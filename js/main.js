import * as store from './core/store.js';
import { S } from './core/store.js';
import { ICON, abrir, fechar, toast } from './core/ui.js';
import { esc, hoje } from './core/format.js';
import { configInicial, produtosIniciais } from './domain/padrao.js';

import hoje_, { pendenciasHoje } from './views/hoje.js';
import fabricacao, { semFabricacao } from './views/fabricacao.js';
import medicoes from './views/medicoes.js';
import checklists from './views/checklists.js';
import expedicao from './views/expedicao.js';
import ocorrencias from './views/ocorrencias.js';
import agenda from './views/agenda.js';
import colaboradores from './views/colaboradores.js';
import imprimir from './views/imprimir.js';
import configuracoes, { aplicarTema } from './views/configuracoes.js';

const VIEWS = { hoje: hoje_, fabricacao, medicoes, checklists, expedicao, ocorrencias, agenda, colaboradores, imprimir, configuracoes };

const NAV = [
  ['Dia a dia', [['hoje', 'Hoje'], ['fabricacao', 'Fabricação do dia'], ['medicoes', 'Medições rápidas'], ['checklists', 'Checklists'], ['expedicao', 'Expedição'], ['ocorrencias', 'Ocorrências']]],
  ['Periódicos', [['agenda', 'Agenda e laudos'], ['colaboradores', 'Colaboradores']]],
  ['Fim do mês', [['imprimir', 'Imprimir mês']]],
  ['Ajustes', [['configuracoes', 'Configurações']]],
];
const ICONE = { hoje: 'hoje', fabricacao: 'producao', medicoes: 'termometro', checklists: 'check', expedicao: 'estoque', ocorrencias: 'alerta', agenda: 'maturacao', colaboradores: 'clientes', imprimir: 'imprimir', configuracoes: 'config' };
const BARRA = [['hoje', 'Hoje'], ['fabricacao', 'Fabricação'], ['', ''], ['medicoes', 'Medições'], ['mais', 'Mais']];

// Ações rápidas do botão "Lançar"
export const LANCAR = [
  ['producao', 'Fabricação do dia', 'Leite, temperaturas, formulação e produtos', () => fabricacao.novo(undefined, { data: hoje() })],
  ['gota', 'Água', 'PL 03/01 · cloro, pH, cor e odor', () => medicoes.novo('PL-03-01', hoje())],
  ['termometro', 'Sala de maturação', 'PL 02/06 · temperatura e umidade', () => medicoes.novo('PL-02-06', hoje())],
  ['sal', 'Salmoura', 'PL 03/09 · volume, temperatura e correções', () => medicoes.novo('PL-03-09', hoje())],
  ['check', 'Checklist', 'Higienização, instalações, pragas, recebimento…', () => ir('checklists')],
  ['estoque', 'Expedição', 'PL 01/11 · produto, lote, kg e destino', () => expedicao.novo()],
  ['alerta', 'Ocorrência', 'Praga, devolução/recolhimento ou não conformidade', () => ir('ocorrencias')],
  ['hoje', 'Não houve fabricação', 'Marcar o dia de hoje sem fabricação', () => semFabricacao(hoje())],
];

let rota = { tela: 'hoje', arg: '' };

function lerRota() {
  const [tela, arg = ''] = (location.hash.replace(/^#\/?/, '') || 'hoje').split('/');
  rota = { tela: VIEWS[tela] ? tela : 'hoje', arg: decodeURIComponent(arg) };
}

export function ir(tela, arg = '') {
  const h = `#/${tela}${arg ? `/${encodeURIComponent(arg)}` : ''}`;
  if (location.hash === h) render(); else location.hash = h;
}

function renderNav() {
  const pend = pendenciasHoje().length;
  const cont = { hoje: pend };
  document.getElementById('nav-lateral').innerHTML = NAV.map(([g, itens]) => `<div class="nav-grupo"><span>${g}</span>${itens
    .map(([k, t]) => `<a class="nav-item${rota.tela === k ? ' on' : ''}" href="#/${k}">${ICON[ICONE[k]]}<span>${t}</span>${cont[k] ? `<b>${cont[k]}</b>` : ''}</a>`).join('')}</div>`).join('');
  document.getElementById('barra').innerHTML = BARRA.map(([k, t]) => {
    if (!k) return '<button tabindex="-1" aria-hidden="true"></button>';
    const on = k === rota.tela || (k === 'mais' && !BARRA.some(([b]) => b === rota.tela));
    return `<button class="${on ? 'on' : ''}" ${k === 'mais' ? 'data-acao="menu-mais"' : `data-ir="${k}"`}>${ICON[k === 'mais' ? 'menu' : ICONE[k]]}<span>${t}</span></button>`;
  }).join('');
  const nome = esc(S.config.nome || 'Queijaria');
  document.getElementById('nome-queijaria').innerHTML = nome;
  document.getElementById('nome-queijaria-m').innerHTML = nome;
  const nuvem = store.modo() === 'nuvem';
  const online = navigator.onLine;
  document.getElementById('lateral-pe').innerHTML = `<span class="modo ${nuvem ? 'nuvem' : ''}">${nuvem ? (online ? 'Sincronizado na nuvem' : 'Sem internet: salvando no aparelho') : S.config.demo ? 'Demonstração: dados de exemplo' : 'Dados neste aparelho'}</span>${nuvem ? `<button data-acao="sair">${ICON.sair} Sair</button>` : ''}`;
}

function render() {
  lerRota();
  const v = VIEWS[rota.tela];
  const main = document.getElementById('main');
  const y = window.scrollY;
  const el = document.createElement('div');
  el.className = 'view';
  el.innerHTML = v.render(rota.arg);
  main.replaceChildren(el);
  v.mount?.(el, rota.arg);
  renderNav();
  window.scrollTo(0, y);
  document.title = `${NAV.flatMap((g) => g[1]).find(([k]) => k === rota.tela)?.[1] || 'Hoje'} · ${S.config.nome || 'Queijaria Boas Práticas'}`;
}

let ultimaTela = '';
function aoMudarRota() {
  render();
  if (ultimaTela !== rota.tela) { window.scrollTo(0, 0); ultimaTela = rota.tela; }
}

function menuLancar() {
  abrir(`<header class="sheet-cab"><div><h2>O que você quer lançar?</h2></div><button class="ic" data-fechar aria-label="Fechar">${ICON.fechar}</button></header>
    <div class="lancar-grade">${LANCAR.map(([ic, t, d], i) => `<button data-lancar="${i}">${ICON[ic]}<strong>${t}</strong><small>${d}</small></button>`).join('')}</div>`);
}

function menuMais() {
  const itens = NAV.flatMap((g) => g[1]).filter(([k]) => !BARRA.some(([b]) => b === k));
  abrir(`<header class="sheet-cab"><div><h2>Mais opções</h2></div><button class="ic" data-fechar aria-label="Fechar">${ICON.fechar}</button></header>
    <div class="mais-lista">${itens.map(([k, t]) => `<button data-ir="${k}">${ICON[ICONE[k]]}<span>${t}</span></button>`).join('')}</div>`);
}

// Delegação global de cliques
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-fechar],[data-ir],[data-acao],[data-lancar]');
  if (!t) return;
  if (t.hasAttribute('data-fechar')) return fechar();
  if (t.dataset.ir) {
    if (!document.getElementById('modal').hidden) fechar();
    return ir(t.dataset.ir, t.dataset.arg || '');
  }
  if (t.dataset.lancar) { fechar(); setTimeout(() => LANCAR[+t.dataset.lancar][3](), 190); return; }
  const a = t.dataset.acao;
  if (a === 'menu-lancar') menuLancar();
  else if (a === 'menu-mais') menuMais();
  else if (a === 'sair') window.firebase?.auth().signOut().then(() => location.reload());
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('modal').hidden) fechar();
});

// ---------- Boot ----------
const carregarScript = (src) => new Promise((ok, erro) => {
  const s = document.createElement('script');
  s.src = src; s.onload = ok; s.onerror = erro;
  document.head.appendChild(s);
});

async function iniciarNuvem(cfg) {
  const v = '10.12.2';
  await carregarScript(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
  await Promise.all([
    carregarScript(`https://www.gstatic.com/firebasejs/${v}/firebase-auth-compat.js`),
    carregarScript(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore-compat.js`),
  ]);
  firebase.initializeApp(cfg);
  const db = firebase.firestore();
  // Cache persistente: o app abre, preenche e salva sem internet e sincroniza depois.
  try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) { console.warn('Cache offline indisponível', e.code); }
  const user = await new Promise((res) => { const off = firebase.auth().onAuthStateChanged((u) => { off(); res(u); }); });
  if (!user) { telaLogin(); return null; }
  return db;
}

function telaLogin() {
  const el = document.getElementById('login');
  el.hidden = false;
  el.innerHTML = `<form class="login-box">
    <div class="marca"><span class="selo"></span><div><strong>Queijaria Boas Práticas</strong><small>Entre para acessar as planilhas</small></div></div>
    <label class="campo"><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label>
    <label class="campo"><span>Senha</span><input name="senha" type="password" autocomplete="current-password" required></label>
    <p class="erro" hidden></p>
    <button class="btn pri" type="submit">Entrar</button>
    <button class="link" type="button" data-esqueci>Esqueci minha senha</button>
  </form>`;
  const f = el.querySelector('form');
  const erro = el.querySelector('.erro');
  f.onsubmit = async (e) => {
    e.preventDefault();
    erro.hidden = true;
    try {
      await firebase.auth().signInWithEmailAndPassword(f.email.value.trim(), f.senha.value);
      location.reload();
    } catch {
      erro.textContent = navigator.onLine ? 'E-mail ou senha incorretos. Confira e tente de novo.' : 'Sem internet. O primeiro acesso precisa de conexão; depois o app funciona sem internet.';
      erro.hidden = false;
    }
  };
  el.querySelector('[data-esqueci]').onclick = async () => {
    if (!f.email.value) { erro.textContent = 'Digite seu e-mail acima para receber o link.'; erro.hidden = false; return; }
    await firebase.auth().sendPasswordResetEmail(f.email.value.trim()).catch(() => {});
    erro.textContent = 'Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.';
    erro.hidden = false;
  };
}

// Aparelhos que começaram com os limites antigos (cloro 2,0 · Dornic e densidade da lei do leite)
// passam a usar só os limites dos documentos. Só mexe se o valor ainda for exatamente o antigo.
async function ajustarFaixasAntigas() {
  const fx = { ...(S.config.faixas || {}) };
  const igual = (k, min, max) => fx[k] && fx[k].min === min && fx[k].max === max;
  let mudou = false;
  if (igual('cloro', 0.2, 2.0)) { fx.cloro = { min: 0.2, max: 5.0 }; mudou = true; }
  if (igual('dornic', 14, 18)) { fx.dornic = { min: null, max: null }; mudou = true; }
  if (igual('densidade', 1.028, 1.034)) { fx.densidade = { min: null, max: null }; mudou = true; }
  if (mudou) await store.setConfig({ faixas: fx });
}

async function boot() {
  aplicarTema();
  // Registra o service worker primeiro, para o app abrir sem internet da próxima vez.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  let firestore = null;
  if (window.FIREBASE_CONFIG) {
    try {
      firestore = await iniciarNuvem(window.FIREBASE_CONFIG);
      if (!firestore) return;
    } catch (e) {
      console.error(e);
      toast('Não foi possível conectar ao Firebase', 'erro');
      return;
    }
  }
  const { vazio } = await store.iniciar({ firestore });
  // Primeiro uso: dados da queijaria-modelo e os 16 produtos (nenhum registro de BPF).
  if (vazio) {
    await store.substituirTudo({ config: configInicial(), produtos: produtosIniciais() });
    // Link de demonstração: config.js com DEMO_EXEMPLO = true já abre com dados de exemplo.
    if (window.DEMO_EXEMPLO && !firestore) await (await import('./demo/exemplo.js')).preencherExemplo();
  } else await ajustarFaixasAntigas();
  document.getElementById('app').classList.remove('carregando');
  store.onChange(render);
  window.addEventListener('rerender', render);
  window.addEventListener('hashchange', aoMudarRota);
  window.addEventListener('online', renderNav);
  window.addEventListener('offline', renderNav);
  aoMudarRota();
}

boot();
