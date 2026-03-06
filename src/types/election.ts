export type Region = 'norte' | 'nordeste' | 'sudeste' | 'sul' | 'centro-oeste' | 'exterior';

export type UF = 
  | 'AC' | 'AM' | 'AP' | 'PA' | 'RO' | 'RR' | 'TO'
  | 'AL' | 'BA' | 'CE' | 'MA' | 'PB' | 'PE' | 'PI' | 'RN' | 'SE'
  | 'ES' | 'MG' | 'RJ' | 'SP'
  | 'PR' | 'RS' | 'SC'
  | 'DF' | 'GO' | 'MT' | 'MS'
  | 'BR' | 'ZZ';

export type Cargo = 
  | 'presidente'
  | 'governador'
  | 'senador'
  | 'deputado-federal'
  | 'deputado-estadual'
  | 'vereador';

export type Turno = 1 | 2;

export type Abrangencia = 'br' | 'uf' | 'mu' | 'zona';

export interface TSEConfig {
  ambiente: 'oficial' | 'teste';
  ciclo: string;
  eleicao: string;
}

export interface Candidate {
  sqcand: number;
  n: number;
  nm: string;
  cc: string;
  nv?: string;
  pvap: number;
  vap: number;
  e: 's' | 'n';
}

export interface Party {
  n: number;
  nm: string;
  sg: string;
}

export interface CargoData {
  cd: number;
  nmn: string;
  nmm: string;
  nmf: string;
  nv: number;
  cand: Candidate[];
}

export interface ElectionData {
  ele: string;
  t: Turno;
  f: 's' | 'o';
  sup: 's' | 'n';
  tpabr: Abrangencia;
  cdabr: string;
  dg: string;
  hg: string;
  dv: 's' | 'n';
  dt: string;
  ht: string;
  tf: 's' | 'n';
  and: 'n' | 'p' | 'f';
  md: 'e' | 's' | 'n';
  esae: 's' | 'n';
  mnae: string[];
  carg: CargoData[];
  st: number;
  s: number;
  v: number;
  vp: number;
  va: number;
  vn: number;
  vbl: number;
  vbr: number;
  vbc: number;
  tvn: number;
}

export interface RegionData {
  region: Region;
  totalVotes: number;
  percentageTotalized: number;
  candidates: {
    candidateId: number;
    name: string;
    party: string;
    votes: number;
    percentage: number;
  }[];
  leaderCandidateId?: number;
}

export interface TimelineDataPoint {
  timestamp: Date;
  candidateId: number;
  candidateName: string;
  votes: number;
  percentage: number;
}

export interface TimelineEntry {
  timestamp: Date;
  totalVotes: number;
  percentageTotalized: number;
  candidates: {
    candidateId: number;
    name: string;
    party: string;
    votes: number;
    percentage: number;
  }[];
}
