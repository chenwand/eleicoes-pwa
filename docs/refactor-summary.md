# Resumo do Refatoramento (Fases 3, 4A e 4B)

Este documento consolida o estado real do projeto Eleições PWA após a extensa rodada de refatorações de arquitetura, focando em manutenibilidade, performance e segurança de tipagem.

## 1. Estado Anterior vs Estado Atual

**Antes do Refactor:**
- Validações misturadas aos serviços de requisição e context providers.
- Componentes React mastodônticos (ex: `EA20Viewer` com +1300 linhas) lidando com toda a regra de tela, input, formatação numérica, iteradores de JSX e parse de vírgulas.
- `any` espalhados pelo código mascarando a tipagem de dados do TSE.
- Cálculo e conversões de *strings* de votação `"45,35"` para *floats* feitos continuamente dentro dos loops `map` na camada de View, custando processamento em cada Render.

**Estado Atual (Pós-Refactor):**
- **Extração de Validações:** As validações matemáticas possuem módulos isolados (`*Validator.ts`), minimizando bloqueios de renderização.
- **Componentização:** A UI foi dividida. O EA20 agora consome subcomponentes com responsabilidades mais bem definidas (Container/Presenter).
- **Tipagem Mais Restrita:** Remoção sistemática do tipo explícito `any` dos visualizadores, adotando UI Models que representam a estrutura processada do TSE.
- **UI Data Adapters:** Fluxos de injeção JSON passam por `adapters/` na etapa de cache (`react-query`), fornecendo valores derivados (ex: `_vapNum`, `_pstNum`) para consumo na renderização em vez de delegar essa transformação aos componentes.
- **UI Component Update:** Painéis de acompanhamento (EA14, EA15, EA20) exibem um controle de "Mudar Turno" baseado no contexto da eleição.

---

## 2. Mudanças por Fase

### Fase 3: Desacoplamento do React Context
- Os cálculos e lógicas de negócios complexas saíram intrínsecas do `ElectionContext.tsx`.
- Lógicas auxiliares isoladas em `src/utils/electionUtils.ts` (como `calculateRegionTotals`, deduções de escopo geográfico ao mudar turnos) e validadores.
- O Contexto tornou-se apenas um provedor do estado atual (Estado/Município/Eleição selecionados).

### Fase 4A: Componentização da UI
- Fatiamento do `EA20Viewer` criando a pasta local `src/components/ea20`.
- Criação de subcomponentes voltados à renderização pura, como `SummaryCards.tsx`, `CandidateCards.tsx`, `RespostaCard.tsx` e `VoteVisualization.tsx`.
- Estabilização da build com remoção dos usos de `any` no escopo abordado, avançando em tipagens de props inter-arquivos.

### Fase 4B: Adaptação de Dados e UI Models
- Criação dos Adapters (`ea20Adapters.ts`, `statsAdapters.ts`) que interceptam a porta do Network/Cache (`select` do hook useQuery) garantindo que as strings vindas do TSE sofram parses numéricos (`parseNum`, `parsePct`) e se tornem novas propriedades `_variávelNum` sob demanda.
- Consertado o desperdício computacional em renderização, substituindo lógicas inline complexas por consumo simplificado das propriedades virtuais criadas.
- Aplicado extensivamente para `EA14`, `EA15` e `EA20`.

### Tratamento de Regressões (Validação Contínua)
Durante o processo de refatoração, foram identificadas e estabilizadas as seguintes regressões:
- **Troca de Turno e Perda de Contexto:** Corrigida a lógica de `shouldPreserveScope` que descartava inadvertidamente eleições majoritárias (Estado/DF) ao retornar para o turno 1, mantendo apenas para eleição municipal.
- **Tela Preta no EA14:** Corrigido o `calculateRegionTotals` que tentava acessar objetos desatualizados sem o DTO prefixado em `_stNum`.
- **Arquivos Locais:** Ajustado o componente Header para garantir que o fluxo offline (FileReader) aplique os mesmos Adapters (EA20 e Stats) gerados para a rede.
- **Stale State de Ambiente:** Adicionado limpeza (`clearSelection()`) quando o servidor ou ambiente é alternado dinamicamente, prevenindo condições de corrida de requisições anteriores.
- **Navegação Consistente:** Incluída mudança entre turnos no cabeçalho interno das tabelas (`EA14`, `EA15` e `EA20`).
- **Duplicate React Keys no EA20:** Como solução pragmática à emissão de dados com provável duplicidade pela API oficial, a indexação do array foi acoplada (`sqcand` + `idx`) para inibir perdas no React Virtual DOM.

---

## 3. O Que Foi Preservado

- **Comportamento Funcional Geral:** A aplicação exibe os mesmos dados nas mesmas etapas. A natureza do fluxo offline e online foi respeitada.
- **Regras de Negócio Central:** As regras de negócio estabelecidas nos validadores (cruzamentos matemáticos de abstenções, válidos, brancos e cadeiras) persistem sem alterações nas fórmulas, apenas relocalizadas ou estabilizadas tipicamente.
- **Manutenção Visual:** O layout e a disposição Tailwind permanecem consistentes visualmente com o modelo anterior ao refactor.
- **Endpoints:** `fetchEA11`, `fetchEA14`, `fetchEA15`, e `fetchEA20` mantêm as mesmas URLs. Os modelos JSON originais continuam compondo a base de tipagem estendida na interface.

---

## 4. Arquivos de Documentação Alterados
Foram revisados e inteiramente atualizados:
- `docs/architecture.md`
- `docs/data-flow.md`
- `docs/business-rules.md`
- `docs/module-responsibilities.md`

---

## 5. Débitos Técnicos Restantes e Riscos Residuais

1. **State Injection via Props em Views Dependentes**: O fluxo React ainda confia que variáveis passadas horizontalmente entre modais (ex. `Dashboard -> EA14 -> EA15`) permaneçam sincronizadas, exigindo prop-drilling que pode fragilizar rotas diretas se não consolidado via React Router.
2. **Complexidade de Ordenação (Sorting)**: O motor dinâmico de ordenação continua intenso em CPU para bases densas. A solução virtualizada (`react-window`) ainda é necessária para fluidez máxima em smartphones com alta contagem de candidatos.
3. **Fluxos de Rede vs Local**: O fluxo offline (upload de arquivo local) e o fluxo online agora compartilham os mesmos adapters (EA20Adapters, StatsAdapters). Por englobarem contextos distintos (API constante vs Snapshot pontual), são fontes potenciais de falsos-positivos de UI e exigem testes mais abrangentes em futuras homologações, inclusive no que tange os dados "incompletos" de urnas.
4. **Estratégia de Keys no EA20**: O workaround utilizando o índice do array (`sqcand + idx`) mitiga o warning do React, porém é pragmático. Recomenda-se revisitar isso futuramente como medida preventiva.

---

## 6. Limites da Validação Realizada

- O foco da validação final manual circundou as regressões identificadas na transição 4A/4B (troca de turnos, tela preta em EA14, leitura de dropzone local via FileReader, state locks no ElectionContext).
- A cobertura de testes do comportamento sob cargas anômalas severas no parse textual dependeu fortemente de testes iterativos ad-hoc na UI, por ausência de Jest/Vitest emulados no CI. Limites estritos do JavaScript Float em contagens estratosféricas ainda precisam ser atestados se extrapolados bilhões nas agremiações somadas por loop.

---

## 7. Próximos Passos Recomendados (Não implementados agora)

1. **Virtualização de Listas Longas:** Implementar `react-window` ou similar no `EA15Viewer` e `CandidateCards.tsx` (EA20) para cidades grandes, reduzindo a renderização inicial e evitando lag na busca textual.
2. **Separação de Stores Menores (Zustand):** Substituir as partes voláteis do `ElectionContext` que misturam preferências de UI (Favoritos ou Filtros) do dado real, utilizando mini-stores desacopladas e reduzindo o re-render master global.
3. **Consolidação do Painel de Filtros Avançado:** Extrair o denso bloco de `Filter Pills` do `EA20Viewer` e `EA15Viewer` para um painel independente flexível, com estado desengatado em um custom hook.
4. **PWA Offline Robustness:** Melhorar o caching de arquivos (Service Worker) das flags SVG e assets estáticos para que uma auditoria local sem rede não entregue placeholders quebrados.
