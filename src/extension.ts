// src/extension.ts
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

const guidCache = new Map<string, string>();
let currentPanel: vscode.WebviewPanel | undefined = undefined;
let currentResourcePath: string | undefined = undefined;
let currentResourceFileName: string | undefined = undefined;
let currentMainGuid: string | undefined = undefined;

const SUPPORTED_EXTENSIONS = ['.asset', '.prefab'];

export function activate(context: vscode.ExtensionContext) {
    console.log('Unity Asset/Prefab Viewer/Editor is now active!');

    let disposable = vscode.commands.registerCommand('unity-asset-viewer.viewResource', async (uri: vscode.Uri) => {
        const resourceUri = uri || vscode.window.activeTextEditor?.document.uri;

        if (!resourceUri || !SUPPORTED_EXTENSIONS.some(ext => resourceUri.fsPath.endsWith(ext))) {
            vscode.window.showWarningMessage(`Abra um arquivo .asset ou .prefab da Unity e tente novamente.`);
            return;
        }

        currentResourcePath = resourceUri.fsPath;
        currentResourceFileName = path.basename(currentResourcePath);
        const metaPath = `${currentResourcePath}.meta`;

        try {
            currentMainGuid = await getMainGuid(metaPath);

            if (currentPanel) {
                currentPanel.reveal(vscode.ViewColumn.One);
                currentPanel.title = `Recurso: ${currentResourceFileName}`;
            } else {
                currentPanel = vscode.window.createWebviewPanel(
                    'unityResourceView',
                    `Recurso: ${currentResourceFileName}`,
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true
                    }
                );

                currentPanel.onDidDispose(() => {
                    currentPanel = undefined;
                    currentResourcePath = undefined;
                    currentResourceFileName = undefined;
                    currentMainGuid = undefined;
                    guidCache.clear();
                }, null, context.subscriptions);

                currentPanel.webview.onDidReceiveMessage(
                    async message => {
                        switch (message.command) {
                            case 'requestChangeGuid':
                                await handleChangeGuidRequest(message.originalFullMatch, message.oldGuid, message.oldAssetName);
                                return;
                            case 'webviewLoaded':
                                await updateWebviewContent();
                                return;
                        }
                    },
                    undefined,
                    context.subscriptions
                );
            }
            await updateWebviewContent();

        } catch (error) {
            vscode.window.showErrorMessage(`Falha ao processar o recurso: ${error instanceof Error ? error.message : String(error)}`);
            console.error(`Falha ao processar o recurso:`, error);
        }
    });

    context.subscriptions.push(disposable);
}

async function updateWebviewContent() {
    if (!currentPanel || !currentResourcePath || !currentResourceFileName || currentMainGuid === undefined) {
        return;
    }
    try {
        const resourceContent = await fs.readFile(currentResourcePath, 'utf8');
        // Regex para extrair GUIDs de várias formas de referência - ADICIONADO FLAG GLOBAL 'g'
        const guidExtractionRegex = /guid:\s*([a-fA-F0-9]{32})/g; 
        const allMatches = [...resourceContent.matchAll(guidExtractionRegex)];
        const guidsInResource = allMatches.map(match => match[1]);
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Analisando ${currentResourceFileName}...`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Lendo referências..." });
            const resolvedGuids = await resolveGuids(guidsInResource, progress);
            progress.report({ increment: 100, message: "Renderizando..." });
            if (currentPanel) { // Verifica se o painel ainda existe
                 currentPanel.webview.html = getWebviewContent(currentResourceFileName!, currentMainGuid!, resourceContent, resolvedGuids, path.extname(currentResourcePath!));
            }
        });

    } catch (error) {
        vscode.window.showErrorMessage(`Erro ao atualizar visualização: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Erro ao atualizar visualização:`, error);
    }
}

async function handleChangeGuidRequest(originalFullMatch: string, oldGuid: string, oldAssetName: string) {
    if (!currentResourcePath) return;

    try {
        const allMetaUris = await vscode.workspace.findFiles('**/*.meta', '**/[Ll]ibrary/**'); // Ignora Library
        if (!allMetaUris.length) {
            vscode.window.showErrorMessage('Nenhum arquivo .meta encontrado no projeto para referenciar.');
            return;
        }

        const assetItemsPromises = allMetaUris.map(async (metaUri) => {
            let itemGuid = '';
            try {
                const metaContent = await fs.readFile(metaUri.fsPath, 'utf8');
                const guidMatch = metaContent.match(/guid:\s*([a-fA-F0-9]{32})/);
                if (guidMatch && guidMatch[1]) {
                    itemGuid = guidMatch[1];
                }
            } catch { /* Silencia erro */ }
            
            const assetNameFromMeta = path.basename(metaUri.fsPath.replace('.meta', ''));
            const actualAssetPath = metaUri.fsPath.replace('.meta', '');

            return {
                label: assetNameFromMeta,
                description: itemGuid ? `GUID: ${itemGuid}` : 'GUID não encontrado',
                detail: actualAssetPath,
                guid: itemGuid,
            };
        });

        const assetItems = (await Promise.all(assetItemsPromises)).filter(item => item.guid);

        if (!assetItems.length) {
            vscode.window.showErrorMessage('Nenhum asset com GUID válido encontrado para seleção.');
            return;
        }
        
        const selectedItem = await vscode.window.showQuickPick(assetItems, {
            placeHolder: `Substituir ref. a "${oldAssetName}" (GUID: ${oldGuid}). Selecione o NOVO recurso:`,
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selectedItem || !selectedItem.guid) {
            vscode.window.showInformationMessage('Nenhuma alteração feita.');
            return;
        }

        const newGuidHex = selectedItem.guid; // Este é o GUID hexadecimal do novo asset selecionado

        // `oldGuid` é o GUID hexadecimal da referência original que foi clicada.
        // `originalFullMatch` é a string completa da referência original (ex: "{fileID: 123, guid: XXX, type: 3}").
        // Nós queremos substituir o `oldGuid` (XXX) por `newGuidHex` (YYY) dentro de `originalFullMatch`.
        
        let newReferenceString = originalFullMatch.replace(oldGuid, newGuidHex);

        let currentContent = await fs.readFile(currentResourcePath, 'utf8');
        
        // Confirma que o GUID que estamos prestes a substituir ainda é o esperado.
        // Esta verificação é uma segurança extra. `oldGuid` é o parâmetro da função, que veio do clique.
        const guidStillInOriginalMatch = originalFullMatch.match(/guid:\s*([a-fA-F0-9]{32})/);

        if (guidStillInOriginalMatch && guidStillInOriginalMatch[1] === oldGuid) {
            if (currentContent.includes(originalFullMatch)) {
                currentContent = currentContent.replace(originalFullMatch, newReferenceString);
                await fs.writeFile(currentResourcePath, currentContent, 'utf8');
                vscode.window.showInformationMessage(`Referência para "${oldAssetName}" atualizada para "${selectedItem.label}" em ${path.basename(currentResourcePath)}.`);
                
                guidCache.clear(); 
                await updateWebviewContent();
            } else {
                vscode.window.showErrorMessage(`A referência original "${originalFullMatch}" não foi encontrada no arquivo. O arquivo pode ter sido modificado externamente. Tente reabrir o recurso.`);
            }
        } else {
             vscode.window.showErrorMessage(`O GUID na referência clicada (${guidStillInOriginalMatch ? guidStillInOriginalMatch[1] : 'N/A'}) não corresponde ao GUID esperado (${oldGuid}) para substituição. Nenhuma alteração feita.`);
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Erro ao alterar referência do GUID: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Erro ao alterar referência do GUID:`, error);
    }
}

async function getMainGuid(metaPath: string): Promise<string> {
    try {
        const metaContent = await fs.readFile(metaPath, 'utf8');
        const guidMatch = metaContent.match(/guid:\s*([a-fA-F0-9]{32})/);
        return guidMatch ? guidMatch[1] : 'GUID principal não encontrado';
    } catch {
        return `Arquivo .meta (${path.basename(metaPath)}) não encontrado`;
    }
}

async function resolveGuids(guids: string[], progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<Map<string, string>> {
    const uniqueGuids = [...new Set(guids)];
    const resolved = new Map<string, string>();
    const totalGuidsToResolve = uniqueGuids.filter(guid => !guidCache.has(guid)).length;
    let resolvedCount = 0;

    if (totalGuidsToResolve > 0 && progress) {
        progress.report({ message: `Procurando ${totalGuidsToResolve} GUIDs novos...` });
    }

    const allMetaFiles = await vscode.workspace.findFiles('**/*.meta', '**/[Ll]ibrary/**');
    
    for (const guid of uniqueGuids) {
        if (guidCache.has(guid)) {
            resolved.set(guid, guidCache.get(guid)!);
            continue;
        }

        let found = false;
        for (const metaUri of allMetaFiles) {
            try {
                const metaContent = await fs.readFile(metaUri.fsPath, 'utf8');
                if (metaContent.includes(`guid: ${guid}`)) { 
                    const assetName = path.basename(metaUri.fsPath.replace('.meta', ''));
                    resolved.set(guid, assetName);
                    guidCache.set(guid, assetName);
                    found = true;
                    break; 
                }
            } catch (e) { /* Ignora erros */ }
        }
        if (!found) {
            // guidCache.set(guid, `GUID_NOT_FOUND:${guid}`); 
            // resolved.set(guid, `GUID_NOT_FOUND:${guid}`);
        }

        if (totalGuidsToResolve > 0 && progress) {
            resolvedCount++;
            const increment = totalGuidsToResolve > 0 ? (resolvedCount / totalGuidsToResolve) * 100 : 100;
            progress.report({ increment: increment, message: `Resolvidos ${resolvedCount}/${totalGuidsToResolve}...` });
        }
    }
    return resolved;
}

function getWebviewContent(
    fileName: string, 
    mainGuid: string, 
    resourceContent: string, 
    resolvedGuids: Map<string, string>,
    fileExtension: string
) {
    let matchIndex = 0; 
    const resourceTypeDisplay = fileExtension === '.prefab' ? 'Prefab' : 'Recurso'; // Ajustado para "Recurso" em vez de "Asset"

    // Regex para encontrar referências:
    // 1. {fileID: F, guid: G, type: T}
    // 2. guid: G, type: T
    // 3. guid: G
    // Captura o GUID em cada caso para resolução.
    const referencePattern = /(\{fileID:\s*-?\d+,\s*guid:\s*([a-fA-F0-9]{32}),\s*type:\s*\d+\}|\bguid:\s*([a-fA-F0-9]{32}),\s*type:\s*\d+\b|\bguid:\s*([a-fA-F0-9]{32})\b)/g;

    const processedContent = resourceContent
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(referencePattern, (
            fullMatch,         // A string completa da referência encontrada
            guidInObjectForm,  // GUID do grupo 1 (se for forma {fileID,guid,type})
            guidInGuidTypeForm,// GUID do grupo 2 (se for forma guid,type)
            guidInGuidOnlyForm // GUID do grupo 3 (se for forma guid apenas)
        ) => { 
            // Determina qual GUID foi capturado. A regex garante que apenas um desses grupos de GUID terá valor.
            // É importante pegar o GUID correto da regex de referência, que pode estar em diferentes grupos de captura.
            // A regex referencePattern tem 3 grupos principais de captura para o GUID, dependendo da forma da referência.
            // O grupo 2 é para {fileID, guid, type}, o grupo 3 é para guid, type, e o grupo 4 é para guid sozinho.
            // Corrigindo para pegar o grupo correto que contém apenas o GUID hexadecimal.
            // O parâmetro `guidInObjectForm` que você está usando na verdade captura a *string completa* da forma {fileID, guid, type}, e não apenas o guid.
            // É preciso ajustar qual grupo de captura da regex `referencePattern` realmente contém o GUID puro.
            // A regex é: /(\{fileID..., guid: (GUID1), ...\}|\bguid: (GUID2), ...\b|\bguid: (GUID3)\b)/g
            // Então, os GUIDs puros são nos grupos de captura 2, 4, 6 (considerando que cada (...) é um grupo).
            // Melhorando a extração do GUID do fullMatch:
            const guidMatchResult = fullMatch.match(/guid:\s*([a-fA-F0-9]{32})/);
            const guid = guidMatchResult ? guidMatchResult[1] : null;


            if (!guid) return fullMatch; // Segurança
            
            const resolvedName = resolvedGuids.get(guid);
            const currentMatchId = `match-${matchIndex++}`;

            if (resolvedName && !resolvedName.startsWith("GUID_NOT_FOUND:")) {
                // `fullMatch` é a string original completa (ex: "{fileID: 123, guid: XXX, type: 3}")
                // `guid` é apenas o valor hexadecimal do GUID (ex: "XXX")
                return `<span class="guid-ref" id="${currentMatchId}" title="Clique para alterar referência: ${resolvedName} (GUID: ${guid})" onclick="handleChangeGuid('${encodeURIComponent(fullMatch)}', '${guid}', '${resolvedName.replace(/'/g, "\\'")}')">${fullMatch} <span class="resolved-name">(${resolvedName})</span></span>`;
            }
            // Se não resolvido, ou marcado como "não encontrado", apenas mostra o fullMatch
            // Adicionamos uma classe para "não encontrado" para possível estilização
            return fullMatch + (resolvedName && resolvedName.startsWith("GUID_NOT_FOUND:") ? ` <span class="unresolved-name">(Referência Externa/Não Encontrada no Projeto)</span>` : (resolvedGuids.has(guid) ? '' : ` <span class="unresolved-name">(Não Resolvido)</span>`));
        });

    return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' vscode-resource:; script-src 'unsafe-inline' vscode-resource: https://*.vscode-cdn.net; img-src data: https: vscode-resource:;">
            <title>Unity ${resourceTypeDisplay}: ${fileName}</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
                    padding: 20px; 
                    line-height: 1.6; 
                    background-color: var(--vscode-editor-background); 
                    color: var(--vscode-editor-foreground);
                }
                h1, h2 { 
                    color: var(--vscode-textLink-foreground);
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    padding-bottom: 5px;
                }
                .guid-box { 
                    background-color: var(--vscode-editorWidget-background); 
                    padding: 10px; 
                    border-radius: 5px; 
                    margin-bottom: 20px; 
                    font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace;
                    border: 1px solid var(--vscode-editorWidget-border);
                }
                .guid-box .main-guid { 
                    color: var(--vscode-textLink-activeForeground); 
                    font-weight: bold;
                }
                pre { 
                    background-color: var(--vscode-editor-background); 
                    padding: 15px; 
                    border-radius: 5px; 
                    white-space: pre-wrap; 
                    word-wrap: break-word; 
                    font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace;
                    border: 1px solid var(--vscode-input-border);
                }
                .guid-ref { 
                    cursor: pointer; 
                    text-decoration: underline;
                    text-decoration-style: dotted;
                    color: var(--vscode-textLink-foreground); 
                }
                .guid-ref:hover { 
                    background-color: var(--vscode-list-hoverBackground); 
                }
                .resolved-name { 
                    color: var(--vscode-descriptionForeground); 
                    font-style: italic;
                }
                .unresolved-name {
                     color: var(--vscode-editorWarning-foreground);
                     font-style: italic;
                }
            </style>
        </head>
        <body>
            <h1>${resourceTypeDisplay}: ${fileName}</h1>
            <div class="guid-box">
                GUID Principal: <span class="main-guid">${mainGuid}</span>
            </div>
            <h2>Conteúdo do ${resourceTypeDisplay} (GUIDs clicáveis para edição):</h2>
            <pre><code>${processedContent}</code></pre>

            <script>
                const vscode = acquireVsCodeApi();
                window.addEventListener('load', () => {
                    vscode.postMessage({ command: 'webviewLoaded' });
                });

                function handleChangeGuid(originalFullMatchEncoded, oldGuid, oldAssetName) {
                    const originalFullMatch = decodeURIComponent(originalFullMatchEncoded);
                    vscode.postMessage({
                        command: 'requestChangeGuid',
                        originalFullMatch: originalFullMatch,
                        oldGuid: oldGuid, // Este é o valor hexadecimal do GUID
                        oldAssetName: oldAssetName
                    });
                }
            </script>
        </body>
        </html>
    `;
}

export function deactivate() {
    if (currentPanel) {
        currentPanel.dispose();
    }
    guidCache.clear();
    console.log('Unity Asset/Prefab Viewer/Editor desativado.');
}
