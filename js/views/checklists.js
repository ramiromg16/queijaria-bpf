// Checklists: PL 01/01 · 04/01 · 01/02 · 02/02 · 03/02 · 01/03 · 01/04 · 02/05 · 03/07 · 01/10.
// Os modelos ficam em js/domain/modelos.js. Resposta diferente do esperado = NC, e o app pede
// a descrição e a ação corretiva.
import { S } from '../core/store.js';
import { ICON, abrir, fechar, cab, toast, pagina, pill, campo, inp, sel, dados, aviso, tabela } from '../core/ui.js';
import { esc, hoje, fmtData, fmtDataCurta, mesDe, nomeMes } from '../core/format.js';
import { gravar, camposCorrecao, lerCorrecao, lembrarResponsavel } from '../domain/registros.js';
import { respCurto } from '../domain/planilhas.js';
import { CHECKLISTS, CK, itensDe, opcoes, esperadoDe, colunasNC, problemasCk, periodoAtual, registroDoPeriodo, registrosCk, pendente, lista } from '../domain/checklists.js';
import { respCampo } from './fabricacao.js';

const GRUPOS = [['dia', 'Diário'], ['semana', 'Semanal'], ['mes', 'Mensal'], ['evento', 'No recebimento']];
let historico = '';

function rotuloPeriodo(m) {
  const p = periodoAtual(m);
  if (!p) return '';
  if (m.freq === 'dia') return 'hoje';
  if (m.freq === 'semana') return `semana de ${fmtDataCurta(p.ini)} a ${fmtDataCurta(p.fim)}`;
  return nomeMes(mesDe(p.ini));
}

function cartao(m) {
  const reg = registroDoPeriodo(m);
  const prob = reg ? problemasCk(m, reg) : [];
  const n = m.itensConfig ? lista(m.itensConfig).length : m.itens.length;
  const ultimos = m.freq === 'evento' ? registrosCk(m.id, '0000', '9999').slice(-1)[0] : null;
  let estado, botoes;
  if (m.freq === 'evento') {
    estado = ultimos ? `<span class="mudo">Último: ${fmtData(ultimos.data)} · ${esc(ultimos.valores?.ingrediente || '')}</span>` : '<span class="mudo">Nenhum recebimento registrado</span>';
    botoes = `<button class="btn pri peq" data-ck="${m.id}">${ICON.mais} Novo recebimento</button>`;
  } else if (reg) {
    estado = `${prob.length ? pill(`${prob.length} NC`, 'mal') : pill('Feito', 'ok')} <span class="mudo">${fmtData(reg.data)} · ${esc(respCurto(reg.responsavel))}${reg.editadoEm ? ' · corrigido' : ''}</span>`;
    botoes = `<button class="btn peq" data-ck="${m.id}" data-reg="${reg.id}">${ICON.editar} Corrigir</button>`;
  } else {
    estado = `${pill('Pendente', 'av')} <span class="mudo">${rotuloPeriodo(m)}</span>`;
    botoes = `<button class="btn pri peq" data-ck="${m.id}">Preencher</button>`;
  }
  return `<div class="ck-card${reg && !prob.length ? ' feito' : ''}${prob.length ? ' nc' : ''}">
    <div class="ck-cab"><b class="cod">${m.codigo}</b>${m.provisorio ? pill('itens a conferir', 'info') : ''}</div>
    <strong>${esc(m.titulo)}</strong>
    <small class="mudo">${n} ${m.layout === 'matriz' ? 'itens verificados' : 'itens'}${m.it ? ` · como fazer: ${esc(m.it)}` : ''}</small>
    <div class="ck-estado">${estado}</div>
    <div class="ck-acoes">${botoes}<button class="btn fant peq" data-hist="${m.id}">Histórico</button></div>
  </div>`;
}

function render() {
  const pend = CHECKLISTS.filter((m) => pendente(m)).length;
  let hist = '';
  if (historico) {
    const m = CK(historico);
    const regs = registrosCk(m.id, '0000', '9999').reverse().slice(0, 60);
    hist = `<div class="painel plano" style="margin-top:18px" id="hist"><h3>Histórico · ${m.codigo} ${esc(m.titulo)} <button class="btn fant peq" data-hist="">Fechar</button></h3>${tabela([
      { t: 'Data', k: (r) => `<b>${fmtData(r.data)}</b>` },
      ...(m.layout === 'recebimento' ? [{ t: 'Recebido', k: (r) => esc([r.valores?.ingrediente, r.valores?.fornecedor].filter(Boolean).join(' · ')) }] : []),
      { t: 'Resultado', k: (r) => { const p = problemasCk(m, r); return p.length ? `${pill(`${p.length} NC`, 'mal')} <span class="mudo">${esc(p.slice(0, 2).join('; '))}${p.length > 2 ? '…' : ''}</span>` : pill('Conforme', 'ok'); } },
      { t: 'Resp.', k: (r) => respCurto(r.responsavel) },
      { t: '', k: (r) => (r.editadoEm ? pill('Corrigido', 'av') : '') },
    ], regs, { clique: (r) => `data-ck="${m.id}" data-reg="${r.id}"`, vazioMsg: 'Nenhum registro ainda.' }).replace('class="tab"', 'class="tab cartoes"')}</div>`;
  }
  return pagina('Checklists', pend ? `${pend} pendente(s) no período atual` : 'Tudo em dia no período atual', '',
    GRUPOS.map(([f, t]) => {
      const ms = CHECKLISTS.filter((m) => m.freq === f);
      return ms.length ? `<h2 class="ck-grupo">${t}</h2><div class="ck-grade">${ms.map(cartao).join('')}</div>` : '';
    }).join('') + hist);
}

function mount(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ck],[data-hist]');
    if (!b) return;
    if (b.dataset.ck) return novo(b.dataset.ck, { regId: b.dataset.reg });
    historico = b.dataset.hist;
    window.dispatchEvent(new Event('rerender'));
    if (historico) setTimeout(() => document.getElementById('hist')?.scrollIntoView({ behavior: 'smooth' }), 50);
  });
}

// ---------- Formulário ----------
const seg = (nome, ops, valor) => `<div class="seg ck-seg">${ops.map((o) => `<label><input type="radio" name="${nome}" value="${o}" ${valor === o ? 'checked' : ''}><span>${o}</span></label>`).join('')}</div>`;

function linhaItem(m, item, i, resp) {
  const r = resp?.r || {};
  const matriz = m.layout === 'matriz';
  const num = m.itensConfig ? '' : `<b class="ck-n">${esc(item.id)}</b>`;
  const respostas = m.colunas.map((c) => `<div class="ck-col">${m.colunas.length > 1 ? `<span>${esc(c.t)}</span>` : ''}${seg(`r${i}_${c.id}`, opcoes(item, c), r[c.id])}</div>`).join('');
  const invertida = m.colunas.length === 1 && esperadoDe(item, m.colunas[0]) === 'NÃO';
  return `<div class="ck-i" data-i="${i}">
    <div class="ck-t">${num}<span>${esc(item.t)}${invertida ? ' <em class="mudo">(o certo é NÃO)</em>' : ''}${item.dica ? ` <em class="mudo">(${esc(item.dica)})</em>` : ''}</span></div>
    <div class="ck-r">${respostas}</div>
    <div class="ck-nc" ${matriz ? '' : 'hidden'}>
      ${campo(matriz ? 'Observação' : 'O que estava não conforme', inp(`d${i}`, resp?.descricaoNC || ''))}
      ${campo('Ação corretiva', inp(`a${i}`, resp?.acaoCorretiva || ''), '', 'acao-i')}
    </div>
  </div>`;
}

export function novo(id, { regId, data } = {}) {
  const m = CK(id);
  let reg = regId ? S.bpf_registros.find((r) => r.id === regId) : null;
  // Diário/semanal/mensal: se o período já tem registro, abre para corrigir.
  if (!reg && m.freq !== 'evento') reg = registroDoPeriodo(m, data || hoje());
  const itens = itensDe(m);
  // Itens que estão no registro mas saíram da lista de Configurações continuam aparecendo.
  const extras = (reg?.respostas || []).filter((r) => !itens.some((i) => i.id === r.item)).map((r) => ({ id: r.item, t: r.texto }));
  const todos = [...itens, ...extras];
  const respDe = (item) => reg?.respostas?.find((r) => r.item === item.id);
  const v = reg?.valores || {};

  const recebimento = m.layout === 'recebimento' ? `
    <div class="linha2">${campo('Ingrediente ou embalagem', sel('ingrediente', [['', 'Escolha…'], ...[...new Set([...lista('ingredientes'), v.ingrediente].filter(Boolean))].map((x) => [x, x])], v.ingrediente || '', 'required'))}${campo('Fornecedor', inp('fornecedor', v.fornecedor || ''))}</div>
    <div class="linha2">${campo('Lote', inp('lote', v.lote || ''))}${campo('Validade', inp('validade', v.validade || '', 'type="date"'))}</div>` : '';

  const sheet = abrir(`${cab(reg ? `Corrigir ${m.codigo}` : m.codigo, esc(m.titulo))}
    <form class="form" novalidate>
      ${m.provisorio ? aviso('Os itens deste checklist são um <b>rascunho</b> e ainda precisam ser conferidos com o documento original da queijaria.', 'info') : ''}
      ${m.it ? `<p class="mudo" style="margin:0">Como fazer: <b>${esc(m.it)}</b> (Manual de Boas Práticas)</p>` : ''}
      <div class="linha2">${campo('Data', inp('data', reg?.data || data || hoje(), `type="date" max="${hoje()}" required`))}${respCampo(m.pac, reg?.responsavel)}</div>
      ${recebimento}
      <div class="ck-topo"><span class="mudo" data-cont></span><button type="button" class="btn peq" data-todos>${ICON.check} Marcar o que falta como conforme</button></div>
      <div class="ck-lista">${todos.map((it, i) => linhaItem(m, it, i, respDe(it))).join('')}</div>
      ${m.layout === 'recebimento' ? campo('Observação', inp('obs', v.obs || '')) : temObs(m) ? campo('Observações', inp('obs', v.obs || '')) : ''}
      ${camposCorrecao(reg)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${reg ? 'Salvar correção' : 'Salvar checklist'}</button></div>
    </form>`, { largo: true });

  const form = sheet.querySelector('form');
  const ler = () => todos.map((item, i) => {
    const r = {};
    for (const c of m.colunas) { const x = form.querySelector(`input[name="r${i}_${c.id}"]:checked`); if (x) r[c.id] = x.value; }
    return { item: item.id, texto: item.t, r, descricaoNC: form[`d${i}`].value.trim(), acaoCorretiva: form[`a${i}`].value.trim() };
  });
  const atualizar = () => {
    const resps = ler();
    let faltam = 0, ncs = 0;
    resps.forEach((r, i) => {
      const linha = sheet.querySelector(`.ck-i[data-i="${i}"]`);
      const nc = colunasNC(m, r).length > 0;
      if (Object.keys(r.r).length < m.colunas.length) faltam++;
      if (nc) ncs++;
      linha.classList.toggle('nc', nc);
      if (m.layout !== 'matriz') linha.querySelector('.ck-nc').hidden = !nc;
      linha.querySelector('.acao-i').classList.toggle('obrig', nc);
    });
    sheet.querySelector('[data-cont]').innerHTML = `${todos.length - faltam} de ${todos.length} respondidos${ncs ? ` · <b class="mal-t">${ncs} NC</b>` : ''}`;
  };
  form.addEventListener('change', atualizar);
  sheet.querySelector('[data-todos]').onclick = () => {
    todos.forEach((item, i) => m.colunas.forEach((c) => {
      if (form.querySelector(`input[name="r${i}_${c.id}"]:checked`)) return;
      const alvo = form.querySelector(`input[name="r${i}_${c.id}"][value="${esperadoDe(item, c)}"]`);
      if (alvo) alvo.checked = true;
    }));
    atualizar();
  };
  atualizar();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = dados(form);
    const resps = ler();
    if (!d.data) return toast('Informe a data', 'erro');
    if (d.data > hoje()) return toast('A data não pode ser no futuro', 'erro');
    if (!d.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    if (m.layout === 'recebimento' && !d.ingrediente) return toast('Escolha o ingrediente ou a embalagem', 'erro');
    const semResposta = resps.findIndex((r) => Object.keys(r.r).length < m.colunas.length);
    if (semResposta >= 0) { sheet.querySelector(`.ck-i[data-i="${semResposta}"]`).scrollIntoView({ block: 'center', behavior: 'smooth' }); return toast('Responda todos os itens', 'erro'); }
    const faltaNC = resps.findIndex((r) => colunasNC(m, r).length && (!r.acaoCorretiva || (m.layout !== 'matriz' && !r.descricaoNC)));
    if (faltaNC >= 0) { sheet.querySelector(`.ck-i[data-i="${faltaNC}"] .ck-nc input`).focus(); return toast('Descreva a não conformidade e a ação corretiva', 'erro'); }
    // Não deixar dois registros no mesmo período (diário/semanal/mensal)
    if (m.freq !== 'evento') {
      const outro = registroDoPeriodo(m, d.data);
      if (outro && outro.id !== reg?.id) return toast(`Já existe ${m.codigo} para esse período (${fmtData(outro.data)}). Abra esse registro para corrigir.`, 'erro');
    }
    const correcao = reg ? lerCorrecao(d) : null;
    if (reg && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');
    const valores = m.layout === 'recebimento' ? { ingrediente: d.ingrediente, fornecedor: d.fornecedor.trim(), lote: d.lote.trim(), validade: d.validade, obs: d.obs.trim() } : temObs(m) ? { obs: d.obs.trim() } : {};
    lembrarResponsavel(m.pac, d.responsavel.trim());
    await gravar('bpf_registros', { modeloId: m.id, data: d.data, hora: reg?.hora || new Date().toTimeString().slice(0, 5), valores, respostas: resps, responsavel: d.responsavel.trim() }, reg, correcao);
    fechar();
    const nNC = resps.filter((r) => colunasNC(m, r).length).length;
    toast(reg ? 'Correção salva' : `${m.codigo} salvo${nNC ? ` · ${nNC} NC` : ''}`);
  };
}

// O papel tem um campo "Observações" da folha inteira (ex.: PL 03/07).
const temObs = (m) => (m.papel?.caixas || []).some(([k]) => k === 'obs');

export default { render, mount, novo };
