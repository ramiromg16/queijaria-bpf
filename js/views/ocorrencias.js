// Ocorrências: PL 02/04 Pragas · IT 01/11 Devolução/recolhimento · Não conformidade avulsa.
// Registra quando acontece. Não apaga, só corrige.
import { S } from '../core/store.js';
import { ICON, abrir, fechar, cab, toast, pagina, pill, tabela, campo, inp, numInp, sel, dados, vazio, abas } from '../core/ui.js';
import { dec, num, esc, hoje, fmtData, mesDe, nomeMes } from '../core/format.js';
import { gravar, camposCorrecao, lerCorrecao, lembrarResponsavel } from '../domain/registros.js';
import { respCurto } from '../domain/planilhas.js';
import { EV, PRAGAS, nomePraga, produto } from '../domain/eventos.js';
import { respCampo } from './fabricacao.js';
import { loteCampo, ligarLote } from './expedicao.js';

const TIPOS = {
  praga: { nome: 'Pragas', titulo: 'Ocorrência de pragas', ev: 'PL-02-04', pac: '04' },
  recolhimento: { nome: 'Devolução e recolhimento', titulo: 'Devolução ou recolhimento', ev: 'IT-01-11', pac: '11' },
  nc: { nome: 'Não conformidade', titulo: 'Não conformidade', ev: 'RNC', pac: 'geral' },
};
let aba = 'praga';
let mesFiltro = '';

const vz = (v) => v === '' || v == null;
const seg = (nome, opcoes, valor) => `<div class="seg">${opcoes.map(([k, t]) => `<label><input type="radio" name="${nome}" value="${k}" ${valor === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>`;
const ja = (tipo, k) => [...new Set(S.bpf_ocorrencias.filter((o) => o.tipo === tipo).map((o) => o.valores?.[k]).filter(Boolean))].sort();
const datalist = (id, itens) => `<datalist id="${id}">${itens.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;

const COLS = {
  praga: [
    { t: 'Data', k: (o) => `<b>${fmtData(o.data)}</b>${o.hora ? ` <span class="mudo">${esc(o.hora)}</span>` : ''}` },
    { t: 'Setor', k: (o) => esc(o.valores?.setor) },
    { t: 'Praga', k: (o) => esc(nomePraga(o.valores || {})) },
    { t: 'Vivo/Morto', k: (o) => esc(o.valores?.situacao || '') },
    { t: 'Observações', k: (o) => esc(o.valores?.obs || '') },
  ],
  recolhimento: [
    { t: 'Data', k: (o) => `<b>${fmtData(o.data)}</b>` },
    { t: 'Lote', k: (o) => `<span class="cod">${esc(o.valores?.lote)}</span> <span class="mudo">${esc(produto(o.valores?.produtoId)?.nome || '')}</span>` },
    { t: 'Cliente', k: (o) => esc(o.valores?.cliente) },
    { t: 'Motivo', k: (o) => esc(o.valores?.motivo) },
    { t: 'Destino final', k: (o) => (o.valores?.destino ? esc(o.valores.destino) : pill('Pendente', 'av')) },
  ],
  nc: [
    { t: 'Data', k: (o) => `<b>${fmtData(o.data)}</b>` },
    { t: 'Setor / assunto', k: (o) => esc(o.valores?.setor) },
    { t: 'Descrição', k: (o) => esc(o.valores?.descricao) },
    { t: 'Ação corretiva', k: (o) => esc(o.valores?.acao) || '<span class="mal-t">sem ação</span>' },
  ],
};

function render() {
  const mes = mesFiltro || mesDe(hoje());
  const doMes = (tipo) => S.bpf_ocorrencias.filter((o) => o.tipo === tipo && mesDe(o.data) === mes);
  const lista = doMes(aba).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : (b.criado || 0) - (a.criado || 0)));
  const pendentes = S.bpf_ocorrencias.filter((o) => o.tipo === 'recolhimento' && !o.valores?.destino);
  const tp = TIPOS[aba];
  const ev = EV(tp.ev);

  const topo = abas(Object.entries(TIPOS).map(([k, x]) => [k, x.nome, doMes(k).length || null]), aba);
  const filtro = `<div class="filtros"><input type="month" value="${mes}" data-mes aria-label="Mês"><span class="mudo">${ev.codigo} · ${esc(ev.titulo)} · ${nomeMes(mes)}</span></div>`;
  const alerta = pendentes.length ? `<div class="aviso">${ICON.alerta}<div><b>${pendentes.length} recolhimento(s) sem destino final.</b> Quando decidir o que fazer com o produto, abra o registro e informe o destino.</div></div>` : '';
  const ajuda = {
    praga: 'Registre sempre que encontrar uma praga (viva ou morta) dentro ou perto da queijaria. Mês sem ocorrência sai na folha como "nenhuma ocorrência registrada".',
    recolhimento: 'IT 01/11: recolher do comércio quando houver problema ou reclamação, guardar em setor separado até decidir o destino e fazer o descarte adequado.',
    nc: 'Qualquer problema que não está em outra planilha: o que aconteceu e o que foi feito para corrigir.',
  }[aba];
  const corpo = lista.length ? `<div class="painel plano">${tabela([...COLS[aba], { t: 'Resp.', k: (o) => respCurto(o.responsavel) }, { t: '', k: (o) => (o.editadoEm ? pill('Corrigido', 'av') : '') }], lista, { clique: (o) => `data-o="${o.id}"` }).replace('class="tab"', 'class="tab cartoes"')}</div>`
    : vazio(`Nada registrado em ${nomeMes(mes)}`, esc(ajuda), `<button class="btn pri" data-novo>Registrar</button>`);

  return pagina('Ocorrências', 'PL 02/04 Pragas · IT 01/11 Devolução e recolhimento · Não conformidade', `<button class="btn pri" data-novo>${ICON.mais} ${tp.titulo}</button>`, topo + alerta + filtro + corpo + (lista.length ? `<p class="mudo">${esc(ajuda)}</p>` : ''));
}

function mount(el) {
  el.querySelector('[data-mes]')?.addEventListener('change', (e) => { mesFiltro = e.target.value; window.dispatchEvent(new Event('rerender')); });
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-aba]');
    if (a) { aba = a.dataset.aba; return window.dispatchEvent(new Event('rerender')); }
    const b = e.target.closest('[data-novo],[data-o]');
    if (!b) return;
    if (b.dataset.o) return novo(null, b.dataset.o);
    novo(aba);
  });
}

const CAMPOS = {
  praga: (v, o) => `
    <div class="linha2">${campo('Hora', inp('hora', o?.hora ?? new Date().toTimeString().slice(0, 5), 'type="time"'))}${campo('Setor', inp('setor', v.setor || '', 'list="dl-setor" required placeholder="Ex.: sala de fabricação · área externa"'))}</div>${datalist('dl-setor', ja('praga', 'setor'))}
    ${campo('Praga', sel('praga', [['', 'Escolha…'], ...PRAGAS.map((p, i) => [String(i + 1), `${i + 1} – ${p}`])], v.praga || '', 'required'))}
    ${campo('Qual (especificar)', inp('outra', v.outra || ''), '', 'outra')}
    ${campo('Encontrada', seg('situacao', [['vivo', 'Viva'], ['morto', 'Morta']], v.situacao || ''))}
    ${campo('Observações', inp('obs', v.obs || '', 'placeholder="Onde estava, o que foi feito"'))}`,
  recolhimento: (v) => `
    ${loteCampo(v.lote)}
    <div data-lote-info></div>
    <div class="linha2">${campo('Produto', sel('produtoId', [['', 'Escolha…'], ...[...S.produtos].sort((a, b) => (a.codigo < b.codigo ? -1 : 1)).map((p) => [p.id, `${p.codigo} · ${p.nome}`])], v.produtoId || ''))}${campo('Quantidade (kg)', numInp('kg', vz(v.kg) ? '' : dec(v.kg, 1)))}</div>
    ${campo('Cliente / local de onde voltou', inp('cliente', v.cliente || '', 'required'))}
    ${campo('Motivo', inp('motivo', v.motivo || '', 'required placeholder="Ex.: reclamação de sabor · embalagem estufada · problema detectado pela queijaria"'))}
    ${campo('Onde ficou separado', inp('separado', v.separado || '', 'placeholder="Ex.: prateleira separada na câmara, identificada"'))}
    <div class="linha2">${campo('Destino final', inp('destino', v.destino || '', 'placeholder="Ex.: descarte · devolvido ao cliente"'), 'pode completar depois')}${campo('Data do destino', inp('dataDestino', v.dataDestino || '', 'type="date"'))}</div>`,
  nc: (v) => `
    ${campo('Setor / assunto', inp('setor', v.setor || '', 'list="dl-setor-nc" required'))}${datalist('dl-setor-nc', ja('nc', 'setor'))}
    ${campo('Descrição da não conformidade', `<textarea name="descricao" rows="3" required>${esc(v.descricao || '')}</textarea>`)}
    ${campo('Ação corretiva', `<textarea name="acao" rows="3">${esc(v.acao || '')}</textarea>`, '', 'acao obrig')}`,
};

const LER = {
  praga: (d) => ({ setor: d.setor.trim(), praga: d.praga, outra: d.praga === '8' ? d.outra.trim() : '', situacao: d.situacao || '', obs: d.obs.trim() }),
  recolhimento: (d) => ({ lote: d.lote.trim().toUpperCase(), produtoId: d.produtoId, kg: vz(d.kg) ? null : num(d.kg), cliente: d.cliente.trim(), motivo: d.motivo.trim(), separado: d.separado.trim(), destino: d.destino.trim(), dataDestino: d.dataDestino }),
  nc: (d) => ({ setor: d.setor.trim(), descricao: d.descricao.trim(), acao: d.acao.trim() }),
};

const VALIDAR = {
  praga: (v) => (!v.setor ? 'Informe o setor' : !v.praga ? 'Escolha a praga' : v.praga === '8' && !v.outra ? 'Especifique qual praga' : !v.situacao ? 'Marque se estava viva ou morta' : ''),
  recolhimento: (v) => (!v.lote && !v.produtoId ? 'Informe o lote ou o produto' : !v.cliente ? 'Informe de onde o produto voltou' : !v.motivo ? 'Informe o motivo' : ''),
  nc: (v) => (!v.setor ? 'Informe o setor ou assunto' : !v.descricao ? 'Descreva a não conformidade' : !v.acao ? 'Descreva a ação corretiva' : ''),
};

export function novo(tipo, id) {
  const o = id ? S.bpf_ocorrencias.find((x) => x.id === id) : null;
  tipo = o?.tipo || tipo || 'praga';
  const tp = TIPOS[tipo];
  const ev = EV(tp.ev);
  const v = o?.valores || {};
  const sheet = abrir(`${cab(o ? `Corrigir: ${tp.titulo.toLowerCase()}` : tp.titulo, `${ev.codigo} · ${esc(ev.titulo)}`)}
    <form class="form" novalidate>
      ${campo('Data', inp('data', o?.data || hoje(), `type="date" max="${hoje()}" required`))}
      ${CAMPOS[tipo](v, o)}
      ${respCampo(tp.pac, o?.responsavel)}
      ${camposCorrecao(o)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${o ? 'Salvar correção' : 'Salvar'}</button></div>
    </form>`);
  const form = sheet.querySelector('form');
  if (tipo === 'praga') {
    const outra = sheet.querySelector('.outra');
    const ver = () => { outra.hidden = form.praga.value !== '8'; };
    form.praga.addEventListener('change', ver);
    ver();
  }
  if (tipo === 'recolhimento') {
    ligarLote(form);
    // Só completar o destino final não é "erro": já deixa o motivo da correção escrito.
    if (o && !v.destino && form.corrMotivo) form.corrMotivo.value = 'Destino final informado';
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = dados(form);
    const val = LER[tipo](d);
    if (!d.data) return toast('Informe a data', 'erro');
    const erro = VALIDAR[tipo](val);
    if (erro) return toast(erro, 'erro');
    if (!d.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    const correcao = o ? lerCorrecao(d) : null;
    if (o && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');
    lembrarResponsavel(tp.pac, d.responsavel.trim());
    await gravar('bpf_ocorrencias', { tipo, data: d.data, hora: d.hora || '', valores: val, responsavel: d.responsavel.trim() }, o, correcao);
    fechar();
    toast(o ? 'Correção salva' : `${tp.titulo}: registrado`);
  };
}

export default { render, mount, novo };
