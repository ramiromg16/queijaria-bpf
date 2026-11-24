// Motor dos checklists: itens, respostas, NC, períodos (dia/semana/mês) e pendências.
// Registro (coleção bpf_registros):
//   { modeloId, data, hora, respostas: [{ item, texto, r: { coluna: 'C'|'NC'|'SIM'|'NÃO' }, descricaoNC, acaoCorretiva }],
//     valores: { ingrediente, fornecedor, lote, validade, obs }, responsavel, editadoEm, editadoPor, historico }
import { S } from '../core/store.js';
import { hoje, mesDe } from '../core/format.js';
import { CHECKLISTS, CK, LISTAS_PADRAO } from './modelos.js';
import { diasDoMes } from './planilhas.js';

export const lista = (nome) => {
  const l = S.config[nome];
  return Array.isArray(l) && l.length ? l : LISTAS_PADRAO[nome];
};

// Itens atuais do modelo (os de Configurações viram itens com o próprio nome como id).
export function itensDe(m) {
  if (m.itensConfig) return lista(m.itensConfig).map((nome) => ({ id: nome, t: nome }));
  return m.itens;
}

export const tipoDe = (item, col) => item.tipo || col.tipo || 'cnc';
export const esperadoDe = (item, col) => item.esperado || col.esperado || (tipoDe(item, col) === 'simnao' ? 'SIM' : 'C');
export const opcoes = (item, col) => (tipoDe(item, col) === 'simnao' ? ['SIM', 'NÃO'] : ['C', 'NC']);

const itemDaResposta = (m, resp) => itensDe(m).find((i) => i.id === resp.item) || (m.itens || []).find((i) => i.id === resp.item) || { id: resp.item, t: resp.texto };

// Colunas em que a resposta é diferente do esperado.
export function colunasNC(m, resp) {
  const item = itemDaResposta(m, resp);
  return m.colunas.filter((c) => resp.r?.[c.id] && resp.r[c.id] !== esperadoDe(item, c));
}

export const respostasNC = (m, reg) => (reg.respostas || []).filter((r) => colunasNC(m, r).length);

export function problemasCk(m, reg) {
  return respostasNC(m, reg).map((r) => {
    const cols = colunasNC(m, r);
    const qual = m.colunas.length > 1 ? ` (${cols.map((c) => c.t.toLowerCase()).join(', ')})` : '';
    return `${m.layout === 'lista' && !m.itensConfig ? `Item ${r.item}: ` : ''}${r.texto}${qual}`;
  });
}

// ---------- Períodos ----------
// Semanas do mês: 1–7, 8–14, 15–21 e 22 até o fim (sempre 4 semanas, para caber no papel).
export function semanas(ym) {
  const dias = diasDoMes(ym);
  return [[0, 7], [7, 14], [14, 21], [21, dias.length]].map(([a, b], i) => ({ n: i + 1, ini: dias[a], fim: dias[b - 1] }));
}
export const semanaDe = (data) => semanas(mesDe(data)).find((s) => data >= s.ini && data <= s.fim);

export function periodos(m, ym) {
  if (m.freq === 'dia') return diasDoMes(ym).map((d) => ({ ini: d, fim: d, rotulo: d.slice(8) }));
  if (m.freq === 'semana') return semanas(ym).map((s) => ({ ini: s.ini, fim: s.fim, rotulo: `Semana ${s.n}` }));
  if (m.freq === 'mes') { const d = diasDoMes(ym); return [{ ini: d[0], fim: d[d.length - 1], rotulo: 'Mês' }]; }
  return [];
}

export const registrosCk = (id, ini, fim) => S.bpf_registros
  .filter((r) => r.modeloId === id && r.data >= ini && r.data <= fim)
  .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : (a.criado || 0) - (b.criado || 0)));

export function periodoAtual(m, data = hoje()) {
  if (m.freq === 'dia') return { ini: data, fim: data };
  if (m.freq === 'semana') return semanaDe(data);
  if (m.freq === 'mes') { const d = diasDoMes(mesDe(data)); return { ini: d[0], fim: d[d.length - 1] }; }
  return null;
}

// Registro do período (para abrir como correção em vez de criar outro).
export function registroDoPeriodo(m, data = hoje()) {
  const p = periodoAtual(m, data);
  if (!p) return null;
  return registrosCk(m.id, p.ini, p.fim)[0] || null;
}

export const pendente = (m, data = hoje()) => m.freq !== 'evento' && !registroDoPeriodo(m, data);

export function resumoCk(m, ym) {
  const h = hoje();
  const d = diasDoMes(ym);
  const regs = registrosCk(m.id, d[0], d[d.length - 1]);
  // Semana/mês em andamento só entra na conta depois que terminar (ou se já foi preenchido).
  const ps = periodos(m, ym).filter((p) => p.ini <= h && (m.freq === 'dia' || p.fim < h || registrosCk(m.id, p.ini, p.fim).length));
  const faltando = ps.filter((p) => !registrosCk(m.id, p.ini, p.fim).length);
  return {
    dias: m.freq === 'evento' ? regs.length : ps.length,
    preenchidos: m.freq === 'evento' ? regs.length : ps.length - faltando.length,
    faltando: faltando.map((p) => p.ini),
    faltandoRotulos: faltando.map((p) => p.rotulo),
    nc: regs.filter((r) => respostasNC(m, r).length).length,
    evento: m.freq === 'evento',
  };
}

export { CHECKLISTS, CK };
