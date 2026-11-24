// Formatação e datas (pt-BR). Datas são guardadas como 'AAAA-MM-DD'.

export const brl = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Para custos unitários pequenos (R$ 0,0035/g)
export const brlU = (v) => {
  const n = Number(v) || 0;
  const casas = Math.abs(n) >= 1 || n === 0 ? 2 : Math.abs(n) >= 0.1 ? 3 : 4;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas });
};

export const dec = (v, casas = 2) =>
  (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const int = (v) => Math.round(Number(v) || 0).toLocaleString('pt-BR');

export const pct = (v, casas = 1) => `${dec((Number(v) || 0) * 100, casas)}%`;

// Aceita "1.234,56", "1234.56", "12,5"
export function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

export const qtd = (v, un) => {
  if (un === 'pc') return `${int(v)} pç`;
  return `${dec(v, Math.abs(v) < 10 ? 2 : 1)} kg`;
};

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const hoje = () => iso(new Date());
export const addDias = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + Number(n || 0));
  return iso(d);
};
export const addMeses = (s, n) => {
  const d = parse(s);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ult));
  return iso(d);
};
export const diffDias = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const mesDe = (s) => String(s).slice(0, 7);
export const inicioMes = (s) => `${mesDe(s)}-01`;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m - 1]} de ${y}`;
};
export const mesCurto = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m - 1].slice(0, 3)}/${String(y).slice(2)}`;
};
export const fmtData = (s) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};
export const fmtDataCurta = (s) => {
  if (!s) return '—';
  const [, m, d] = s.split('-');
  return `${d}/${m}`;
};
export const fmtDataLonga = (s) =>
  parse(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export const relDias = (n) => {
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`;
};
