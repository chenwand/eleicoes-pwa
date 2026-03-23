import { parseNum, parsePct } from '../parsers';
import type { EA14Response, EA14Abrangencia, EA14Secoes, EA14Eleitores } from '../../types/ea14';

export interface UI_EA14Secoes extends EA14Secoes {
  _pstNum: number;
  _stNum: number;
  _tsNum: number;
}

export interface UI_EA14Eleitores extends EA14Eleitores {
  _teNum: number;
  _cNum: number;
  _aNum: number;
  _pcNum: number;
  _paNum: number;
}

export interface UI_EA14Abrangencia extends Omit<EA14Abrangencia, 's' | 'e'> {
  s: UI_EA14Secoes;
  e: UI_EA14Eleitores;
  _munfNum: number;
  _munptNum: number;
  _munnrNum: number;
}

export interface UI_EA14Response extends Omit<EA14Response, 'abr'> {
  abr: UI_EA14Abrangencia[];
}

export function adaptStatsResponse(data: any): UI_EA14Response | any {
  if (!data || !data.abr) return data;

  const adaptAbrangencia = (a: any): UI_EA14Abrangencia => ({
    ...a,
    s: {
      ...a.s,
      _pstNum: parsePct(a.s?.pst),
      _stNum: parseNum(a.s?.st),
      _tsNum: parseNum(a.s?.ts),
    },
    e: {
      ...a.e,
      _teNum: parseNum(a.e?.te),
      _cNum: parseNum(a.e?.c),
      _aNum: parseNum(a.e?.a),
      _pcNum: parsePct(a.e?.pc),
      _paNum: parsePct(a.e?.pa),
    },
    _munfNum: parseNum(a.munf),
    _munptNum: parseNum(a.munpt),
    _munnrNum: parseNum(a.munnr),
  });

  return {
    ...data,
    abr: data.abr ? data.abr.map(adaptAbrangencia) : [],
  };
}
