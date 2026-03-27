# Quadro Nacional (Consolidado de UFs)

## 1. Objetivo
Dashboard consolidado para monitoramento da apuração em tempo real de todas as unidades federativas (UFs) participantes, permitindo uma visão macro (Brasil) e micro (UF) em uma única interface.

---

## 2. Escopo e Evolução (Finalizado)
O projeto foi implementado seguindo uma abordagem incremental de 4 fases principais:
- **Fase 1 (Núcleo)**: Implementação do hook `useQueries` para fetch paralelo de 28 arquivos (BR + 27 UFs) e grid básica.
- **Fase 2 (Sinalização)**: Mapeamento de status (`md` - matemático, `tf` - totalizado, `esae`) e cálculo de `leadDiff`.
- **Fase 3 (Agregação)**: Resumo Nacional e Regional com vitórias por estado (Apenas para cargo de Presidente).
- **Fase 4 (Polish & UX)**: Skeletons, animações, descoberta dinâmica via EA12, navegação bidirecional e sincronização manual.

### Restrição de Cargo
- **Majoritário Apenas**: O monitoramento é restrito aos cargos **Presidente (1)**, **Governador (3)** e **Senador (5)**.
- **Fallback Automático**: O sistema prioriza Presidente em eleições nacionais e Governador em estaduais. Caso o cargo selecionado anteriormente se torne inválido (ex: mudar de Federal para Estadual), o sistema refaz a validação e seleciona o melhor disponível.

---

## 3. Modelo de Dados

### UFSummary
```typescript
interface UFSummary {
  cd: string;           // Sigla da UF (ex: 'SP', 'ZZ', 'BR')
  nm: string;           // Nome amigável
  pstNum: number;       // % de seções totalizadas (Ex: 98,45) -> UI: "Totalizado"
  tf: boolean;          // Totalização final (Sim/Não)
  md: 'e' | 's' | null;  // Matematicamente Definido (Eleito/2º Turno)
  esae: boolean;        // Eleição sem atribuição de eleitos
  top2: CandidateSummary[];
  leadDiff?: number;     // Diferença de % entre o 1º e 2º colocado
  error?: boolean;      // Flag de falha no carregamento individual
}
```

### CandidateSummary
```typescript
interface CandidateSummary {
  id: string;           // Identificador SQCAND
  nm: string;           // Nome do candidato (display)
  v: number;            // Votos nominais totais
  pvap: number;         // % de votos válidos
  st: string;           // Status normalizado (eleito, segundo turno, etc.)
}
```

---

## 4. Regras de Apresentação e UI

### Indicadores de Status (Bolinhas)
Cada card de UF na grid e no Resumo Nacional possui um "ping dot" que indica o estágio da apuração:
- **Laranja (`bg-orange-600`)**: ESAE (**Eleição sem atribuição de eleitos**). Prioridade máxima (exibido mesmo se `tf=s`).
- **Roxo (`bg-indigo-600`)**: MD (**Matematicamente Definido**). Indica que o resultado não pode mais ser alterado.
- **Verde (`bg-green-600`)**: **Finalizado** (`tf=s`). Apuração concluída e totalizada.
- **Amarelo (`bg-amber-500`)**: **Em Andamento**. Estado padrão durante o processamento.

### Terminologia "Totalizado"
- **Regra de Negócio**: O rótulo padrão "Apurado" foi globalmente substituído por **"Totalizado"** nos cards de UF e resumos, alinhando-se à terminologia oficial de conclusão de processamento do TSE.

### Editor de JSON Consolidado (Simulação)
- **Objetivo**: Permitir a edição manual do estado consolidado (`UFSummary[]`) para testes de layout e simulações de vitória nacional.
- **Comportamento**:
  - Ao salvar mudanças, o sistema entra em **Modo Simulação**.
  - Exibe badges de "SIMULANDO" e "DADOS EDITADOS LOCALMENTE" para evitar confusão com dados reais.
  - O botão "Refresh" limpa o cache local e volta para os dados oficiais.
- **Sintaxe**: O editor utiliza realce de sintaxe em tempo real com regras específicas para chaves, strings e booleanos brasileiros.

### Badges e Indicadores Visuais
- **Liderança**: O candidato em 1º lugar recebe destaque visual (`bg-blue-50/50`) e sua percentagem é realçada. Logo abaixo, são exibidas as **bandeiras das UFs** onde ele está liderando, acompanhadas do percentual de votos em cada uma.
- **Definição Matemática**: O badge "Definido" (vindo do campo `md`) só é exibido se o valor for `s` ou `e` e a totalização ainda não estiver completa (`tf !== true`).
- **Skeletons**: Cada card da grid possui seu próprio estado de loading, permitindo carregamento progressivo assíncrono.

### Ocultação e Agregação de Resumos
- **Indicadores Regionais**: Ocultados automaticamente quando o cargo é **Estadual** (Governador/Senador) ou quando não há dados para processar (Eleição sem participação em certas regiões).
- **Exterior (ZZ)**: Os votos do exterior são incluídos na contagem de vitórias do **Resumo Nacional** quando o cargo é Presidente.

### Animações e Comportamento do Modal
- **Painel Lateral**: Desliza da direita para a esquerda com `z-index: 100` e largura de `90vw/95vw`.
- **Backdrop**: Fundo `backdrop-blur-sm` com `z-index: 90`, permitindo fechar ao clicar fora.
- **Transição de Saída**: Implementação de `pointer-events-none` via estado `isClosing` para evitar clicks fantasmas durante o fechamento.

---

## 5. Arquitetura de Rede e Sincronização

### Descoberta Dinâmica via EA12
1. **Eleição Nacional**: Se a abrangência `br` for detectada no EA11, o sistema baixa o **EA12** para identificar as UFs que realmente possuem participação naquela eleição.
2. **Exterior (ZZ)**: Incluído obrigatoriamente para o cargo de **Presidente (1)**. Seus votos são agregados no Resumo Nacional de vitórias por UF.
3. **Arquivo BR**: Solicitado exclusivamente para o cargo de **Presidente (1)** para evitar erros 404 em cargos estaduais.

### Controle de Refresh
- **Manual-First**: Polling automático desativado (`staleTime: Infinity`).
- **Trigger**: Sincronização ocorre apenas em:
  - Abertura do Modal.
  - Troca de Cargo no seletor interno.
  - Clicar no botão **Refresh** (rotação) no cabeçalho.

---

## 6. Fluxo de Navegação Contextual
1. **Acesso**: Botão posicionado no **Dashboard principal**, logo após o botão do painel EA20.
2. **Imersão Subitânea**: Clique em card de UF -> Seta `selectedAbrangencia` -> Dispara evento `open-ea20` -> Transição suave para o EA20 Dashboard.
3. **Back-stack**: O `fromNationalBoard: true` é passado no evento. Se presente, o botão "Voltar" do EA20 Dashboard reabre o Quadro Nacional em vez de ir para a Home.

---

## 7. Decisões Técnicas e Histórico de Bugs
- **Bug de Transição (Federal/Estadual)**: Resolvido resetando o `selectedCargoCd` no `useEffect` de dependência em `selectedEleicao.cd` e validando o cargo no hook `useNationalBoard`.
- **Bug 00000**: Arquivos em nível UF-wide devem usar o código de município `00000` na URL (ex: `.../dados/sp/sp-c0003-e00000-u.json`).
- **Case Sensitivity**: Prefixos de UF na URL devem ser sempre minúsculos (`rj-...`), enquanto códigos de UF no sistema são maiúsculos (`RJ`).
- **Z-Index Conflict**: Resolvido orquestrando o estado `isOpen` global e local para gerenciar o ciclo de vida das animações de entrada/saída.