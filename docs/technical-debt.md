# Pendências Técnicas e Dívida Técnica

Este documento registra decisões arquiteturais, bugs conhecidos e limitações que foram postergadas ou revertidas para manter a estabilidade do sistema.

## 1. Elegibilidade por Cargo na Troca de Turno (EA20)
- **Data de Registro:** 2026-03-24
- **Impacto:** O usuário poderia clicar no botão em um cargo proporcional e cair em uma "tela vazia".
- **Status:** **RESOLVIDO (2026-03-27)** - Implementada lógica local via `getTurnoSwitchEligibility()` no `EA20Viewer` e `ElectionContext`, conforme recomendação.

## 2. Restauração de Favoritos Cross-Environment (Header e Dashboard)
- **Data de Registro:** 2026-03-24
- **Descrição:** Ao restaurar um favorito de outro ambiente/host, pode ocorrer uma inconsistência transitória em que o Header não exibe imediatamente a eleição restaurada e/ou o Dashboard não reflete a seleção no mesmo ciclo.
- **Contexto da Decisão:** A troca de ambiente dispara o `clearSelection()` para evitar dados órfãos, e a nova eleição só é aplicada após o refetch do EA11. Embora um fallback visual tenha sido implementado no Header usando `pendingFavorite`, componentes como o Dashboard (que dependem estritamente do `selectedEleicao` do contexto) podem "piscar" ou esconder botões temporariamente até a consolidação final.
- **Impacto:** Experiência visual não-determinística durante a transição de rede. O sistema se estabiliza automaticamente assim que o carregamento termina, e a funcionalidade básica não é afetada.
- **Status:** Não bloqueante, adiado para investigação futura.
