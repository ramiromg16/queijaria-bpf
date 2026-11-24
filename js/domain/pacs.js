// Cabeçalho e rodapé de cada PAC, copiados LITERALMENTE dos documentos da Queijaria Artesanal
// Almeida Guimarães (cabeçalho/rodapé de página de cada arquivo "PAC xx ...", conferidos em 19/11/2026).
// Atenção: está igual ao papel, inclusive o erro do PAC 01, cujo cabeçalho diz "Código: PAC 02"
// e "Página: x de 5" (o total 5 está escrito fixo no documento).
//   nome: segunda linha da caixa do meio · codigo: "Código: ..." · total: o "de y" de "Página x de y"
//   rotuloPagina: "Página" ou "Página:" (o PAC 01 usa dois-pontos)
export const LOGO = 'img/logo-queijaria.png';

export const RODAPE_PAC = [
  ['Elaborado por:', 'Flora Aparecida Teixeira Castro'],
  ['Verificado por:', 'Adriana Maria de Almeida'],
  ['Aprovado por:', 'Luiz Antônio Guimarães'],
];

const P = (nome, codigo, total, rotuloPagina = 'Página') => ({ nome, codigo, revisao: '00', total, rotuloPagina });
export const PACS = {
  '01': P('ÁGUA DE ABASTECIMENTO E ÁGUAS RESIDUAIS', 'PAC 02', '5', 'Página:'),
  '02': P('Manutenção das Instalações, Equipamentos e Utensílios; Limpeza e Sanitização; Vestiário, Sanitário e Barreira Sanitária; Iluminação e Ventilação', 'PAC 02', '8'),
  '03': P('Higiene, Hábitos Higiênicos, Treinamento e Saúde dos Colaboradores', 'PAC 03', '6'),
  '04': P('Controle Integrado de Pragas', 'PAC 04', '6'),
  '05': P('Controle matéria-prima, ingredientes, material de embalagem e combate à fraude', 'PAC 05', '6'),
  '06': P('Controle de temperatura', 'PAC 06', '6'),
  '07': P('Calibração e aferição de instrumentos de controle de processo', 'PAC 07', '5'),
  '09': P('Controle de formulação dos produtos', 'PAC 09', '7'),
  '10': P('Procedimentos Sanitários Operacionais', 'PAC 10', '4'),
  '11': P('Rastreabilidade e Recolhimento', 'PAC 11', '2'),
};

// Número da página de cada planilha dentro do documento do PAC ("Página x de y").
// No Word esse número é automático e os arquivos recebidos não guardam em que página cada PL cai.
// Preencher aqui conferindo a folha de papel (ex.: 'PL-01-04': '5'). Vazio = sai "___".
export const PAGINA_PL = {};

// Posição da folha no papel (tamanho de página de cada seção dos documentos, conferido em 19/11/2026).
// Quase todas as PLs são em pé (retrato). Só estas são deitadas (paisagem):
export const PAISAGEM = new Set(['PL-02-05', 'PL-02-09', 'PL-03-09', 'PL-02-11']);
