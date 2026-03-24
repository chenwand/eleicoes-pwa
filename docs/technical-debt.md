# Pendências Técnicas e Dívida Técnica

Este documento registra decisões arquiteturais, bugs conhecidos e limitações que foram postergadas ou revertidas para manter a estabilidade do sistema.

## 1. Elegibilidade por Cargo na Troca de Turno (EA20)
- **Data de Registro:** 2026-03-24
- **Descrição:** O botão "Mudar Turno" permite a tentativa de mudar para o 2º turno mesmo quando o cargo sendo visualizado é proporcional (Vereador, Deputados). Isso ocorre porque a regra de visibilidade atual é puramente geográfica e baseada na existência da eleição alvo.
- **Contexto da Decisão:** Uma tentativa de resolver isso sincronizando o cargo selecionado do `EA20Viewer` com o `ElectionContext` (estado global) foi realizada, mas introduziu uma regressão onde o botão sumia em cenários majoritários válidos (ex.: ao carregar a página ou em visualizadores que não informam o cargo precocemente).
- **Impacto:** O usuário pode clicar no botão em um cargo proporcional e cair em uma "tela vazia" ou com erro de carregamento (já que não existem arquivos de 2T para esses cargos). O sistema é recuperável voltando para o 1T ou trocando de cargo.
- **Recomendação de Solução:** Implementar a lógica de restrição de visibilidade do botão de forma **local** dentro dos componentes que possuem conhecimento do cargo (como o próprio `EA20Viewer` ou componentes de cabeçalho específicos), sem tentar elevar o "cargo selecionado" para o estado global da eleição, mantendo o `ElectionContext` focado em regras geográficas e estruturais.

## 2. Restauração de Favoritos Cross-Environment (Header e Dashboard)
- **Data de Registro:** 2026-03-24
- **Descrição:** Ao restaurar um favorito de outro ambiente/host, pode ocorrer uma inconsistência transitória em que o Header não exibe imediatamente a eleição restaurada e/ou o Dashboard não reflete a seleção no mesmo ciclo.
- **Contexto da Decisão:** A troca de ambiente dispara o `clearSelection()` para evitar dados órfãos, e a nova eleição só é aplicada após o refetch do EA11. Embora um fallback visual tenha sido implementado no Header usando `pendingFavorite`, componentes como o Dashboard (que dependem estritamente do `selectedEleicao` do contexto) podem "piscar" ou esconder botões temporariamente até a consolidação final.
- **Impacto:** Experiência visual não-determinística durante a transição de rede. O sistema se estabiliza automaticamente assim que o carregamento termina, e a funcionalidade básica não é afetada.
- **Status:** Não bloqueante, adiado para investigação futura.
