// Camada de dados. Mesma interface para o modo demonstração (localStorage)
// e para o modo nuvem (Firestore com cache offline).

export const COLS = ['produtos', 'colaboradores', 'bpf_registros', 'fabricacoes', 'expedicoes', 'bpf_ocorrencias', 'laudos', 'treinamentos'];

export const CONFIG_PADRAO = {
  nome: 'Minha Queijaria',
  documento: '',
  registro: '',
  cidade: '',
  telefone: '',
  // Configuração dos formulários (ver PLANO.md, seção 5)
  caixasDagua: [],
  equipamentosHigienizacao: [],
  instrumentos: [],
  ingredientes: [],
  responsaveis: {},
  faixas: {},
  tituloComercializacao: '',
  demo: false,
};

const LS_KEY = 'queijaria-bpf:v1';

export const S = { config: { ...CONFIG_PADRAO } };
for (const c of COLS) S[c] = [];

let versao = 0;
const ouvintes = new Set();
let adapter = null;

export const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const getVersao = () => versao;
export const onChange = (fn) => (ouvintes.add(fn), () => ouvintes.delete(fn));

let agendado = false;
function notificar() {
  versao++;
  if (agendado) return;
  agendado = true;
  queueMicrotask(() => {
    agendado = false;
    for (const fn of ouvintes) fn();
  });
}

export const list = (col) => S[col] || [];
export const get = (col, id) => (S[col] || []).find((d) => d.id === id);

function aplicarLocal(col, doc, remover = false) {
  const arr = S[col];
  const i = arr.findIndex((d) => d.id === doc.id);
  if (remover) { if (i >= 0) arr.splice(i, 1); return; }
  if (i >= 0) arr[i] = doc; else arr.push(doc);
}

// ops: [{col, doc}] para gravar ou [{col, id, remover:true}] para apagar
export async function salvarVarios(ops) {
  const agora = Date.now();
  const prontas = ops.map((o) => {
    if (o.remover) return { col: o.col, doc: { id: o.id }, remover: true };
    const doc = { ...o.doc };
    if (!doc.id) { doc.id = novoId(); doc.criado = doc.criado || agora; }
    doc.atualizado = agora;
    return { col: o.col, doc };
  });
  for (const o of prontas) aplicarLocal(o.col, o.doc, o.remover);
  notificar();
  await adapter.escrever(prontas);
  return prontas.map((o) => o.doc);
}

export async function salvar(col, doc) {
  const [d] = await salvarVarios([{ col, doc }]);
  return d;
}
export const apagar = (col, id) => salvarVarios([{ col, id, remover: true }]);

export async function setConfig(patch) {
  S.config = { ...S.config, ...patch };
  notificar();
  await adapter.config(S.config);
}

// Substitui todos os dados (usado por demo, backup e "limpar tudo").
export async function substituirTudo(dados) {
  const novo = { config: { ...CONFIG_PADRAO, ...(dados.config || {}) } };
  for (const c of COLS) novo[c] = Array.isArray(dados[c]) ? dados[c] : [];
  const antigo = {};
  for (const c of COLS) antigo[c] = S[c].map((d) => d.id);
  Object.assign(S, novo);
  notificar();
  await adapter.substituir(novo, antigo);
}

export function exportar() {
  const out = { app: 'queijaria-bpf', versao: 1, exportadoEm: new Date().toISOString(), config: S.config };
  for (const c of COLS) out[c] = S[c];
  return out;
}

// ---------- Adaptador local ----------
function adapterLocal() {
  let t = null;
  const gravar = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(exportar())); } catch (e) { console.error('Falha ao salvar localmente', e); }
    }, 150);
  };
  return {
    modo: 'local',
    async iniciar() {
      let dados = null;
      try { dados = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { dados = null; }
      if (dados) {
        S.config = { ...CONFIG_PADRAO, ...dados.config };
        for (const c of COLS) S[c] = dados[c] || [];
        notificar();
        return { vazio: false };
      }
      return { vazio: true };
    },
    escrever: async () => gravar(),
    config: async () => gravar(),
    substituir: async () => gravar(),
  };
}

// ---------- Adaptador Firestore ----------
function adapterFirestore(db) {
  const cfgRef = db.collection('config').doc('geral');
  const lotear = async (ops) => {
    for (let i = 0; i < ops.length; i += 400) {
      const b = db.batch();
      for (const o of ops.slice(i, i + 400)) {
        const ref = db.collection(o.col).doc(o.doc.id);
        if (o.remover) b.delete(ref); else b.set(ref, o.doc);
      }
      await b.commit();
    }
  };
  return {
    modo: 'nuvem',
    async iniciar() {
      const primeiros = COLS.map((c) => new Promise((res) => {
        let pronto = false;
        db.collection(c).onSnapshot((snap) => {
          S[c] = snap.docs.map((d) => d.data());
          notificar();
          if (!pronto) { pronto = true; res(); }
        }, (e) => { console.error(c, e); res(); });
      }));
      const cfg = new Promise((res) => {
        let pronto = false;
        cfgRef.onSnapshot((d) => {
          S.config = { ...CONFIG_PADRAO, ...(d.exists ? d.data() : {}) };
          notificar();
          if (!pronto) { pronto = true; res(d.exists); }
        }, () => res(false));
      });
      const [temCfg] = await Promise.all([cfg, ...primeiros]);
      return { vazio: !temCfg && COLS.every((c) => S[c].length === 0) };
    },
    escrever: (ops) => lotear(ops),
    config: (c) => cfgRef.set(c),
    async substituir(novo, antigo) {
      const ops = [];
      for (const c of COLS) {
        const manter = new Set(novo[c].map((d) => d.id));
        for (const id of antigo[c]) if (!manter.has(id)) ops.push({ col: c, doc: { id }, remover: true });
        for (const d of novo[c]) ops.push({ col: c, doc: d });
      }
      await lotear(ops);
      await cfgRef.set(novo.config);
    },
  };
}

export const modo = () => adapter?.modo;

export async function iniciar({ firestore } = {}) {
  adapter = firestore ? adapterFirestore(firestore) : adapterLocal();
  return adapter.iniciar();
}
