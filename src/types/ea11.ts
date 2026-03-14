export interface CargoEA11 {
  cd: string;
  ds: string;
  tp: string;
}

export interface MunicipioEA11 {
  cd: string; // Codigo do municipio (ex: 09210)
  cdi: string; // Codigo IBGE (ex: 2111300)
}

export interface AbrangenciaEA11 {
  cd: string; // br, uf (ex: am, pe)
  cp?: CargoEA11[];
  mu?: MunicipioEA11[];
}

export interface EleicaoEA11 {
  cd: string; // Codigo da eleicao
  cdt2?: string; // Codigo do segundo turno, se houver
  sqele: string; // Sequencial da eleicao
  nm: string; // Nome da eleicao
  t: string; // Turno ('1' ou '2')
  tp: string; // Tipo da eleicao (ex: '3' ordinaria, '4' suplementar)
  abr: AbrangenciaEA11[];
}

export interface PleitoEA11 {
  cd: string; // Codigo do pleito
  cdpr: string;
  dt: string; // Data
  dtlim: string; // Data limite
  e: EleicaoEA11[]; // Lista de eleicoes do pleito
}

export interface ArquivoConfigEA11 {
  tp: string; // a, cm, e, cs, ab, u
  dir: string; // Diretorio template (ex: <base>/<ambiente>/<ciclo>/<cd_eleicao>/config)
}

export interface EA11Response {
  dg: string; // Data de geracao
  hg: string; // Hora de geracao
  f: string;
  c: string; // Ciclo (ex: ele2024)
  arq: ArquivoConfigEA11[]; // Arquivos de configuracao
  pl: PleitoEA11[]; // Lista de pleitos
}
