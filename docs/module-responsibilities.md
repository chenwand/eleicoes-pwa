# Responsabilidades de Módulos (Pós-Fase 4B / Consolidado)

Mapeamento do estado final do projeto, certificando onde as barreiras técnicas fixadas limitam e guiam expansões de lógicas e features por pasta.

## 1. Núcleo Isolado de Lógica Pura
Arquivos que executam deduções de alta densidade eleitoral. Inteiramente testáveis, não lidam com rede (HTML fetchers) nem React-Render.
- **`src/services/*Validator.ts`**: Conjunto de Auditores. Retornam Arrays tipados declarando se uma asserção crua sobre seções não repousa em bases lícitas (`ea14Validator`, `ea15Validator`, `ea20Validator`).
- **`src/hooks/useAvailableRoles.ts`**: Domínio territorial restrito que blinda acesso a tipos errôneos de cargos em UFs ou em 1st escrutínios indevidos na montagem das guias (Tabs) de Viewers Globais.
- **`src/utils/electionUtils.ts`**: Utilitário abstrato de retenção orgânica comportamental da geografia elegível do eleitor ao realizar transições no tempo/turnos.

## 2. A Barreira de Contrato da Fila e de Interceptadores (Cache Nativos)
Lidam passivamente convertendo "Bases externas para Internas" centralizados na orquestração de leitura e parsing global, blindando o consumo confuso e mitigando O(N) nas renderizações densas.
- **`src/utils/parsers.ts`**: As chaves brutas textuais nativas da formatação brasileira crua (","). Unidades menores atômicas exportadas ao universo da app.
- **`src/utils/adapters/*Adapters.ts`**: **(Coração da Fase 4B)** Extratores e estendedores automáticos de tipagem robusta de cache interceptando todos JSON oficiais nos subscritores e empurrando UI Models seguros contados sem aniquilar ou mutar in-place os atributos originais que persistem preservados para as Views Textuais embutidas se invocados na sua natureza `raw`. Ponto inicial de qualquer adição de variável matemática na aplicação inteira.

## 3. Ponto Neutro Abstrato Central (Context)
Desacoplado de Regras Eleitorais de negócios duras, é a espinha dorsal de Redirecionamento da navegação por memórias do aplicativo global.
- **`src/context/ElectionContext.tsx`**: Apenas coordena a "Visita do Eleitor" nas UFs / Pleito Ativo via `localStorage`. Fornece dispatchers para limpar ou alternar cenários em um nível puramente macro geográfico.

## 4. Pastas de Apresentação Divididas Hierarquicamente
Responsabilidades estritamente de visual de cores, espaçamentos, HTML Tables ordenadoras da vida final (Sem parsing matemático ou extrações lógicas profundas, puramente consumo de states globais puros).
- **`src/components/EA*Viewer.tsx`**: Contêineres de Injeção Visual Master. Orquestram estado UI puro (`searchtext`, botões `sortmode=recent`, aberturas visuais). Roteiam o array numérico gigante recém importado da tipagem enriquecidas UI Model em direções de blocos visuais burros. Embebedam a nova ação universal em cabeçalhos autônomos para voltar/avançar turnos na hierarquia.
- **`src/components/ea20/`**: Divisão atômica isolada na sub-pasta restrita a Sub-componentes Passivos "Dumb". Especializados em enxugamento pesado ex: `SummaryCards`, `CandCard`, onde só repassam os CSS de Tailwind de acordo com props engessadas `totalVotos` etc., zerando side-effects assíncronos de suas lógicas engustas limitadas a Layout HTML nativo.

## Nota final sobre Responsabilidades Erradicadas
Componentes e Serviços NUNCA fazem tipagens evasadas sob forma bruta ou encastamentos como `"as any"` em re-assinalações impuras nas View Layers. A integridade estrutural unificada do ecossistema de dados na Aplicação baseia-se pesadamente na aderência contratual formal fixada no Model Typings Global injetada e fiscalizada no `TypeScript Build Process` antes de permitir compilação da entrega de PWA Produtivo.
