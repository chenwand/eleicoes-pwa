

export interface MunicipioEA12 {
  cd: string;  // Código TSE do município
  cdi: string; // Código IBGE
  nm: string;  // Nome do município
  c: string;   // 's' = capital, 'n' = não capital
  z: string[]; // Array de strings com as zonas
}

export interface AbrangenciaEA12 {
  cd: string; // Código do estado (UF) ex: 'ac', 'al' ou 'br'
  ds: string; // Descrição (Nome do estado) ex: 'ACRE'
  mu: MunicipioEA12[];
}

export interface EA12Response {
  dg: string; // Data geração
  hg: string; // Hora geração
  f: string;
  abr: AbrangenciaEA12[];
}
