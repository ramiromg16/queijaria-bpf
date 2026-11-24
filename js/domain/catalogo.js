// Catálogo de todas as planilhas do app, na ordem do fichário (PAC, depois número da PL).
import { PLANILHAS, PL, resumoMes } from './planilhas.js';
import { CHECKLISTS, CK, resumoCk, problemasCk } from './checklists.js';
import { EVENTOS, EV, resumoEv } from './eventos.js';

const ordem = (p) => p.ordem || `${p.pac}-${p.codigo.slice(3, 5)}`;

export const TODAS = [
  ...PLANILHAS.map((p) => ({ ...p, tipo: 'pl' })),
  ...CHECKLISTS.map((m) => ({ ...m, tipo: 'ck', tela: 'checklists' })),
  ...EVENTOS.map((e) => ({ ...e, tipo: 'ev' })),
].sort((a, b) => (ordem(a) < ordem(b) ? -1 : 1));

export const porId = (id) => TODAS.find((p) => p.id === id);

export function resumo(id, ym) {
  if (EV(id)) return resumoEv(EV(id), ym);
  const ck = CK(id);
  return ck ? resumoCk(ck, ym) : resumoMes(PL(id), ym);
}

export function problemas(id, reg) {
  if (EV(id)) return EV(id).problemas(reg);
  const ck = CK(id);
  return ck ? problemasCk(ck, reg) : PL(id).problemas(reg);
}
