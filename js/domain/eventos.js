// Fase 3: planilhas de registro "quando acontece" e periódicas.
//   Expedição ......... PL 01/11 Rastreabilidade · PL 02/11 Comercialização (mesmos dados)
//   Ocorrências ....... PL 02/04 Pragas · IT 01/11 Devolução/recolhimento · Não conformidade avulsa
//   Agenda e laudos ... PL 01/07 Aferição · PL 02/07 Calibração da balança · PL 02/01 Higiene da caixa d'água · Laudos (PAC 08)
//
// Colunas copiadas das planilhas originais (PAC 01, 04, 07 e 11 da Almeida Guimarães).
// "proprio: true" = o modelo não tem planilha em papel para isso; a folha é do app e diz isso.
//
// Dados:
//   expedicoes:      { data, produtoId, lote, kg, destino, obs, responsavel }
//   bpf_ocorrencias: { tipo: 'praga'|'recolhimento'|'nc', data, hora, valores, responsavel }
//   bpf_registros:   { modeloId: 'PL-01-07'|'PL-02-07'|'PL-02-01', data, valores, responsavel }
//   laudos:          { tipo: 'leite'|'queijo'|'agua'|'outro', data (coleta), dataResultado, laboratorio, analises, resultado, arquivo, obs, acao, responsavel }
import { S } from '../core/store.js';
import { dec, esc, hoje, fmtData, fmtDataCurta, mesDe } from '../core/format.js';
import { diasDoMes } from './planilhas.js';
import { lista } from './checklists.js';

const t = (v) => esc(v ?? '');
const cnc = (v) => (v === 'NC' ? '<b class="nc">NC</b>' : v === 'C' ? 'C' : '');
const kg = (v) => (v === '' || v == null ? '' : dec(v, 1));
const ord = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : (a.hora || '') < (b.hora || '') ? -1 : (a.hora || '') > (b.hora || '') ? 1 : (a.criado || 0) - (b.criado || 0));
export const produto = (id) => S.produtos.find((p) => p.id === id);
const nomeProd = (id) => { const p = produto(id); return p ? `${p.codigo} ${p.nome}` : ''; };

// ---------- Listas fixas do papel ----------
// PL 02/04: "1 - Barata 2 - Formiga 3 - Mosca 4 – Rato 5 – Aranha 6 – Tesourinha 7 – Besouro 8 – Outros (especificar)"
export const PRAGAS = ['Barata', 'Formiga', 'Mosca', 'Rato', 'Aranha', 'Tesourinha', 'Besouro', 'Outros'];
export const nomePraga = (v) => (v.praga === '8' || v.praga === 8 ? `Outros: ${v.outra || '?'}` : PRAGAS[+v.praga - 1] || '');

// PL 01/07: Termômetro | Balança | Termolactodensímetro | Aerômetro de Baumé
export const INSTRUMENTOS = [['termometro', 'Termômetro'], ['balanca', 'Balança'], ['termolacto', 'Termolactodensímetro'], ['baume', 'Aerômetro de Baumé']];

// PAC 08, item 4.1 (texto do documento)
export const LAUDOS = {
  leite: { nome: 'Leite', meses: 3, analises: 'Contagem de células somáticas (CCS) e contagem padrão em placa (CPP), em laboratório da RBQL' },
  queijo: { nome: 'Queijo', meses: 6, analises: 'Físico-químicas: umidade, amido, fosfatase residual e nitrato · Microbiológicas: coliformes a 35 °C, coliformes a 45 °C, Staphylococcus coagulase positivo, Salmonella spp e L. monocytogenes' },
  agua: { nome: 'Água', meses: 6, analises: 'Físico-químicas: cor, turbidez, nitrato, nitrito, cloretos, pH, cloro residual livre, dureza total e ferro total · Microbiológicas: coliformes a 35 °C, coliformes a 45 °C e contagem de bactérias heterotróficas' },
  outro: { nome: 'Outra análise', meses: null, analises: '' },
};

// PL 02/01: linhas do papel = as caixas d'água (sem as linhas de distribuição) + "Troca do filtro"
export const itensCaixa = () => [...lista('caixasDagua').filter((c) => !/linha/i.test(c)), 'Troca do filtro'];

// ---------- Fontes de dados ----------
const oc = (tipo) => (ini, fim) => S.bpf_ocorrencias.filter((r) => r.tipo === tipo && r.data >= ini && r.data <= fim).sort(ord);
const reg = (id) => (ini, fim) => S.bpf_registros.filter((r) => r.modeloId === id && r.data >= ini && r.data <= fim).sort(ord);

export const EVENTOS = [
  {
    id: 'PL-01-11', codigo: 'PL 01/11', titulo: 'Rastreabilidade dos produtos acabados', pac: '11', frequencia: 'expedição de produtos', tela: 'expedicao', periodo: 'mes', mesAno: false, freqFim: true, caixas: ['Observações:'],
    regs: (ini, fim) => S.expedicoes.filter((r) => r.data >= ini && r.data <= fim).sort(ord),
    colunas: [
      { t: 'Data', k: (r) => fmtData(r.data), cls: 'c dia' },
      { t: 'Produto', k: (r) => t(nomeProd(r.produtoId)) },
      { t: 'Lote', k: (r) => t(r.lote), cls: 'c' },
      { t: 'Quant. Kg', k: (r) => kg(r.kg), cls: 'num' },
      { t: 'Destino/Local da venda', k: (r) => t(r.destino) },
    ],
    rodape: (r) => [['Observações:', r.obs]],
    relacaoProdutos: true,
    problemas: () => [],
  },
  {
    id: 'PL-02-11', codigo: 'PL 02/11', titulo: 'Controle da comercialização', pac: '11', frequencia: 'no momento da comercialização', tela: 'expedicao', periodo: 'mes', layout: 'comercializacao', mesAno: false, freqFim: true,
    regs: (ini, fim) => S.expedicoes.filter((r) => r.data >= ini && r.data <= fim).sort(ord),
    colunas: [],
    problemas: () => [],
  },
  {
    id: 'PL-02-04', codigo: 'PL 02/04', titulo: 'Registro de Ocorrências de Pragas', pac: '04', frequencia: 'diária', tela: 'ocorrencias', periodo: 'mes', caixas: ['Observações:'],
    regs: oc('praga'),
    vazioMsg: 'Nenhuma ocorrência de pragas registrada neste mês.',
    colunas: [
      { t: 'Data', k: (r) => fmtDataCurta(r.data), cls: 'c dia' },
      { t: 'Hora', k: (r) => t(r.hora), cls: 'c' },
      { t: 'Setor', k: (r) => t(r.valores?.setor) },
      { t: 'Praga', k: (r) => `${t(r.valores?.praga)} – ${t(nomePraga(r.valores || {}))}` },
      { t: 'Vivo', k: (r) => (r.valores?.situacao === 'vivo' ? 'X' : ''), cls: 'c' },
      { t: 'Morto', k: (r) => (r.valores?.situacao === 'morto' ? 'X' : ''), cls: 'c' },
    ],
    rodape: (r) => [['Observações:', r.valores?.obs]],
    legenda: () => `${PRAGAS.map((p, i) => `${i + 1} – ${p}${i === 7 ? ' (especificar)' : ''}`).join('   ')}.`,
    problemas: (r) => [`Praga: ${nomePraga(r.valores || {})}${r.valores?.situacao ? ` (${r.valores.situacao})` : ''}${r.valores?.setor ? `, ${r.valores.setor}` : ''}`],
    acao: (r) => r.valores?.obs,
  },
  {
    id: 'IT-01-11', codigo: 'IT 01/11', titulo: 'Recolhimento e devolução de produtos', pac: '11', frequencia: 'sempre que se fizer necessário', tela: 'ocorrencias', periodo: 'mes', proprio: true, ordem: '11-03',
    info: () => 'IT 01/11: 1 Recolhimento (recolher do comércio) · 2 Armazenamento (colocar em setor separado até que se determine o destino) · 3 Destinação final (descarte adequado).',
    regs: oc('recolhimento'),
    vazioMsg: 'Nenhum recolhimento ou devolução registrado neste mês.',
    colunas: [
      { t: 'Data', k: (r) => fmtDataCurta(r.data), cls: 'c dia' },
      { t: 'Produto', k: (r) => t(nomeProd(r.valores?.produtoId)) },
      { t: 'Lote', k: (r) => t(r.valores?.lote), cls: 'c' },
      { t: 'Kg', k: (r) => kg(r.valores?.kg), cls: 'num' },
      { t: 'Cliente / local', k: (r) => t(r.valores?.cliente) },
      { t: 'Motivo', k: (r) => t(r.valores?.motivo), cls: 'txt' },
      { t: 'Onde ficou separado', k: (r) => t(r.valores?.separado), cls: 'txt' },
      { t: 'Destino final', k: (r) => (r.valores?.destino ? `${t(r.valores.destino)}${r.valores.dataDestino ? ` (${fmtDataCurta(r.valores.dataDestino)})` : ''}` : '<i>pendente</i>'), cls: 'txt' },
    ],
    problemas: (r) => [`Recolhimento${r.valores?.lote ? ` do lote ${r.valores.lote}` : ''}${r.valores?.motivo ? `: ${r.valores.motivo}` : ''}`, !r.valores?.destino && 'destino final ainda não informado'].filter(Boolean),
    acao: (r) => r.valores?.destino,
  },
  {
    id: 'RNC', codigo: 'NC', titulo: 'Registro de não conformidades', pac: '', frequencia: 'quando acontecer', tela: 'ocorrencias', periodo: 'mes', proprio: true, ordem: '99',
    regs: oc('nc'),
    vazioMsg: 'Nenhuma não conformidade avulsa registrada neste mês.',
    colunas: [
      { t: 'Data', k: (r) => fmtDataCurta(r.data), cls: 'c dia' },
      { t: 'Setor / assunto', k: (r) => t(r.valores?.setor) },
      { t: 'Descrição da não conformidade', k: (r) => t(r.valores?.descricao), cls: 'txt' },
      { t: 'Ação corretiva', k: (r) => t(r.valores?.acao), cls: 'txt' },
    ],
    problemas: (r) => [r.valores?.descricao || 'Não conformidade'],
    acao: (r) => r.valores?.acao,
  },
  {
    // PL 02/03 "Periódicos" (PAC 03): Nome | Data Nascimento | Cargo | Exames Periódico (Programar | Realizar)
    // + "Obs.: Funcionário afastado / Motivo / Data". Folha do ano. Montada em impressao-eventos.js.
    id: 'PL-02-03', codigo: 'PL 02/03', titulo: 'Periódicos', pac: '03', frequencia: 'anual', tela: 'colaboradores', periodo: 'ano', layout: 'periodicos', mesAno: false,
    regs: (ini, fim) => S.bpf_registros.filter((r) => r.modeloId === 'PL-02-03' && r.data >= ini && r.data <= fim).sort(ord),
    colunas: [],
    // Exame atrasado aparece como aviso na tela Hoje e na tela Colaboradores.
    problemas: () => [],
  },
  {
    // PAC 03: "sempre que é realizado um treinamento, um relatório é gerado com o assunto abordado e
    // todos os participantes assinam o documento". Sem modelo em papel: uma folha por treinamento.
    id: 'TREIN', codigo: 'Treinamento', titulo: 'Relatório de treinamento e lista de presença', pac: '03', frequencia: 'sempre que houver treinamento', tela: 'colaboradores', periodo: 'mes', proprio: true, ordem: '03-03',
    regs: (ini, fim) => S.treinamentos.filter((r) => r.data >= ini && r.data <= fim).sort(ord),
    colunas: [],
    problemas: () => [],
  },
  {
    id: 'PL-01-07', codigo: 'PL 01/07', titulo: 'Controle de aferição de termômetro e balança', pac: '07', frequencia: 'mensal', tela: 'agenda', periodo: 'ano', layout: 'meses', mesAno: false, caixas: ['Ação corretiva:'],
    regs: reg('PL-01-07'),
    colunas: [
      { t: 'Data', k: (r) => fmtData(r.data), cls: 'c dia' },
      ...INSTRUMENTOS.map(([k, n]) => ({ t: n, k: (r) => cnc(r.valores?.[k]), cls: 'c', alerta: (r) => r.valores?.[k] === 'NC' })),
      { t: 'Observações', k: (r) => t(r.valores?.obs), cls: 'txt' },
    ],
    rodape: (r) => [['Ação corretiva:', r.valores?.acao]],
    problemas: (r) => INSTRUMENTOS.filter(([k]) => r.valores?.[k] === 'NC').map(([, n]) => `Aferição NC: ${n.toLowerCase()}`),
    acao: (r) => r.valores?.acao,
  },
  {
    id: 'PL-02-07', codigo: 'PL 02/07', titulo: 'Controle de Calibração da Balança', pac: '07', frequencia: 'anual', tela: 'agenda', periodo: 'ano', mesAno: false, caixas: ['Ação corretiva:'],
    regs: reg('PL-02-07'),
    vazioMsg: 'Nenhuma calibração registrada neste ano.',
    colunas: [
      { t: 'Data', k: (r) => fmtData(r.data), cls: 'c dia' },
      { t: 'Balança', k: (r) => cnc(r.valores?.balanca), cls: 'c', alerta: (r) => r.valores?.balanca === 'NC' },
      { t: 'Observações', k: (r) => t(r.valores?.obs), cls: 'txt' },
    ],
    rodape: (r) => [['Ação corretiva:', r.valores?.acao]],
    problemas: (r) => (r.valores?.balanca === 'NC' ? ['Calibração da balança NC'] : []),
    acao: (r) => r.valores?.acao,
  },
  {
    id: 'PL-02-01', codigo: 'PL 02/01', titulo: 'Controle da Higiene da Caixa d’água', pac: '01', frequencia: 'Semestral', tela: 'agenda', periodo: 'ano', layout: 'caixas', mesAno: false,
    regs: reg('PL-02-01'),
    colunas: [],
    problemas: () => [],
  },
  {
    id: 'LAUDOS', codigo: 'PAC 08', titulo: 'Controle das análises laboratoriais', pac: '08', frequencia: 'leite: trimestral · queijo e água: semestral', tela: 'agenda', periodo: 'ano', proprio: true, ordem: '08-01',
    info: () => 'Os laudos em papel ficam arquivados na queijaria (PAC 08). Aqui fica o controle: quando coletou, onde analisou, o resultado e onde o laudo está guardado.',
    regs: (ini, fim) => S.laudos.filter((r) => r.data >= ini && r.data <= fim).sort(ord),
    vazioMsg: 'Nenhuma análise registrada neste ano.',
    colunas: [
      { t: 'Coleta', k: (r) => fmtData(r.data), cls: 'c dia' },
      { t: 'Tipo', k: (r) => t(LAUDOS[r.tipo]?.nome || r.tipo), cls: 'c' },
      { t: 'Análises', k: (r) => t(r.analises), cls: 'txt' },
      { t: 'Laboratório', k: (r) => t(r.laboratorio) },
      { t: 'Resultado', k: (r) => (r.resultado ? `${r.dataResultado ? `${fmtDataCurta(r.dataResultado)} ` : ''}${cnc(r.resultado)}` : '<i>aguardando</i>'), cls: 'c', alerta: (r) => r.resultado === 'NC' },
      { t: 'Onde está arquivado', k: (r) => t(r.arquivo), cls: 'txt' },
    ],
    rodape: (r) => [['Obs.', r.obs], ['Ação corretiva', r.acao]],
    problemas: (r) => (r.resultado === 'NC' ? [`Laudo de ${(LAUDOS[r.tipo]?.nome || r.tipo).toLowerCase()} não conforme`] : []),
    acao: (r) => r.acao,
  },
];

export const EV = (id) => EVENTOS.find((e) => e.id === id);

// Qual planilha um registro pertence (para alertas e para abrir a correção).
export function evDoRegistro(col, r) {
  if (col === 'expedicoes') return EV('PL-01-11');
  if (col === 'laudos') return EV('LAUDOS');
  if (col === 'treinamentos') return EV('TREIN');
  if (col === 'bpf_registros' && r.modeloId === 'PL-02-03') return EV('PL-02-03');
  if (col === 'bpf_ocorrencias') return EV({ praga: 'PL-02-04', recolhimento: 'IT-01-11', nc: 'RNC' }[r.tipo]);
  if (col === 'bpf_registros') return EVENTOS.find((e) => e.id === r.modeloId && e.periodo === 'ano' && e.id !== 'LAUDOS');
  return null;
}

// Período impresso: o mês, ou o ano inteiro (planilhas mensal/anual/semestral, que no papel são de um ano).
export function intervalo(ev, ym) {
  if (ev.periodo === 'ano') return { ini: `${ym.slice(0, 4)}-01-01`, fim: `${ym.slice(0, 4)}-12-31` };
  const d = diasDoMes(ym);
  return { ini: d[0], fim: d[d.length - 1] };
}

export function resumoEv(ev, ym) {
  const d = diasDoMes(ym);
  const regs = ev.regs(d[0], d[d.length - 1]);
  const nc = regs.filter((r) => ev.problemas(r).length).length;
  if (ev.layout === 'meses') {
    // Mensal: só conta como "sem registro" depois que o mês terminar.
    const acabou = d[d.length - 1] < hoje();
    const falta = acabou && !regs.length;
    return { dias: acabou || regs.length ? 1 : 0, preenchidos: regs.length ? 1 : 0, faltando: falta ? [d[0]] : [], faltandoRotulos: falta ? ['mês'] : [], nc };
  }
  return { dias: regs.length, preenchidos: regs.length, faltando: [], nc, evento: true, unidade: 'registro(s)' };
}

export const ehDoMes = (data, ym) => mesDe(data) === ym;
