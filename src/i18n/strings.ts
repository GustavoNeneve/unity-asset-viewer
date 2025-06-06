export interface LocalizedStrings {
    resourceTypeAsset: string;
    resourceTypePrefab: string;
    errorNotSupportedFile: string;
    statusAnalyzing: string;
    statusReadingRefs: string;
    statusRendering: string;
    statusSearchingGuids: string;
    statusResolved: string;
    mainGuid: string;
    contentHeader: string;
    errorProcessingResource: string;
    errorNoMetaFiles: string;
    errorNoValidGuids: string;
    errorReferenceNotFound: string;
    errorGuidMismatch: string;
    errorChangingGuid: string;
    noChangesMade: string;
    referenceUpdated: string;
    clickToChangeRef: string;
    selectNewResource: string;
    externalReference: string;
    guidNotFound: string;
}

const en: LocalizedStrings = {
    resourceTypeAsset: 'Asset',
    resourceTypePrefab: 'Prefab',
    errorNotSupportedFile: 'Open a Unity .asset or .prefab file and try again.',
    statusAnalyzing: 'Analyzing {0}...',
    statusReadingRefs: 'Reading references...',
    statusRendering: 'Rendering...',
    statusSearchingGuids: 'Searching for {0} new GUIDs...',
    statusResolved: 'Resolved {0}/{1}...',
    mainGuid: 'Main GUID',
    contentHeader: 'Content (GUIDs are clickable for editing):',
    errorProcessingResource: 'Failed to process resource: {0}',
    errorNoMetaFiles: 'No .meta files found in project for reference.',
    errorNoValidGuids: 'No assets with valid GUIDs found for selection.',
    errorReferenceNotFound: 'Original reference "{0}" not found. File may have been modified. Try reopening.',
    errorGuidMismatch: 'GUID in clicked reference does not match expected. No changes made.',
    errorChangingGuid: 'Error changing GUID reference: {0}',
    noChangesMade: 'No changes made. New resource not selected or new resource GUID not found.',
    referenceUpdated: 'Reference to "{0}" updated to "{1}" in {2}.',
    clickToChangeRef: 'Click to change reference: {0} (GUID: {1})',
    selectNewResource: 'Replace ref. to "{0}" (GUID: {1}). Select NEW resource:',
    externalReference: '(External Reference/Not Found in Project)',
    guidNotFound: 'GUID not found'
};

const pt: LocalizedStrings = {
    resourceTypeAsset: 'Asset',
    resourceTypePrefab: 'Prefab',
    errorNotSupportedFile: 'Abra um arquivo .asset ou .prefab da Unity e tente novamente.',
    statusAnalyzing: 'Analisando {0}...',
    statusReadingRefs: 'Lendo referências...',
    statusRendering: 'Renderizando...',
    statusSearchingGuids: 'Procurando {0} GUIDs novos...',
    statusResolved: 'Resolvidos {0}/{1}...',
    mainGuid: 'GUID Principal',
    contentHeader: 'Conteúdo (GUIDs clicáveis para edição):',
    errorProcessingResource: 'Falha ao processar o recurso: {0}',
    errorNoMetaFiles: 'Nenhum arquivo .meta encontrado no projeto para referenciar.',
    errorNoValidGuids: 'Nenhum asset com GUID válido encontrado para seleção.',
    errorReferenceNotFound: 'A referência original "{0}" não foi encontrada. O arquivo pode ter sido modificado. Tente reabrir.',
    errorGuidMismatch: 'GUID na referência clicada não corresponde ao esperado. Nenhuma alteração feita.',
    errorChangingGuid: 'Erro ao alterar referência do GUID: {0}',
    noChangesMade: 'Nenhuma alteração feita. Novo recurso não selecionado ou GUID do novo recurso não encontrado.',
    referenceUpdated: 'Referência para "{0}" atualizada para "{1}" em {2}.',
    clickToChangeRef: 'Clique para alterar referência: {0} (GUID: {1})',
    selectNewResource: 'Substituir ref. a "{0}" (GUID: {1}). Selecione o NOVO recurso:',
    externalReference: '(Referência Externa/Não Encontrada no Projeto)',
    guidNotFound: 'GUID não encontrado'
};

export const strings = {
    en,
    pt
};
