export interface EA14Secoes {
  ts: string; // total seções
  st: string; // seções totalizadas
  pst: string; // porcentagem seções totalizadas
  pstn: string; // porcentagem seções totalizadas numérico
  snt: string; // seções não totalizadas
  psnt: string; // porcentagem seções não totalizadas
  psntn: string; // porcentagem seções não totalizadas numérico
  si: string; // seções instaladas
  psi: string; // porcentagem seções instaladas
  psin: string; // porcentagem seções instaladas numérico
  sni: string; // seções não instaladas
  psni: string; // porcentagem seções não instaladas
  psnin: string; // porcentagem seções não instaladas numérico
  sa: string; // seções anuladas
  psa: string; // porcentagem seções anuladas
  psan: string; // porcentagem seções anuladas numérico
  sna: string; // seções não apuradas
  psna: string; // porcentagem seções não apuradas
  psnan: string; // porcentagem seções não apuradas numérico
}

export interface EA14Eleitores {
  te: string; // total eleitores
  est: string; // eleitores seções totalizadas
  pest: string; // porcentagem eleitores seções totalizadas
  pestn: string; // porcentagem eleitores seções totalizadas numérico
  esnt: string; // eleitores seções não totalizadas
  pesnt: string; // porcentagem eleitores seções não totalizadas
  pesntn: string; // porcentagem eleitores seções não totalizadas numérico
  esi: string; // eleitores seções instaladas
  pesi: string; // porcentagem eleitores seções instaladas
  pesin: string; // porcentagem eleitores seções instaladas numérico
  esni: string; // eleitores seções não instaladas
  pesni: string; // porcentagem eleitores seções não instaladas
  pesnin: string; // porcentagem eleitores seções não instaladas numérico
  esa: string; // eleitores seções anuladas
  pesa: string; // porcentagem eleitores seções anuladas
  pesan: string; // porcentagem eleitores seções anuladas numérico
  esna: string; // eleitores seções não apuradas
  pesna: string; // porcentagem eleitores seções não apuradas
  pesnan: string; // porcentagem eleitores seções não apuradas numérico
  c: string; // comparecimento
  pc: string; // porcentagem comparecimento
  pcn: string; // porcentagem comparecimento numérico
  a: string; // abstenção
  pa: string; // porcentagem abstenção
  pan: string; // porcentagem abstenção numérico
}

export interface EA14Abrangencia {
  and: string; // andamento ('f' finalizado, 'p' parcial)
  tpabr: string; // tipo de abrangência ('uf', 'br', 'mu')
  cdabr: string; // código da abrangência
  dt: string; // data
  ht: string; // hora
  munnr: string; // municípios não recebidos
  pmunnr: string; // pct municípios não recebidos
  pmunnrn: string; // pct municípios não recebidos numerico
  munpt: string; // municípios parcialmente totalizados
  pmunpt: string; // pct municípios parcialmente totalizados
  pmunptn: string; // pct municípios partcialmente totalizados numerico
  munf: string; // municípios finalizados
  pmunf: string; // pct minicípios finalizados
  pmunfn: string; // pct municípios finalizados numérico
  s: EA14Secoes;
  e: EA14Eleitores;
}

export interface EA14Response {
  ele: string; // eleição
  t: string; // turno
  f: string; // fase
  dg: string; // data geracao
  hg: string; // hora geracao
  abr: EA14Abrangencia[];
}
