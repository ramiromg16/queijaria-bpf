// Monta as folhas mensais para imprimir e assinar (uma folha por PL).
// O app nunca preenche sozinho: dia sem registro sai como "não preenchido".
import { S } from '../core/store.js';
import { esc, hoje, fmtData, fmtDataCurta, dec, int } from '../core/format.js';
import { PL, linhasMes, respCurto, diasDoMes } from './planilhas.js';
import { CK, itensDe, colunasNC, respostasNC, registrosCk, semanas, lista, opcoes } from './checklists.js';
import { porId } from './catalogo.js';
import { EV } from './eventos.js';
import { PACS, PAGINA_PL, LOGO, RODAPE_PAC, PAISAGEM } from './pacs.js';
import { folhaEv, corrigidosEv, folhasTreinamento } from './impressao-eventos.js';

const hora = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dataMs = (ms) => new Date(ms).toLocaleDateString('pt-BR');
const mesAno = (ym) => `${ym.slice(5)}/${ym.slice(0, 4)}`;
const strip = (h) => String(h).replace(/<[^>]+>/g, '');

// Diferenças entre a versão original e a atual, coluna a coluna.
function mudancas(pl, reg) {
  const orig = reg.historico?.[0]?.anterior;
  if (!orig) return reg.editadoEm ? 'registro corrigido' : '';
  if (orig.semFabricacao) return 'antes estava marcado como "não houve fabricação"';
  const extra = (r) => (pl.porProduto ? { ...r, _item: reg._item && (orig.produtos || []).find((p) => p.lote === reg._item.lote), _prod: reg._prod } : r);
  const a = extra(orig);
  const out = [];
  for (const c of pl.colunas) {
    const antes = strip(c.k(a)), depois = strip(c.k(reg));
    if (antes !== depois) out.push(`${esc(c.t)}: ${antes || 'vazio'} → ${depois || 'vazio'}`);
  }
  // Textos que saem embaixo da tabela (ação corretiva, observação…)
  const rod = (r) => Object.fromEntries((pl.rodape?.(r) || []).filter(Boolean));
  const ra = rod(a), rb = rod(reg);
  for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
    if ((ra[k] || '') !== (rb[k] || '')) out.push(`${esc(k.replace(/:$/, ''))}: ${esc(ra[k]) || 'vazio'} → ${esc(rb[k]) || 'vazio'}`);
  }
  return out.join('; ');
}

// Campos de texto que o papel tem embaixo da tabela ("Não conformidade:", "Obs.:", "Ação corretiva:"…),
// com o mesmo rótulo do papel. Saem sempre, mesmo vazios, como no papel. Cada texto leva a data.
//   caixas: rótulos do papel · rodape(r): [[rótulo, texto], ...] de cada registro
export function caixasPapel(caixas, regs, rodapeFn) {
  const linhas = caixas.map((rot) => {
    const txt = regs.map((r) => {
      const v = ((rodapeFn(r) || []).find((x) => x && x[0] === rot) || [])[1];
      return v ? `<b>${fmtDataCurta(r.data)}</b> ${esc(v)}` : '';
    }).filter(Boolean).join(' · ');
    return `<tr class="ck-caixa"><td><b>${esc(rot)}</b> ${txt}</td></tr>`;
  }).join('');
  return `<table class="pl ck ck-papel caixas-papel"><tbody>${linhas}</tbody></table>`;
}
// Linha "Frequência: ..." para as folhas em que o papel a põe embaixo da tabela.
export const freqFim = (pl) => (pl.freqFim ? `<p class="ck-linha-resp">Frequência: <b>${esc(pl.frequencia)}</b></p>` : '');

// "Observações e ações corretivas" do mês (o que o papel tem fora da tabela).
function rodapeDias(pl, linhas) {
  if (pl.caixas) return caixasPapel(pl.caixas, linhas.flatMap((l) => l.regs.map((r) => ({ ...r, data: l.data }))), pl.rodape);
  if (!pl.rodape) return '';
  const itens = [];
  for (const l of linhas) {
    for (const r of l.regs) {
      const partes = (pl.rodape(r) || []).filter((x) => x && x[1]).map(([k, v]) => `${esc(k)}: ${esc(v)}`);
      if (partes.length) itens.push(`<li><b>${fmtDataCurta(l.data)}</b> ${partes.join(' · ')}</li>`);
    }
  }
  return itens.length ? `<div class="pl-notas"><b>Observações e ações corretivas</b><ul>${itens.join('')}</ul></div>` : '';
}

// Cabeçalho igual ao da página do PAC no papel: logotipo | "Programa de Autocontrole" + nome do PAC |
// Código / Revisão / Página. Embaixo, o título da planilha. Folhas que não existem no papel
// ("Registro do app") ficam com o cabeçalho simples do app.
export function cabecalho(pl, ym, op = {}) {
  const pac = !pl.proprio && PACS[pl.pac];
  // Só o que o papel tem no topo: "Frequência" (salvo freqFim/semFreq) e "Mês/Ano" (salvo mesAno: false).
  const partes = [
    pl.antes ? `<span>${esc(pl.antes)}</span>` : '',
    pl.freqFim || pl.semFreq ? '' : `<span>Frequência: <b>${esc(pl.frequencia)}</b></span>`,
    pl.mesAno === false ? '' : pl.periodo === 'ano' ? `<span>Ano: <b>${ym.slice(0, 4)}</b></span>` : `<span>Mês/Ano: <b>${mesAno(ym)}</b></span>`,
  ].join('');
  const periodo = op.ck || !partes ? '' : `<p class="pl-per">${partes}</p>`;
  if (pac) {
    return `<header class="pac-cab">
      <div class="pac-logo"><img src="${new URL(LOGO, location.href)}" alt=""></div>
      <div class="pac-nome"><span>Programa de Autocontrole</span><b>${esc(pac.nome)}</b></div>
      <div class="pac-id"><span>Código: ${esc(pac.codigo)}</span><span>Revisão: ${esc(pac.revisao)}</span><span>${esc(pac.rotuloPagina)} ${esc(PAGINA_PL[pl.id] || '___')} de ${esc(pac.total)}</span></div>
    </header>
    <h1 class="pl-tit">${pl.codigo} – ${esc(pl.titulo)}</h1>${periodo}`;
  }
  const c = S.config;
  return `<header class="pl-cab">
    <div class="pl-q"><strong>${esc(c.nome)}</strong><span>Município: ${esc(c.cidade || '________________')}</span><span>Registro: ${esc(c.registro || '________________')}</span></div>
    <div class="pl-t"><span class="pl-cod">${pl.codigo}</span><h1>${esc(pl.titulo)}</h1>${pl.proprio ? '<span class="pl-prop">Registro do app: o modelo da queijaria não tem planilha em papel para isto</span>' : ''}</div>
    <div class="pl-f"><span>Frequência: <b>${esc(pl.frequencia)}</b></span>${pl.periodo === 'ano' ? `<span>Ano: <b>${ym.slice(0, 4)}</b></span>` : `<span>Mês/Ano: <b>${mesAno(ym)}</b></span>`}</div>
  </header>`;
}

function folhaPL(id, ym) {
  const pl = PL(id);
  if (pl.layout === 'produtos') return folhaProdutos(pl, ym);
  const linhas = linhasMes(pl, ym);
  const ncol = pl.colunas.length + (pl.resp ? 2 : 1);
  const notas = [];
  // Folha sem "Mês/Ano" no papel: a coluna Data leva a data completa.
  const dia = (l) => (pl.mesAno === false ? fmtData(l.data) : l.data.slice(8));
  const tdResp = (nome) => (pl.resp ? `<td class="resp">${respCurto(nome)}</td>` : '');
  const corpo = linhas.map((l) => {
    if (l.status === 'vazio') return `<tr class="np"><td class="dia">${dia(l)}</td><td colspan="${ncol - 1}">não preenchido</td></tr>`;
    if (l.status === 'futuro') return `<tr><td class="dia">${dia(l)}</td>${'<td></td>'.repeat(ncol - 1)}</tr>`;
    if (l.status === 'sem') {
      let marca = '';
      if (l.reg?.editadoEm) { notas.push([dia(l), l.reg, 'marcado como "não houve fabricação"']); marca = `<sup>${notas.length}</sup>`; }
      return `<tr class="sem"><td class="dia">${dia(l)}${marca}</td><td colspan="${ncol - (pl.resp ? 2 : 1)}">não houve fabricação neste dia</td>${tdResp(l.reg?.responsavel)}</tr>`;
    }
    return l.regs.map((r) => {
      // Só marca a linha se algo DESTA folha mudou; uma nota por registro.
      let marca = '';
      const mud = r.editadoEm ? mudancas(pl, r) : '';
      if (mud) {
        let i = notas.findIndex(([, x]) => x.id === r.id);
        if (i < 0) { notas.push([dia(l), r, mud]); i = notas.length - 1; } else if (!notas[i][2].includes(mud)) notas[i][2] += `; ${mud}`;
        marca = `<sup>${i + 1}</sup>`;
      }
      const tds = pl.colunas.map((c) => `<td class="${c.cls || ''}">${c.k(r)}</td>`).join('');
      return `<tr${marca ? ' class="corr"' : ''}><td class="dia">${dia(l)}${marca}</td>${tds}${tdResp(r.responsavel)}</tr>`;
    }).join('');
  }).join('');

  const notasHtml = notas.length ? `<div class="pl-notas"><b>Linhas corrigidas</b> (o registro original fica guardado no app):<ol>${notas.map(([d, r, mud]) =>
    `<li>Dia ${d}: corrigido em ${dataMs(r.editadoEm)} às ${hora(r.editadoEm)} por ${esc(r.editadoPor)}${r.motivoCorrecao ? `, motivo: “${esc(r.motivoCorrecao)}”` : ''}${mud ? `. ${mud}` : ''}.</li>`).join('')}</ol></div>` : '';

  // Legenda e observação na mesma ordem do papel; legenda só nas folhas que a têm no papel.
  const info = pl.info ? `<p class="pl-info">${esc(pl.info())}</p>` : '';
  const leg = [pl.legenda ? esc(pl.legenda) : '', notas.length ? 'número sobrescrito = linha corrigida (ver notas)' : ''].filter(Boolean).join(' · ');
  const legHtml = leg ? `<p class="pl-leg">${leg}</p>` : '';
  // Linha embaixo do cabeçalho da tabela (PL 03/01: "7:00").
  const sub = pl.subcab ? `<tr><th></th><th colspan="${pl.colunas.length}">${esc(pl.subcab)}</th>${pl.resp ? '<th></th>' : ''}</tr>` : '';
  return `<section class="folha">
    ${cabecalho(pl, ym)}
    <table class="pl">
      <thead><tr><th class="dia${pl.mesAno === false || (pl.colDia && pl.colDia.length > 4) ? ' larga' : ''}">${esc(pl.colDia || 'Dia')}</th>${pl.colunas.map((c) => `<th class="${c.cls || ''}">${esc(c.t)}</th>`).join('')}${pl.resp ? '<th class="resp">Responsável</th>' : ''}</tr>${sub}</thead>
      <tbody>${corpo}</tbody>
    </table>
    ${pl.total ? `<p class="pl-total">${esc(pl.total(linhas))}</p>` : ''}
    ${rodapeDias(pl, linhas)}
    ${pl.legAntes ? legHtml + info : info + legHtml}
    ${freqFim(pl)}
    ${notasHtml}
    ${rodape(pl, ym)}
  </section>`;
}

// Nos checklists o "Responsável" já está no lugar dele na folha; aqui fica só a assinatura.
const rodapePac = (pl) => (!pl.proprio && PACS[pl.pac] ? `<table class="pac-rod"><tr>${RODAPE_PAC.map(([k, v]) => `<td>${esc(k)}<br>${esc(v)}</td>`).join('')}</tr></table>` : '');
// PL 02/09 igual ao papel: "Lote/Data Fabricação" × uma coluna por produto
// ("PRODUTO/QUANTIDADE PRODUZIDA DIARIAMENTE"), uma linha por fabricação. Linhas que sobram ficam em branco.
// Cada célula traz as peças e os quilos daquele produto no dia (o app guarda os dois).
function folhaProdutos(pl, ym) {
  const d = diasDoMes(ym);
  const fabs = S.fabricacoes.filter((f) => f.data >= d[0] && f.data <= d[d.length - 1] && !f.semFabricacao)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : (a.criado || 0) - (b.criado || 0)));
  const ativos = S.produtos.filter((p) => p.ativo !== false).map((p) => p.id);
  const usados = fabs.flatMap((f) => (f.produtos || []).map((i) => i.produtoId));
  const ids = [...new Set([...ativos, ...usados])].filter((id) => S.produtos.some((p) => p.id === id))
    .sort((a, b) => (porProd(a).codigo < porProd(b).codigo ? -1 : 1));
  const grupo = S.config.tituloComercializacao;
  const notas = [];
  const cel = (f, id) => {
    const its = (f.produtos || []).filter((i) => i.produtoId === id);
    if (!its.length) return '';
    const pc = its.reduce((s, i) => s + (+i.pecas || 0), 0), kg = its.reduce((s, i) => s + (+i.kg || 0), 0);
    return [pc ? `${int(pc)} pç` : '', kg ? `${dec(kg, 1)} kg` : ''].filter(Boolean).join('<br>');
  };
  const linhas = fabs.map((f) => {
    let marca = '';
    if (f.editadoEm) { notas.push(f); marca = `<sup>${notas.length}</sup>`; }
    return `<tr${marca ? ' class="corr"' : ''}><td class="c dia larga">${fmtDataCurta(f.data)}${marca}</td>${ids.map((id) => `<td class="num">${cel(f, id)}</td>`).join('')}</tr>`;
  }).join('') + `<tr><td></td>${'<td></td>'.repeat(ids.length)}</tr>`.repeat(Math.max(0, 14 - fabs.length));
  const resps = [...new Set(fabs.map((f) => f.responsavel).filter(Boolean))];
  const notasHtml = notas.length ? `<div class="pl-notas"><b>Fabricações corrigidas</b> (o registro original fica guardado no app):<ol>${notas.map((f) =>
    `<li>${fmtDataCurta(f.data)}: corrigido em ${dataMs(f.editadoEm)} às ${hora(f.editadoEm)} por ${esc(f.editadoPor)}${f.motivoCorrecao ? `, motivo: “${esc(f.motivoCorrecao)}”` : ''}.</li>`).join('')}</ol></div>` : '';
  return `<section class="folha">
    ${cabecalho(pl, ym, { ck: true })}
    <table class="pl ev com">
      <thead>
        <tr><th class="dia larga" rowspan="${grupo ? 3 : 2}">Lote/Data Fabricação</th><th colspan="${ids.length}">PRODUTO/QUANTIDADE PRODUZIDA DIARIAMENTE</th></tr>
        ${grupo ? `<tr><th colspan="${ids.length}">${esc(grupo)}</th></tr>` : ''}
        <tr>${ids.map((id) => `<th class="prod">${esc(porProd(id).nome)}</th>`).join('')}</tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <p class="ck-linha-resp">Frequência: <b>${esc(pl.frequencia)}</b></p>
    <p class="ck-linha-resp">Responsável: ${resps.length ? `<b>${resps.map(esc).join(', ')}</b>` : '<i class="ck-linha"></i>'}</p>
    ${notasHtml}
    ${rodape(pl, ym, { ck: true })}
  </section>`;
}
const porProd = (id) => S.produtos.find((p) => p.id === id) || { codigo: '', nome: '?' };

export const rodape = (pl, ym, op = {}) => `<div class="pl-fim"><footer class="pl-assin">
      ${op.ck ? '' : '<span>Responsável: <i></i></span>'}
      <span>Assinatura: <i></i></span>
      <small class="pl-gerado">${pl.codigo} · ${op.data ? fmtData(op.data) : pl.periodo === 'ano' ? ym.slice(0, 4) : mesAno(ym)}<br>gerado em ${dataMs(Date.now())} às ${hora(Date.now())}</small>
    </footer>${rodapePac(pl)}</div>`;

// ---------- Checklists ----------
const VAZIO = 'vazio';
const valorCol = (resp, c) => resp?.r?.[c.id] || '';

// O que mudou entre a versão original e a atual de um checklist.
function mudancasCk(m, reg) {
  const orig = reg.historico?.[0]?.anterior;
  if (!orig) return reg.editadoEm ? 'registro corrigido' : '';
  const out = [];
  if (orig.data !== reg.data) out.push(`Data: ${fmtData(orig.data)} → ${fmtData(reg.data)}`);
  for (const k of ['ingrediente', 'fornecedor', 'lote', 'validade', 'obs']) {
    const a = orig.valores?.[k] || '', b = reg.valores?.[k] || '';
    if (a !== b) out.push(`${k[0].toUpperCase() + k.slice(1)}: ${esc(a) || VAZIO} → ${esc(b) || VAZIO}`);
  }
  for (const r of reg.respostas || []) {
    const o = (orig.respostas || []).find((x) => x.item === r.item);
    const nome = m.itensConfig ? esc(r.texto) : `Item ${esc(r.item)}`;
    for (const c of m.colunas) {
      const a = valorCol(o, c), b = valorCol(r, c);
      if (a !== b) out.push(`${nome}${m.colunas.length > 1 ? ` (${c.t.toLowerCase()})` : ''}: ${a || VAZIO} → ${b || VAZIO}`);
    }
  }
  return out.join('; ');
}

// Texto da célula e se ela é NC.
function celula(m, resp) {
  if (!resp) return ['', false];
  const nc = colunasNC(m, resp);
  if (m.colunas.length === 1) return [valorCol(resp, m.colunas[0]), nc.length > 0];
  if (!m.colunas.every((c) => valorCol(resp, c))) return ['', false];
  return nc.length ? [`NC ${nc.map((c) => c.sigla || c.t[0]).join('')}`, true] : ['C', false];
}

// Itens do mês: os atuais + os que aparecem nos registros (se a lista mudou, nada some do papel).
function linhasItens(m, regs) {
  const itens = itensDe(m).map((i) => ({ id: i.id, t: i.t }));
  for (const r of regs) for (const resp of r.respostas || []) if (!itens.some((i) => i.id === resp.item)) itens.push({ id: resp.item, t: resp.texto });
  return itens;
}
const nomeItem = (m, it) => (m.itensConfig ? esc(it.t) : `<b>${esc(it.id)}.</b> ${esc(it.t)}`);

function colunasLista(m, ym, regs) {
  const h = hoje();
  // Semana/mês em andamento ainda não é "não preenchido": só depois que o período terminar.
  const st = (ini, fim = ini) => (fim < h || (m.freq === 'dia' && ini <= h) ? 'np' : 'futuro');
  const dias = diasDoMes(ym);
  if (m.freq === 'dia') return dias.map((d) => { const r = regs.find((x) => x.data === d); return { rotulo: d.slice(8), reg: r, status: r ? 'ok' : st(d) }; });
  const blocos = m.freq === 'semana' ? semanas(ym).map((s) => ({ ...s, rot: `Sem. ${s.n}` })) : [{ ini: dias[0], fim: dias[dias.length - 1], rot: 'Mês' }];
  return blocos.flatMap((b) => {
    const rs = regs.filter((r) => r.data >= b.ini && r.data <= b.fim);
    if (!rs.length) return [{ rotulo: b.rot, sub: `${fmtDataCurta(b.ini)} a ${fmtDataCurta(b.fim)}`, status: st(b.ini, b.fim) }];
    return rs.map((r) => ({ rotulo: fmtDataCurta(r.data), sub: m.freq === 'semana' ? b.rot : '', reg: r, status: 'ok' }));
  });
}

function listaNC(m, regs) {
  const linhas = regs.flatMap((r) => respostasNC(m, r).map((resp) => [r, resp]));
  if (!linhas.length) return '';
  return `<table class="pl ck-ncs"><thead><tr><th class="dia">Data</th><th>Item não conforme</th><th>Descrição</th><th>Ação corretiva</th></tr></thead><tbody>${linhas.map(([r, resp]) => {
    const cols = colunasNC(m, resp);
    return `<tr><td class="dia">${fmtDataCurta(r.data)}</td><td class="txt">${m.itensConfig ? esc(resp.texto) : `${esc(resp.item)}. ${esc(resp.texto)}`}${m.colunas.length > 1 ? ` (${cols.map((c) => c.t.toLowerCase()).join(', ')})` : ''}</td><td class="txt">${esc(resp.descricaoNC)}</td><td class="txt">${esc(resp.acaoCorretiva)}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function corpoLista(m, ym, regs, marca) {
  const cols = colunasLista(m, ym, regs);
  const itens = linhasItens(m, regs);
  const marcas = cols.map((c) => marca(c.reg));
  const estreita = m.freq === 'dia';
  const th = (c, i) => `<th class="${c.status === 'np' ? 'npc' : ''}">${esc(c.rotulo)}${marcas[i]}${c.sub && !estreita ? `<small>${esc(c.sub)}</small>` : ''}</th>`;
  const td = (c, it) => {
    if (c.status !== 'ok') return `<td class="${c.status === 'np' ? 'npc' : ''}"></td>`;
    const [txt] = celula(m, c.reg.respostas?.find((x) => x.item === it.id));
    return `<td class="c">${txt}</td>`;
  };
  const resp = (c) => `<td class="c${c.status === 'np' ? ' npc' : ''}">${c.status === 'ok' ? respCurto(c.reg.responsavel) : c.status === 'np' ? 'n.p.' : ''}</td>`;
  return `<table class="pl ck${estreita ? ' ck-dias' : ''}">
    <thead><tr><th class="item">${esc(m.rotuloItens || 'Itens')}</th>${cols.map(th).join('')}</tr></thead>
    <tbody>${itens.map((it) => `<tr><td class="item">${nomeItem(m, it)}</td>${cols.map((c) => td(c, it)).join('')}</tr>`).join('')}
    <tr class="ck-resp"><td class="item"><b>Responsável</b></td>${cols.map(resp).join('')}</tr></tbody></table>`;
}

function corpoMatriz(m, ym, regs, marca) {
  const dias = diasDoMes(ym);
  return (regs.length ? regs : [null]).map((r) => {
    const itens = linhasItens(m, r ? [r] : []);
    const cab = r ? `Data da verificação: <b>${fmtData(r.data)}</b>${marca(r)} · Responsável: <b>${esc(r.responsavel)}</b>`
      : dias[dias.length - 1] < hoje() ? 'Data da verificação: <b class="np-t">não preenchido</b>' : 'Data da verificação: ____/____/______';
    const linha = (it) => {
      const resp = r?.respostas?.find((x) => x.item === it.id);
      return `<tr><td class="item">${esc(it.t)}</td>${m.colunas.map((c) => `<td class="c">${valorCol(resp, c)}</td>`).join('')}<td class="txt">${esc(resp?.descricaoNC || '')}</td><td class="txt">${esc(resp?.acaoCorretiva || '')}</td></tr>`;
    };
    return `<p class="ck-sub">${cab}</p><table class="pl ck ck-matriz">
      <thead><tr><th class="item">${esc(m.rotuloItens)}</th>${m.colunas.map((c) => `<th>${esc(c.t)} (${c.tipo === 'simnao' ? 'SIM/NÃO' : 'C/NC'})</th>`).join('')}<th>Observação</th><th>Ação corretiva</th></tr></thead>
      <tbody>${itens.map(linha).join('')}</tbody></table>`;
  }).join('');
}

// Igual ao papel: perguntas nas linhas, um ingrediente/embalagem por coluna, com a data do recebimento.
// Se o mesmo ingrediente chegou mais de uma vez no mês, ganha uma coluna por recebimento.
function corpoRecebimento(m, regs, marca) {
  const itens = m.itens;
  const nomes = [...lista('ingredientes')];
  for (const r of regs) if (r.valores?.ingrediente && !nomes.includes(r.valores.ingrediente)) nomes.push(r.valores.ingrediente);
  const cols = nomes.flatMap((n) => { const rs = regs.filter((r) => r.valores?.ingrediente === n); return rs.length ? rs.map((r) => ({ n, r })) : [{ n }]; });
  const marcas = cols.map((c) => marca(c.r));
  return `<table class="pl ck">
      <thead>
        <tr><th class="item">Itens</th>${cols.map((c) => `<th>${esc(c.n)}</th>`).join('')}</tr>
        <tr><th class="item sub">Data do recebimento</th>${cols.map((c, i) => `<th class="sub">${c.r ? `${fmtData(c.r.data)}${marcas[i]}` : ''}</th>`).join('')}</tr>
      </thead>
      <tbody>${itens.map((it) => `<tr><td class="item"><b>${esc(it.id)}.</b> ${esc(it.t)}</td>${cols.map((c) => {
        if (!c.r) return '<td></td>';
        const [txt] = celula(m, c.r.respostas?.find((x) => x.item === it.id));
        return `<td class="c">${txt}</td>`;
      }).join('')}</tr>`).join('')}
      <tr class="ck-caixa"><td colspan="${cols.length + 1}"><b>Obs.:</b> ${obsRec(regs)}<br><b>Ação corretiva:</b> ${acoesRec(m, regs)}</td></tr></tbody></table>
    <p class="ck-leg">     C = Conforme        NC = Não Conforme</p>
    <p class="ck-linha-resp">Responsável: ${nomesResp(regs)}</p>`;
}
// Textos do campo "Obs.: / Ação corretiva:" da PL 02/05 (o papel tem um campo só para a folha).
const obsRec = (regs) => regs.filter((r) => r.valores?.fornecedor || r.valores?.lote || r.valores?.validade || r.valores?.obs)
  .map((r) => `${fmtDataCurta(r.data)} ${esc(r.valores.ingrediente)}: ${[r.valores.fornecedor && `fornecedor ${esc(r.valores.fornecedor)}`, r.valores.lote && `lote ${esc(r.valores.lote)}`, r.valores.validade && `validade ${fmtData(r.valores.validade)}`, r.valores.obs && esc(r.valores.obs)].filter(Boolean).join(', ')}`).join(' · ');
const acoesRec = (m, regs) => regs.flatMap((r) => respostasNC(m, r).map((x) => `${fmtDataCurta(r.data)} ${esc(r.valores?.ingrediente || '')}, item ${esc(x.item)}: ${esc([x.descricaoNC, x.acaoCorretiva].filter(Boolean).join(' – '))}`)).join(' · ');
const nomesResp = (regs) => { const n = [...new Set(regs.map((r) => r.responsavel).filter(Boolean))]; return n.length ? `<b>${n.map(esc).join(', ')}</b>` : '<i class="ck-linha"></i>'; };

function folhaCk(m, ym) {
  const dias = diasDoMes(ym);
  const regs = registrosCk(m.id, dias[0], dias[dias.length - 1]);
  const notas = [];
  const marca = (r) => {
    if (!r?.editadoEm) return '';
    const mud = mudancasCk(m, r);
    if (!mud) return '';
    notas.push([fmtDataCurta(r.data), r, mud]);
    return `<sup>${notas.length}</sup>`;
  };
  const corpo = m.layout === 'lista' ? corpoLista(m, ym, regs, marca) : m.layout === 'matriz' ? corpoMatriz(m, ym, regs, marca) : corpoRecebimento(m, regs, marca);

  const notasHtml = notas.length ? `<div class="pl-notas"><b>Registros corrigidos</b> (o registro original fica guardado no app):<ol>${notas.map(([d, r, mud]) =>
    `<li>${d}: corrigido em ${dataMs(r.editadoEm)} às ${hora(r.editadoEm)} por ${esc(r.editadoPor)}${r.motivoCorrecao ? `, motivo: “${esc(r.motivoCorrecao)}”` : ''}. ${mud}.</li>`).join('')}</ol></div>` : '';
  // Nada de texto extra na folha: só o que está no papel.
  const info = '';
  const siglas = m.colunas.filter((c) => c.sigla).map((c) => `${c.sigla} = ${c.t.toLowerCase()}`).join(', ');
  const legenda = [
    'C = Conforme · NC = Não Conforme',
    siglas ? `NC ${esc(siglas)}` : '',
    m.layout === 'lista' ? 'coluna cinza / n.p. = não preenchido' : '',
    notas.length ? 'número sobrescrito = registro corrigido (ver notas)' : '',
  ].filter(Boolean).join(' · ');

  return `<section class="folha">
    ${cabecalho(m, ym)}
    ${info ? `<p class="pl-info">${esc(info)}</p>` : ''}
    ${corpo}
    ${m.layout === 'recebimento' ? '' : listaNC(m, regs)}
    ${m.layout === 'recebimento' ? (notas.length ? '<p class="pl-leg">número sobrescrito = registro corrigido (ver notas)</p>' : '') : `<p class="pl-leg">${legenda}</p>`}
    ${notasHtml}
    ${rodape(m, ym, { ck: m.layout === 'recebimento' })}
  </section>`;
}

// ---------- Checklists no formato do papel: uma folha por verificação ----------
const BRANCO = '___/___/______';
const LINHA = '<i class="ck-linha"></i>';

function campoTopo(m, p, k, r) {
  if (k === 'freq') return `Frequência: <b>${esc(p.freq)}</b>`;
  if (k === 'data') return `Data: ${r ? `<b>${fmtData(r.data)}</b>` : BRANCO}`;
  return `Responsável: ${r?.responsavel ? `<b>${esc(r.responsavel)}</b>` : LINHA}`;
}

// Textos de cada item para uma caixa (ex.: "Ações corretivas:") — só itens que têm o texto.
function textoCaixa(m, r, k) {
  if (!r) return '';
  if (k === 'obs') return esc(r.valores?.obs || '');
  const campo = k === 'desc' ? 'descricaoNC' : 'acaoCorretiva';
  return (r.respostas || []).filter((x) => x[campo]).map((x) => `${m.itensConfig ? esc(x.texto) : `${esc(x.item)}.`} ${esc(x[campo])}`).join(' · ');
}

function tabelaPapel(m, r) {
  const p = m.papel;
  const itens = linhasItens(m, r ? [r] : []);
  const marcas = p.marcas || [];
  const colsResp = marcas.length ? marcas : m.colunas.map((c, i) => p.titulosCol?.[i] || c.t);
  const ncols = 1 + colsResp.length + (p.extras || []).length;
  const linha = (it) => {
    const resp = r?.respostas?.find((x) => x.item === it.id);
    let tds;
    if (marcas.length) {
      const item = itensDe(m).find((i) => i.id === it.id) || it;
      const v = valorCol(resp, m.colunas[0]);
      tds = opcoes(item, m.colunas[0]).map((o) => `<td class="c x">${v === o ? 'X' : ''}</td>`).join('');
    } else tds = m.colunas.map((c) => `<td class="c">${valorCol(resp, c)}</td>`).join('');
    const ext = (p.extras || []).map(([k]) => `<td class="txt">${esc(resp?.[k === 'desc' ? 'descricaoNC' : 'acaoCorretiva'] || '')}</td>`).join('');
    return `<tr><td class="item">${nomeItem(m, it)}</td>${tds}${ext}</tr>`;
  };
  const topo = p.topoTabela ? `<tr class="ck-topo">${p.topo.map((k, i) => `<td colspan="${i === p.topo.length - 1 ? ncols - p.topo.length + 1 : 1}">${campoTopo(m, p, k, r)}</td>`).join('')}</tr>` : '';
  const caixas = (p.caixas || []).map(([k, t]) => `<tr class="ck-caixa"><td colspan="${ncols}"><b>${esc(t)}</b> ${textoCaixa(m, r, k)}</td></tr>`).join('');
  return `<table class="pl ck ck-papel">
    <thead>${topo}<tr><th class="item">${esc(p.rotulo)}</th>${colsResp.map((t) => `<th class="${marcas.length ? 'x' : ''}">${esc(t)}</th>`).join('')}${(p.extras || []).map(([, t]) => `<th>${esc(t)}</th>`).join('')}</tr></thead>
    <tbody>${itens.map(linha).join('')}${caixas}</tbody></table>`;
}

// PL 01/01: caixas d'água × (presença de tampa SIM/NÃO, vazamentos SIM/NÃO, higiene, observação, ação corretiva, responsável)
function tabelaCaixas(m, r) {
  const p = m.papel;
  const itens = linhasItens(m, r ? [r] : []);
  const [tampa, vaz, hig] = m.colunas;
  const xs = (resp, c) => ['SIM', 'NÃO'].map((o) => `<td class="c x">${valorCol(resp, c) === o ? 'X' : ''}</td>`).join('');
  const linha = (it) => {
    const resp = r?.respostas?.find((x) => x.item === it.id);
    return `<tr><td class="item">${esc(it.t)}</td>${xs(resp, tampa)}${xs(resp, vaz)}<td class="c">${valorCol(resp, hig)}</td><td class="txt">${esc(resp?.descricaoNC || '')}</td><td class="txt">${esc(resp?.acaoCorretiva || '')}</td><td class="c">${r && resp ? esc(respCurto(r.responsavel)) : ''}</td></tr>`;
  };
  return `<table class="pl ck ck-papel ck-matriz">
    <thead><tr class="ck-topo"><td colspan="5">${campoTopo(m, p, 'freq', r)}</td><td colspan="4">${campoTopo(m, p, 'data', r)}</td></tr>
    <tr><th class="item" rowspan="2">${esc(m.rotuloItens)}</th><th colspan="2">Presença de tampa</th><th colspan="2">Vazamentos</th><th rowspan="2">Higiene</th><th rowspan="2">Observação</th><th rowspan="2">Ação Corretiva</th><th rowspan="2">Responsável</th></tr>
    <tr><th class="x">SIM</th><th class="x">NÃO</th><th class="x">SIM</th><th class="x">NÃO</th></tr></thead>
    <tbody>${itens.map(linha).join('')}</tbody></table>`;
}

function folhaPapel(m, ym, r) {
  const p = m.papel;
  const mud = r?.editadoEm ? mudancasCk(m, r) : '';
  const nota = mud ? `<div class="pl-notas"><b>Registro corrigido</b> (o original fica guardado no app): corrigido em ${dataMs(r.editadoEm)} às ${hora(r.editadoEm)} por ${esc(r.editadoPor)}${r.motivoCorrecao ? `, motivo: “${esc(r.motivoCorrecao)}”` : ''}. ${mud}.</div>` : '';
  const resp = `<p class="ck-linha-resp">${campoTopo(m, p, 'resp', r)}</p>`;
  const fim = p.legenda && p.respFim && m.id === 'PL-03-02'
    ? `<p class="ck-leg">${esc(p.legenda)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${campoTopo(m, p, 'resp', r)}</p>`
    : `${p.legenda ? `<p class="ck-leg">${esc(p.legenda)}</p>` : ''}${p.respFim ? resp : ''}`;
  return `<section class="folha retrato">
    ${cabecalho(m, ym, { ck: true })}
    ${p.respAntes ? resp : ''}
    ${p.topoTabela ? '' : `<p class="ck-linha-topo">${p.topo.map((k) => `<span>${campoTopo(m, p, k, r)}</span>`).join('')}</p>`}
    ${m.layout === 'matriz' ? tabelaCaixas(m, r) : tabelaPapel(m, r)}
    ${fim}
    ${nota}
    ${rodape(m, ym, { ck: true, data: r?.data })}
  </section>`;
}

// Uma folha por registro do mês. Mês sem nenhum registro: sai uma folha em branco, como o papel.
function folhasPapel(m, ym) {
  const d = diasDoMes(ym);
  const regs = registrosCk(m.id, d[0], d[d.length - 1]);
  return (regs.length ? regs : [null]).map((r) => folhaPapel(m, ym, r)).join('');
}

// Folhas que existem no papel saem na mesma posição do papel (em pé, salvo as de PAISAGEM).
// As folhas do app ("Registro do app", ex.: laudos) continuam deitadas, por serem largas.
const posicao = (id, html) => (PAISAGEM.has(id) || porId(id)?.proprio ? html : html.replaceAll('<section class="folha">', '<section class="folha retrato">'));
export const folha = (id, ym) => posicao(id, folhaBase(id, ym));
const folhaBase = (id, ym) => (id === 'TREIN' ? folhasTreinamento(ym) : EV(id) ? folhaEv(id, ym) : CK(id) ? (CK(id).papel ? folhasPapel(CK(id), ym) : folhaCk(CK(id), ym)) : folhaPL(id, ym));

// Quantos registros aparecem como corrigidos nesta folha (mesma regra do PDF).
export function corrigidosNaFolha(id, ym) {
  if (EV(id)) return corrigidosEv(id, ym);
  const m = CK(id);
  if (m) { const d = diasDoMes(ym); return registrosCk(id, d[0], d[d.length - 1]).filter((r) => r.editadoEm && mudancasCk(m, r)).length; }
  const pl = PL(id);
  const ids = new Set();
  for (const l of linhasMes(pl, ym)) for (const r of l.regs) if (r.editadoEm && mudancas(pl, r)) ids.add(r.id);
  return ids.size;
}

export const pacote = (ids, ym) => `<div class="folhas">${ids.map((id) => folha(id, ym)).join('')}</div>`;

export const tituloImpressao = (ids, ym) => (ids.length === 1 ? `${porId(ids[0]).codigo.replace('/', '-')} ${mesAno(ym).replace('/', '-')}` : `Pacote BPF ${mesAno(ym).replace('/', '-')}`);

