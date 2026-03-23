import type { 
  EA20Response, EA20Cargo, EA20Agrupamento, EA20Partido, 
  EA20Candidato, EA20Pergunta, EA20Resposta, EA20Secoes, EA20Eleitores, EA20Votos 
} from '../../types/ea20';
import { parseNum, parsePct } from '../parsers';

export interface UI_EA20Candidato extends EA20Candidato {
  _vapNum: number;
  _pvapNum: number;
}

export interface UI_EA20Partido extends Omit<EA20Partido, 'cand'> {
  cand: UI_EA20Candidato[];
}

export interface UI_EA20Agrupamento extends Omit<EA20Agrupamento, 'par'> {
  par: UI_EA20Partido[];
}

export interface UI_EA20Cargo extends Omit<EA20Cargo, 'agr'> {
  agr: UI_EA20Agrupamento[];
}

export interface UI_EA20Resposta extends EA20Resposta {
  _vapNum: number;
  _pvapNum: number;
}

export interface UI_EA20Pergunta extends Omit<EA20Pergunta, 'resp'> {
  resp: UI_EA20Resposta[];
}

export interface UI_EA20Secoes extends EA20Secoes {
  _pstNum: number;
}

export interface UI_EA20Eleitores extends EA20Eleitores {
  _pcNum: number;
  _paNum: number;
}

export interface UI_EA20Votos extends EA20Votos {
  _tvNum: number;
  _vvcNum: number;
  _vvNum: number;
  _vnomNum: number;
  _vlNum: number;
  _vbNum: number;
  _vanNum: number;
  _vansjNum: number;
  _tvnNum: number;
  _pvvcNum: number;
  _pvbNum: number;
  _ptvnNum: number;
}

export interface UI_EA20Response extends Omit<EA20Response, 'carg' | 'perg' | 's' | 'e' | 'v'> {
  carg?: UI_EA20Cargo[];
  perg?: UI_EA20Pergunta[];
  s: UI_EA20Secoes;
  e: UI_EA20Eleitores;
  v: UI_EA20Votos;
}

export function adaptEA20Response(data: EA20Response): UI_EA20Response {
  const adaptCandidato = (c: EA20Candidato): UI_EA20Candidato => ({
    ...c,
    _vapNum: parseNum(c.vap),
    _pvapNum: parsePct(c.pvap),
  });

  const adaptPartido = (p: EA20Partido): UI_EA20Partido => ({
    ...p,
    cand: p.cand ? p.cand.map(adaptCandidato) : [],
  });

  const adaptAgrupamento = (a: EA20Agrupamento): UI_EA20Agrupamento => ({
    ...a,
    par: a.par ? a.par.map(adaptPartido) : [],
  });

  const adaptCargo = (c: EA20Cargo): UI_EA20Cargo => ({
    ...c,
    agr: c.agr ? c.agr.map(adaptAgrupamento) : [],
  });

  const adaptResposta = (r: EA20Resposta): UI_EA20Resposta => ({
    ...r,
    _vapNum: parseNum(r.vap),
    _pvapNum: parsePct(r.pvap),
  });

  const adaptPergunta = (p: EA20Pergunta): UI_EA20Pergunta => ({
    ...p,
    resp: p.resp ? p.resp.map(adaptResposta) : [],
  });

  return {
    ...data,
    s: { ...data.s, _pstNum: parsePct(data.s?.pst) },
    e: { ...data.e, _pcNum: parsePct(data.e?.pc), _paNum: parsePct(data.e?.pa) },
    v: { 
      ...data.v, 
      _tvNum: parseNum(data.v?.tv),
      _vvcNum: parseNum(data.v?.vvc),
      _vvNum: parseNum(data.v?.vv),
      _vnomNum: parseNum(data.v?.vnom),
      _vlNum: parseNum(data.v?.vl),
      _vbNum: parseNum(data.v?.vb),
      _vanNum: parseNum(data.v?.van),
      _vansjNum: parseNum(data.v?.vansj),
      _tvnNum: parseNum(data.v?.tvn),
      _pvvcNum: parsePct(data.v?.pvvc),
      _pvbNum: parsePct(data.v?.pvb),
      _ptvnNum: parsePct(data.v?.ptvn),
    },
    carg: data.carg ? data.carg.map(adaptCargo) : undefined,
    perg: data.perg ? data.perg.map(adaptPergunta) : undefined,
  };
}
