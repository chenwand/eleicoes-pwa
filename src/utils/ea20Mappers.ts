/**
 * Mapeia o status do candidato retornado pelo TSE para um valor padronizado
 */
export function mapEA20Status(st: string): 'eleito' | 'nao-eleito' {
  const s = st.toLowerCase();
  if (s.includes('eleito') || s.includes('média')) return 'eleito';
  return 'nao-eleito';
}

/**
 * Mapeia a destinação do voto retornado pelo TSE para um valor padronizado
 */
export function mapEA20Destinacao(dvt: string): 'valido' | 'anulado' | 'sub-judice' {
  const d = dvt.toLowerCase();
  if (d.includes('sub judice')) return 'sub-judice';
  if (d.includes('anulado')) return 'anulado';
  return 'valido';
}
