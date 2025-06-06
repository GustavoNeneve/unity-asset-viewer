// src/extension.ts
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { I18n } from './i18n/i18n';

const SUPPORTED_EXTENSIONS = ['.asset', '.prefab'];
const guidCache = new Map<string, string>();
let currentPanel: vscode.WebviewPanel | undefined = undefined;
let currentResourcePath: string | undefined = undefined;
let currentResourceFileName: string | undefined = undefined;
let currentMainGuid: string | undefined = undefined;

// Inicializa o sistema de localização
const i18n = I18n.getInstance();

export function activate(context: vscode.ExtensionContext) {
    console.log('Unity Asset/Prefab Viewer/Editor is now active!');

    // Registra o comando para mudar o idioma
    let languageCommand = vscode.commands.registerCommand('unity-asset-viewer.setLanguage', async () => {
        const selected = await vscode.window.showQuickPick(
            [
                { label: 'English', value: 'en' },
                { label: 'Português', value: 'pt' }
            ],
            { placeHolder: 'Select Language / Selecione o Idioma' }
        );

        if (selected) {
            await vscode.workspace.getConfiguration('unityAssetViewer').update('language', selected.value, true);
            i18n.setLanguage(selected.value as 'en' | 'pt');
            if (currentPanel) {
                await updateWebviewContent();
            }
        }
    });

    // Registra o comando principal
    let viewCommand = vscode.commands.registerCommand('unity-asset-viewer.viewResource', async (uri: vscode.Uri) => {
        const resourceUri = uri || vscode.window.activeTextEditor?.document.uri;

        if (!resourceUri || !SUPPORTED_EXTENSIONS.some(ext => resourceUri.fsPath.endsWith(ext))) {
            vscode.window.showWarningMessage(i18n.getString('errorNotSupportedFile'));
            return;
        }

        currentResourcePath = resourceUri.fsPath;
        currentResourceFileName = path.basename(currentResourcePath);
        const metaPath = `${currentResourcePath}.meta`;

        try {
            currentMainGuid = await getMainGuid(metaPath);

            if (currentPanel) {
                currentPanel.reveal(vscode.ViewColumn.One);
                currentPanel.title = `${i18n.getString(resourceUri.fsPath.endsWith('.prefab') ? 'resourceTypePrefab' : 'resourceTypeAsset')}: ${currentResourceFileName}`;
            } else {
                currentPanel = vscode.window.createWebviewPanel(
                    'unityResourceView',
                    `${i18n.getString(resourceUri.fsPath.endsWith('.prefab') ? 'resourceTypePrefab' : 'resourceTypeAsset')}: ${currentResourceFileName}`,
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true
                    }
                );

                currentPanel.onDidDispose(() => {
                    currentPanel = undefined;
                    currentResourcePath = undefined;
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
            vscode.window.showErrorMessage(i18n.getString('errorProcessingResource', error));
        }
    });

    context.subscriptions.push(languageCommand, viewCommand);

    // Configura o idioma inicial
    const config = vscode.workspace.getConfiguration('unityAssetViewer');
    const language = config.get<string>('language', 'auto');
    if (language !== 'auto') {
        i18n.setLanguage(language as 'en' | 'pt');
    }
}

async function updateWebviewContent() {
    if (!currentPanel || !currentResourcePath || !currentResourceFileName || currentMainGuid === undefined) {
        return;
    }
    try {
        const resourceContent = await fs.readFile(currentResourcePath, 'utf8');
        const guidsInResource = [...resourceContent.matchAll(/guid:\s*([a-fA-F0-9]{32})/g)].map(match => match[1]);
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: i18n.getString('statusAnalyzing', currentResourceFileName),
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: i18n.getString('statusReadingRefs') });
            const resolvedGuids = await resolveGuids(guidsInResource, progress);
            progress.report({ increment: 100, message: i18n.getString('statusRendering') });
            if (currentPanel) {
                 currentPanel.webview.html = getWebviewContent(
                     currentResourceFileName!,
                     currentMainGuid!,
                     resourceContent,
                     resolvedGuids,
                     path.extname(currentResourcePath!)
                 );
            }
        });

    } catch (error) {
        vscode.window.showErrorMessage(i18n.getString('errorProcessingResource', error));
    }
}

async function handleChangeGuidRequest(originalFullMatch: string, oldGuid: string, oldAssetName: string) {
    if (!currentResourcePath) return;

    try {
        const allMetaUris = await vscode.workspace.findFiles('**/*.meta', '**/node_modules/**');
        if (!allMetaUris.length) {
            vscode.window.showErrorMessage(i18n.getString('errorNoMetaFiles'));
            return;
        }

        const assetItemsPromises = allMetaUris.map(async (metaUri) => {
            let itemGuid = '';
            let itemMetaFound = false;
            try {
                const metaContent = await fs.readFile(metaUri.fsPath, 'utf8');
                const guidMatch = metaContent.match(/guid:\s*([a-fA-F0-9]{32})/);
                if (guidMatch && guidMatch[1]) {
                    itemGuid = guidMatch[1];
                    itemMetaFound = true;
                }
            } catch { /* Silencia erro se .meta não for encontrado */ }
            
            const assetNameFromMeta = path.basename(metaUri.fsPath.replace('.meta', ''));
            const actualAssetPath = metaUri.fsPath.replace('.meta', '');

            return {
                label: assetNameFromMeta,
                description: itemMetaFound ? `GUID: ${itemGuid}` : i18n.getString('guidNotFound'),
                detail: actualAssetPath,
                guid: itemGuid,
                originalAssetPath: actualAssetPath
            };
        });

        const assetItems = (await Promise.all(assetItemsPromises))
                            .filter(item => item.guid !== '');

        if (!assetItems.length) {
            vscode.window.showErrorMessage(i18n.getString('errorNoValidGuids'));
            return;
        }
        
        const selectedItem = await vscode.window.showQuickPick(assetItems, {
            placeHolder: i18n.getString('selectNewResource', oldAssetName, oldGuid),
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selectedItem || !selectedItem.guid) {
            vscode.window.showInformationMessage(i18n.getString('noChangesMade'));
            return;
        }

        const newGuid = selectedItem.guid;
        let currentContent = await fs.readFile(currentResourcePath, 'utf8');
        const newGuidStringReplacement = `guid: ${newGuid}`;

        const guidInOriginalMatch = originalFullMatch.match(/guid:\s*([a-fA-F0-9]{32})/);

        if (guidInOriginalMatch && guidInOriginalMatch[1] === oldGuid) {
            if (currentContent.includes(originalFullMatch)) {
                currentContent = currentContent.replace(originalFullMatch, newGuidStringReplacement);
                await fs.writeFile(currentResourcePath, currentContent, 'utf8');
                vscode.window.showInformationMessage(i18n.getString('referenceUpdated', oldAssetName, selectedItem.label, path.basename(currentResourcePath)));
                
                guidCache.clear();
                await updateWebviewContent();
            } else {
                vscode.window.showErrorMessage(i18n.getString('errorReferenceNotFound', originalFullMatch));
            }
        } else {
             vscode.window.showErrorMessage(i18n.getString('errorGuidMismatch'));
        }

    } catch (error) {
        vscode.window.showErrorMessage(i18n.getString('errorChangingGuid', error));
    }
}

async function getMainGuid(metaPath: string): Promise<string> {
    try {
        const metaContent = await fs.readFile(metaPath, 'utf8');
        const guidMatch = metaContent.match(/guid:\s*([a-fA-F0-9]{32})/);
        return guidMatch ? guidMatch[1] : i18n.getString('guidNotFound');
    } catch {
        return i18n.getString('guidNotFound');
    }
}

async function resolveGuids(guids: string[], progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<Map<string, string>> {
    const uniqueGuids = [...new Set(guids)];
    const resolved = new Map<string, string>();
    const totalGuidsToResolve = uniqueGuids.filter(guid => !guidCache.has(guid)).length;
    let resolvedCount = 0;

    if (totalGuidsToResolve > 0 && progress) {
        progress.report({ message: i18n.getString('statusSearchingGuids', totalGuidsToResolve) });
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
            } catch (e) { /* Ignora erros de leitura de meta arquivos individuais */ }
        }

        if (totalGuidsToResolve > 0 && progress) {
            resolvedCount++;
            progress.report({ 
                increment: 100 / totalGuidsToResolve,
                message: i18n.getString('statusResolved', resolvedCount, totalGuidsToResolve)
            });
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
    const resourceTypeDisplay = i18n.getString(fileExtension === '.prefab' ? 'resourceTypePrefab' : 'resourceTypeAsset');

    const processedContent = resourceContent
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/(guid:\s*[a-fA-F0-9]{32}|guid:\s*[a-fA-F0-9]{32},\s*type:\s*\d+)/g, (fullMatchWithPossibleType) => {
            const guidOnlyMatchResult = fullMatchWithPossibleType.match(/guid:\s*([a-fA-F0-9]{32})/);
            if (!guidOnlyMatchResult || !guidOnlyMatchResult[1]) return fullMatchWithPossibleType;
            
            const guid = guidOnlyMatchResult[1];
            const resolvedName = resolvedGuids.get(guid);
            const currentMatchId = `match-${matchIndex++}`;

            if (resolvedName && !resolvedName.startsWith("GUID_NOT_FOUND:")) {
                return `<span class="guid-ref" id="${currentMatchId}" title="${i18n.getString('clickToChangeRef', resolvedName, guid)}" onclick="handleChangeGuid('${encodeURIComponent(fullMatchWithPossibleType)}', '${guid}', '${resolvedName.replace(/'/g, "\\'")}')">${fullMatchWithPossibleType} <span class="resolved-name">(${resolvedName})</span></span>`;
            }
            return fullMatchWithPossibleType + (resolvedName && resolvedName.startsWith("GUID_NOT_FOUND:") ? ` <span class="unresolved-name">${i18n.getString('externalReference')}</span>` : '');
        });

    return `
        <!DOCTYPE html>
        <html lang="${i18n.getCurrentLanguage()}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://*.vscode-cdn.net; img-src data: https:;">
            <title>Unity ${resourceTypeDisplay}: ${fileName}</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
                ${i18n.getString('mainGuid')}: <span class="main-guid">${mainGuid}</span>
            </div>
            <h2>${i18n.getString('contentHeader')}</h2>
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
                        oldGuid: oldGuid,
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
