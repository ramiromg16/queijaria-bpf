// Agenda e laudos: PL 01/07 Aferição (mensal) · PL 02/07 Calibração da balança (anual) ·
// PL 02/01 Higiene da caixa d'água (semestral) · Laudos do PAC 08 (leite 3 meses; queijo e água 6 meses).
// Cada tarefa mostra a última vez feita e a próxima data. Não apaga, só corrige.
import { S } from '../core/store.js';
import { ICON, abrir, fechar, cab, toast, pagina, pill, tabela, campo, inp, sel, dados, aviso } from '../core/ui.js';
import { esc, hoje, fmtData, relDias, diffDias } from '../core/format.js';
import { gravar, camposCorrecao, lerCorrecao, lembrarResponsavel } from '../domain/registros.js';
import { respCurto } from '../domain/planilhas.js';
import { EV, INSTRUMENTOS, LAUDOS, itensCaixa } from '../domain/eventos.js';
import { tarefas } from '../domain/agenda.js';
import { respCampo } from './fabricacao.js';

let historico = '';

const seg = (nome, valor) => `<div class="seg">${['C', 'NC'].map((k) => `<label><input type="radio" name="${nome}" value="${k}" ${valor === k ? 'checked' : ''}><span>${k === 'C' ? 'C · Conforme' : 'NC · Não conforme'}</span></label>`).join('')}</div>`;

export function estado(x) {
  if (x.status === 'mes') return pill('Falta neste mês', 'av');
  if (x.status === 'nunca') return pill('Nunca registrado', 'av');
  if (x.status === 'vencido') return pill(`Venceu ${relDias(x.dias)}`, 'mal');
  if (x.status === 'breve') return pill(`Vence ${relDias(x.dias)}`, 'av');
  return pill('Em dia', 'ok');
}

function cartao(x) {
  const nc = x.status === 'vencido';
  return `<div class="ck-card${x.status === 'ok' ? ' feito' : ''}${nc ? ' nc' : ''}">
    <strong>${esc(x.t)}</strong>
    <small class="mudo">${esc(x.s)}</small>
    <div class="ck-estado">${estado(x)}</div>
    <small class="mudo">Última: ${x.ultima ? fmtData(x.ultima) : '—'}${x.proxima && x.status !== 'mes' ? ` · próxima: ${fmtData(x.proxima)}` : ''}</small>
    <div class="ck-acoes"><button class="btn ${x.status === 'ok' ? '' : 'pri'} peq" data-tarefa="${esc(x.id)}">${ICON.mais} Registrar</button></div>
  </div>`;
}

const HIST = {
  'PL-01-07': () => [S.bpf_registros.filter((r) => r.modeloId === 'PL-01-07'), [
    { t: 'Data', k: (r) => `<b>${fmtData(r.data)}</b>` },
    ...INSTRUMENTOS.map(([k, n]) => ({ t: n, k: (r) => (r.valores?.[k] === 'NC' ? pill('NC', 'mal') : esc(r.valores?.[k] || '')) })),
    { t: 'Obs.', k: (r) => esc(r.valores?.obs || '') },
  ]],
  'PL-02-07': () => [S.bpf_registros.filter((r) => r.modeloId === 'PL-02-07'), [
    { t: 'Data', k: (r) => `<b>${fmtData(r.data)}</b>` },
    { t: 'Balança', k: (r) => (r.valores?.balanca === 'NC' ? pill('NC', 'mal') : esc(r.valores?.balanca || '')) },
    { t: 'Observações', k: (r) => esc(r.valores?.obs || '') },
  ]],
  'PL-02-01': () => [S.bpf_registros.filter((r) => r.modeloId === 'PL-02-01'), [
    { t: 'Data', k: (r) => `<b>${fmtData(r.data)}</b>` },
    { t: 'O que foi feito', k: (r) => esc((r.valores?.itens || []).map((i) => i.item).join(' · ')) },
    { t: 'Observação', k: (r) => esc((r.valores?.itens || []).map((i) => i.obs).filter(Boolean).join(' · ')) },
  ]],
  LAUDOS: () => [S.laudos, [
    { t: 'Coleta', k: (r) => `<b>${fmtData(r.data)}</b>` },
    { t: 'Tipo', k: (r) => esc(LAUDOS[r.tipo]?.nome || r.tipo) },
    { t: 'Laboratório', k: (r) => esc(r.laboratorio || '') },
    { t: 'Resultado', k: (r) => (r.resultado === 'NC' ? pill('Não conforme', 'mal') : r.resultado === 'C' ? pill('Conforme', 'ok') : pill('Aguardando', 'av')) },
    { t: 'Arquivado em', k: (r) => esc(r.arquivo || '') },
  ]],
};

function render() {
  const ts = tarefas();
  const ordem = { vencido: 0, nunca: 1, mes: 2, breve: 3, ok: 4 };
  const cards = [...ts].sort((a, b) => ordem[a.status] - ordem[b.status]).map(cartao).join('');
  const aguardando = S.laudos.filter((l) => !l.resultado);
  const botoesHist = ['PL-01-07', 'PL-02-07', 'PL-02-01', 'LAUDOS'].map((id) => `<button class="btn ${historico === id ? 'pri' : ''} peq" data-hist="${id}">${EV(id).codigo} ${esc(EV(id).titulo)}</button>`).join('');
  let hist = '';
  if (historico) {
    const [regs, cols] = HIST[historico]();
    const l = [...regs].sort((a, b) => (a.data < b.data ? 1 : -1));
    hist = `<div class="painel plano" style="margin-top:12px"><h3>${EV(historico).codigo} · ${esc(EV(historico).titulo)}</h3>${tabela([...cols, { t: 'Resp.', k: (r) => respCurto(r.responsavel) }, { t: '', k: (r) => (r.editadoEm ? pill('Corrigido', 'av') : '') }], l, { clique: (r) => `data-abrir="${historico}" data-reg="${r.id}"`, vazioMsg: 'Nenhum registro ainda.' }).replace('class="tab"', 'class="tab cartoes"')}</div>`;
  }
  const nunca = ts.filter((x) => x.status === 'nunca').length;
  return pagina('Agenda e laudos', 'Aferição · calibração da balança · higiene da caixa d’água · análises de laboratório', `<button class="btn pri" data-laudo="">${ICON.mais} Registrar laudo</button>`, `
    ${nunca ? aviso(`<b>${nunca} tarefa(s) sem nenhum registro.</b> Se já foram feitas antes de usar o app, registre a data da última vez (pode ser uma data passada): assim o app calcula a próxima.`, 'info') : ''}
    ${aguardando.length ? aviso(`<b>${aguardando.length} laudo(s) aguardando resultado.</b> Quando o laudo chegar, abra o registro e informe o resultado.`, '') : ''}
    <div class="ck-grade">${cards}</div>
    <h3 class="ck-grupo" style="margin-top:24px">Histórico</h3>
    <div class="pg-acoes" style="flex-wrap:wrap">${botoesHist}</div>
    ${hist}`);
}

function mount(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tarefa],[data-hist],[data-abrir],[data-laudo]');
    if (!b) return;
    if (b.dataset.hist) { historico = historico === b.dataset.hist ? '' : b.dataset.hist; return window.dispatchEvent(new Event('rerender')); }
    if (b.hasAttribute('data-laudo')) return laudo(b.dataset.laudo || 'leite');
    if (b.dataset.abrir) return b.dataset.abrir === 'LAUDOS' ? laudo(null, b.dataset.reg) : registro(b.dataset.abrir, b.dataset.reg);
    abrirTarefa(tarefas().find((x) => x.id === b.dataset.tarefa));
  });
}

export function abrirTarefa(x) {
  if (!x) return;
  if (x.abre.tipo === 'laudo') return laudo(x.abre.laudo);
  return registro(x.abre.tipo, null, x.abre.item);
}

// ---------- PL 01/07 · PL 02/07 · PL 02/01 ----------
const FORM = {
  'PL-01-07': {
    nome: 'Aferição dos instrumentos', pac: '07',
    ajuda: 'Termômetro: copo com gelo picado e água gelada, haste no meio do copo por pelo menos 15 segundos; deve marcar 0 °C. Balança: limpar e conferir com um peso padrão. Se não estiver certo, trocar o equipamento.',
    campos: (v) => `${INSTRUMENTOS.map(([k, n]) => campo(n, seg(k, v[k] ?? 'C'))).join('')}
      ${campo('Observações', inp('obs', v.obs || ''))}
      ${campo('Ação corretiva', inp('acao', v.acao || ''), '', 'acao')}`,
    ler: (d) => ({ ...Object.fromEntries(INSTRUMENTOS.map(([k]) => [k, d[k] || ''])), obs: d.obs.trim(), acao: d.acao.trim() }),
  },
  'PL-02-07': {
    nome: 'Calibração da balança', pac: '07',
    ajuda: 'Feita por empresa especializada. Guarde o certificado de calibração para mostrar à fiscalização.',
    campos: (v) => `${campo('Balança', seg('balanca', v.balanca ?? 'C'))}
      ${campo('Observações', inp('obs', v.obs || '', 'placeholder="Ex.: empresa, nº do certificado, onde está guardado"'))}
      ${campo('Ação corretiva', inp('acao', v.acao || ''), '', 'acao')}`,
    ler: (d) => ({ balanca: d.balanca || '', obs: d.obs.trim(), acao: d.acao.trim() }),
  },
  'PL-02-01': {
    nome: 'Higiene da caixa d’água', pac: '01',
    ajuda: 'Marque o que foi feito nesta data. Cada caixa tem prazo de 6 meses.',
    campos: (v, marcar) => {
      const feitos = v.itens || [];
      return `<fieldset><legend>O que foi feito</legend>${itensCaixa().map((item, i) => {
        const f = feitos.find((x) => x.item === item);
        const on = f || (!feitos.length && marcar === item);
        return `<div class="caixa-i"><label class="check"><input type="checkbox" name="it${i}" value="${esc(item)}" ${on ? 'checked' : ''}><span>${esc(item)}</span></label>${inp(`obs${i}`, f?.obs || '', 'placeholder="Observação"')}</div>`;
      }).join('')}</fieldset>`;
    },
    ler: (d) => ({ itens: itensCaixa().map((item, i) => (d[`it${i}`] ? { item, obs: (d[`obs${i}`] || '').trim() } : null)).filter(Boolean) }),
  },
};

export function registro(id, regId, marcar) {
  const f = FORM[id];
  const ev = EV(id);
  const r = regId ? S.bpf_registros.find((x) => x.id === regId) : null;
  const v = r?.valores || {};
  const sheet = abrir(`${cab(r ? `Corrigir: ${f.nome.toLowerCase()}` : f.nome, `${ev.codigo} · ${esc(ev.titulo)} · ${esc(ev.frequencia)}`)}
    <form class="form" novalidate>
      <p class="mudo" style="margin:0">${esc(f.ajuda)}</p>
      ${campo('Data', inp('data', r?.data || hoje(), `type="date" max="${hoje()}" required`), r ? '' : 'se foi feito antes, coloque a data em que foi feito')}
      ${f.campos(v, marcar)}
      <div data-alertas></div>
      ${respCampo(f.pac, r?.responsavel)}
      ${camposCorrecao(r)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${r ? 'Salvar correção' : 'Salvar'}</button></div>
    </form>`);
  const form = sheet.querySelector('form');
  const atualizar = () => {
    const p = ev.problemas({ valores: f.ler(dados(form)) });
    sheet.querySelector('[data-alertas]').innerHTML = p.length ? aviso(`<b>Não conforme:</b> ${p.map(esc).join(' · ')}.<br>Descreva a ação corretiva.`, 'mal') : '';
    sheet.querySelector('.acao')?.classList.toggle('obrig', p.length > 0);
  };
  form.addEventListener('change', atualizar);
  atualizar();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = dados(form);
    const val = f.ler(d);
    if (!d.data) return toast('Informe a data', 'erro');
    if (id === 'PL-02-01' && !val.itens.length) return toast('Marque o que foi feito', 'erro');
    if (form.acao && ev.problemas({ valores: val }).length && !val.acao) { form.acao.focus(); return toast('Descreva a ação corretiva', 'erro'); }
    if (!d.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    const correcao = r ? lerCorrecao(d) : null;
    if (r && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');
    if (!r && id === 'PL-01-07' && S.bpf_registros.some((x) => x.modeloId === id && x.data.slice(0, 7) === d.data.slice(0, 7))) return toast('A aferição deste mês já foi registrada. Abra pelo histórico para corrigir.', 'erro');
    lembrarResponsavel(f.pac, d.responsavel.trim());
    await gravar('bpf_registros', { modeloId: id, data: d.data, hora: '', valores: val, respostas: [], responsavel: d.responsavel.trim() }, r, correcao);
    fechar();
    toast(r ? 'Correção salva' : `${f.nome}: registrado`);
  };
}

// ---------- Laudos (PAC 08) ----------
export function laudo(tipo, id) {
  const l = id ? S.laudos.find((x) => x.id === id) : null;
  const b = l || { tipo: tipo || 'leite', data: hoje(), analises: LAUDOS[tipo || 'leite'].analises };
  const sheet = abrir(`${cab(l ? 'Corrigir laudo' : 'Registrar laudo', 'PAC 08 · Controles laboratoriais e análises')}
    <form class="form" novalidate>
      <p class="mudo" style="margin:0">O laudo em papel continua arquivado na queijaria. Aqui você anota a coleta, o resultado e onde o papel está guardado. Pode registrar a coleta agora e o resultado quando chegar.</p>
      <div class="linha2">${campo('Tipo', sel('tipo', Object.entries(LAUDOS).map(([k, x]) => [k, x.nome]), b.tipo))}${campo('Data da coleta', inp('data', b.data, `type="date" max="${hoje()}" required`))}</div>
      ${campo('Análises', `<textarea name="analises" rows="3">${esc(b.analises || '')}</textarea>`)}
      ${campo('Laboratório', inp('laboratorio', b.laboratorio || '', `list="dl-lab"`))}<datalist id="dl-lab">${[...new Set(S.laudos.map((x) => x.laboratorio).filter(Boolean))].map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="linha2">${campo('Data do resultado', inp('dataResultado', b.dataResultado || '', 'type="date"'))}${campo('Resultado', `<div class="seg">${[['', 'Aguardando'], ['C', 'Conforme'], ['NC', 'Não conforme']].map(([k, t]) => `<label><input type="radio" name="resultado" value="${k}" ${(b.resultado || '') === k ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>`)}</div>
      ${campo('Onde o laudo está arquivado', inp('arquivo', b.arquivo || '', 'placeholder="Ex.: pasta PAC 08 no escritório"'))}
      ${campo('Observação', inp('obs', b.obs || ''))}
      ${campo('Ação corretiva', inp('acao', b.acao || '', 'placeholder="Ex.: corrigir a causa e coletar nova amostra"'), '', 'acao')}
      ${respCampo('08', l?.responsavel)}
      ${camposCorrecao(l)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${l ? 'Salvar correção' : 'Salvar'}</button></div>
    </form>`);
  const form = sheet.querySelector('form');
  // Informar o resultado que chegou depois não é "erro": já deixa o motivo escrito.
  if (l && !l.resultado && form.corrMotivo) form.corrMotivo.value = 'Resultado do laudo informado';
  form.tipo.addEventListener('change', () => {
    // Troca o texto das análises se ainda estiver o texto padrão.
    if (Object.values(LAUDOS).some((x) => x.analises === form.analises.value) || !form.analises.value) form.analises.value = LAUDOS[form.tipo.value].analises;
  });
  const atualizar = () => sheet.querySelector('.acao').classList.toggle('obrig', form.resultado.value === 'NC');
  form.addEventListener('change', atualizar);
  atualizar();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = dados(form);
    if (!d.data) return toast('Informe a data da coleta', 'erro');
    if (d.resultado === 'NC' && !d.acao.trim()) { form.acao.focus(); return toast('Descreva a ação corretiva', 'erro'); }
    if (d.resultado && !d.dataResultado) return toast('Informe a data do resultado', 'erro');
    if (d.dataResultado && diffDias(d.data, d.dataResultado) < 0) return toast('A data do resultado está antes da coleta', 'erro');
    if (!d.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    const correcao = l ? lerCorrecao(d) : null;
    if (l && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');
    lembrarResponsavel('08', d.responsavel.trim());
    await gravar('laudos', { tipo: d.tipo, data: d.data, analises: d.analises.trim(), laboratorio: d.laboratorio.trim(), dataResultado: d.dataResultado, resultado: d.resultado || '', arquivo: d.arquivo.trim(), obs: d.obs.trim(), acao: d.acao.trim(), responsavel: d.responsavel.trim() }, l, correcao);
    fechar();
    toast(l ? 'Correção salva' : 'Laudo registrado');
  };
}

export default { render, mount };
