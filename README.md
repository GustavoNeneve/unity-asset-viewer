[English](#english) | [Português](#português)

---

## English

# Unity Asset Viewer/Editor for VS Code

A Visual Studio Code extension to view the content of Unity `.asset` files, understand their GUID references, and edit these references directly within the editor.

## Key Features

* **`.asset` File Viewing:** Opens and displays the YAML content of Unity `.asset` files.
* **GUID "Translation":** Shows the name of the referenced file next to each GUID found in the asset's content.
* **GUID Reference Editing:** Allows changing which `.asset` file a specific GUID points to, through a quick pick interface.
* **Integrated Interface:** Works within VS Code, using a Webview to display information.

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**

---

## Prerequisites

* **Visual Studio Code:** Version 1.60.0 or higher (recommended).
* **Unity Project with `Force Text` Serialization:**
    * In Unity: `Edit > Project Settings > Editor`
    * Under `Asset Serialization > Mode`, select `Force Text`.

## Installation (Recommended - Via `.vsix` File)

If you have the extension's `.vsix` file (e.g., `unity-asset-viewer-0.0.1.vsix`):

1.  **Open VS Code.**
2.  Go to the **Extensions** tab (blocks icon in the sidebar, or `Ctrl+Shift+X`).
3.  Click the three dots (`...`) in the upper right corner of the Extensions panel.
4.  Select **"Install from VSIX..."**.
5.  Navigate to where you saved the `.vsix` file and select it.
6.  The extension will be installed. You may need to restart VS Code.

## Using the Extension

After installation:

1.  **Ensure `.asset` Files are Visible:**
    * By default, VS Code might hide non-code files in Unity projects.
    * Check (or create) the `.vscode/settings.json` file in the root of your Unity project.
    * Adjust the `"files.exclude"` section to not hide `.asset` and `.meta` files:
        ```json
        {
          // ... other settings ...
          "files.exclude": {
            // ... other exclusions ...
            "**/*.asset": false, // Ensure this is not 'true'
            "**/*.meta": false   // Ensure this is not 'true'
          }
        }
        ```
    * Save the `settings.json` file. The files should now appear in the VS Code Explorer.

2.  **Using the Extension:**
    * **To View/Edit an Asset:**
        1.  In the VS Code Explorer (with your Unity project open), find an `.asset` file.
        2.  Right-click on it.
        3.  Select **"View Unity Asset"** from the context menu.
    * **Editing GUIDs:**
        1.  In the asset view tab, referenced GUIDs will appear with the name of the corresponding asset next to them.
        2.  Click on the GUID line you wish to change.
        3.  A quick pick box will appear, listing all `.asset` files in your project. Choose the new asset for the reference to point to.
        4.  The change will be saved to the original `.asset` file, and the view will update.
        5.  **Important:** Unity may need to re-import the modified asset. Check the changes in the Unity editor.

## Development and Contribution (Running from Source Code)

If you wish to modify the extension or contribute to development:

1.  **Additional Prerequisites:**
    * **Node.js and npm:** (Available at [nodejs.org](https://nodejs.org/))

2.  **Get the Source Code:**
    * Clone the repository or download the extension files.

3.  **Open in VS Code:**
    * Open the extension's folder in VS Code.

4.  **Install Dependencies:**
    * Open the integrated terminal in VS Code (`Ctrl+` or `Cmd+` on Mac).
    * Run the command:
        ```bash
        npm install
        ```

5.  **Run in Development Mode:**
    * Press `F5`. This will open a new VS Code window ("Extension Development Host").
    * In this **new window**, open the root folder of your Unity project (`File > Open Folder...`).
    * Follow the instructions in the "Using the Extension" section to test.

## Packaging the Extension (Creating a `.vsix` from source code)

If you have modified the code and want to generate a new `.vsix` file:

1.  **Install `vsce` (VS Code Extension Manager) globally (if you haven't already):**
    ```bash
    npm install -g vsce
    ```

2.  **Package:**
    * In the terminal, inside the extension's folder (where `package.json` is located), run:
        ```bash
        vsce package
        ```
    * This will generate a `[extension-name]-[version].vsix` file in your extension's folder.

## Troubleshooting

* **"View Unity Asset" command not appearing:**
    * Ensure the extension is installed and enabled.
    * Make sure you are right-clicking on an `.asset` file.
    * Confirm that the Unity project folder is correctly opened.
    * Check your `files.exclude` settings in `.vscode/settings.json`.
* **GUIDs not "translated":** The `.meta` file for the referenced GUID might be missing, or the GUID might be for a Unity internal type.
* For more detailed issues, open an issue in the project repository (if available).

## Contributions

Contributions are welcome! Feel free to open issues or pull requests in the project repository.

---

*This README was generated to help with the use and development of the extension.*

---

## Português

# Unity Asset Viewer/Editor para VS Code

Uma extensão do Visual Studio Code para visualizar o conteúdo de arquivos `.asset` da Unity, entender suas referências de GUID e editar essas referências diretamente no editor.

## Funcionalidades Principais

* **Visualização de Arquivos `.asset`:** Abre e exibe o conteúdo YAML de arquivos `.asset` da Unity.
* **"Tradução" de GUIDs:** Mostra o nome do arquivo referenciado ao lado de cada GUID encontrado no conteúdo do asset.
* **Edição de Referências GUID:** Permite alterar para qual arquivo `.asset` um GUID específico está apontando, através de uma interface de seleção rápida.
* **Interface Integrada:** Funciona dentro do VS Code, utilizando uma Webview para exibir as informações.

## Pré-requisitos

* **Visual Studio Code:** Versão 1.60.0 ou superior (recomendado).
* **Projeto Unity com Serialização `Force Text`:**
    * No Unity: `Edit > Project Settings > Editor`
    * Em `Asset Serialization > Mode`, selecione `Force Text`.

## Instalação (Recomendado - Via Arquivo `.vsix`)

Se você possui o arquivo `.vsix` da extensão (ex: `unity-asset-viewer-0.0.1.vsix`):

1.  **Abra o VS Code.**
2.  Vá para a aba **Extensões** (ícone de blocos na barra lateral, ou `Ctrl+Shift+X`).
3.  Clique nos três pontos (`...`) no canto superior direito do painel de Extensões.
4.  Selecione **"Instalar do VSIX..."**.
5.  Navegue até o local onde você salvou o arquivo `.vsix` e selecione-o.
6.  A extensão será instalada. Pode ser necessário reiniciar o VS Code.

## Uso da Extensão

Após a instalação:

1.  **Garanta a Visibilidade dos Arquivos `.asset`:**
    * Por padrão, o VS Code pode esconder arquivos não-código em projetos Unity.
    * Verifique (ou crie) o arquivo `.vscode/settings.json` na raiz do seu projeto Unity.
    * Ajuste a seção `"files.exclude"` para não esconder arquivos `.asset` e `.meta`:
        ```json
        {
          // ... outras configurações ...
          "files.exclude": {
            // ... outras exclusões ...
            "**/*.asset": false, // Garanta que não está 'true'
            "**/*.meta": false   // Garanta que não está 'true'
          }
        }
        ```
    * Salve o `settings.json`. Os arquivos devem agora aparecer no Explorer do VS Code.

2.  **Utilizando a Extensão:**
    * **Para Visualizar/Editar um Asset:**
        1.  No Explorer do VS Code (com seu projeto Unity aberto), encontre um arquivo `.asset`.
        2.  Clique com o botão direito sobre ele.
        3.  Selecione **"Ver Asset da Unity"** no menu de contexto.
    * **Editando GUIDs:**
        1.  Na aba de visualização do asset, os GUIDs referenciados aparecerão com o nome do asset correspondente ao lado.
        2.  Clique sobre a linha do GUID que deseja alterar.
        3.  Uma caixa de seleção rápida aparecerá, listando todos os arquivos `.asset` do seu projeto. Escolha o novo asset para o qual a referência deve apontar.
        4.  A alteração será salva no arquivo `.asset` original, e a visualização será atualizada.
        5.  **Importante:** A Unity pode precisar reimportar o asset modificado. Verifique as alterações no editor da Unity.

## Desenvolvimento e Contribuição (Executando a Partir do Código-Fonte)

Se você deseja modificar a extensão ou contribuir para o desenvolvimento:

1.  **Pré-requisitos Adicionais:**
    * **Node.js e npm:** (Disponível em [nodejs.org](https://nodejs.org/))

2.  **Obtenha o Código-Fonte:**
    * Clone o repositório ou baixe os arquivos da extensão.

3.  **Abra no VS Code:**
    * Abra a pasta da extensão no VS Code.

4.  **Instale as Dependências:**
    * Abra o terminal integrado do VS Code (`Ctrl+` ou `Cmd+` no Mac).
    * Execute o comando:
        ```bash
        npm install
        ```

5.  **Execute em Modo de Desenvolvimento:**
    * Pressione `F5`. Isso abrirá uma nova janela do VS Code ("Host de Desenvolvimento de Extensão").
    * Nesta **nova janela**, abra a pasta raiz do seu projeto Unity (`Arquivo > Abrir Pasta...`).
    * Siga as instruções da seção "Uso da Extensão" para testar.

## Empacotando a Extensão (Criando um `.vsix` a partir do código-fonte)

Se você modificou o código e quer gerar um novo arquivo `.vsix`:

1.  **Instale o `vsce` (VS Code Extension Manager) globalmente (se ainda não o fez):**
    ```bash
    npm install -g vsce
    ```

2.  **Empacote:**
    * No terminal, dentro da pasta da extensão (onde está o `package.json`), execute:
        ```bash
        vsce package
        ```
    * Isso gerará um arquivo `[nome-da-extensao]-[versao].vsix` na pasta da sua extensão.

## Solução de Problemas

* **Comando "Ver Asset da Unity" não aparece:**
    * Verifique se a extensão está instalada e ativada.
    * Certifique-se de que está clicando com o botão direito num arquivo `.asset`.
    * Confirme se a pasta do projeto Unity está corretamente aberta.
    * Verifique as configurações de `files.exclude` no seu `.vscode/settings.json`.
* **GUIDs não traduzidos:** O arquivo `.meta` do GUID referenciado pode estar faltando ou o GUID pode ser de um tipo interno da Unity.
* Para problemas mais detalhados, abra uma issue no repositório do projeto (se houver).

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests no repositório do projeto.

---
*Este README foi gerado para auxiliar no uso e desenvolvimento da extensão.*
