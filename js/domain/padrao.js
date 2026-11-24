// Cadastro inicial: modelo da Queijaria Artesanal Almeida Guimarães (Itanhandu/MG),
// recebido em 17/11/2026. Outra queijaria só precisa mudar isto em Configurações.
import { FAIXAS_PADRAO } from './faixas.js';
import { LISTAS_PADRAO } from './modelos.js';

export const PACS = [
  ['01', 'Água de abastecimento'],
  ['02', 'Instalações, equipamentos e higienização'],
  ['03', 'Higiene e saúde dos colaboradores'],
  ['04', 'Controle integrado de pragas'],
  ['05', 'Matéria-prima, ingredientes e embalagens'],
  ['06', 'Controle de temperaturas'],
  ['07', 'Aferição e calibração de instrumentos'],
  ['08', 'Análises laboratoriais'],
  ['09', 'Formulação e produção'],
  ['10', 'Procedimentos sanitários operacionais'],
  ['11', 'Rastreabilidade e recolhimento'],
];

const NOMES = ['TRADICIONAL', 'CURADO', 'DEFUMADO', 'ROSSO', 'CAPA PRETA', 'ÁUREO', 'AZEITADO', 'CACHACEIRO', 'MACCHIATO', 'ALECRIM', 'MANJERICÃO', 'PIMENTA', 'DEFUMADO COM HORTELÃ', 'PANELA DE QUEIJO', 'CAPRINO', 'PECORINO'];

export const produtosIniciais = () =>
  NOMES.map((nome, i) => ({ id: `p${String(i + 1).padStart(3, '0')}`, codigo: String(i + 1).padStart(3, '0'), nome, ativo: true }));

const TUCA = 'Luiz Antônio Guimarães (Tuca)';
const TUCA_MARCELO = 'Tuca e/ou Marcelo Lúcio';

export const configInicial = () => ({
  nome: 'Queijaria Artesanal Almeida Guimarães',
  cidade: 'Itanhandu/MG',
  registro: '',
  documento: '',
  telefone: '',
  responsaveis: {
    geral: TUCA,
    '01': TUCA, '02': 'Marcelo Lúcio', '03': 'Adriana', '04': TUCA,
    '05': TUCA_MARCELO, '06': TUCA_MARCELO, '07': TUCA, '08': 'Adriana',
    '09': TUCA_MARCELO, '10': TUCA, '11': 'Adriana',
  },
  faixas: JSON.parse(JSON.stringify(FAIXAS_PADRAO)),
  caixasDagua: [...LISTAS_PADRAO.caixasDagua],
  equipamentosHigienizacao: [...LISTAS_PADRAO.equipamentosHigienizacao],
  ingredientes: [...LISTAS_PADRAO.ingredientes],
  // Linha do cabeçalho da PL 02/11 no papel da Almeida Guimarães
  tituloComercializacao: 'MANTIQUEIRA DE MINAS',
});
