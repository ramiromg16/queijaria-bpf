// Colaboradores: cadastro, PL 02/03 "Periódicos" (exames periódicos e afastamentos) e treinamentos.
// PL 02/03 no papel: Nome | Data Nascimento | Cargo | Exames Periódico (Programar | Realizar)
//   + "Obs.: Funcionário afastado: ___ Motivo: ___ Data: ___" + Responsável. Frequência: anual.
// Treinamentos: o PAC 03 diz que "um relatório é gerado com o assunto abordado e todos os
//   participantes assinam o documento". Não há modelo em papel: a folha é do app.
// Dados:
//   colaboradores: { nome, nascimento, cargo, ativo }
//   bpf_registros (modeloId 'PL-02-03'): { data, valores: { tipo: 'exame'|'afastamento', colaboradorId, ano, programar, realizar, motivo }, responsavel }
//   treinamentos:  { data, assunto, instrutor, conteudo, participantes: [colaboradorId], responsavel }
// Registro de exame, afastamento e treinamento não é apagado, só corrigido.
import { S, salvar } from '../core/store.js';
import { ICON, abrir, fechar, cab, toast, pagina, pill, tabela, campo, inp, dados, vazio, aviso } from '../core/ui.js';
import { esc, hoje, fmtData } from '../core/format.js';
import { gravar, camposCorrecao, lerCorrecao, lembrarResponsavel } from '../domain/registros.js';
import { respCampo } from './fabricacao.js';

const PAC = '03';
let ano = '';

export const colab = (id) => S.colaboradores.find((c) => c.id === id);
export const ativos = () => [...S.colaboradores].filter((c) => c.ativo !== false).sort((a, b) => (a.nome < b.nome ? -1 : 1));
export const regs0203 = () => S.bpf_registros.filter((r) => r.modeloId === 'PL-02-03');
export const exameDe = (cid, a) => regs0203().find((r) => r.valores?.tipo === 'exame' && r.valores.colaboradorId === cid && r.valores.ano === a);
// Exames programados que já passaram da data e não foram realizados.
export const examesAtrasados = () => regs0203().filter((r) => r.valores?.tipo === 'exame' && r.valores.programar && !r.valores.realizar && r.valores.programar < hoje());

function render() {
  const a = ano || hoje().slice(0, 4);
  const cols = ativos();
  const afast = regs0203().filter((r) => r.valores?.tipo === 'afastamento' && r.data.startsWith(a)).sort((x, y) => (x.data < y.data ? 1 : -1));
  const treins = [...S.treinamentos].sort((x, y) => (x.data < y.data ? 1 : -1));
  const atras = examesAtrasados();

  const tabCol = cols.length ? `<div class="painel plano">${tabela([
    { t: 'Nome', k: (c) => `<b>${esc(c.nome)}</b>` },
    { t: 'Data nascimento', k: (c) => (c.nascimento ? fmtData(c.nascimento) : '') },
    { t: 'Cargo', k: (c) => esc(c.cargo || '') },
    { t: `Exame ${a}: programar`, k: (c) => { const e = exameDe(c.id, a); return e?.valores.programar ? fmtData(e.valores.programar) : ''; } },
    { t: 'Realizar', k: (c) => { const e = exameDe(c.id, a); return e?.valores.realizar ? fmtData(e.valores.realizar) : e?.valores.programar && e.valores.programar < hoje() ? pill('Atrasado', 'mal') : ''; } },
    { t: '', k: (c) => `<button class="btn peq" data-exame="${c.id}">Exame</button> <button class="btn peq fant" data-cad="${c.id}">Cadastro</button>` },
  ], cols).replace('class="tab"', 'class="tab cartoes"')}</div>`
    : vazio('Nenhum colaborador cadastrado', 'Cadastre quem trabalha na queijaria. Os nomes aparecem na PL 02/03 (exames periódicos) e na lista de presença dos treinamentos.', '<button class="btn pri" data-cad="">Cadastrar colaborador</button>');

  const tabAf = afast.length ? tabela([
    { t: 'Data', k: (r) => fmtData(r.data) },
    { t: 'Funcionário afastado', k: (r) => esc(colab(r.valores.colaboradorId)?.nome || '') },
    { t: 'Motivo', k: (r) => esc(r.valores.motivo || '') },
    { t: '', k: (r) => (r.editadoEm ? pill('Corrigido', 'av') : '') },
  ], afast, { clique: (r) => `data-af="${r.id}"` }).replace('class="tab"', 'class="tab cartoes"') : `<p class="mudo">Nenhum afastamento em ${a}.</p>`;

  const tabTr = treins.length ? tabela([
    { t: 'Data', k: (r) => `<b>${fmtData(r.data)}</b>` },
    { t: 'Assunto', k: (r) => esc(r.assunto) },
    { t: 'Instrutor', k: (r) => esc(r.instrutor || '') },
    { t: 'Participantes', cls: 'num', k: (r) => (r.participantes || []).length },
    { t: '', k: (r) => (r.editadoEm ? pill('Corrigido', 'av') : '') },
  ], treins, { clique: (r) => `data-tr="${r.id}"` }).replace('class="tab"', 'class="tab cartoes"') : '<p class="mudo">Nenhum treinamento registrado.</p>';

  return pagina('Colaboradores', 'PL 02/03 Periódicos · afastamentos · treinamentos', `<button class="btn pri" data-cad="">${ICON.mais} Colaborador</button>`, `
    <div class="filtros"><input type="number" min="2020" max="2100" value="${a}" data-ano aria-label="Ano" style="width:110px"><span class="mudo">A PL 02/03 é anual: uma folha por ano.</span></div>
    ${atras.length ? aviso(`<b>${atras.length} exame(s) periódico(s) atrasado(s)</b>: ${atras.map((r) => esc(colab(r.valores.colaboradorId)?.nome || '?')).join(', ')}.`, 'mal') : ''}
    <h3 class="sec">Exames periódicos (PL 02/03)</h3>${tabCol}
    <h3 class="sec">Afastamentos <button class="btn peq" data-af="">${ICON.mais} Registrar</button></h3>${tabAf}
    <h3 class="sec">Treinamentos <button class="btn peq" data-tr="">${ICON.mais} Registrar</button></h3>${tabTr}`);
}

function mount(el) {
  el.querySelector('[data-ano]')?.addEventListener('change', (e) => { ano = String(e.target.value); window.dispatchEvent(new Event('rerender')); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cad],[data-exame],[data-af],[data-tr]');
    if (!b) return;
    if (b.dataset.cad !== undefined) cadastro(b.dataset.cad);
    else if (b.dataset.exame) exame(b.dataset.exame);
    else if (b.dataset.af !== undefined) afastamento(b.dataset.af);
    else treinamento(b.dataset.tr);
  });
}

// Cadastro (nome, nascimento, cargo). Quem sai da queijaria fica inativo, não é apagado.
function cadastro(id) {
  const c = id ? colab(id) : null;
  const sheet = abrir(`${cab(c ? 'Cadastro do colaborador' : 'Novo colaborador', 'Aparece na PL 02/03 e nos treinamentos')}
    <form class="form" novalidate>
      ${campo('Nome', inp('nome', c?.nome || '', 'required'))}
      <div class="linha2">${campo('Data de nascimento', inp('nascimento', c?.nascimento || '', 'type="date"'))}${campo('Cargo', inp('cargo', c?.cargo || ''))}</div>
      ${c ? `<label class="check"><input type="checkbox" name="inativo" ${c.ativo === false ? 'checked' : ''}><span>Não trabalha mais na queijaria (sai das próximas folhas, o histórico fica guardado)</span></label>` : ''}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">Salvar</button></div>
    </form>`);
  const form = sheet.querySelector('form');
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = dados(form);
    if (!v.nome.trim()) return toast('Informe o nome', 'erro');
    await salvar('colaboradores', { ...(c || {}), nome: v.nome.trim(), nascimento: v.nascimento, cargo: v.cargo.trim(), ativo: !v.inativo });
    fechar();
    toast('Colaborador salvo');
  };
}

// Mudou algo que já estava preenchido? Então é correção (pede quem e por quê).
const mudouPreenchido = (antes, depois) => Object.keys(antes || {}).some((k) => antes[k] && antes[k] !== depois[k]);

function exame(cid) {
  const a = ano || hoje().slice(0, 4);
  const c = colab(cid);
  const r = exameDe(cid, a);
  const v0 = r?.valores || {};
  const sheet = abrir(`${cab(`Exame periódico ${a}`, `${esc(c?.nome || '')} · PL 02/03`)}
    <form class="form" novalidate>
      <div class="linha2">${campo('Programar (data marcada)', inp('programar', v0.programar || '', 'type="date"'))}${campo('Realizar (data em que fez)', inp('realizar', v0.realizar || '', `type="date" max="${hoje()}"`))}</div>
      ${respCampo(PAC, r?.responsavel)}
      ${camposCorrecao(r)}
      <p class="mudo" style="margin:0">Preencher uma data que estava em branco não é correção. Mudar uma data já preenchida pede quem corrigiu e o motivo.</p>
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">Salvar</button></div>
    </form>`);
  const form = sheet.querySelector('form');
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = dados(form);
    if (!v.programar && !v.realizar) return toast('Informe a data a programar ou a data realizada', 'erro');
    if (!v.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    const valores = { tipo: 'exame', colaboradorId: cid, ano: a, programar: v.programar, realizar: v.realizar };
    const doc = { modeloId: 'PL-02-03', data: v.realizar || v.programar, valores, responsavel: v.responsavel.trim() };
    lembrarResponsavel(PAC, v.responsavel.trim());
    if (r && mudouPreenchido({ programar: v0.programar, realizar: v0.realizar }, valores)) {
      const correcao = lerCorrecao(v);
      if (!correcao?.por || !correcao.motivo) return toast('Informe quem está corrigindo e o motivo', 'erro');
      await gravar('bpf_registros', doc, r, correcao);
    } else await salvar('bpf_registros', { ...(r || {}), ...doc });
    fechar();
    toast('Exame salvo');
  };
}

function afastamento(id) {
  const r = id ? S.bpf_registros.find((x) => x.id === id) : null;
  const v0 = r?.valores || {};
  const lista = ativos();
  if (r && !lista.some((c) => c.id === v0.colaboradorId) && colab(v0.colaboradorId)) lista.push(colab(v0.colaboradorId));
  if (!lista.length) return toast('Cadastre os colaboradores primeiro', 'erro');
  const sheet = abrir(`${cab(r ? 'Corrigir afastamento' : 'Funcionário afastado', 'Sai no "Obs." da PL 02/03')}
    <form class="form" novalidate>
      ${campo('Funcionário afastado', `<select name="colaboradorId" required><option value="">Escolha…</option>${lista.map((c) => `<option value="${c.id}" ${c.id === v0.colaboradorId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>`)}
      <div class="linha2">${campo('Data', inp('data', r?.data || hoje(), `type="date" max="${hoje()}" required`))}${campo('Motivo', inp('motivo', v0.motivo || '', 'required'))}</div>
      ${respCampo(PAC, r?.responsavel)}
      ${camposCorrecao(r)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${r ? 'Salvar correção' : 'Salvar'}</button></div>
    </form>`);
  const form = sheet.querySelector('form');
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = dados(form);
    if (!v.colaboradorId || !v.data || !v.motivo.trim()) return toast('Informe o funcionário, a data e o motivo', 'erro');
    if (!v.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    const correcao = r ? lerCorrecao(v) : null;
    if (r && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');
    lembrarResponsavel(PAC, v.responsavel.trim());
    await gravar('bpf_registros', { modeloId: 'PL-02-03', data: v.data, valores: { tipo: 'afastamento', colaboradorId: v.colaboradorId, motivo: v.motivo.trim() }, responsavel: v.responsavel.trim() }, r, correcao);
    fechar();
    toast(r ? 'Correção salva' : 'Afastamento registrado');
  };
}

function treinamento(id) {
  const r = id ? S.treinamentos.find((x) => x.id === id) : null;
  const lista = ativos();
  for (const pid of r?.participantes || []) if (!lista.some((c) => c.id === pid) && colab(pid)) lista.push(colab(pid));
  const sheet = abrir(`${cab(r ? 'Corrigir treinamento' : 'Registrar treinamento', 'Relatório com o assunto e a lista de presença para assinar (PAC 03)')}
    <form class="form" novalidate>
      <div class="linha2">${campo('Data', inp('data', r?.data || hoje(), `type="date" required`))}${campo('Instrutor', inp('instrutor', r?.instrutor || ''))}</div>
      ${campo('Assunto', inp('assunto', r?.assunto || '', 'required placeholder="Ex.: Higienização das mãos (IT 02/03)"'))}
      ${campo('Conteúdo abordado', `<textarea name="conteudo" rows="3">${esc(r?.conteudo || '')}</textarea>`)}
      <div class="campo"><span>Participantes</span>${lista.length ? lista.map((c) => `<label class="check"><input type="checkbox" name="p_${c.id}" ${(r?.participantes || []).includes(c.id) ? 'checked' : ''}><span>${esc(c.nome)}</span></label>`).join('') : '<p class="mudo">Cadastre os colaboradores para marcar quem participou.</p>'}</div>
      ${respCampo(PAC, r?.responsavel)}
      ${camposCorrecao(r)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${r ? 'Salvar correção' : 'Salvar'}</button></div>
    </form>`, { largo: true });
  const form = sheet.querySelector('form');
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = dados(form);
    if (!v.data || !v.assunto.trim()) return toast('Informe a data e o assunto', 'erro');
    if (!v.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    const participantes = lista.filter((c) => v[`p_${c.id}`]).map((c) => c.id);
    const correcao = r ? lerCorrecao(v) : null;
    if (r && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');
    lembrarResponsavel(PAC, v.responsavel.trim());
    await gravar('treinamentos', { data: v.data, assunto: v.assunto.trim(), instrutor: v.instrutor.trim(), conteudo: v.conteudo.trim(), participantes, responsavel: v.responsavel.trim() }, r, correcao);
    fechar();
    toast(r ? 'Correção salva' : 'Treinamento registrado. Imprima a lista de presença em Imprimir mês.');
  };
}

export default { render, mount };
