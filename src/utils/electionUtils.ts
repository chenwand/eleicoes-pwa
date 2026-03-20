export const UF_TO_REGION: Record<string, string> = {
  'AC': 'N', 'AM': 'N', 'AP': 'N', 'PA': 'N', 'RO': 'N', 'RR': 'N', 'TO': 'N',
  'AL': 'NE', 'BA': 'NE', 'CE': 'NE', 'MA': 'NE', 'PB': 'NE', 'PE': 'NE', 'PI': 'NE', 'RN': 'NE', 'SE': 'NE',
  'ES': 'SE', 'MG': 'SE', 'RJ': 'SE', 'SP': 'SE',
  'PR': 'S', 'RS': 'S', 'SC': 'S',
  'DF': 'CO', 'GO': 'CO', 'MT': 'CO', 'MS': 'CO'
};

export const REGIONS = [
  { cd: 'BR', nm: 'Brasil', icon: '🇧🇷' },
  { cd: 'N', nm: 'Norte', icon: '🌲' },
  { cd: 'NE', nm: 'Nordeste', icon: '🌵' },
  { cd: 'SE', nm: 'Sudeste', icon: '🏢' },
  { cd: 'S', nm: 'Sul', icon: '❄️' },
  { cd: 'CO', nm: 'Centro-Oeste', icon: '🌾' },
  { cd: 'ZZ', nm: 'Exterior', icon: '🗼' }
];

export function calculateRegionTotals(localData: any, selectedRegion: string) {
  if (!localData?.abr) return null;
  
  if (selectedRegion === 'BR') {
    return localData.abr.find((a: any) => a.cdabr === 'br') || null;
  }

  if (selectedRegion === 'ZZ') {
    return localData.abr.find((a: any) => a.cdabr === 'zz') || null;
  }

  const ufsInRegion = localData.abr.filter((a: any) => 
    UF_TO_REGION[a.cdabr.toUpperCase()] === selectedRegion
  );

  if (ufsInRegion.length === 0) return null;

  const toSortable = (dt: string, ht: string) => {
    if (!dt) return '';
    const [d, m, y] = dt.split('/');
    return `${y}/${m}/${d} ${ht || ''}`;
  };

  const sortedByDate = [...ufsInRegion].sort((a, b) => {
    const tsA = toSortable(a.dt, a.ht);
    const tsB = toSortable(b.dt, b.ht);
    return tsB.localeCompare(tsA);
  });

  const sum = {
    cdabr: selectedRegion.toLowerCase(),
    tpabr: 'regiao',
    and: ufsInRegion.every((a: any) => a.and === 'f') ? 'f' : 'p',
    dt: sortedByDate[0].dt,
    ht: sortedByDate[0].ht,
    s: {
      ts: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.s.ts) || 0), 0).toString(),
      st: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.s.st) || 0), 0).toString(),
      pst: '', 
      snt: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.s.snt) || 0), 0).toString(),
      si: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.s.si) || 0), 0).toString(),
    },
    e: {
      te: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.e.te) || 0), 0).toString(),
      c: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.e.c) || 0), 0).toString(),
      pc: '', 
      a: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.e.a) || 0), 0).toString(),
      pa: '', 
    },
    munf: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.munf) || 0), 0).toString(),
    munpt: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.munpt) || 0), 0).toString(),
    munnr: ufsInRegion.reduce((acc: number, a: any) => acc + (parseInt(a.munnr) || 0), 0).toString(),
  };

  const safePct = (val: number, total: number) => 
    total > 0 ? ((val / total) * 100).toFixed(2).replace('.', ',') : '0,00';

  sum.s.pst = safePct(parseInt(sum.s.st), parseInt(sum.s.ts));
  sum.e.pc = safePct(parseInt(sum.e.c), parseInt(sum.e.te));
  sum.e.pa = safePct(parseInt(sum.e.a), parseInt(sum.e.te));

  return sum;
}
