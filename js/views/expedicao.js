// Expedição: PL 01/11 Rastreabilidade dos produtos acabados e PL 02/11 Controle da comercialização.
// Um registro por saída (produto + lote + kg + destino). A PL 02/11 é montada com os mesmos dados.
// Registro não é apagado, só corrigido.
import { S } from '../core/store.js';
import { ICON, abrir, fechar, cab, toast, pagina, pill, tabela, campo, inp, numInp, sel, dados, vazio, aviso } from '../core/ui.js';
import { dec, num, esc, hoje, fmtData, mesDe, nomeMes } from '../core/format.js';
import { gravar, camposCorrecao, lerCorrecao, lembrarResponsavel } from '../domain/registros.js';
import { respCurto } from '../domain/planilhas.js';
import { produto } from '../domain/eventos.js';
import { respCampo } from './fabricacao.js';

const PAC = '11';
let mesFiltro = '';

const vz = (v) => v === '' || v == null;
const prodsAtivos = () => [...S.produtos].filter((p) => p.ativo !== false).sort((a, b) => (a.codigo < b.codigo ? -1 : 1));

// Todos os lotes da Fabricação, do mais novo para o mais antigo.
export function lotes(produtoId) {
  return S.fabricacoes
    .filter((f) => !f.semFabricacao)
    .flatMap((f) => (f.produtos || []).map((p) => ({ ...p, data: f.data })))
    .filter((p) => p.lote && (!produtoId || p.produtoId === produtoId))
    .sort((a, b) => (a.data < b.data ? 1 : -1));
}
export const loteInfo = (lote) => lotes().find((l) => l.lote === lote);
export const kgExpedido = (lote, ignorarId) => S.expedicoes.filter((e) => e.lote === lote && e.id !== ignorarId).reduce((s, e) => s + (+e.kg || 0), 0);
const destinos = () => [...new Set(S.expedicoes.map((e) => e.destino).filter(Boolean))].sort();

// Campo de lote com sugestões; ao escolher o lote, o produto é preenchido sozinho.
export const loteCampo = (valor, produtoId) => `${campo('Lote', inp('lote', valor || '', 'list="dl-lotes" autocomplete="off" placeholder="Ex.: 001-171126"'), 'sugestões: lotes da Fabricação do dia')}<datalist id="dl-lotes">${opcoesLotes(produtoId)}</datalist>`;
const opcoesLotes = (produtoId) => lotes(produtoId).slice(0, 80).map((l) => `<option value="${esc(l.lote)}">${esc(produto(l.produtoId)?.nome || '')} · ${fmtData(l.data)}${l.kg ? ` · ${dec(l.kg, 1)} kg` : ''}</option>`).join('');
export function ligarLote(form, ignorarId) {
  const dl = form.querySelector('#dl-lotes');
  const prod = form.produtoId;
  const info = form.querySelector('[data-lote-info]');
  const atualizar = () => {
    const l = loteInfo(form.lote.value.trim());
    if (l && prod && prod.value !== l.produtoId) prod.value = l.produtoId;
    if (!info) return;
    if (!form.lote.value.trim()) { info.innerHTML = ''; return; }
    if (!l) { info.innerHTML = aviso('Esse lote não aparece na Fabricação do dia. Confira o número na etiqueta.', 'av'); return; }
    const saiu = kgExpedido(l.lote, ignorarId);
    info.innerHTML = `<p class="mudo" style="margin:0">Lote fabricado em <b>${fmtData(l.data)}</b> · ${esc(produto(l.produtoId)?.nome || '')}${l.kg ? ` · produzido ${dec(l.kg, 1)} kg` : ''}${saiu ? ` · já expedido ${dec(saiu, 1)} kg` : ''}</p>`;
  };
  form.lote.addEventListener('input', atualizar);
  prod?.addEventListener('change', () => { dl.innerHTML = opcoesLotes(prod.value); const l = loteInfo(form.lote.value.trim()); if (l && l.produtoId !== prod.value) form.lote.value = ''; atualizar(); });
  atualizar();
}

function render() {
  const mes = mesFiltro || mesDe(hoje());
  const lista = S.expedicoes.filter((e) => mesDe(e.data) === mes).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : (b.criado || 0) - (a.criado || 0)));
  const total = lista.reduce((s, e) => s + (+e.kg || 0), 0);
  const porProd = Object.entries(lista.reduce((m, e) => ((m[e.produtoId] = (m[e.produtoId] || 0) + (+e.kg || 0)), m), {}))
    .sort((a, b) => b[1] - a[1]).map(([id, k]) => `${esc(produto(id)?.nome || '?')} ${dec(k, 1)} kg`).join(' · ');

  const filtro = `<div class="filtros"><input type="month" value="${mes}" data-mes aria-label="Mês"><span class="mudo">${lista.length} saída(s) · ${dec(total, 1)} kg em ${nomeMes(mes)}</span></div>`;
  const corpo = lista.length ? `<div class="painel plano">${tabela([
    { t: 'Data', k: (e) => `<b>${fmtData(e.data)}</b>` },
    { t: 'Produto', k: (e) => esc(produto(e.produtoId)?.nome || '') },
    { t: 'Lote', k: (e) => `<span class="cod">${esc(e.lote)}</span>` },
    { t: 'Kg', cls: 'num', k: (e) => dec(e.kg, 1) },
    { t: 'Destino/Local da venda', k: (e) => esc(e.destino) },
    { t: 'Resp.', k: (e) => respCurto(e.responsavel) },
    { t: '', k: (e) => (e.editadoEm ? pill('Corrigido', 'av') : '') },
  ], lista, { clique: (e) => `data-e="${e.id}"` }).replace('class="tab"', 'class="tab cartoes"')}</div>
    ${porProd ? `<p class="mudo">Por produto (sai assim na PL 02/11): ${porProd}</p>` : ''}`
    : vazio('Nenhuma expedição neste mês', 'Registre cada saída de queijo: produto, lote, quantidade e para onde foi. Isso preenche a PL 01/11 (Rastreabilidade) e a PL 02/11 (Comercialização).', '<button class="btn pri" data-novo>Registrar expedição</button>');

  return pagina('Expedição', 'PL 01/11 Rastreabilidade · PL 02/11 Comercialização', `<button class="btn pri" data-novo>${ICON.mais} Registrar expedição</button>`, filtro + corpo);
}

function mount(el) {
  el.querySelector('[data-mes]')?.addEventListener('change', (e) => { mesFiltro = e.target.value; window.dispatchEvent(new Event('rerender')); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-novo],[data-e]');
    if (!b) return;
    novo(b.dataset.e);
  });
}

export function novo(id) {
  const e = id ? S.expedicoes.find((x) => x.id === id) : null;
  const b = e || { data: hoje(), produtoId: '', lote: '', kg: '', destino: '', obs: '' };
  const prods = prodsAtivos();
  if (e && !prods.some((p) => p.id === e.produtoId) && produto(e.produtoId)) prods.push(produto(e.produtoId));
  const sheet = abrir(`${cab(e ? 'Corrigir expedição' : 'Registrar expedição', 'PL 01/11 Rastreabilidade · PL 02/11 Comercialização')}
    <form class="form" novalidate>
      <div class="linha2">${campo('Data', inp('data', b.data, `type="date" max="${hoje()}" required`))}${campo('Quantidade (kg)', numInp('kg', vz(b.kg) ? '' : dec(b.kg, 1), 'required'))}</div>
      ${loteCampo(b.lote, b.produtoId)}
      <div data-lote-info></div>
      ${campo('Produto', sel('produtoId', [['', 'Escolha…'], ...prods.map((p) => [p.id, `${p.codigo} · ${p.nome}`])], b.produtoId, 'required'))}
      ${campo('Destino/Local da venda', inp('destino', b.destino, 'list="dl-destinos" required placeholder="Ex.: Feira de Itanhandu · Empório X · cliente"'))}<datalist id="dl-destinos">${destinos().map((d) => `<option value="${esc(d)}">`).join('')}</datalist>
      ${campo('Observações', inp('obs', b.obs || ''))}
      ${respCampo(PAC, e?.responsavel)}
      ${camposCorrecao(e)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${e ? 'Salvar correção' : 'Salvar'}</button></div>
    </form>`);
  const form = sheet.querySelector('form');
  ligarLote(form, e?.id);
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = dados(form);
    if (!v.data) return toast('Informe a data', 'erro');
    if (!v.produtoId) return toast('Escolha o produto', 'erro');
    if (!v.lote.trim()) return toast('Informe o lote', 'erro');
    if (!num(v.kg)) return toast('Informe a quantidade em kg', 'erro');
    if (!v.destino.trim()) return toast('Informe o destino/local da venda', 'erro');
    if (!v.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    const correcao = e ? lerCorrecao(v) : null;
    if (e && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');
    lembrarResponsavel(PAC, v.responsavel.trim());
    await gravar('expedicoes', { data: v.data, produtoId: v.produtoId, lote: v.lote.trim().toUpperCase(), kg: num(v.kg), destino: v.destino.trim(), obs: v.obs.trim(), responsavel: v.responsavel.trim() }, e, correcao);
    fechar();
    toast(e ? 'Correção salva' : 'Expedição registrada');
  };
}

export default { render, mount, novo };
