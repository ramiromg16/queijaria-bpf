// Folhas para imprimir das planilhas da fase 3 (expedição, ocorrências, agenda e laudos).
// Mesma regra das outras: o app nunca preenche sozinho; período sem registro sai como "não preenchido".
import { S } from '../core/store.js';
import { dec, esc, hoje, fmtData, fmtDataCurta, mesDe } from '../core/format.js';
import { respCurto } from './planilhas.js';
import { EV, intervalo, itensCaixa, produto } from './eventos.js';
import { cabecalho, rodape, caixasPapel } from './impressao.js';

const hora = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dataMs = (ms) => new Date(ms).toLocaleDateString('pt-BR');
const strip = (h) => String(h).replace(/<[^>]+>/g, '');
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// O que mudou entre a primeira versão e a atual.
function mudancas(ev, reg) {
  const orig = reg.historico?.[0]?.anterior;
  if (!orig) return reg.editadoEm ? 'registro corrigido' : '';
  const out = [];
  for (const c of ev.colunas) {
    const a = strip(c.k(orig)), b = strip(c.k(reg));
    if (a !== b) out.push(`${esc(c.t)}: ${a || 'vazio'} → ${b || 'vazio'}`);
  }
  const rod = (r) => Object.fromEntries((ev.rodape?.(r) || []).filter(Boolean));
  const ra = rod(orig), rb = rod(reg);
  for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) if ((ra[k] || '') !== (rb[k] || '')) out.push(`${esc(k.replace(/:$/, ''))}: ${esc(ra[k]) || 'vazio'} → ${esc(rb[k]) || 'vazio'}`);
  if (ev.layout === 'caixas') {
    const fmt = (r) => (r.valores?.itens || []).map((i) => `${i.item}${i.obs ? ` (${i.obs})` : ''}`).join(', ');
    if (orig.data !== reg.data) out.push(`Data: ${fmtData(orig.data)} → ${fmtData(reg.data)}`);
    if (fmt(orig) !== fmt(reg)) out.push(`Itens: ${esc(fmt(orig)) || 'vazio'} → ${esc(fmt(reg)) || 'vazio'}`);
  }
  if (ev.layout === 'periodicos') {
    if (orig.data !== reg.data) out.push(`Data: ${fmtData(orig.data)} → ${fmtData(reg.data)}`);
    for (const [k, n] of [['programar', 'Programar'], ['realizar', 'Realizar'], ['motivo', 'Motivo']]) {
      const a = orig.valores?.[k] || '', b = reg.valores?.[k] || '';
      if (a !== b) out.push(`${n}: ${(k === 'motivo' ? esc(a) : fmtData(a)) || 'vazio'} → ${(k === 'motivo' ? esc(b) : fmtData(b)) || 'vazio'}`);
    }
  }
  return out.join('; ');
}

function criarNotas(ev) {
  const notas = [];
  const marca = (r) => {
    if (!r?.editadoEm) return '';
    let i = notas.findIndex(([x]) => x.id === r.id);
    if (i < 0) { const mud = mudancas(ev, r); if (!mud) return ''; notas.push([r, mud]); i = notas.length - 1; }
    return `<sup>${i + 1}</sup>`;
  };
  const html = () => (notas.length ? `<div class="pl-notas"><b>Registros corrigidos</b> (o registro original fica guardado no app):<ol>${notas.map(([r, mud]) =>
    `<li>${fmtDataCurta(r.data)}: corrigido em ${dataMs(r.editadoEm)} às ${hora(r.editadoEm)} por ${esc(r.editadoPor)}${r.motivoCorrecao ? `, motivo: “${esc(r.motivoCorrecao)}”` : ''}. ${mud}.</li>`).join('')}</ol></div>` : '');
  return { marca, html, n: () => notas.length };
}

// Linha de uma tabela comum; a 1ª coluna recebe a marca de corrigido.
const linha = (ev, r, marca) => `<tr${r.editadoEm && marca(r) ? ' class="corr"' : ''}>${ev.colunas.map((c, i) => `<td class="${c.cls || ''}">${c.k(r)}${i === 0 ? marca(r) : ''}</td>`).join('')}</tr>`;
const cabTabela = (ev) => `<thead><tr>${ev.colunas.map((c) => `<th class="${c.cls?.includes('dia') ? 'dia larga' : c.cls || ''}">${esc(c.t)}</th>`).join('')}</tr></thead>`;

function notasRodape(ev, regs) {
  if (ev.caixas) return caixasPapel(ev.caixas, regs, ev.rodape || (() => []));
  if (!ev.rodape) return '';
  const itens = regs.map((r) => {
    const partes = (ev.rodape(r) || []).filter((x) => x && x[1]).map(([k, v]) => `${esc(k)}: ${esc(v)}`);
    return partes.length ? `<li><b>${fmtDataCurta(r.data)}</b> ${partes.join(' · ')}</li>` : '';
  }).filter(Boolean);
  return itens.length ? `<div class="pl-notas"><b>Observações e ações corretivas</b><ul>${itens.join('')}</ul></div>` : '';
}

// Lista simples: uma linha por registro do período.
function corpoLista(ev, regs, marca) {
  const corpo = regs.length ? regs.map((r) => linha(ev, r, marca)).join('')
    : `<tr class="np"><td colspan="${ev.colunas.length}" style="text-align:center">${esc(ev.vazioMsg || 'Nenhum registro neste período.')}</td></tr>`;
  return `<table class="pl ev">${cabTabela(ev)}<tbody>${corpo}</tbody></table>`;
}

// PL 01/07: igual ao papel, 12 linhas com a coluna Data em branco. Os registros do ano entram
// nas primeiras linhas, em ordem de data; as que sobram ficam em branco para preencher à mão.
function corpoMeses(ev, ini, regs, marca) {
  const ncol = ev.colunas.length;
  const ordem = [...regs].sort((x, y) => (x.data < y.data ? -1 : x.data > y.data ? 1 : 0));
  const brancas = Math.max(0, 12 - ordem.length);
  const corpo = ordem.map((r) => linha(ev, r, marca)).join('') + `<tr>${'<td></td>'.repeat(ncol)}</tr>`.repeat(brancas);
  return `<table class="pl ev">${cabTabela(ev)}<tbody>${corpo}</tbody></table>`;
}

// PL 02/01: o papel tem duas tabelas iguais na folha (caixas × data, responsável, observação):
// a primeira recebe o 1º semestre e a segunda o 2º.
function corpoCaixas(ev, ini, regs, marca) {
  const ano = ini.slice(0, 4);
  const h = hoje();
  const itens = itensCaixa();
  for (const r of regs) for (const i of r.valores?.itens || []) if (!itens.includes(i.item)) itens.push(i.item);
  return [[`${ano}-01-01`, `${ano}-06-30`], [`${ano}-07-01`, `${ano}-12-31`]].map(([a, b]) => {
    const rs = regs.filter((r) => r.data >= a && r.data <= b);
    const linhas = itens.map((item) => {
      const feitos = rs.filter((r) => (r.valores?.itens || []).some((i) => i.item === item));
      if (!feitos.length) return `<tr${b < h ? ' class="np"' : ''}><td class="item">${esc(item)}</td>${b < h ? '<td colspan="3">não preenchido</td>' : '<td></td><td></td><td></td>'}</tr>`;
      return feitos.map((r) => `<tr><td class="item">${esc(item)}</td><td class="c">${fmtData(r.data)}${marca(r)}</td><td class="c">${respCurto(r.responsavel)}</td><td class="txt">${esc((r.valores.itens.find((i) => i.item === item) || {}).obs || '')}</td></tr>`).join('');
    }).join('');
    return `<table class="pl ev ck-matriz" style="margin-top:4mm"><thead><tr><th colspan="4">Controle da Higiene da Caixa d’água</th></tr><tr><th class="item">Caixas d’água (capacidade)</th><th>Data</th><th>Responsável</th><th>Observação</th></tr></thead><tbody>${linhas}</tbody></table>`;
  }).join('');
}

// PL 02/03 igual ao papel: Nome | Data Nascimento | Cargo | Exames Periódico (Programar | Realizar),
// a linha "Obs.: Funcionário afastado: / Motivo: / Data:" e o Responsável.
const nomeCol = (id) => S.colaboradores.find((c) => c.id === id);
function corpoPeriodicos(ev, ini, regs, marca) {
  const ano = ini.slice(0, 4);
  const exames = regs.filter((r) => r.valores?.tipo === 'exame' && r.valores.ano === ano);
  const exAno = S.bpf_registros.filter((r) => r.modeloId === 'PL-02-03' && r.valores?.tipo === 'exame' && r.valores.ano === ano);
  const ids = [...new Set([...S.colaboradores.filter((c) => c.ativo !== false).map((c) => c.id), ...exAno.map((r) => r.valores.colaboradorId)])]
    .map(nomeCol).filter(Boolean).sort((a, b) => (a.nome < b.nome ? -1 : 1));
  const afast = regs.filter((r) => r.valores?.tipo === 'afastamento');
  const linhas = ids.map((c) => {
    const e = exAno.find((r) => r.valores.colaboradorId === c.id);
    return `<tr><td>${esc(c.nome)}${e ? marca(e) : ''}</td><td class="c">${c.nascimento ? fmtData(c.nascimento) : ''}</td><td>${esc(c.cargo || '')}</td><td class="c">${e?.valores.programar ? fmtData(e.valores.programar) : ''}</td><td class="c">${e?.valores.realizar ? fmtData(e.valores.realizar) : ''}</td></tr>`;
  }).join('') + '<tr><td></td><td></td><td></td><td></td><td></td></tr>'.repeat(Math.max(0, 10 - ids.length));
  const obs = afast.map((r) => `Funcionário afastado: <b>${esc(nomeCol(r.valores.colaboradorId)?.nome || '')}</b>${marca(r)} &nbsp; Motivo: <b>${esc(r.valores.motivo || '')}</b> &nbsp; Data: <b>${fmtData(r.data)}</b>`).join('<br>')
    || 'Funcionário afastado: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Motivo: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Data:';
  const resps = [...new Set([...exames, ...afast].map((r) => r.responsavel).filter(Boolean))];
  return `<table class="pl ev ck-matriz"><thead>
      <tr><th rowspan="2">Nome</th><th rowspan="2">Data Nascimento</th><th rowspan="2">Cargo</th><th colspan="2">Exames Periódico</th></tr>
      <tr><th>Programar</th><th>Realizar</th></tr></thead>
    <tbody>${linhas}<tr class="ck-caixa"><td colspan="5"><b>Obs.:</b> ${obs}</td></tr></tbody></table>
    <p class="ck-linha-resp">Responsável: ${resps.length ? `<b>${resps.map(esc).join(', ')}</b>` : '<i class="ck-linha"></i>'}</p>`;
}

// Treinamento (PAC 03): relatório com o assunto e a lista de presença para cada participante assinar.
export function folhasTreinamento(ym) {
  const ev = EV('TREIN');
  const { ini, fim } = intervalo(ev, ym);
  const regs = ev.regs(ini, fim);
  return (regs.length ? regs : [null]).map((r) => {
    const nomes = (r?.participantes || []).map((id) => nomeCol(id)?.nome).filter(Boolean);
    const linhas = nomes.map((n, i) => `<tr><td class="c">${i + 1}</td><td>${esc(n)}</td><td></td></tr>`).join('')
      + Array.from({ length: Math.max(0, 15 - nomes.length) }, (_, i) => `<tr><td class="c">${nomes.length + i + 1}</td><td></td><td></td></tr>`).join('');
    const corr = r?.editadoEm ? `<div class="pl-notas"><b>Registro corrigido</b> em ${dataMs(r.editadoEm)} às ${hora(r.editadoEm)} por ${esc(r.editadoPor)}${r.motivoCorrecao ? `, motivo: “${esc(r.motivoCorrecao)}”` : ''}.</div>` : '';
    return `<section class="folha retrato">
      ${cabecalho(ev, ym)}
      <p class="ck-linha-topo"><span>Data: ${r ? `<b>${fmtData(r.data)}</b>` : '___/___/______'}</span><span>Instrutor: ${r?.instrutor ? `<b>${esc(r.instrutor)}</b>` : '<i class="ck-linha"></i>'}</span></p>
      <p class="ck-linha-resp">Assunto: ${r ? `<b>${esc(r.assunto)}</b>` : '<i class="ck-linha" style="width:150mm"></i>'}</p>
      <div class="pl-notas" style="min-height:22mm"><b>Conteúdo abordado:</b> ${esc(r?.conteudo || '')}</div>
      <table class="pl ck ck-papel"><thead><tr><th class="x">Nº</th><th class="item">Participante</th><th style="width:70mm">Assinatura</th></tr></thead><tbody>${linhas}</tbody></table>
      ${corr}
      ${rodape(ev, ym, { data: r?.data })}
    </section>`;
  }).join('');
}

// PL 02/11: data × produto, com a quantidade comercializada (soma das expedições do dia).
function corpoComercializacao(ev, regs) {
  const ids = [...new Set([...S.produtos.filter((p) => p.ativo !== false).sort((a, b) => (a.codigo < b.codigo ? -1 : 1)).map((p) => p.id), ...regs.map((r) => r.produtoId)])];
  const datas = [...new Set(regs.map((r) => r.data))].sort();
  const soma = (d, id) => regs.filter((r) => (d == null || r.data === d) && r.produtoId === id).reduce((s, r) => s + (+r.kg || 0), 0);
  const cel = (v) => (v ? dec(v, 1) : '');
  const grupo = S.config.tituloComercializacao;
  return `<table class="pl ev com"><thead>
      <tr><th class="dia larga" rowspan="${grupo ? 3 : 2}">Data comercialização</th><th colspan="${ids.length}">PRODUTO/QUANTIDADE COMERCIALIZADA</th></tr>
      ${grupo ? `<tr><th colspan="${ids.length}">${esc(grupo)}</th></tr>` : ''}
      <tr>${ids.map((id) => `<th class="prod">${esc(produto(id)?.nome || '?')}</th>`).join('')}</tr>
    </thead><tbody>
      ${datas.length ? datas.map((d) => `<tr><td class="c dia">${fmtData(d)}</td>${ids.map((id) => `<td class="num">${cel(soma(d, id))}</td>`).join('')}</tr>`).join('')
        : `<tr class="np"><td colspan="${ids.length + 1}" style="text-align:center">Nenhuma comercialização registrada neste mês.</td></tr>`}
    </tbody></table>`;
}

// "RELAÇÃO DE PRODUTOS" que vem embaixo da PL 01/11 no papel.
const relacaoProdutos = () => `<div class="pl-notas"><b>RELAÇÃO DE PRODUTOS:</b><ul class="ck-perg" style="list-style:none;padding-left:0">${[...S.produtos].filter((p) => p.ativo !== false).sort((a, b) => (a.codigo < b.codigo ? -1 : 1)).map((p) => `<li>- Produto ${esc(p.codigo)} – ${esc(p.nome)}</li>`).join('')}</ul></div>`;

export function folhaEv(id, ym) {
  const ev = EV(id);
  const { ini, fim } = intervalo(ev, ym);
  const regs = ev.regs(ini, fim);
  const notas = criarNotas(ev);
  const corpo = ev.layout === 'meses' ? corpoMeses(ev, ini, regs, notas.marca)
    : ev.layout === 'caixas' ? corpoCaixas(ev, ini, regs, notas.marca)
    : ev.layout === 'periodicos' ? corpoPeriodicos(ev, ini, regs, notas.marca)
    : ev.layout === 'comercializacao' ? corpoComercializacao(ev, regs)
    : corpoLista(ev, regs, notas.marca);
  const temCNC = ev.colunas.some((c) => c.alerta);
  const legenda = [
    temCNC ? 'C = Conforme · NC = Não Conforme' : '',
    ev.legenda ? esc(ev.legenda()) : '',
    notas.n() ? 'número sobrescrito = registro corrigido (ver notas)' : '',
  ].filter(Boolean).join(' · ');
  return `<section class="folha">
    ${cabecalho(ev, ym)}
    ${ev.info ? `<p class="pl-info">${esc(ev.info())}</p>` : ''}
    ${corpo}
    ${ev.total && regs.length ? `<p class="pl-total">${esc(ev.total(regs))}</p>` : ''}
    ${notasRodape(ev, regs)}
    ${ev.relacaoProdutos ? relacaoProdutos() : ''}
    ${legenda ? `<p class="pl-leg">${legenda}</p>` : ''}
    ${ev.freqFim ? `<p class="ck-linha-resp">${'Frequência'}: <b>${esc(ev.frequencia)}</b></p>` : ''}
    ${notas.html()}
    ${rodape(ev, ym, { ck: ev.layout === 'periodicos' })}
  </section>`;
}

export function corrigidosEv(id, ym) {
  const ev = EV(id);
  if (ev.layout === 'comercializacao') return 0;
  const { ini, fim } = intervalo(ev, ym);
  return ev.regs(ini, fim).filter((r) => r.editadoEm && mudancas(ev, r)).length;
}
