# Regras de Negócio do Projeto Eleições PWA

Este documento documenta precisamente todas as lógicas essenciais enraizadas na base após o encerramento do refatoramento unificado (Fases 3 e 4B).

## Regra 1: Validação de Totais Globais Contábeis (Seções Nacionais / Estaduias)
- **Nome:** Consistência Central de Urnas e Eleitores (EA14/EA20/EA15)
- **Descrição:** O total absoluto matemático sempre exige prova real: totalização deve somar seções não processadas e consolidadas puramente; o comparecimento cruzado com abstenções crava o teto de eleitorado estrito na seção da urna lida.
- **Localização:** Módulos autônomos puros `src/services/*Validator.ts`.
- **Condição e Comutação:** Se qualquer cálculo de Floats estritos diverge, é reportado no array passivo. O sistema NUNCA impede o funcionamento ou bloqueia exibições nos Viewers ao falhar.

## Regra 2: Decomposição de Válidos e Contenciosos Eleitorais (EA20)
- **Nome:** Decomposição dos Votos Válidos, Residuais e Sub-judice
- **Descrição:** Requer a quebra estrita da lei do voto depositado, espelhando os relatórios da apuração oficial.
  - Votos Válidos Concorrentes equivalem puramente à base para cadeiras ou contagem majoritária nominal.
  - Demais brancos e marginais da eleição somam as sobras e completam a caixa geral `tv`.
- **Exceção de Escopo:** Em Plebiscitos / Consultas Populares (identificados se existir `.perg` / Perguntas em EA20) as regras lógicas de Nomes e Legendas caem e são bypassadas completamente das auditoras.
- **Localização:** Exclusivo a `services/ea20Validator.ts`.

## Regra 3: Consistência Hierárquica Partidária (Coligações EA20)
- **Nome:** Asserção Ascendente por Cadeia Partidária
- **Descrição:** O total do teto da chave "Agrupamento / Coligação" (`tval / tvan`) é forçado matematicamente à soma descendente das bases agremiações. Subsequentemente, valida se o `vap` nominal individual de todos vereadores ou deputados formam corretamente o valor de agrupamento partidário. Exceções concedem atalhos à partido neutro se a Federação vier silenciada de totalizador.
- **Prioridade:** Regra vital na Auditoria Forense transparente visual, engatilhando tarjas vermelhas proeminentes na UI se falharem os pacotes Json injetados locais pelas mesas apuradoras.

## Regra 4: Retenção de Escopo em Troca Semântica de Tempo (Turnos)
- **Nome:** Navegação Contextual entre Turnos Geográficos
- **Descrição:** Lógica de negócio orgânica na matriz de Estado do código que decide se uma coordenada geográfica sobrevive ao salto dimensional entre turnos de uma mesma eleição oficial. 
- **Comportamento Lógico:**
  - Descobre-se quem é a eleição simétrica pelo hook indireto comparando as props `cdt2` (ID cruzado).
  - Executa-se `shouldPreserveScope`: Checa abertamente o Catálogo Central (EA12 UF) garantindo impiedosamente e de forma coesa se o Município selecionado ou Cargo (como Estado Majoritário) está elegível nos remanescentes daquela disputa temporal T2. Retém, caso afirmativo. Reseta caso inexistente, impedindo requisições HTTPs HTTP 404s ou telas brancas fantasma para o cache do React Query.
- **Localização:** `src/context/ElectionContext.tsx` e utilitários `utils/electionUtils.ts`.

## Regra 5: Visibilidade e Restrição Legal Geográfica de Filtro (Cargos)
- **Nome:** Filtro Dinâmico Discriminador Territorial Unificado
- **Descrição:** Inibe aparições inviáveis na grade eleitoral central de UI, pautando-se nas leis territoriais:
  - Deputado Distrital (Cargo Num. '8') fixado exclusivamente a Brasília / Distrito Federal.
  - Deputado Estadual (Cargo Num. '7') varrido da listagem do Brasilia/DF e garantido nos demais escopos estaduais nativos.
  - Concatena e dedupera a grade exibitiva da árvore.
- **Localização:** Transfundido nativamente limpo por fora no módulo de Custom Hook Puro: `src/hooks/useAvailableRoles.ts`.

## Adendos Arquiteturais Essenciais da Refatoração
**Não confundir Parsing com Regra de Negócio**
As conversões automáticas pré-computadas baseadas nos sufixos `Num` que percorrem o React inteiramente sob instâncias Float geradas pelas máscaras Brasileiras (Ex.: `parseNum()` do `"13.567"`) **não são regras de contabilidade ou hierarquia TSE**, são simplesmente regras técnicas linguísticas do software agora isoladas firmes nas fronteiras limpas das pastas `adapters/` via TanStack Caching Selectors. Toda regra puramente contábil que a Urna eletrônica faz repousa sem mácula nos `Validators`.
