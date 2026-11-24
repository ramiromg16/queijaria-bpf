// Componentes de interface: ícones, modal, toast, tabelas, campos e gráficos.
import { esc, brl, fmtData } from './format.js';

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const ICON = {
  painel: svg('<path d="M3 13h8V3H3zM13 21h8v-8h-8zM13 3v6h8V3zM3 21h8v-4H3z"/>'),
  producao: svg('<path d="M4 18c0-5 3.6-9 8-9s8 4 8 9z"/><path d="M4 18h16v2H4z"/><circle cx="9" cy="14" r="1"/><circle cx="14.5" cy="12.5" r="1.2"/>'),
  maturacao: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>'),
  estoque: svg('<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>'),
  vendas: svg('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>'),
  receber: svg('<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 15h4"/>'),
  leite: svg('<path d="M8 2h8M9 2v3l-3 4v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9l-3-4V2"/><path d="M6 13c2-1 4 1 6 0s4-1 6 0"/>'),
  insumos: svg('<path d="M9 3h6v4l4 6v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6l4-6z"/><path d="M5 14h14"/>'),
  despesas: svg('<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
  produtos: svg('<path d="M4 6h16M4 12h16M4 18h10"/>'),
  clientes: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
  relatorios: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  config: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  menu: svg('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
  fechar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  lixo: svg('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  editar: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  imprimir: svg('<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>'),
  whats: svg('<path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c.3 2 2.5 4.3 4.6 4.6l1.3-1.3 2 1-.5 1.7c-3.5.6-8.4-4.3-7.8-7.8L10.3 7l1 2z"/>'),
  baixar: svg('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
  alerta: svg('<path d="M12 3l10 18H2zM12 10v5M12 18v.01"/>'),
  check: svg('<path d="M4 12l5 5L20 6"/>'),
  sair: svg('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>'),
  busca: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  termometro: svg('<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/><path d="M12 10v7"/>'),
  gota: svg('<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>'),
  sal: svg('<path d="M7 10h10l-1 10H8z"/><path d="M8 10V7a4 4 0 0 1 8 0v3M10 14h.01M14 14h.01M12 17h.01"/>'),
  hoje: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 15l2.5 2.5L16 13"/>'),
  folha: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'),
  etiqueta: svg('<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>'),
};

// Pede para a tela atual se redesenhar (após mudar um filtro local).
export const rerender = () => window.dispatchEvent(new Event('rerender'));

// ---------- Modal (bottom-sheet no celular, painel lateral no desktop) ----------
let onFechar = null;
export function abrir(html, { largo = false, aoFechar } = {}) {
  const m = document.getElementById('modal');
  m.querySelector('.sheet').className = `sheet${largo ? ' largo' : ''}`;
  m.querySelector('.sheet').innerHTML = html;
  m.hidden = false;
  document.body.classList.add('com-modal');
  onFechar = aoFechar || null;
  requestAnimationFrame(() => m.classList.add('aberto'));
  const foco = m.querySelector('[autofocus], input:not([type=hidden]), select, textarea');
  if (foco && window.matchMedia('(min-width: 900px)').matches) setTimeout(() => foco.focus(), 60);
  return m.querySelector('.sheet');
}
export function fechar() {
  const m = document.getElementById('modal');
  m.classList.remove('aberto');
  document.body.classList.remove('com-modal');
  setTimeout(() => { m.hidden = true; m.querySelector('.sheet').innerHTML = ''; }, 180);
  const f = onFechar; onFechar = null; f && f();
}
export const cab = (titulo, sub = '') =>
  `<header class="sheet-cab"><div><h2>${esc(titulo)}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button type="button" class="ic" data-fechar aria-label="Fechar">${ICON.fechar}</button></header>`;

// ---------- Toast ----------
export function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.innerHTML = `${tipo === 'erro' ? ICON.alerta : ICON.check}<span>${esc(msg)}</span>`;
  document.getElementById('toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 300); }, 2800);
}

export function confirmar(msg, { ok = 'Confirmar', perigo = false } = {}) {
  return new Promise((res) => {
    const el = document.getElementById('confirm');
    el.innerHTML = `<div class="confirm-box" role="alertdialog"><p>${msg}</p><div class="acoes"><button class="btn" data-r="0">Cancelar</button><button class="btn ${perigo ? 'perigo' : 'pri'}" data-r="1">${esc(ok)}</button></div></div>`;
    el.hidden = false;
    el.onclick = (e) => {
      const b = e.target.closest('[data-r]');
      if (!b && e.target !== el) return;
      el.hidden = true; el.onclick = null;
      res(b?.dataset.r === '1');
    };
  });
}

// ---------- Blocos de página ----------
export const pagina = (titulo, sub, acoes = '', corpo = '') =>
  `<div class="pg-cab"><div><h1>${esc(titulo)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${acoes ? `<div class="pg-acoes">${acoes}</div>` : ''}</div>${corpo}`;

export const kpi = (rotulo, valor, nota = '', tom = '') =>
  `<div class="kpi ${tom}"><span class="kpi-r">${esc(rotulo)}</span><strong>${valor}</strong>${nota ? `<small>${nota}</small>` : ''}</div>`;

export const pill = (txt, tom = '') => `<span class="pill ${tom}">${esc(txt)}</span>`;

export const aviso = (html, tom = '', acao = '') =>
  `<div class="aviso ${tom}">${tom === 'info' ? ICON.check : ICON.alerta}<div>${html}</div>${acao}</div>`;

export const vazio = (titulo, texto, acao = '') =>
  `<div class="vazio"><h3>${esc(titulo)}</h3><p>${texto}</p>${acao}</div>`;

// cols: [{t:'Título', k: fn(row)=>html, cls:'num'}]
export function tabela(cols, linhas, { vazioMsg = 'Nada por aqui ainda.', clique, rodape } = {}) {
  if (!linhas.length) return `<div class="vazio pequeno"><p>${vazioMsg}</p></div>`;
  return `<div class="tab-wrap"><table class="tab"><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${esc(c.t)}</th>`).join('')}</tr></thead><tbody>${linhas
    .map((r) => `<tr${clique ? ` class="clic" ${clique(r)}` : ''}>${cols.map((c) => `<td class="${c.cls || ''}" data-t="${esc(c.t)}">${c.k(r)}</td>`).join('')}</tr>`)
    .join('')}</tbody>${rodape ? `<tfoot><tr>${rodape}</tr></tfoot>` : ''}</table></div>`;
}

export const abas = (itens, ativo, attr = 'data-aba') =>
  `<div class="abas" role="tablist">${itens.map(([k, t, n]) => `<button role="tab" class="${k === ativo ? 'on' : ''}" ${attr}="${k}">${esc(t)}${n != null ? ` <b>${n}</b>` : ''}</button>`).join('')}</div>`;

// ---------- Campos de formulário ----------
export const campo = (rotulo, input, dica = '', cls = '') =>
  `<label class="campo ${cls}"><span>${esc(rotulo)}</span>${input}${dica ? `<em>${dica}</em>` : ''}</label>`;

export const inp = (nome, valor = '', attrs = '') =>
  `<input name="${nome}" value="${esc(valor)}" ${attrs}>`;

export const numInp = (nome, valor = '', attrs = '') =>
  `<input name="${nome}" inputmode="decimal" value="${valor === '' || valor == null ? '' : esc(String(valor).replace('.', ','))}" ${attrs}>`;

export const sel = (nome, opcoes, valor = '', attrs = '') =>
  `<select name="${nome}" ${attrs}>${opcoes.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(valor) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;

export const dados = (form) => Object.fromEntries(new FormData(form).entries());

// Régua de validade: mostra quanto da vida útil do lote já passou.
export function regua(fab, venc, ref, status) {
  const total = Math.max(1, (new Date(venc) - new Date(fab)) / 864e5);
  const passou = Math.min(1, Math.max(0, (new Date(ref) - new Date(fab)) / 864e5 / total));
  return `<div class="regua ${status}" title="Fabricado em ${fmtData(fab)} · vence em ${fmtData(venc)}"><i style="width:${(passou * 100).toFixed(1)}%"></i></div>`;
}

// ---------- Gráficos (Chart.js) ----------
const graficos = new Map();
export function grafico(id, cfg) {
  const el = document.getElementById(id);
  if (!el || !window.Chart) return;
  graficos.get(id)?.destroy();
  const css = getComputedStyle(document.documentElement);
  const cor = (v) => css.getPropertyValue(v).trim();
  window.Chart.defaults.font.family = cor('--f-txt') || 'sans-serif';
  window.Chart.defaults.color = cor('--tinta-2');
  window.Chart.defaults.borderColor = cor('--linha');
  graficos.set(id, new window.Chart(el, cfg));
}
export function limparGraficos() {
  for (const g of graficos.values()) g.destroy();
  graficos.clear();
}
export const cores = () => {
  const css = getComputedStyle(document.documentElement);
  return ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'].map((v) => css.getPropertyValue(v).trim());
};
export const corVar = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export const moedaTick = (v) => brl(v).replace(',00', '');

// ---------- Exportação ----------
export function baixarArquivo(nome, conteudo, tipo = 'text/plain') {
  const blob = new Blob([conteudo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function csv(cabecalho, linhas) {
  const q = (v) => {
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cabecalho, ...linhas].map((l) => l.map(q).join(';')).join('\n');
}

export function imprimir(html, titulo = 'Impressão') {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return toast('Libere pop-ups para imprimir', 'erro');
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Public+Sans:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${new URL('css/print.css', location.href)}"></head><body>${html}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),200))<\/script></body></html>`);
  w.document.close();
}

export const whatsapp = (fone, texto) => {
  const n = String(fone || '').replace(/\D/g, '');
  const num = n ? (n.length <= 11 ? `55${n}` : n) : '';
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`, '_blank');
};
