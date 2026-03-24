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
- **Nome:** Navegação Contextual entre Turnos com Elegibilidade Geográfica e por Cargo
- **Descrição:** Lógica que decide se a troca entre turnos (1º e 2º) é permitida, baseada na elegibilidade geográfica e de cargo definida pelo EA11 da eleição alvo.
- **Fonte de Verdade:** `EA11.abr[]` e `EA11.abr[].cp[]` da eleição alvo (2º turno).
- **Comportamento Lógico:**

  ### T2 → T1: Sempre permitido
  A abrangência geográfica do 2º turno é obrigatoriamente um subconjunto válido do 1º turno. O escopo (UF/Município) e o visualizador são preservados.

  ### T1 → T2: Condições cumulativas
  1. **Existência do turno alvo:** `selectedEleicao.cdt2` deve existir
  2. **Existência da eleição alvo no EA11:** a eleição referenciada por `cdt2` deve constar em `EA11.pl[].e[]`
  3. **Elegibilidade geográfica:**
     - Escopo Brasil (BR): permitido se a eleição alvo existir
     - Escopo UF: a UF deve existir em `targetEleicao.abr[].cd`
     - Escopo Município: o município deve existir em `targetEleicao.abr[].mu[].cd`, ou ser implicitamente coberto em eleições federais/estaduais onde o TSE omite a lista `mu`
  4. **Elegibilidade por cargo (quando aplicável):**
     - Se há cargo selecionado (ex.: no EA20Viewer), esse cargo deve existir em `targetAbr.cp[].cd`
     - Se o cargo não existe no turno alvo, o botão é ocultado
     - Se não há cargo selecionado (Header, EA14, EA15), a verificação de cargo é omitida — o botão segue apenas a regra geográfica
     - Exemplo: Vereador (cd=13) existe no 1T municipal mas não no 2T → botão oculto no EA20Viewer quando Vereador está selecionado

- **Arquitetura de dois níveis:**
  - **Nível global (`ElectionContext`):** `turnoSwitchAllowed` valida apenas geografia. Usado por Header, EA14Viewer, EA15Viewer.
  - **Nível local (`EA20Viewer`):** `ea20TurnoAllowed` valida geografia + cargo via `getTurnoSwitchEligibility()`. Usa o `selectedCargo.cd` local.

- **Proteção defensiva:** `switchTurno()` no `ElectionContext` executa `getTurnoSwitchEligibility()` antes da troca. Se inelegível, bloqueia a troca e registra o motivo no console.

- **Helper retorna motivo estruturado:**
  ```typescript
  getTurnoSwitchEligibility(...) → { allowed: boolean, reason: string }
  ```
  Motivos possíveis: `t2-to-t1`, `no-cdt2`, `target-election-not-found`, `uf-not-in-target`, `municipio-not-in-target`, `cargo-not-in-target-turno`, `eligible`.

- **Localização:** `src/utils/electionUtils.ts` (`getTurnoSwitchEligibility`, `canSwitchTurno`), `src/context/ElectionContext.tsx`, `src/components/EA20Viewer.tsx`.

## Regra 5: Visibilidade e Restrição Legal Geográfica de Filtro (Cargos)
- **Nome:** Filtro Dinâmico Discriminador Territorial Unificado
- **Descrição:** Inibe aparições inviáveis na grade eleitoral central de UI, pautando-se nas leis territoriais:
  - Deputado Distrital (Cargo Num. '8') fixado exclusivamente a Brasília / Distrito Federal.
  - Deputado Estadual (Cargo Num. '7') varrido da listagem do Brasilia/DF e garantido nos demais escopos estaduais nativos.
  - Concatena e dedupera a grade exibitiva da árvore.
- **Localização:** Transfundido nativamente limpo por fora no módulo de Custom Hook Puro: `src/hooks/useAvailableRoles.ts`.

## Regra 6: Status de Definição Matemática (EA20)
- **Nome:** Sinalização de Resultados Matematicamente Garantidos
- **Descrição:** Exibe alertas proeminentes quando o TSE sinaliza que a eleição já está decidida em nível matemático, mesmo antes da totalização de 100% das seções.
- **Fonte de Verdade:** Campo `md` (matematicamente definido) do JSON EA20.
- **Comportamento:**
  - `md === "e" && tf !== "s"`: Exibe "Eleição matematicamente definida (Eleito)".
  - `md === "s" && tf !== "s"`: Exibe "Eleição matematicamente definida (Segundo turno)".
  - Se `tf === "s"` (totalizado), a mensagem é omitida pois o resultado final já é definitivo.
- **Localização:** Cabeçalho do `EA20Viewer.tsx`.

## Regra 7: Eleição sem atribuição de eleitos (EA20)
- **Nome:** Aviso de Ausência de Proclamação de Resultados
- **Descrição:** Notifica o usuário quando a eleição, por motivos legais ou técnicos, não possui atribuição de eleitos no momento da geração do arquivo.
- **Fonte de Verdade:** Campo `esae` ("s") e array de mensagens `mnae` do JSON EA20.
- **Comportamento:**
  - Se `esae === "s"`, exibe um bloco de aviso "Eleição sem atribuição de eleitos".
  - Lista todas as mensagens contidas no array `mnae` para explicar o motivo (ex: "A atribuição dos eleitos será realizada após o julgamento dos recursos").
- **Localização:** Cabeçalho do `EA20Viewer.tsx` (abaixo de status geográficos).

## Adendos Arquiteturais Essenciais da Refatoração
**Não confundir Parsing com Regra de Negócio**
As conversões automáticas pré-computadas baseadas nos sufixos `Num` que percorrem o React inteiramente sob instâncias Float geradas pelas máscaras Brasileiras (Ex.: `parseNum()` do `"13.567"`) **não são regras de contabilidade ou hierarquia TSE**, são simplesmente regras técnicas linguísticas do software agora isoladas firmes nas fronteiras limpas das pastas `adapters/` via TanStack Caching Selectors. Toda regra puramente contábil que a Urna eletrônica faz repousa sem mácula nos `Validators`.

## Regra 8: Deep Link (V1)
- **Nome:** Restauração de Contexto via Parâmetros de URL
- **Fonte de Verdade:** Query parameters: `e` (eleicaoCd), `uf` (ufCd), `m` (munCdTse), `z` (zona).
- **Descrição:** Garante a portabilidade de um cenário de visualização entre usuários.
- **Condições de Validação:**
  - `e` é **obrigatório**. Se ausente, a lógica de entrada é ignorada (não é um deep link).
  - **Inferência de Escopo:** O nível da abrangência é definido pela presença de parâmetros:
    - Somente `e` → Abrangência Brasil (BR).
    - `e` + `uf` → Abrangência UF.
    - `e` + `uf` + `m` → Abrangência Município.
  - **Integridade Hierárquica:** `m` sem `uf` ou `z` sem `m` são considerados **inválidos**.
- **Comportamento de Erro:** Se o link for inválido ou a eleição (`e`) não existir no `EA11` do ambiente receptor, um alerta é exibido e a restauração é abortada. **Não há fallback silencioso** para níveis superiores.
- **Isolamento de Ambiente:** O ambiente/host NÃO é transportado na URL; o link restaura a eleição dentro do ambiente atual do receptor.
- **Localização:** `src/utils/deepLink.ts`, `src/hooks/useDeepLinkRestore.ts`.
