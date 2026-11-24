// Fabricação do dia: um formulário que alimenta PL 01/05, 01/06, 01/09 e 02/09.
// Data, volume e temperatura do leite são digitados uma vez só.
import { S } from '../core/store.js';
import { ICON, abrir, fechar, cab, toast, confirmar, pagina, pill, tabela, campo, inp, numInp, sel, dados, vazio, aviso } from '../core/ui.js';
import { dec, int, num, esc, hoje, fmtData, mesDe, nomeMes } from '../core/format.js';
import { fora, normDensidade, fmtFaixa } from '../domain/faixas.js';
import { gravar, camposCorrecao, lerCorrecao, responsavelPadrao, lembrarResponsavel, nomesResponsaveis, gerarLote } from '../domain/registros.js';
import { problemasFab, respCurto } from '../domain/planilhas.js';

const PAC = '09';
let mesFiltro = '';

const vz = (v) => v === '' || v == null;
const numOuNulo = (v) => (vz(v) ? null : num(v));
const cncSeg = (nome, valor) => `<div class="seg">${['C', 'NC'].map((k) => `<label><input type="radio" name="${nome}" value="${k}" ${valor === k ? 'checked' : ''}><span>${k === 'C' ? 'C · Conforme' : 'NC · Não conforme'}</span></label>`).join('')}</div>`;
export const respCampo = (pac, valor) => `${campo('Responsável', inp('responsavel', valor || responsavelPadrao(pac), 'list="dl-resp" required'))}<datalist id="dl-resp">${nomesResponsaveis().map((n) => `<option value="${esc(n)}">`).join('')}</datalist>`;

export const doDia = (data) => S.fabricacoes.filter((f) => f.data === data);

function status(f) {
  if (f.semFabricacao) return pill('Não houve fabricação');
  const p = problemasFab(f);
  return `${p.length ? pill(`${p.length} NC`, 'mal') : pill('Conforme', 'ok')}${f.editadoEm ? ` ${pill('Corrigido', 'av')}` : ''}`;
}

function render() {
  const mes = mesFiltro || mesDe(hoje());
  const lista = S.fabricacoes.filter((f) => mesDe(f.data) === mes).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : (b.criado || 0) - (a.criado || 0)));
  const fabs = lista.filter((f) => !f.semFabricacao);
  const litros = fabs.reduce((s, f) => s + (+f.volumeLeite || 0), 0);
  const kg = fabs.reduce((s, f) => s + (f.produtos || []).reduce((t, p) => t + (+p.kg || 0), 0), 0);
  const hojeFeito = doDia(hoje()).length > 0;

  const acoes = `${hojeFeito ? '' : `<button class="btn" data-sem>Hoje não houve fabricação</button>`}<button class="btn pri" data-novo>${ICON.mais} Registrar fabricação</button>`;
  const filtro = `<div class="filtros"><input type="month" value="${mes}" data-mes aria-label="Mês"><span class="mudo">${fabs.length} fabricações · ${int(litros)} L de leite · ${dec(kg, 1)} kg produzidos em ${nomeMes(mes)}</span></div>`;
  const corpo = lista.length ? `<div class="painel plano">${tabela([
    { t: 'Data', k: (f) => `<b>${fmtData(f.data)}</b>` },
    { t: 'Leite', cls: 'num', k: (f) => (f.semFabricacao ? '—' : `${int(f.volumeLeite)} L`) },
    { t: 'Cozimento', cls: 'num', k: (f) => (f.semFabricacao || vz(f.tempCozimento) ? '—' : `${dec(f.tempCozimento, 0)} °C`) },
    { t: 'Mexedura', cls: 'num', k: (f) => (f.semFabricacao || vz(f.tempoMexedura) ? '—' : `${int(f.tempoMexedura)} min`) },
    { t: 'Produtos e lotes', k: (f) => (f.produtos || []).map((p) => `<span class="cod">${esc(p.lote)}</span> <span class="mudo">${esc(S.produtos.find((x) => x.id === p.produtoId)?.nome || '')} · ${dec(p.kg, 1)} kg</span>`).join('<br>') || '<span class="mudo">—</span>' },
    { t: 'Resp.', k: (f) => respCurto(f.responsavel) },
    { t: 'Situação', k: status },
  ], lista, { clique: (f) => `data-f="${f.id}"` }).replace('class="tab"', 'class="tab cartoes"')}</div>`
    : vazio('Nenhuma fabricação neste mês', 'Registre a fabricação de cada dia: recepção do leite, temperaturas, formulação e os queijos produzidos. Num dia sem fabricação, marque "não houve fabricação".', '<button class="btn pri" data-novo>Registrar fabricação</button>');

  return pagina('Fabricação do dia', 'PL 01/05 Leite · PL 01/06 Temperatura · PL 01/09 Formulação · PL 02/09 Produtos', acoes, filtro + corpo);
}

function mount(el) {
  el.querySelector('[data-mes]')?.addEventListener('change', (e) => { mesFiltro = e.target.value; window.dispatchEvent(new Event('rerender')); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-novo],[data-sem],[data-f]');
    if (!b) return;
    if (b.hasAttribute('data-novo')) return novo();
    if (b.hasAttribute('data-sem')) return semFabricacao(hoje());
    novo(b.dataset.f);
  });
}

// Marca que não houve fabricação no dia (para a PL não sair como "não preenchido").
export async function semFabricacao(data) {
  if (doDia(data).length) return toast('Esse dia já tem registro de fabricação', 'erro');
  const sheet = abrir(`${cab('Não houve fabricação', fmtData(data))}
    <form class="form">
      <p style="margin:0">Nas planilhas de fabricação deste dia vai aparecer <b>"não houve fabricação neste dia"</b>, em vez de "não preenchido".</p>
      ${campo('Data', inp('data', data, 'type="date" required'))}
      ${respCampo(PAC)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">Confirmar</button></div>
    </form>`);
  const f = sheet.querySelector('form');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const v = dados(f);
    if (doDia(v.data).length) return toast('Esse dia já tem registro de fabricação', 'erro');
    lembrarResponsavel(PAC, v.responsavel);
    await gravar('fabricacoes', { data: v.data, semFabricacao: true, responsavel: v.responsavel.trim() });
    fechar();
    toast(`${fmtData(v.data)}: sem fabricação`);
  };
}

const linhaProduto = (item = {}) => `<div class="item-linha" data-item>
  ${campo('Produto', sel('produtoId', [['', 'Escolha…'], ...S.produtos.filter((p) => p.ativo !== false || p.id === item.produtoId).sort((a, b) => (a.codigo < b.codigo ? -1 : 1)).map((p) => [p.id, `${p.codigo} · ${p.nome}`])], item.produtoId || ''))}
  ${campo('Peças', numInp('pecas', item.pecas ?? ''))}
  ${campo('Kg', numInp('kg', vz(item.kg) ? '' : dec(item.kg, 2)))}
  <button type="button" class="ic" data-tirar aria-label="Tirar produto">${ICON.fechar}</button>
  <div class="item-info">${item.lote ? `Lote <b class="cod">${esc(item.lote)}</b>` : 'O lote é gerado ao salvar'}</div>
  <input type="hidden" name="lote" value="${esc(item.lote || '')}">
</div>`;

export function novo(id, { data } = {}) {
  let f = id ? S.fabricacoes.find((x) => x.id === id) : null;
  // Dia marcado como "não houve fabricação": registrar a fabricação vira uma correção desse registro.
  if (!f && data) f = doDia(data).find((x) => x.semFabricacao) || null;
  const b = f && !f.semFabricacao ? f : { data: f?.data || data || hoje(), horaRecepcao: '', produtos: [] };
  const sheet = abrir(`${cab(f ? (f.semFabricacao ? 'Registrar fabricação (corrige "não houve")' : 'Corrigir fabricação') : 'Fabricação do dia', f ? fmtData(b.data) : 'Recepção do leite, temperaturas, formulação e produtos')}
  <form class="form" novalidate>
    <div class="linha2">${campo('Data da fabricação', inp('data', b.data, 'type="date" required'))}${respCampo(PAC, b.responsavel)}</div>

    <fieldset><legend>Leite · PL 01/05</legend>
      <div class="linha3">
        ${campo('Horário de recepção', inp('horaRecepcao', b.horaRecepcao || '', 'type="time"'))}
        ${campo('Volume de leite (L)', numInp('volumeLeite', b.volumeLeite ?? '', 'required'), 'aparece em todas as PLs')}
        ${campo('Temperatura do leite (°C)', numInp('tempLeite', b.tempLeite ?? ''), 'no início da fabricação')}
      </div>
      ${campo('Análise sensorial', cncSeg('sensorial', b.sensorial), 'Íntegro: líquido branco opalescente homogêneo, com odor característico')}
      ${campo('Alizarol', cncSeg('alizarol', b.alizarol))}
      <div class="linha2">
        ${campo('Acidez Dornic (°D)', numInp('dornic', b.dornic ?? ''), `faixa: ${fmtFaixa('dornic')}`)}
        ${campo('Densidade (termolactodensímetro)', numInp('densidade', vz(b.densidade) ? '' : dec(b.densidade, 3)), `ex.: 1,030 ou 30 · faixa: ${fmtFaixa('densidade')}`)}
      </div>
    </fieldset>

    <fieldset><legend>Temperatura na fabricação · PL 01/06</legend>
      <div class="linha2">
        ${campo('Temperatura do cozimento/mexedura (°C)', numInp('tempCozimento', b.tempCozimento ?? ''), `faixa: ${fmtFaixa('tempCozimento')}`)}
        ${campo('Tempo de mexedura (min)', numInp('tempoMexedura', b.tempoMexedura ?? ''), `faixa: ${fmtFaixa('tempoMexedura')}`)}
      </div>
    </fieldset>

    <fieldset><legend>Formulação · PL 01/09</legend>
      <div class="linha3">
        ${campo('Acidez do leite (°D)', numInp('acidezLeite', b.acidezLeite ?? ''), 'na hora da fabricação')}
        ${campo('Soro/fermento (quantidade)', inp('fermento', b.fermento || '', 'placeholder="Ex.: 2 L"'))}
        ${campo('Acidez do soro (°D)', numInp('acidezSoro', b.acidezSoro ?? ''))}
      </div>
      <div class="linha2">
        ${campo('Coalho (quantidade)', inp('coalho', b.coalho || '', 'placeholder="Ex.: 30 mL"'))}
        ${campo('Rendimento (kg)', numInp('rendimento', vz(b.rendimento) ? '' : dec(b.rendimento, 1)), '<span data-soma></span>')}
      </div>
    </fieldset>

    <fieldset><legend>Produtos e quantidades · PL 02/09</legend>
      <div class="itens" data-itens>${(b.produtos.length ? b.produtos : [{}]).map(linhaProduto).join('')}</div>
      <div><button type="button" class="btn peq" data-mais>${ICON.mais} Outro produto</button></div>
    </fieldset>

    <div data-alertas></div>
    ${campo('Ação corretiva', inp('acao', b.acao || '', 'placeholder="O que foi feito quando algo saiu fora do padrão"'), '', 'acao')}
    ${campo('Observação', inp('obs', b.obs || ''))}
    ${camposCorrecao(f)}
    <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${f ? 'Salvar correção' : 'Salvar fabricação'}</button></div>
  </form>`, { largo: true });

  const form = sheet.querySelector('form');
  const itensEl = sheet.querySelector('[data-itens]');
  const ler = () => {
    const v = dados(form);
    return { ...v, densidade: normDensidade(v.densidade), sensorial: form.sensorial.value, alizarol: form.alizarol.value };
  };
  const problemas = (v) => problemasFab({ sensorial: v.sensorial, alizarol: v.alizarol, dornic: numOuNulo(v.dornic), densidade: v.densidade, tempCozimento: numOuNulo(v.tempCozimento), tempoMexedura: numOuNulo(v.tempoMexedura) });
  const atualizar = () => {
    const v = ler();
    const p = problemas(v);
    sheet.querySelector('[data-alertas]').innerHTML = p.length ? aviso(`<b>Fora do padrão:</b> ${p.map(esc).join(' · ')}.<br>Descreva a ação corretiva abaixo.`, 'mal') : '';
    form.acao.required = p.length > 0;
    sheet.querySelector('.acao').classList.toggle('obrig', p.length > 0);
    const soma = [...itensEl.querySelectorAll('[data-item]')].reduce((s, it) => s + num(it.querySelector('[name=kg]').value), 0);
    sheet.querySelector('[data-soma]').textContent = soma ? `soma dos produtos: ${dec(soma, 1)} kg` : '';
  };
  form.addEventListener('input', atualizar);
  form.addEventListener('change', atualizar);
  sheet.querySelector('[data-mais]').onclick = () => { itensEl.insertAdjacentHTML('beforeend', linhaProduto()); };
  itensEl.addEventListener('click', (e) => {
    if (!e.target.closest('[data-tirar]')) return;
    e.target.closest('[data-item]').remove();
    if (!itensEl.children.length) itensEl.insertAdjacentHTML('beforeend', linhaProduto());
    atualizar();
  });
  atualizar();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const v = ler();
    if (!v.data) return toast('Informe a data', 'erro');
    if (!num(v.volumeLeite)) return toast('Informe o volume de leite', 'erro');
    if (!v.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    if (problemas(v).length && !v.acao.trim()) { form.acao.focus(); return toast('Descreva a ação corretiva', 'erro'); }
    const outro = doDia(v.data).find((x) => x.semFabricacao && x.id !== f?.id);
    if (outro) return toast('Esse dia está marcado como "não houve fabricação". Abra esse registro para corrigir.', 'erro');
    const correcao = f ? lerCorrecao(v) : null;
    if (f && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');

    // Produtos e lotes
    const itens = [];
    for (const it of itensEl.querySelectorAll('[data-item]')) {
      const produtoId = it.querySelector('[name=produtoId]').value;
      const pecas = it.querySelector('[name=pecas]').value;
      const kg = it.querySelector('[name=kg]').value;
      if (!produtoId && !pecas && !kg) continue;
      if (!produtoId) return toast('Escolha o produto em todas as linhas', 'erro');
      const prod = S.produtos.find((p) => p.id === produtoId);
      const anterior = (f?.produtos || []).find((p) => p.lote === it.querySelector('[name=lote]').value);
      const manter = anterior && anterior.produtoId === produtoId && f.data === v.data;
      const lote = manter ? anterior.lote : gerarLote(prod, v.data, f?.id, itens.map((i) => i.lote).concat((f?.produtos || []).map((p) => p.lote)));
      itens.push({ produtoId, pecas: vz(pecas) ? null : Math.round(num(pecas)), kg: numOuNulo(kg), lote });
    }

    const doc = {
      data: v.data, responsavel: v.responsavel.trim(), semFabricacao: false,
      horaRecepcao: v.horaRecepcao, volumeLeite: num(v.volumeLeite), tempLeite: numOuNulo(v.tempLeite),
      sensorial: v.sensorial, alizarol: v.alizarol, dornic: numOuNulo(v.dornic), densidade: v.densidade,
      tempCozimento: numOuNulo(v.tempCozimento), tempoMexedura: numOuNulo(v.tempoMexedura),
      acidezLeite: numOuNulo(v.acidezLeite), fermento: v.fermento.trim(), acidezSoro: numOuNulo(v.acidezSoro), coalho: v.coalho.trim(), rendimento: numOuNulo(v.rendimento),
      produtos: itens, acao: v.acao.trim(), obs: v.obs.trim(),
    };
    if (!f && doDia(v.data).some((x) => !x.semFabricacao) && !(await confirmar(`Já existe uma fabricação em ${fmtData(v.data)}. Registrar mais uma no mesmo dia?`, { ok: 'Registrar outra' }))) return;
    lembrarResponsavel(PAC, doc.responsavel);
    await gravar('fabricacoes', doc, f, correcao);
    fechar();
    toast(f ? 'Correção salva' : `Fabricação de ${fmtData(v.data)} salva${itens.length ? ` · ${itens.length} lote(s)` : ''}`);
  };
}

export default { render, mount, novo };
