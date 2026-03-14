import type { UF, Region } from '../types/election';

export const regionMapping: Record<UF, Region> = {
  AC: 'norte', AM: 'norte', AP: 'norte', PA: 'norte', RO: 'norte', RR: 'norte', TO: 'norte',
  AL: 'nordeste', BA: 'nordeste', CE: 'nordeste', MA: 'nordeste', PB: 'nordeste', PE: 'nordeste', PI: 'nordeste', RN: 'nordeste', SE: 'nordeste',
  ES: 'sudeste', MG: 'sudeste', RJ: 'sudeste', SP: 'sudeste',
  PR: 'sul', RS: 'sul', SC: 'sul',
  DF: 'centro-oeste', GO: 'centro-oeste', MT: 'centro-oeste', MS: 'centro-oeste',
  BR: 'br' as Region, ZZ: 'exterior'
};

export const regionNames: Record<Region, string> = {
  norte: 'Norte',
  nordeste: 'Nordeste',
  sudeste: 'Sudeste',
  sul: 'Sul',
  'centro-oeste': 'Centro-Oeste',
  exterior: 'Exterior',
  br: 'Brasil'
};

export const regionUFMapping: Record<Region, UF[]> = {
  norte: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
  nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  sudeste: ['ES', 'MG', 'RJ', 'SP'],
  sul: ['PR', 'RS', 'SC'],
  'centro-oeste': ['DF', 'GO', 'MT', 'MS'],
  exterior: ['ZZ'],
  br: []
};

export const allUFs: UF[] = [
  'AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO',
  'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE',
  'ES', 'MG', 'RJ', 'SP',
  'PR', 'RS', 'SC',
  'DF', 'GO', 'MT', 'MS',
  'ZZ'
];

export const brUF: UF = 'BR';
export const exteriorUF: UF = 'ZZ';
