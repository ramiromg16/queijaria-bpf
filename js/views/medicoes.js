// Medições rápidas: PL 03/01 Água · PL 02/06 Sala de maturação · PL 03/09 Salmoura.
// Um registro por planilha por dia. Depois de salvo, só pode ser corrigido.
import { S } from '../core/store.js';
import { ICON, abrir, fechar, cab, toast, pagina, pill, campo, inp, numInp, dados, aviso } from '../core/ui.js';
import { dec, num, esc, hoje, addDias, fmtData, fmtDataLonga, mesDe, nomeMes } from '../core/format.js';
import { fora, fmtFaixa } from '../domain/faixas.js';
import { gravar, camposCorrecao, lerCorrecao, lembrarResponsavel } from '../domain/registros.js';
import { PL, diasDoMes, respCurto } from '../domain/planilhas.js';
import { respCampo } from './fabricacao.js';

let dataSel = '';

const vz = (v) => v === '' || v == null;
const nn = (v) => (vz(v) ? null : num(v));
const cncSeg = (nome, valor) => `<div class="seg">${['C', 'NC'].map((k) => `<label><input type="radio" name="${nome}" value="${k}" ${valor === k ? 'checked' : ''}><span>${k === 'C' ? 'C · Conforme' : 'NC · Não conforme'}</span></label>`).join('')}</div>`;

// Cada medição: campos do formulário, leitura dos valores e resumo curto para a tela.
export const MEDICOES = {
  'PL-03-01': {
    nome: 'Água', icone: 'gota', sub: 'Área de processamento · 7h', hora: '07:00',
    campos: (v) => `
      <div class="linha3">
        ${campo('Teor de cloro (ppm)', numInp('cloro', vz(v.cloro) ? '' : dec(v.cloro, 1), 'required'), `faixa: ${fmtFaixa('cloro')}`)}
        ${campo('pH', numInp('ph', vz(v.ph) ? '' : dec(v.ph, 1)), `faixa: ${fmtFaixa('ph')}`)}
        ${campo('Hora', inp('hora', v._hora, 'type="time"'))}
      </div>
      ${campo('Cor', cncSeg('cor', v.cor ?? 'C'))}
      ${campo('Odor', cncSeg('odor', v.odor ?? 'C'))}
      ${campo('Observação', inp('obs', v.obs || ''))}
      ${campo('Ação corretiva', inp('acao', v.acao || ''), '', 'acao')}`,
    ler: (d) => ({ cloro: nn(d.cloro), ph: nn(d.ph), cor: d.cor || '', odor: d.odor || '', obs: d.obs.trim(), acao: d.acao.trim() }),
    valido: (v) => (v.cloro == null ? 'Informe o teor de cloro' : ''),
    resumo: (v) => [`${dec(v.cloro, 1)} ppm`, !vz(v.ph) && `pH ${dec(v.ph, 1)}`, v.cor === 'NC' && 'cor NC', v.odor === 'NC' && 'odor NC'].filter(Boolean).join(' · '),
  },
  'PL-02-06': {
    nome: 'Sala de maturação', icone: 'termometro', sub: 'Temperatura e umidade', hora: '',
    campos: (v) => `
      <div class="linha3">
        ${campo('Temperatura (°C)', numInp('temp', vz(v.temp) ? '' : dec(v.temp, 1), 'required'), `faixa: ${fmtFaixa('matTemp')}`)}
        ${campo('Umidade relativa (%)', numInp('ur', vz(v.ur) ? '' : dec(v.ur, 0)), `faixa: ${fmtFaixa('matUR')}`)}
        ${campo('Hora', inp('hora', v._hora, 'type="time"'))}
      </div>
      ${campo('Situação da sala', cncSeg('cnc', v.cnc ?? 'C'))}
      ${campo('Não conformidade', inp('nc', v.nc || '', 'placeholder="O que estava errado"'), '', 'ncdesc')}
      ${campo('Ação corretiva', inp('acao', v.acao || ''), '', 'acao')}`,
    ler: (d) => ({ temp: nn(d.temp), ur: nn(d.ur), cnc: d.cnc || '', nc: d.nc.trim(), acao: d.acao.trim() }),
    valido: (v) => (v.temp == null ? 'Informe a temperatura' : v.cnc === 'NC' && !v.nc ? 'Descreva a não conformidade' : ''),
    resumo: (v) => [`${dec(v.temp, 1)} °C`, !vz(v.ur) && `${dec(v.ur, 0)}% UR`, v.cnc === 'NC' && 'NC'].filter(Boolean).join(' · '),
  },
  'PL-03-09': {
    nome: 'Salmoura', icone: 'sal', sub: 'Volume, temperatura e correções', hora: '',
    campos: (v) => `
      <div class="linha3">
        ${campo('Volume (L)', numInp('volume', vz(v.volume) ? '' : dec(v.volume, 0)))}
        ${campo('Temperatura (°C)', numInp('temp', vz(v.temp) ? '' : dec(v.temp, 1)))}
        ${campo('Hora', inp('hora', v._hora, 'type="time"'))}
      </div>
      <div class="linha2">
        ${campo('Correção de sal', inp('sal', v.sal || '', 'placeholder="Ex.: 2 kg · ou: não precisou"'))}
        ${campo('Correção de acidez (°D)', inp('acidez', v.acidez || '', 'placeholder="Ex.: 12 °D"'))}
      </div>
      ${campo('Observação', inp('obs', v.obs || ''))}`,
    ler: (d) => ({ volume: nn(d.volume), temp: nn(d.temp), sal: d.sal.trim(), acidez: d.acidez.trim(), obs: d.obs.trim() }),
    valido: (v) => (v.volume == null && v.temp == null && !v.sal && !v.acidez && !v.obs ? 'Preencha pelo menos um campo' : ''),
    resumo: (v) => [!vz(v.volume) && `${dec(v.volume, 0)} L`, !vz(v.temp) && `${dec(v.temp, 1)} °C`, v.sal && `sal: ${v.sal}`].filter(Boolean).join(' · ') || 'registrado',
  },
};
export const IDS_MED = Object.keys(MEDICOES);

export const regDoDia = (modeloId, data) => S.bpf_registros.find((r) => r.modeloId === modeloId && r.data === data);

function celula(id, data) {
  const r = regDoDia(id, data);
  if (!r) return data > hoje() ? '<span class="mudo">—</span>' : '<span class="np">não preenchido</span>';
  const nc = PL(id).problemas(r).length;
  return `<span class="${nc ? 'mal-t' : ''}">${esc(MEDICOES[id].resumo(r.valores))}</span>${r.editadoEm ? ' <span class="mudo">(corrigido)</span>' : ''}`;
}

function render() {
  const data = dataSel || hoje();
  const cards = IDS_MED.map((id) => {
    const m = MEDICOES[id];
    const pl = PL(id);
    const r = regDoDia(id, data);
    const prob = r ? pl.problemas(r) : [];
    return `<div class="painel col-4 med ${r ? (prob.length ? 'nc' : 'feito') : ''}">
      <h3><span class="med-t">${ICON[m.icone]} ${m.nome}</span><small>${pl.codigo}</small></h3>
      <p class="mudo" style="margin:-6px 0 12px">${m.sub}</p>
      ${r ? `<p class="med-v">${esc(m.resumo(r.valores))}</p>
        <p class="mudo" style="margin:0 0 12px">${r.hora ? `${esc(r.hora)} · ` : ''}${esc(respCurto(r.responsavel))}${r.editadoEm ? ' · corrigido' : ''}</p>
        ${prob.length ? `<p class="mal-t" style="margin:0 0 12px">${prob.map(esc).join(' · ')}</p>` : ''}
        <button class="btn" data-med="${id}">${ICON.editar} Corrigir</button>`
      : `<p class="med-v vazio-t">${data > hoje() ? 'Data futura' : 'Não preenchido'}</p><button class="btn pri" data-med="${id}" ${data > hoje() ? 'disabled' : ''}>${ICON.mais} Registrar</button>`}
    </div>`;
  }).join('');

  const mes = mesDe(data);
  const dias = diasDoMes(mes).filter((d) => d <= hoje() || mesDe(hoje()) !== mes).reverse();
  const grade = `<div class="painel plano col-12"><h3>${nomeMes(mes)[0].toUpperCase() + nomeMes(mes).slice(1)} <small>toque num dia para abrir</small></h3><div class="tab-wrap"><table class="tab cartoes"><thead><tr><th>Dia</th>${IDS_MED.map((id) => `<th>${MEDICOES[id].nome}</th>`).join('')}</tr></thead><tbody>${dias.map((d) => `<tr class="clic${d === data ? ' sel' : ''}" data-dia="${d}"><td data-t="Dia"><b>${fmtData(d).slice(0, 5)}</b></td>${IDS_MED.map((id) => `<td data-t="${MEDICOES[id].nome}">${celula(id, d)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;

  const nav = `<div class="filtros dia-nav"><button class="btn peq" data-dia="${addDias(data, -1)}" aria-label="Dia anterior">‹</button><input type="date" value="${data}" max="${hoje()}" data-data aria-label="Data"><button class="btn peq" data-dia="${addDias(data, 1)}" ${data >= hoje() ? 'disabled' : ''} aria-label="Próximo dia">›</button><strong>${data === hoje() ? 'Hoje, ' : ''}${fmtDataLonga(data)}</strong></div>`;
  return pagina('Medições rápidas', 'PL 03/01 Água · PL 02/06 Sala de maturação · PL 03/09 Salmoura', '', nav + `<div class="grade">${cards}${grade}</div>`);
}

function mount(el) {
  el.querySelector('[data-data]').addEventListener('change', (e) => { if (e.target.value) { dataSel = e.target.value; window.dispatchEvent(new Event('rerender')); } });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-med],[data-dia]');
    if (!b || b.disabled) return;
    if (b.dataset.med) return novo(b.dataset.med, dataSel || hoje());
    dataSel = b.dataset.dia;
    window.dispatchEvent(new Event('rerender'));
  });
}

export function novo(id, data = hoje()) {
  const m = MEDICOES[id];
  const pl = PL(id);
  const r = regDoDia(id, data);
  const v = { ...(r?.valores || {}), _hora: r ? r.hora : m.hora || new Date().toTimeString().slice(0, 5) };
  const sheet = abrir(`${cab(r ? `Corrigir: ${m.nome}` : m.nome, `${pl.codigo} · ${esc(pl.titulo)} · ${fmtData(data)}`)}
    <form class="form" novalidate>
      ${m.campos(v)}
      <div data-alertas></div>
      ${respCampo(pl.pac, r?.responsavel)}
      ${camposCorrecao(r)}
      <div class="sheet-pe"><button type="button" class="btn fant" data-fechar>Cancelar</button><button class="btn pri">${r ? 'Salvar correção' : 'Salvar'}</button></div>
    </form>`);
  const form = sheet.querySelector('form');
  const atualizar = () => {
    const val = m.ler(dados(form));
    const p = pl.problemas({ valores: val });
    sheet.querySelector('[data-alertas]').innerHTML = p.length ? aviso(`<b>Fora do padrão:</b> ${p.map(esc).join(' · ')}.${form.acao ? '<br>Descreva a ação corretiva.' : ''}`, 'mal') : '';
    sheet.querySelector('.acao')?.classList.toggle('obrig', p.length > 0);
    const ncd = sheet.querySelector('.ncdesc');
    if (ncd) ncd.hidden = val.cnc !== 'NC' && !val.nc;
  };
  form.addEventListener('input', atualizar);
  form.addEventListener('change', atualizar);
  atualizar();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = dados(form);
    const val = m.ler(d);
    const erro = m.valido(val);
    if (erro) return toast(erro, 'erro');
    if (form.acao && pl.problemas({ valores: val }).length && !val.acao) { form.acao.focus(); return toast('Descreva a ação corretiva', 'erro'); }
    if (!d.responsavel?.trim()) return toast('Informe o responsável', 'erro');
    const correcao = r ? lerCorrecao(d) : null;
    if (r && (!correcao?.por || !correcao.motivo)) return toast('Informe quem está corrigindo e o motivo', 'erro');
    if (!r && regDoDia(id, data)) return toast('Esse dia já foi registrado. Abra de novo para corrigir.', 'erro');
    lembrarResponsavel(pl.pac, d.responsavel.trim());
    await gravar('bpf_registros', { modeloId: id, data, hora: d.hora || '', valores: val, respostas: [], responsavel: d.responsavel.trim() }, r, correcao);
    fechar();
    toast(r ? 'Correção salva' : `${m.nome}: registrado`);
  };
}

export default { render, mount, novo };
