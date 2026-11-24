import { S, setConfig, salvar, substituirTudo, exportar, modo, COLS } from '../core/store.js';
import { ICON, abrir, fechar, cab, toast, confirmar, pagina, pill, tabela, campo, inp, numInp, dados, baixarArquivo } from '../core/ui.js';
import { dec, num, esc, hoje, int } from '../core/format.js';
import { FAIXAS_PADRAO } from '../domain/faixas.js';
import { PACS } from '../domain/padrao.js';
import { NOMES_LISTAS } from '../domain/modelos.js';
import { lista } from '../domain/checklists.js';
import { operador, setOperador } from '../domain/registros.js';

export function aplicarTema() {
  let t = 'auto';
  try { t = localStorage.getItem('bpf-tema') || 'auto'; } catch {}
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

const vz = (v) => v === '' || v == null;

function render() {
  const c = S.config;
  let tema = 'auto';
  try { tema = localStorage.getItem('bpf-tema') || 'auto'; } catch {}
  const nuvem = modo() === 'nuvem';
  const registros = COLS.reduce((s, k) => s + S[k].length, 0);
  const r = c.responsaveis || {};
  const fx = c.faixas || {};
  const produtos = [...S.produtos].sort((a, b) => (a.codigo < b.codigo ? -1 : 1));

  return pagina('Configurações', 'Dados da queijaria, responsáveis, faixas de alerta, produtos e backup', '', `
  <div class="grade">
    <form class="painel col-7 form" data-form="geral">
      <h3>Dados da queijaria <small>saem no cabeçalho de todas as planilhas</small></h3>
      ${campo('Nome da queijaria', inp('nome', c.nome, 'required'))}
      <div class="linha2">${campo('Município', inp('cidade', c.cidade, 'placeholder="Ex.: Itanhandu/MG"'))}${campo('Registro', inp('registro', c.registro, 'placeholder="Ex.: IMA nº … · SIM … · Selo Arte"'))}</div>
      <div class="linha2">${campo('CPF / CNPJ / Inscrição de produtor', inp('documento', c.documento))}${campo('Telefone', inp('telefone', c.telefone))}</div>
      ${campo('Linha de cima dos produtos nas PL 02/09 e 02/11', inp('tituloComercializacao', c.tituloComercializacao || '', 'placeholder="Ex.: MANTIQUEIRA DE MINAS (deixe vazio se não usar)"'), 'no papel da Almeida Guimarães aparece "MANTIQUEIRA DE MINAS"')}
      <div><button class="btn pri">Salvar dados</button></div>
    </form>
    <form class="painel col-5 form" data-form="aparelho">
      <h3>Este aparelho</h3>
      ${nuvem ? `<p style="margin:0">Você entrou como <b>${esc(operador())}</b>. As correções ficam registradas com esse e-mail.</p>` : campo('Quem usa este aparelho', inp('operador', operador(), 'placeholder="Seu nome"'), 'aparece como "corrigido por" quando alguém corrige um registro')}
      <div class="seg">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, t]) => `<label><input type="radio" name="tema" value="${k}" ${tema === k ? 'checked' : ''} data-tema><span>${t}</span></label>`).join('')}</div>
      ${nuvem ? '' : '<div><button class="btn pri">Salvar</button></div>'}
    </form>

    <form class="painel col-6 form" data-form="resp">
      <h3>Responsáveis <small>sugeridos ao preencher e impressos na folha</small></h3>
      ${campo('Responsável geral pelos PACs', inp('geral', r.geral || ''))}
      ${PACS.map(([n, t]) => campo(`PAC ${n} · ${t}`, inp(`pac${n}`, r[n] || ''))).join('')}
      <div><button class="btn pri">Salvar responsáveis</button></div>
    </form>

    <form class="painel col-6 form" data-form="faixas">
      <h3>Faixas de alerta <small>fora da faixa = NC e pede ação corretiva</small></h3>
      ${Object.entries(FAIXAS_PADRAO).map(([k, p]) => {
        const v = fx[k] || {};
        const val = (q) => { const x = v[q] === undefined ? p[q] : v[q]; return vz(x) ? '' : dec(x, p.casas); };
        return `<div class="faixa-l"><span>${esc(p.nome)}${p.un ? ` <small>(${esc(p.un)})</small>` : ''}${p.nota ? `<em>${esc(p.nota)}</em>` : ''}</span>${numInp(`${k}_min`, val('min'), 'placeholder="mín." aria-label="mínimo"')}${numInp(`${k}_max`, val('max'), 'placeholder="máx." aria-label="máximo"')}</div>`;
      }).join('')}
      <p class="mudo" style="margin:0">Deixe em branco para não ter limite.</p>
      <div><button class="btn pri">Salvar faixas</button></div>
    </form>

    <form class="painel col-12 form" data-form="listas">
      <h3>Listas dos checklists <small>um item por linha</small></h3>
      <div class="linha3 listas">${Object.entries(NOMES_LISTAS).map(([k, t]) => campo(t, `<textarea name="${k}" rows="8">${esc(lista(k).join(String.fromCharCode(10)))}</textarea>`)).join('')}</div>
      <p class="mudo" style="margin:0">Mudar a lista não altera os registros já feitos: eles guardam o nome do item como estava no dia.</p>
      <div><button class="btn pri">Salvar listas</button></div>
    </form>

    <div class="painel plano col-12"><h3>Produtos <button class="btn peq" data-prod="">${ICON.mais} Novo produto</button></h3>
      ${tabela([
        { t: 'Código', k: (p) => `<b class="cod">${esc(p.codigo)}</b>` },
        { t: 'Produto', k: (p) => esc(p.nome) },
        { t: 'Situação', k: (p) => (p.ativo === false ? pill('Inativo') : pill('Ativo', 'ok')) },
      ], produtos, { clique: (p) => `data-prod="${p.id}"`, vazioMsg: 'Nenhum produto cadastrado.' }).replace('class="tab"', 'class="tab cartoes"')}
    </div>

    <div class="painel col-12"><h3>Onde ficam os dados e backup</h3>
      <p style="margin-top:0">${nuvem ? 'Os dados estão <b>na nuvem (Firebase)</b> e sincronizam entre todos os aparelhos. Sem internet, o app continua funcionando e envia tudo quando a conexão voltar.' : 'Os dados estão salvos <b>somente neste aparelho</b> e funcionam sem internet. Baixe um backup toda semana, ou ative a versão na nuvem para usar em vários aparelhos.'} <span class="mudo">${int(registros)} registros guardados.</span></p>
      <div class="pg-acoes">
        <button class="btn" data-backup>${ICON.baixar} Baixar backup</button>
        <label class="btn">${ICON.folha} Restaurar backup<input type="file" accept=".json,application/json" data-restaurar hidden></label>
      </div>
    </div>
  </div>`);
}

function mount(el) {
  el.querySelectorAll('form[data-form]').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = dados(f);
    const tipo = f.dataset.form;
    if (tipo === 'geral') {
      await setConfig({ nome: v.nome.trim(), documento: v.documento.trim(), registro: v.registro.trim(), cidade: v.cidade.trim(), telefone: v.telefone.trim(), tituloComercializacao: v.tituloComercializacao.trim() });
    } else if (tipo === 'aparelho') {
      setOperador(v.operador);
    } else if (tipo === 'resp') {
      const resp = { geral: v.geral.trim() };
      for (const [n] of PACS) resp[n] = v[`pac${n}`].trim();
      await setConfig({ responsaveis: resp });
    } else if (tipo === 'faixas') {
      const faixas = {};
      for (const k of Object.keys(FAIXAS_PADRAO)) {
        const min = v[`${k}_min`], max = v[`${k}_max`];
        faixas[k] = { min: vz(min) ? null : num(min), max: vz(max) ? null : num(max) };
        if (faixas[k].min != null && faixas[k].max != null && faixas[k].min > faixas[k].max) return toast(`${FAIXAS_PADRAO[k].nome}: o mínimo está maior que o máximo`, 'erro');
      }
      await setConfig({ faixas });
    } else if (tipo === 'listas') {
      const novo = {};
      for (const k of Object.keys(NOMES_LISTAS)) {
        novo[k] = [...new Set(v[k].split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean))];
        if (!novo[k].length) return toast(`A lista "${NOMES_LISTAS[k]}" não pode ficar vazia`, 'erro');
      }
      await setConfig(novo);
    }
    toast('Configurações salvas');
  }));
  el.querySelectorAll('[data-tema]').forEach((r) => r.addEventListener('change', () => {
    try { localStorage.setItem('bpf-tema', r.value); } catch {}
    aplicarTema();
  }));
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prod]');
    if (b) produto(b.dataset.prod);
  });
  el.querySelector('[data-backup]').onclick = () => {
    baixarArquivo(`backup-bpf-${(S.config.nome || 'queijaria').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-${hoje()}.json`, JSON.stringify(exportar()), 'application/json');
    toast('Backup baixado');
  };
  el.querySelector('[data-restaurar]').onchange = async (e) => {
    const arq = e.target.files[0];
    if (!arq) return;
    try {
      const j = JSON.parse(await arq.text());
      if (j.app !== 'queijaria-bpf') throw new Error('arquivo');
      if (!(await confirmar(`Restaurar o backup de <b>${esc(j.config?.nome || '')}</b> de ${esc(String(j.exportadoEm || '').slice(0, 10).split('-').reverse().join('/'))}? <b>Tudo o que está neste aparelho será substituído</b> pelo que está no backup.`, { ok: 'Restaurar', perigo: true }))) return;
      await substituirTudo(j);
      toast('Backup restaurado');
    } catch {
      toast('Esse arquivo não é um backup do Queijaria Boas Práticas', 'erro');
    }
  };
}

function produto(id) {
  const p = id ? S.produtos.find((x) => x.id === id) : null;
  const prox = String(Math.max(0, ...S.produtos.map((x) => parseInt(x.codigo, 10) || 0)) + 1).padStart(3, '0');
  const b = p || { codigo: prox, nome: '', ativo: true };
  const usado = p && S.fabricacoes.some((f) => (f.produtos || []).some((i) => i.produtoId === p.id));
  const sheet = abrir(`${cab(p ? 'Editar produto' : 'Novo produto', 'O código entra no número do lote')}
    <form class="form">
      <div class="linha2">${campo('Código', inp('codigo', b.codigo, `required ${usado ? 'readonly' : ''}`), usado ? 'já usado em lotes, não pode mudar' : '')}${campo('Situação', `<div class="seg"><label><input type="radio" name="ativo" value="1" ${b.ativo !== false ? 'checked' : ''}><span>Ativo</span></label><label><input type="radio" name="ativo" value="0" ${b.ativo === false ? 'checked' : ''}><span>Inativo</span></label></div>`)}</div>
      ${campo('Nome do produto', inp('nome', b.nome, 'required autofocus'))}
      <p class="mudo" style="margin:0">Produtos não são apagados, para não quebrar os lotes já registrados. Use "Inativo" para tirar da lista.</p>
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">Salvar</button></div>
    </form>`);
  const f = sheet.querySelector('form');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const v = dados(f);
    const codigo = v.codigo.trim();
    if (S.produtos.some((x) => x.codigo === codigo && x.id !== p?.id)) return toast('Já existe um produto com esse código', 'erro');
    await salvar('produtos', { ...(p || {}), codigo, nome: v.nome.trim().toUpperCase(), ativo: v.ativo === '1' });
    fechar();
    toast('Produto salvo');
  };
}

export default { render, mount };
