// Definição das planilhas (PL): código, título, frequência e colunas do papel.
// Fase 1: PL 01/05, 01/06, 01/09, 02/09 (Fabricação do dia) e 03/01, 02/06, 03/09 (Medições rápidas).
import { S } from '../core/store.js';
import { dec, esc, hoje, int } from '../core/format.js';
import { fora } from './faixas.js';

const vz = (v) => v === '' || v == null;
const n = (v, casas = 1) => (vz(v) ? '' : dec(v, casas));
const t = (v) => esc(v ?? '');
const cnc = (v) => (v === 'NC' ? '<b class="nc">NC</b>' : v === 'C' ? 'C' : '');
// Nome curto para a coluna "Resp.": apelido entre parênteses, senão o primeiro nome.
const curto = (nome) => {
  const s = String(nome || '');
  const apelido = s.match(/\(([^)]+)\)/);
  return esc(apelido ? apelido[1] : s.split(/\s+e\/ou\s+/)[0].split(' ')[0]);
};

// Problemas (NC) de cada tipo de registro. Usado nos alertas, na tela Hoje e no PDF.
const probFab = {
  leite: (r) => [r.sensorial === 'NC' && 'Análise sensorial do leite NC', r.alizarol === 'NC' && 'Alizarol NC', fora('dornic', r.dornic), fora('densidade', r.densidade)],
  temp: (r) => [fora('tempCozimento', r.tempCozimento), fora('tempoMexedura', r.tempoMexedura)],
};

// Colunas iguais às planilhas originais (PACs ALMEIDA GUIMARÃES.doc). O que o papel não tem
// como coluna (ação corretiva, observação) sai embaixo da tabela, em "Observações e ações corretivas".
//   colDia: título da primeira coluna no papel · resp: o papel tem coluna "Responsável"
//   rodape(r): textos que saem embaixo da tabela, por dia
export const PLANILHAS = [
  {
    id: 'PL-01-05', codigo: 'PL 01/05', titulo: 'Controle da matéria-prima – Leite', pac: '05', frequencia: 'diária', fonte: 'fab', tela: 'fabricacao', colDia: 'Dia',
    // Texto igual ao papel. O papel não tem campo de ação corretiva: ela fica guardada no app, não sai na folha.
    info: () => '*Íntegro (líquido branco opalescente homogêneo) com odor característico',
    legenda: 'C = Conforme                       NC = Não Conforme',
    problemas: (r) => probFab.leite(r).filter(Boolean),
    colunas: [
      { t: 'Horário recepção do leite', k: (r) => t(r.horaRecepcao), cls: 'c' },
      { t: 'Análise sensorial do leite* (C/NC)', k: (r) => cnc(r.sensorial), cls: 'c' },
      { t: 'Alizarol', k: (r) => cnc(r.alizarol), cls: 'c' },
      { t: 'Dornic', k: (r) => n(r.dornic, 0), cls: 'num', alerta: (r) => fora('dornic', r.dornic) },
      { t: 'Termolactodensímetro', k: (r) => n(r.densidade, 3), cls: 'num', alerta: (r) => fora('densidade', r.densidade) },
    ],
  },
  {
    id: 'PL-01-06', codigo: 'PL 01/06', titulo: 'Controle da temperatura no processo de fabricação', pac: '06', frequencia: 'diária', fonte: 'fab', tela: 'fabricacao', colDia: 'Data', freqFim: true,
    // Texto copiado do papel (fica embaixo da tabela, como no papel; a Frequência vem logo depois).
    info: () => 'Observação: A temperatura de aquecimento/mexedura da massa deve ser de 45 a 51ºC, por um período de 30 a 45 minutos, controlada com o uso de um termômetro.',
    problemas: (r) => probFab.temp(r).filter(Boolean),
    colunas: [
      { t: 'Volume de leite', k: (r) => n(r.volumeLeite, 0), cls: 'num' },
      { t: 'Temperatura do leite no início da fabricação', k: (r) => n(r.tempLeite), cls: 'num' },
      { t: 'Temperatura do cozimento da massa', k: (r) => n(r.tempCozimento), cls: 'num', alerta: (r) => fora('tempCozimento', r.tempCozimento) },
    ],
    // O papel não tem coluna de tempo de mexedura nem de ação corretiva: o app pede e guarda, mas não imprime.
  },
  {
    id: 'PL-01-09', codigo: 'PL 01/09', titulo: 'Controle de formulação dos produtos', pac: '09', frequencia: 'diária', fonte: 'fab', tela: 'fabricacao', colDia: 'Data de fabricação',
    problemas: () => [],
    colunas: [
      { t: 'Volume de leite (qtde)', k: (r) => n(r.volumeLeite, 0), cls: 'num' },
      { t: 'Temperatura do leite', k: (r) => n(r.tempLeite), cls: 'num' },
      { t: 'Acidez do leite (°D)', k: (r) => n(r.acidezLeite, 0), cls: 'num' },
      { t: 'Soro/Fermento (qtde)', k: (r) => t(r.fermento), cls: 'c' },
      { t: 'Acidez do soro (°D)', k: (r) => n(r.acidezSoro, 0), cls: 'num' },
      { t: 'Coalho (qtde)', k: (r) => t(r.coalho), cls: 'c' },
      { t: 'Rendimento (Kg)', k: (r) => n(r.rendimento), cls: 'num' },
    ],
  },
  {
    // Igual ao papel (PAC 09 .docx): Lote/Data Fabricação × produtos. A folha é montada em impressao.js (folhaProdutos).
    id: 'PL-02-09', codigo: 'PL 02/09', titulo: 'Controle de produtos e quantidade produzidos', pac: '09', frequencia: 'diária', fonte: 'fab', tela: 'fabricacao', porProduto: true, layout: 'produtos', colDia: 'Data', resp: true,
    problemas: () => [],
    colunas: [
      { t: 'Produto', k: (r) => t(r._prod?.nome) },
      { t: 'Lote', k: (r) => t(r._item?.lote) },
      { t: 'Quantidade (peças)', k: (r) => (vz(r._item?.pecas) ? '' : int(r._item.pecas)), cls: 'num' },
      { t: 'Quantidade (kg)', k: (r) => n(r._item?.kg), cls: 'num' },
    ],
  },
  {
    id: 'PL-03-01', codigo: 'PL 03/01', titulo: 'Controle da potabilidade da água', pac: '01', frequencia: 'diária', fonte: 'bpf', tela: 'medicoes', colDia: 'Data', resp: true, mesAno: false,
    // Textos copiados do papel, sem mudar nada, nos mesmos lugares: ponto de coleta no topo,
    // "7:00" embaixo do cabeçalho da tabela, legenda e observação embaixo.
    antes: '1 – Área de processamento/Fabricação queijos',
    subcab: '7:00',
    info: () => 'Observação: A cloração deve estar entre 0,2 à 5 ppm, e o PH entre 6 a 9,0.',
    legenda: 'C= Conforme    NC= Não conforme', legAntes: true,
    problemas: (r) => { const v = r.valores || {}; return [fora('cloro', v.cloro), fora('ph', v.ph), v.cor === 'NC' && 'Cor da água NC', v.odor === 'NC' && 'Odor da água NC'].filter(Boolean); },
    colunas: [
      { t: 'Teor de cloro', k: (r) => n(r.valores?.cloro), cls: 'num', alerta: (r) => fora('cloro', r.valores?.cloro) },
      { t: 'Cor', k: (r) => cnc(r.valores?.cor), cls: 'c' },
      { t: 'Odor', k: (r) => cnc(r.valores?.odor), cls: 'c' },
      { t: 'pH', k: (r) => n(r.valores?.ph), cls: 'num', alerta: (r) => fora('ph', r.valores?.ph) },
      { t: 'Observação', k: (r) => t(r.valores?.obs), cls: 'txt' },
      { t: 'Ação corretiva', k: (r) => t(r.valores?.acao), cls: 'txt' },
    ],
  },
  {
    id: 'PL-02-06', codigo: 'PL 02/06', titulo: 'Controle da temperatura da sala de maturação', pac: '06', frequencia: 'diária', fonte: 'bpf', tela: 'medicoes', colDia: 'Data', mesAno: false, freqFim: true,
    caixas: ['Não conformidade:', 'Ação corretiva:'],
    problemas: (r) => { const v = r.valores || {}; return [fora('matTemp', v.temp), fora('matUR', v.ur), v.cnc === 'NC' && (v.nc || 'Sala de maturação NC')].filter(Boolean); },
    colunas: [
      { t: 'Temperatura da sala de maturação', k: (r) => n(r.valores?.temp), cls: 'num', alerta: (r) => fora('matTemp', r.valores?.temp) },
      { t: 'Controle da umidade relativa do ar', k: (r) => n(r.valores?.ur, 0), cls: 'num', alerta: (r) => fora('matUR', r.valores?.ur) },
      { t: 'C/NC', k: (r) => cnc(r.valores?.cnc), cls: 'c' },
    ],
    rodape: (r) => [['Não conformidade:', r.valores?.nc], ['Ação corretiva:', r.valores?.acao]],
  },
  {
    id: 'PL-03-09', codigo: 'PL 03/09', titulo: 'Controle da salmoura', pac: '09', frequencia: 'diária', fonte: 'bpf', tela: 'medicoes', colDia: 'Data', mesAno: false, semFreq: true,
    // O papel da PL 03/09 não tem linha de frequência nem Mês/Ano; tem o campo "Obs.:" embaixo.
    caixas: ['Obs.:'],
    problemas: () => [],
    colunas: [
      { t: 'Volume', k: (r) => n(r.valores?.volume, 0), cls: 'num' },
      { t: 'Temperatura', k: (r) => n(r.valores?.temp), cls: 'num' },
      { t: 'Correção de sal', k: (r) => t(r.valores?.sal), cls: 'c' },
      { t: 'Correção de acidez (°D)', k: (r) => t(r.valores?.acidez), cls: 'c' },
    ],
    rodape: (r) => [['Obs.:', r.valores?.obs]],
  },
];

export const PL = (id) => PLANILHAS.find((p) => p.id === id);
export const respCurto = curto;

export function registrosDoDia(pl, data) {
  if (pl.fonte === 'fab') return S.fabricacoes.filter((f) => f.data === data);
  return S.bpf_registros.filter((r) => r.modeloId === pl.id && r.data === data);
}

export const diasDoMes = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const total = new Date(y, m, 0).getDate();
  return Array.from({ length: total }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
};

// Uma linha por dia (ou por registro, quando houver mais de um no dia).
// status: 'ok' · 'sem' (não houve fabricação) · 'vazio' (não preenchido) · 'futuro'
export function linhasMes(pl, ym) {
  const h = hoje();
  return diasDoMes(ym).map((data) => {
    let regs = registrosDoDia(pl, data).sort((a, b) => ((a.hora || a.horaRecepcao || '') < (b.hora || b.horaRecepcao || '') ? -1 : 1));
    if (pl.fonte === 'fab') {
      const fabs = regs.filter((r) => !r.semFabricacao);
      if (!fabs.length && regs.length) return { data, regs: [], status: 'sem', reg: regs[0] };
      regs = fabs;
      if (pl.porProduto) regs = regs.flatMap((f) => ((f.produtos || []).length ? f.produtos : [null]).map((item) => ({ ...f, _item: item, _prod: item && S.produtos.find((p) => p.id === item.produtoId) })));
    }
    if (regs.length) return { data, regs, status: 'ok' };
    return { data, regs: [], status: data > h ? 'futuro' : 'vazio' };
  });
}

export function resumoMes(pl, ym) {
  const linhas = linhasMes(pl, ym);
  const passados = linhas.filter((l) => l.status !== 'futuro');
  const regs = linhas.flatMap((l) => l.regs);
  const unicos = [...new Map(regs.map((r) => [r.id, r])).values()];
  return {
    dias: passados.length,
    preenchidos: passados.filter((l) => l.status === 'ok' || l.status === 'sem').length,
    faltando: passados.filter((l) => l.status === 'vazio').map((l) => l.data),
    nc: unicos.filter((r) => pl.problemas(r).length).length,
  };
}

// Todos os problemas de um registro de fabricação (para alertas).
export const problemasFab = (f) => (f.semFabricacao ? [] : [...probFab.leite(f), ...probFab.temp(f)].filter(Boolean));
