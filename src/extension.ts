// src/extension.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Essa função é chamada quando a extensão é ativada
export function activate(context: vscode.ExtensionContext) {

    // Registra o comando que definimos no package.json
    let disposable = vscode.commands.registerCommand('unity-asset-viewer.viewAsset', async (uri: vscode.Uri) => {
        // Se o comando foi chamado sem um URI (ex: pela paleta de comandos sem arquivo aberto),
        // pega o arquivo que está ativo no editor.
        const resourceUri = uri || vscode.window.activeTextEditor?.document.uri;

        if (!resourceUri || !resourceUri.fsPath.endsWith('.asset')) {
            vscode.window.showWarningMessage('Isso não parece um arquivo .asset da Unity. Abra um .asset e tente de novo.');
            return;
        }

        const assetPath = resourceUri.fsPath;
        const metaPath = `${assetPath}.meta`;

        let assetContent = '';
        let metaContent = '';
        let guid = 'Não encontrado';

        // Tenta ler o arquivo .asset
        try {
            assetContent = fs.readFileSync(assetPath, 'utf8');
        } catch (error) {
            vscode.window.showErrorMessage(`Falha ao ler o arquivo .asset: ${assetPath}`);
            return;
        }

        // Tenta ler o arquivo .meta e extrair o GUID
        try {
            metaContent = fs.readFileSync(metaPath, 'utf8');
            // Regex pra achar a linha do GUID. Mágica!
            const guidMatch = metaContent.match(/guid:\s*([a-fA-F0-9]{32})/);
            if (guidMatch && guidMatch[1]) {
                guid = guidMatch[1];
            }
        } catch (error) {
            guid = 'Arquivo .meta não encontrado ou ilegível.';
        }

        // Cria e mostra um painel web (uma aba nova)
        const panel = vscode.window.createWebviewPanel(
            'unityAssetView', // ID interno da view
            `Asset: ${path.basename(assetPath)}`, // Título da aba
            vscode.ViewColumn.One, // Mostra na primeira coluna
            {} // Opções (deixa vazio por enquanto)
        );

        // Define o conteúdo HTML da nossa aba
        panel.webview.html = getWebviewContent(path.basename(assetPath), guid, assetContent);
    });

    // Adiciona o comando ao contexto de "disposables" da extensão
    context.subscriptions.push(disposable);
}

// Essa função gera o HTML que vai ser exibido na aba
function getWebviewContent(fileName: string, guid: string, assetContent: string) {
    // Usando crases (template literals) pra montar o HTML fica mais fácil
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Unity Asset Viewer</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                h1 { color: #d4d4d4; }
                .guid-box { background-color: #3c3c3c; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
                .guid-box span { font-family: monospace; font-size: 1.2em; color: #4ec9b0; }
                pre { background-color: #1e1e1e; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
            </style>
        </head>
        <body>
            <h1>${fileName}</h1>
            <div class="guid-box">
                GUID: <span>${guid}</span>
            </div>
            <h2>Conteúdo do Asset:</h2>
            <pre><code>${assetContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </body>
        </html>
    `;
}

// Essa função é chamada quando a extensão é desativada (não precisamos fazer nada aqui por enquanto)
export function deactivate() {}