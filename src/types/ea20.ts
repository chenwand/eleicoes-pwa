// EA20 — Arquivo de Resultado Unificado (TSE)

export interface EA20Vice {
  tp: string;       // tipo de vice
  sqcand: string;
  nm: string;
  nmu: string;
  sgp: string;
}

export interface EA20Candidato {
  n: string;          // número na urna
  sqcand: string;     // sequencial candidato (usado para foto)
  nm: string;         // nome completo
  nmu: string;        // nome na urna
  dt: string;         // data nascimento
  dvt: string;        // destinação do voto (ex: "Válido", "Anulado", "Sub-Judice")
  seq: string;        // sequencial na seção
  e: 's' | 'n';      // eleito?
  st: string;         // status (ex: "Eleito", "Não eleito")
  vap: string;        // votos apurados
  pvap: string;       // percentual de votos
  pvapn: string;      // percentual numérico
  vs: EA20Vice[];     // vice(s)
}

export interface EA20Partido {
  n: string;          // número do partido
  sg: string;         // sigla
  nm: string;         // nome
  nfed: string;       // nome federação
  tvtn: string;       // total votos (pós-totalização, não usar p/ validação)
  tvan: string;       // total votos nominais (soma de cand.vap)
  tval: string;       // total votos legenda
  cand: EA20Candidato[];
}

export interface EA20Agrupamento {
  n: string;          // número da coligação
  nm: string;         // nome
  tp: string;         // tipo
  com: string;        // composição (partidos)
  tvtn: string;       // total votos (pós-totalização, não usar p/ validação)
  tvan: string;       // total votos nominais (soma de par.tvan)
  tval: string;       // total votos legenda (soma de par.tval)
  par: EA20Partido[];
}

export interface EA20Cargo {
  cd: string;         // código do cargo
  nmn: string;        // nome neutro
  nmm: string;        // nome masculino
  nmf: string;        // nome feminino
  nv: string;         // nº de vagas
  fed: any[];         // dados federados
  agr: EA20Agrupamento[];
}

export interface EA20Resposta {
  n: string;          // número na urna
  nm: string;         // nome completo
  nmu: string;        // nome na urna
  vap: string;        // votos apurados
  pvap: string;       // percentual de votos
  pvapn: string;      // percentual numérico
  e: 's' | 'n';      // eleito?
  st: string;         // status
}

export interface EA20Pergunta {
  cd: string;         // código da pergunta
  ds: string;         // descrição (pergunta)
  dica: string;       // dica (instrução)
  resp: EA20Resposta[];
}

export interface EA20Secoes {
  ts: string;   // total seções
  st: string;   // seções totalizadas
  pst: string;  // % seções totalizadas
  pstn: string;
  snt: string;  // seções não totalizadas
  si: string;   // seções instaladas
  sni: string;  // seções não instaladas
  sa: string;   // seções apuradas
  sna: string;  // seções não apuradas
}

export interface EA20Eleitores {
  te: string;   // total eleitores
  est: string;  // eleitores em seções totalizadas
  pest: string;
  esnt: string; // eleitores em seções não totalizadas
  c: string;    // comparecimento
  pc: string;   // % comparecimento
  a: string;    // abstenção
  pa: string;   // % abstenção
  esi: string;  // eleitores em seções instaladas
  esni: string; // eleitores em seções não instaladas
  esa: string;  // eleitores em seções apuradas
  esna: string; // eleitores em seções não apuradas
}

export interface EA20Votos {
  tv: string;     // total votos
  vvc: string;    // votos válidos (com brancos)
  pvvc: string;
  vv: string;     // votos válidos nominais + legendas
  pvv: string;
  vnom: string;   // votos nominais
  pvnom: string;
  vl: string;     // votos em legenda
  pvl: string;
  van: string;    // votos anulados
  pvan: string;
  vansj: string;  // votos anulados sub judice
  pvansj: string;
  vb: string;     // votos em branco
  pvb: string;
  tvn: string;    // total votos nulos
  ptvn: string;
  vn: string;     // votos nulos
  pvn: string;
  vnt: string;    // votos nulos técnicos
  pvnt: string;
  vscv: string;   // votos sem candidato válido
}

export interface EA20Response {
  ele: string;
  t: string;
  f: string;
  sup: string;
  tpabr: string;   // "mu" | "zona"
  cdabr: string;   // código município ou zona
  dg: string;
  hg: string;
  dt: string;
  ht: string;
  tf: string;      // totalizado? "s"/"n"
  and: string;     // andamento: "f" | "p"
  md?: string;      // matematicamente definido: "e" (eleito) | "s" (segundo turno)
  dv: string;
  esae: string;
  mnae: string[];
  carg?: EA20Cargo[];
  perg?: EA20Pergunta[];
  s: EA20Secoes;
  e: EA20Eleitores;
  v: EA20Votos;
}
