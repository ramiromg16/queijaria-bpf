// Tela inicial: o que falta preencher hoje, nesta semana e neste mês, e o que saiu fora do padrão.
import { S } from '../core/store.js';
import { ICON, aviso } from '../core/ui.js';
import { esc, hoje, addDias, fmtDataCurta, fmtDataLonga, mesDe, nomeMes } from '../core/format.js';
import { faixa } from '../domain/faixas.js';
import { PL, problemasFab } from '../domain/planilhas.js';
import { CHECKLISTS, CK, pendente, periodoAtual, problemasCk } from '../domain/checklists.js';
import { TODAS, resumo } from '../domain/catalogo.js';
import { MEDICOES, IDS_MED, regDoDia, novo as novaMedicao } from './medicoes.js';
import { doDia, novo as novaFab, semFabricacao } from './fabricacao.js';
import { novo as novoCk } from './checklists.js';
import { atencao, tarefas } from '../domain/agenda.js';
import { evDoRegistro } from '../domain/eventos.js';
import { abrirTarefa, estado, registro as abrirRegAgenda, laudo as abrirLaudo } from './agenda.js';
import { novo as novaExp } from './expedicao.js';
import { novo as novaOc } from './ocorrencias.js';
import { examesAtrasados, colab } from './colaboradores.js';

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// O que falta preencher (usado também no contador do menu).
// quando: 'dia' · 'semana' · 'mes'
export function pendenciasHoje() {
  const h = hoje();
  const out = [];
  if (!doDia(h).length) out.push({ quando: 'dia', chave: 'fab', t: 'Fabricação do dia', s: 'PL 01/05 · 01/06 · 01/09 · 02/09', icone: 'producao' });
  for (const id of IDS_MED) if (!regDoDia(id, h)) out.push({ quando: 'dia', chave: id, t: MEDICOES[id].nome, s: `${PL(id).codigo} · ${MEDICOES[id].sub}`, icone: MEDICOES[id].icone });
  for (const m of CHECKLISTS) if (pendente(m, h)) out.push({ quando: m.freq, chave: m.id, ck: true, t: m.titulo, s: m.codigo, icone: 'check' });
  // Agenda: mensal ainda não feito entra em "Neste mês"; o resto (vencido, nunca registrado, vence em 30 dias) em "Agenda e laudos".
  for (const x of atencao()) out.push({ quando: x.status === 'mes' ? 'mes' : 'agenda', chave: x.id, tarefa: true, t: x.t, s: x.s, icone: 'maturacao', x });
  return out;
}

function foraDoPadrao(dias = 7) {
  const desde = addDias(hoje(), -dias + 1);
  const out = [];
  for (const f of S.fabricacoes) if (f.data >= desde) for (const p of problemasFab(f)) out.push([f.data, 'Fabricação', p, f.acao, `data-fab="${f.id}"`]);
  for (const r of S.bpf_registros) {
    if (r.data < desde) continue;
    const ev = evDoRegistro('bpf_registros', r);
    if (ev) { for (const p of ev.problemas(r)) out.push([r.data, ev.codigo, p, ev.acao?.(r), `data-ev="${ev.id}" data-reg="${r.id}"`]); continue; }
    const m = CK(r.modeloId);
    if (m) {
      for (const resp of r.respostas || []) {
        const p = problemasCk(m, { respostas: [resp] });
        if (p.length) out.push([r.data, m.codigo, p[0], resp.acaoCorretiva, `data-ck="${m.id}" data-reg="${r.id}"`]);
      }
      continue;
    }
    const pl = PL(r.modeloId);
    if (!pl) continue;
    for (const p of pl.problemas(r)) out.push([r.data, MEDICOES[r.modeloId]?.nome || pl.codigo, p, r.valores?.acao, `data-med="${r.modeloId}" data-data="${r.data}"`]);
  }
  for (const [col, lista] of [['bpf_ocorrencias', S.bpf_ocorrencias], ['laudos', S.laudos]]) {
    for (const r of lista) {
      const ev = evDoRegistro(col, r);
      // Recolhimento sem destino continua aparecendo até ser resolvido.
      if (!ev || (r.data < desde && !(r.tipo === 'recolhimento' && !r.valores?.destino))) continue;
      for (const p of ev.problemas(r)) out.push([r.data, ev.codigo, p, ev.acao?.(r), `data-ev="${ev.id}" data-reg="${r.id}"`]);
    }
  }
  return out.sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

const botoes = (p, h) => {
  if (p.chave === 'fab') return `<button class="btn peq fant" data-sem>Não houve</button><button class="btn peq pri" data-fab="">Preencher</button>`;
  if (p.ck) return `<button class="btn peq pri" data-ck="${p.chave}">Preencher</button>`;
  if (p.tarefa) return `${p.quando === 'agenda' ? estado(p.x) : ''}<button class="btn peq pri" data-tarefa="${esc(p.chave)}">Registrar</button>`;
  return `<button class="btn peq pri" data-med="${p.chave}" data-data="${h}">Preencher</button>`;
};

function render() {
  const h = hoje();
  const mes = mesDe(h);
  const pend = pendenciasHoje();
  const sem = periodoAtual({ freq: 'semana' }, h);
  const grupos = [
    ['dia', 'Hoje'],
    ['semana', `Nesta semana <small>${fmtDataCurta(sem.ini)} a ${fmtDataCurta(sem.fim)}</small>`],
    ['mes', `Neste mês <small>${nomeMes(mes)}</small>`],
    ['agenda', 'Agenda e laudos <small>vencidos, sem registro ou vencendo em 30 dias</small>'],
  ];
  const lista = grupos.map(([q, t]) => {
    const ps = pend.filter((p) => p.quando === q);
    if (!ps.length) return '';
    return `<h4 class="pend-g">${t}</h4><div class="pend">${ps.map((p) => `<div class="pend-i">
        <span class="pend-ic">${ICON[p.icone]}</span><div><strong>${esc(p.t)}</strong><small>${esc(p.s)}</small></div>
        <div class="pend-a">${botoes(p, h)}</div>
      </div>`).join('')}</div>`;
  }).join('');

  const atras = examesAtrasados();
  const exHtml = atras.length ? `<div class="col-12">${aviso(`<b>Exame periódico atrasado (PL 02/03)</b>: ${atras.map((r) => esc(colab(r.valores.colaboradorId)?.nome || '?')).join(', ')}.`, 'mal', '<a class="btn peq" href="#/colaboradores">Abrir</a>')}</div>` : '';
  const hojeHtml = `${exHtml}<div class="painel col-7"><h3>Falta preencher <small>${pend.length ? `${pend.length} pendente(s)` : ''}</small></h3>
    ${pend.length ? lista : `<p class="tudo-ok">${ICON.check} Tudo em dia.</p>`}
  </div>`;

  const fora = foraDoPadrao(7);
  const foraHtml = `<div class="painel col-5"><h3>Fora do padrão <small>últimos 7 dias</small></h3>${fora.length ? `<div class="lista-alerta">${fora.slice(0, 8).map(([d, o, p, acao, attr]) => `<button ${attr}><strong>${esc(p)}</strong><span class="val">${fmtDataCurta(d)}</span><small>${esc(o)}${acao ? ` · ação: ${esc(acao)}` : ' · sem ação corretiva'}</small><small></small></button>`).join('')}${fora.length > 8 ? `<p class="mudo" style="margin:8px 0 0">e mais ${fora.length - 8}…</p>` : ''}</div>` : '<p class="mudo">Nada fora do padrão.</p>'}</div>`;

  const mesHtml = `<div class="painel plano col-12"><h3>Planilhas de ${nomeMes(mes)} <a data-ir="imprimir">Imprimir mês</a></h3><div class="tab-wrap"><table class="tab cartoes"><thead><tr><th>Planilha</th><th class="num">Preenchidos</th><th>Sem registro</th><th class="num">NC</th></tr></thead><tbody>${TODAS.map((pl) => {
    const r = resumo(pl.id, mes);
    const falta = r.faltandoRotulos ? r.faltandoRotulos : r.faltando.map((d) => d.slice(8));
    return `<tr class="clic" data-ir="${pl.tela}"><td data-t="Planilha"><b class="cod">${pl.codigo}</b> ${esc(pl.titulo)}</td><td class="num" data-t="Preenchidos">${r.evento ? `${r.preenchidos} ${r.unidade || 'recebimento(s)'}` : r.dias ? `${r.preenchidos} de ${r.dias}` : "em andamento"}</td><td data-t="Sem registro">${r.evento ? '<span class="mudo">quando houver</span>' : falta.length ? `<span class="mal-t">${falta.length}</span> <span class="mudo">${falta.slice(-6).join(', ')}${falta.length > 6 ? '…' : ''}</span>` : '<span class="ok-t">nenhum</span>'}</td><td class="num" data-t="NC">${r.nc || '—'}</td></tr>`;
  }).join('')}</tbody></table></div></div>`;

  const avisos = [];
  if (faixa('matUR').min == null && faixa('matUR').max == null) avisos.push('A faixa de <b>umidade da sala de maturação</b> ainda não foi definida (os documentos não informam). Sem ela o app não avisa quando a umidade sai do padrão.');
  const avisoHtml = avisos.length ? aviso(avisos.join('<br>'), 'info', '<button class="btn peq" data-ir="configuracoes">Configurar</button>') : '';

  return `<div class="saudacao"><h1>${saudacao()}!</h1><p>${fmtDataLonga(h)} · ${esc(S.config.nome)}</p></div>
    ${avisoHtml}
    <div class="grade">${hojeHtml}${foraHtml}${mesHtml}</div>`;
}

function mount(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fab],[data-med],[data-sem],[data-ck],[data-tarefa],[data-ev]');
    if (!b) return;
    if (b.dataset.tarefa) return abrirTarefa(tarefas().find((x) => x.id === b.dataset.tarefa));
    if (b.dataset.ev) {
      const id = b.dataset.ev, reg = b.dataset.reg;
      if (id === 'LAUDOS') return abrirLaudo(null, reg);
      if (id === 'PL-01-11') return novaExp(reg);
      if (['PL-02-04', 'IT-01-11', 'RNC'].includes(id)) return novaOc(null, reg);
      return abrirRegAgenda(id, reg);
    }
    if (b.hasAttribute('data-sem')) return semFabricacao(hoje());
    if (b.hasAttribute('data-fab')) return novaFab(b.dataset.fab || undefined);
    if (b.dataset.ck) return novoCk(b.dataset.ck, { regId: b.dataset.reg });
    novaMedicao(b.dataset.med, b.dataset.data || hoje());
  });
}

export default { render, mount };
