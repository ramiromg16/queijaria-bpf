// Modelos dos checklists. Tudo em dados: para mudar um item, mude aqui.
//
// Textos copiados das planilhas originais da Queijaria Artesanal Almeida Guimarães
// (arquivo "PACs ALMEIDA GUIMARÃES.doc" e "PAC 05 ... .docx", recebidos em 17/11/2026).
// A numeração segue o papel, inclusive onde o papel pula número (PL 01/02 não tem o item 10).
//
// Campos de cada modelo:
//   freq: 'dia' | 'semana' | 'mes' | 'evento' (no recebimento)
//   layout: 'lista' (itens × datas) · 'matriz' (objetos × perguntas, ex.: caixas d'água) · 'recebimento'
//   colunas: perguntas feitas para cada item. tipo 'cnc' (C/NC) ou 'simnao' (SIM/NÃO)
//   itens: [{ id, t, tipo?, esperado?, dica? }]. `esperado` é a resposta BOA. Nas planilhas SIM/NÃO
//   várias perguntas são invertidas (a resposta boa é NÃO). Nas planilhas C/NC o papel usa C para
//   "está certo" mesmo quando a pergunta é invertida; `dica` lembra isso no formulário.
//   itensConfig: nome da lista em Configurações que vira os itens (ex.: caixas d'água)

const C = (id, t, dica) => ({ id, t, tipo: 'cnc', ...(dica ? { dica } : {}) });
const SIM = (id, t) => ({ id, t, tipo: 'simnao', esperado: 'SIM' });
const NAO = (id, t) => ({ id, t, tipo: 'simnao', esperado: 'NÃO' });
const RESP = [{ id: 'r', t: 'Resposta' }];
const C_NAO_HA = 'C = não há; NC = há';

// Listas padrão de Configurações (iguais ao papel; a queijaria pode mudar)
export const LISTAS_PADRAO = {
  caixasDagua: ['Caixa 5.000 lts', 'Caixa 2.000 lts', 'Linhas de Distribuição'],
  equipamentosHigienizacao: [
    'Suporte de Papel Toalha (PT)', 'Suporte de Sabão líquido (SL)', 'Lixeira de Pedal (LP)', 'Tanque de Fabricação',
    'Tanques de salmoura', 'Bancadas', 'Mesas', 'Pia', 'Prensa', 'Formas', 'Lira', 'Pesos', 'Panos', 'Desnatadeira',
    'Batedeira de manteiga', 'Embaladora a vácuo', 'Balança Eletrônica', 'Prateleiras de maturação', 'Baldes', 'Peneiras',
    'Vassouras', 'Rodos', 'Janelas', 'Telas', 'Pisos', 'Tetos', 'Paredes',
  ],
  ingredientes: ['Sal', 'Coalho', 'Condimentos', 'Tinturas', 'Grãos de café', 'Azeite', 'Embalagem'],
};
export const NOMES_LISTAS = {
  caixasDagua: "Caixas d'água e redes (PL 01/01)",
  equipamentosHigienizacao: 'Equipamentos e utensílios (PL 03/02)',
  ingredientes: 'Ingredientes e embalagens (PL 02/05)',
};

export const CHECKLISTS = [
  {
    id: 'PL-03-02', codigo: 'PL 03/02', titulo: 'Avaliação da eficiência da higienização', pac: '02', frequencia: 'diária', freq: 'dia', layout: 'lista',
    colunas: [{ id: 'visual', t: 'Avaliação visual', sigla: 'V', tipo: 'cnc' }, { id: 'contato', t: 'Contato direto', sigla: 'T', tipo: 'cnc' }],
    itensConfig: 'equipamentosHigienizacao', rotuloItens: 'Equipamentos / utensílios',
    it: 'IT 03/02 – Higienização manual de equipamentos e utensílios',
  },
  {
    id: 'PL-01-02', codigo: 'PL 01/02', titulo: 'Avaliação das condições de vestiário, sanitário, barreira sanitária, iluminação e ventilação', pac: '02', frequencia: 'semanal', freq: 'semana', layout: 'lista', colunas: RESP,
    nota: 'A numeração segue a planilha original, que não tem o item 10.',
    itens: [
      C('1', 'O ambiente do vestiário e do sanitário está limpo e organizado?'),
      C('2', 'O armário do vestiário está limpo, organizado e devidamente identificado?'),
      C('3', 'O ambiente da barreira sanitária está limpo e organizado?'),
      C('4', 'As lixeiras estão funcionando e possuem tampas e sacos plásticos?'),
      C('5', 'O lixo é recolhido diariamente?'),
      C('6', 'Há presença de sabonete líquido na saboneteira?'),
      C('7', 'Há presença de suporte de papel toalha?'),
      C('8', 'Há papel toalha não reciclável para secar as mãos?'),
      C('9', 'Pias e ralos estão em bom estado de conservação e funcionando adequadamente?'),
      C('11', 'Lava botas está em bom estado de conservação e funcionando adequadamente?'),
      C('12', 'O acionamento da torneira da barreira sanitária é sem contato manual e está em perfeito funcionamento?'),
      C('13', 'Os detergentes e sanitizantes são identificados e guardados em lugares específicos?'),
      C('14', 'Vasos sanitários, chuveiros, pias e lavador de botas em condições adequadas?'),
      C('15', 'A iluminação natural e/ou artificial é suficiente na área de trabalho?'),
      C('16', 'A intensidade e qualidade da iluminação permitem avaliar as condições higiênicas dos utensílios e equipamentos?'),
      C('17', 'As luminárias estão adequadas e em bom estado de conservação?'),
      C('18', 'A ventilação está suficiente para evitar o calor excessivo e a condensação de vapor?'),
      C('19', 'O controle de condensação é adequado?'),
    ],
  },
  {
    id: 'PL-02-02', codigo: 'PL 02/02', titulo: 'Instalações e equipamentos industriais', pac: '02', frequencia: 'semanal', freq: 'semana', layout: 'lista', colunas: RESP,
    itens: [
      C('1', 'Coberturas, forro ou teto em estado de manutenção adequado?'),
      C('2', 'Paredes em estado de manutenção adequado?'),
      C('3', 'Piso em estado de manutenção adequado?'),
      C('4', 'Portas, janelas, óculos e outras aberturas estão adequadamente vedadas?'),
      C('5', 'Portas e janelas em estado de manutenção adequado?'),
      C('6', 'As embalagens e ingredientes de uso diário estão bem-acondicionados na área de produção?'),
      C('7', 'Ausência de vazamentos, infiltrações e descamações decorrentes das instalações hidráulicas?'),
      C('8', 'Condições adequadas de manutenção das tubulações e suportes (para transporte do produto, vapor, água de abastecimento, rede elétrica)?'),
      C('9', 'Ausência de instalações provisórias?'),
      C('10', 'Áreas de circulação e de estacionamento de veículos estão em boas condições de manutenção?'),
      C('11', 'A área ao redor das edificações encontra-se em situação adequada de limpeza e organização?'),
      C('12', 'Escoamento adequado das águas residuais, ausência de empoçamentos?'),
      C('13', 'Existência de equipamentos indispensáveis ao processamento e compatíveis com o volume de produção?'),
      C('14', 'A disposição dos equipamentos possibilita a manutenção e limpeza adequada?'),
      C('15', 'Os equipamentos estão instalados de modo que propicie um fluxo operacional adequado?'),
      C('16', 'Conservação, manutenção e funcionamento adequados dos equipamentos?'),
      C('17', 'Os equipamentos em desuso são retirados do ambiente de trabalho?'),
      C('18', 'Instrumentos de controle existentes e em condições adequadas de funcionamento?'),
      C('19', 'Os utensílios estão nos lugares definidos?'),
      C('20', 'Superfícies em contato com alimentos em condições adequadas, com ausência de rugosidade, porosidade, fendas, falhas, cantos mortos ou soldas aparentes?'),
      C('21', 'Prateleiras, estrados e pallets estão em condições adequadas de conservação?'),
    ],
  },
  {
    id: 'PL-01-03', codigo: 'PL 01/03', titulo: 'Avaliação das condições de higiene e conduta dos colaboradores', pac: '03', frequencia: 'semanal', freq: 'semana', layout: 'lista', colunas: RESP,
    itens: [
      C('1', 'Os uniformes e calçados estão limpos e em bom estado de conservação?'),
      C('2', 'Os colaboradores estão barbeados, com os cabelos cobertos e sem adornos (pulseira, anéis, cordões, etc)?'),
      C('3', 'As unhas estão limpas e aparadas?'),
      C('4', 'Os colaboradores obedecem às recomendações de não fumar na área interna?'),
      C('5', 'Os cartazes educativos para os colaboradores e visitantes afixados em local visível?'),
      C('6', 'Os colaboradores lavam as mãos e antebraços sempre que utilizam os sanitários?'),
      C('7', 'Os uniformes são trocados diariamente?'),
      C('8', 'Os colaboradores passam pela barreira sanitária antes de entrar na agroindústria?'),
      C('9', 'As instalações sanitárias (vasos, pias e saboneteiras) estão funcionando adequadamente?'),
      C('10', 'Há disponibilidade de sabonete, água, papel toalha e lixeiras?'),
      C('11', 'Há funcionários com doenças infecciosas, lesões abertas, purulentas inaparentes ou assintomáticas de agentes causadores de toxinfecções e outra fonte de contaminação?', C_NAO_HA),
    ],
  },
  {
    id: 'PL-01-04', codigo: 'PL 01/04', titulo: 'Controle integrado de pragas', pac: '04', frequencia: 'semanal', freq: 'semana', layout: 'lista', colunas: RESP,
    itens: [
      C('1', 'As áreas ao redor das edificações estão limpas, sem materiais em desuso, gramas e matos estão aparados?'),
      C('2', 'As aberturas para as áreas externas da queijaria são protegidas pelo uso de telas?'),
      C('3', 'Todas as janelas estão adequadamente teladas e limpas?'),
      C('4', 'A porta é ajustada de tal forma a não permitir aberturas maiores de 1 cm quando fechadas?'),
      C('5', 'A porta da queijaria é mantida sempre fechada?'),
      C('6', 'O portão da queijaria é mantido sempre fechado?'),
      C('7', 'O perímetro interno da queijaria é mantido isento de animais domésticos?'),
      C('8', 'É observada a presença de insetos, roedores e pássaros dentro das instalações da queijaria?', C_NAO_HA),
      C('9', 'As áreas destinadas ao armazenamento do resíduo estão limpas e em bom estado de conservação?'),
      C('10', 'As lixeiras possuem tampa e são constituídos com material adequado?'),
      C('11', 'Os resíduos são retirados da queijaria diariamente?'),
      C('12', 'Existem alimentos guardados na queijaria pelos colaboradores?', C_NAO_HA),
      C('13', 'Os resíduos são armazenados em lixeiras identificadas e estocados em local específico?'),
    ],
  },
  {
    id: 'PL-01-10', codigo: 'PL 01/10', titulo: 'Procedimentos sanitários operacionais', pac: '10', frequencia: 'semanal', freq: 'semana', layout: 'lista', colunas: RESP,
    itens: [
      C('1', 'As operações de recebimento da matéria-prima, manipulação e processamento são executadas de forma a prevenir a contaminação dos produtos (evitando contaminações cruzadas, contrafluxos e embalagens desprotegidas)?'),
      C('2', 'Os produtos são corretamente separados e identificados quanto à sua natureza, temperatura e embalagens?'),
      C('3', 'Todas as superfícies que têm contato direto com os produtos como equipamentos e utensílios são limpas e sanitizadas com a frequência necessária para evitar condições anti-higiênicas ou alterações dos produtos?'),
      C('4', 'Ausência de transmissão de odor aos produtos pelos agentes de limpeza, sanitizantes e produtos químicos utilizados?'),
      C('5', 'Os agentes de limpeza, sanitizantes e produtos químicos utilizados são efetivos?'),
      C('6', 'Existem detergentes e sanitizantes em quantidades suficientes para a higienização das instalações, equipamentos e utensílios?'),
      C('7', 'As soluções sanitizantes estão sendo preparadas de forma correta?'),
      C('8', 'Os recipientes são adequados para sua finalidade e estão em bom estado de conservação?'),
      C('9', 'Os produtos acabados são armazenados observando a organização, a separação estrita por lote e a liberação preferencial dos mais antigos?'),
      C('10', 'Os produtos permanecem na expedição pelo período estritamente necessário?'),
      C('11', 'A estocagem dos produtos, matérias-primas e ingredientes é realizada sobre paletes, prateleiras, armários etc.?'),
      C('12', 'Os veículos de transporte de matéria-prima e produto acabado são de fácil limpeza?'),
      C('13', 'Os veículos de transporte de matéria-prima e produto acabado asseguram a manutenção de temperatura e são perfeitamente vedados, evitando a entrada de pragas e o escoamento de líquidos?'),
      C('14', 'Os veículos de transporte estão higienizados?'),
      C('15', 'Veículos apresentam bom estado de conservação e não transportam cargas de diferentes naturezas?'),
      C('16', 'Os veículos são inspecionados por dentro antes do seu carregamento?'),
      C('17', 'Não existem utensílios compartilhados por diferentes setores (ÁREAS SUJAS E ÁREAS LIMPAS)?'),
      C('18', 'Os equipamentos e utensílios usados no armazenamento de produtos não comestíveis são instalados e operados de forma que não propiciem qualquer risco de contaminação aos produtos comestíveis?'),
      C('19', 'Os equipamentos e utensílios usados no armazenamento de produtos não comestíveis são identificados como de uso exclusivo para essa finalidade?'),
      C('20', 'Os equipamentos, utensílios e dispositivos acessórios (como torneiras, válvulas de vapor, mangueiras e outros), que não entram em contato direto com os produtos, são limpos e mantidos em condições higiênicas?'),
      C('21', 'Os insumos e produtos não são utilizados após a sua validade?'),
      C('22', 'Refugos e restos de produtos são removidos com a frequência adequada?'),
      C('23', 'Utiliza-se o sistema PEPS (Primeiro que entra-Primeiro que sai) ou outro sistema adequado para controle dos produtos estocados?'),
      C('24', 'A estocagem de matérias-primas ou produtos acabados é realizada sem contato direto com o piso, sendo armazenadas em superfície apropriada?'),
      C('25', 'A embalagem é realizada de modo que se evite a contaminação do produto?'),
      C('26', 'Área ao redor das edificações em situação adequada (sem material em desuso, mato; grama aparada)?'),
    ],
  },
  {
    id: 'PL-01-01', codigo: 'PL 01/01', titulo: "Inspeção da higiene e manutenção da caixa d'água/redes de distribuição", pac: '01', frequencia: 'mensal', freq: 'mes', layout: 'matriz',
    colunas: [
      { id: 'tampa', t: 'Presença de tampa', tipo: 'simnao', esperado: 'SIM' },
      { id: 'vazamentos', t: 'Vazamentos', tipo: 'simnao', esperado: 'NÃO' },
      { id: 'higiene', t: 'Higiene', tipo: 'cnc' },
    ],
    itensConfig: 'caixasDagua', rotuloItens: "Caixas d'água (capacidade)",
    it: "IT 02/01 – Higiene da caixa d'água",
  },
  {
    id: 'PL-04-01', codigo: 'PL 04/01', titulo: 'Controle de águas residuais (ralos, pisos e sistema de tratamento de efluentes)', pac: '01', frequencia: 'mensal', freq: 'mes', layout: 'lista', colunas: RESP,
    itens: [
      NAO('1', 'Os ralos sifonados estão entupidos?'),
      SIM('2', 'Os ralos são fechados após o término das atividades na queijaria?'),
      SIM('3', 'O escoamento da água no piso está adequado?'),
      NAO('4', 'A água está ficando empoçada no piso?'),
      NAO('5', 'Há retenção de água na queijaria?'),
      SIM('6', 'As águas residuais estão destinadas adequadamente?'),
      SIM('7', 'O sistema de tratamento de efluentes está com a manutenção em dia?'),
    ],
  },
  {
    id: 'PL-03-07', codigo: 'PL 03/07', titulo: 'Controle de manutenção preventiva dos equipamentos', pac: '07', frequencia: 'mensal', freq: 'mes', layout: 'lista', colunas: RESP,
    itens: [
      C('1', 'Os equipamentos estão em bom estado de conservação?'),
      C('2', 'Os equipamentos estão em locais adequados?'),
      C('3', 'Os equipamentos estão com a aferição em dia?'),
      C('4', 'Os equipamentos estão bem higienizados?'),
      C('5', 'Os equipamentos estão funcionando?'),
    ],
  },
  {
    id: 'PL-02-05', codigo: 'PL 02/05', titulo: 'Controle de ingredientes e embalagem', pac: '05', frequencia: 'no momento do recebimento', mesAno: false, freq: 'evento', layout: 'recebimento', colunas: RESP,
    itens: [
      C('1', 'Estão dentro dos padrões?'),
      C('2', 'Estão dentro do prazo de validade?'),
      C('3', 'Atendem as especificações do fabricante?'),
      C('4', 'As embalagens estão intactas?'),
      C('5', 'Os ingredientes estão em quantidade suficiente?'),
      C('6', 'Estão aprovados para uso?'),
      C('7', 'Os ingredientes e embalagens estão armazenados em local limpo e organizado?'),
    ],
  },
];

// Como cada checklist sai impresso: UMA FOLHA POR VERIFICAÇÃO, igual à PL de papel
// (mesmas colunas, mesmos campos e na mesma ordem). Conferido no "PACs ALMEIDA GUIMARÃES.doc"
// e nos .docx dos PACs 03, 04, 05 e 07 em 18/11/2026.
//   freq: texto da frequência como está no papel
//   topo: campos da linha de cima ('freq', 'data', 'resp'); topoTabela: ficam dentro da tabela
//   respAntes: "Responsável: ___" acima da tabela · respFim: embaixo
//   rotulo: título da coluna dos itens
//   marcas: colunas de marcar X, na ordem das respostas (C/NC ou SIM/NÃO). Sem marcas: escreve C/NC em cada coluna
//   extras: colunas de texto de cada item ('desc' = descrição da NC/observação, 'acao' = ação corretiva)
//   caixas: campos de texto embaixo dos itens ('obs' fica em branco: o app não pergunta)
//   legenda: texto da legenda do papel
const PAPEL = {
  'PL-03-02': { freq: 'diária', topo: ['freq', 'data'], rotulo: 'EQUIPAMENTOS / UTENSILIOS', titulosCol: ['AVALIAÇÃO VISUAL', 'CONTATO DIRETO'], extras: [['desc', 'OBSERVAÇÕES'], ['acao', 'AÇÃO CORRETIVA']], legenda: 'C = Conforme          NC = Não Conforme', respFim: true },
  'PL-01-02': { freq: 'Semanal', topo: ['freq', 'data'], rotulo: 'Itens', marcas: ['C', 'NC'], extras: [['desc', 'Observações']], caixas: [['acao', 'Ações corretivas:']], respFim: true },
  'PL-02-02': { freq: 'Semanal', topo: ['freq', 'data'], rotulo: 'Itens', marcas: ['C', 'NC'], extras: [['desc', 'Observações']], caixas: [['acao', 'Ações corretivas:']], respFim: true },
  'PL-01-03': { freq: 'semanal', topo: ['freq', 'data'], rotulo: 'HIGIENE PESSOAL', marcas: ['C', 'NC'], extras: [['desc', 'DESCRIÇÃO DA NC'], ['acao', 'AÇÃO CORRETIVA']], legenda: 'C= CONFORME                       NC= NÃO CONFORME', respFim: true },
  'PL-01-04': { freq: 'Semanal', topo: ['resp', 'freq', 'data'], topoTabela: true, rotulo: 'Controle de Pragas', marcas: ['C', 'NC'], extras: [['acao', 'Ação Corretiva']], caixas: [['desc', 'Descrição da Não Conformidade:']], legenda: 'C= CONFORME                                      NC= NÃO CONFORME' },
  'PL-04-01': { freq: 'Mensal', topo: ['freq', 'data'], topoTabela: true, respAntes: true, rotulo: 'ITENS', marcas: ['SIM', 'NÃO'], extras: [['acao', 'Ação Corretiva']], caixas: [['desc', 'Obs.:']] },
  'PL-03-07': { freq: 'mensal', topo: ['freq', 'data'], rotulo: 'Itens', marcas: ['Conforme', 'Não Conforme'], caixas: [['desc', 'Não Conformidade:'], ['acao', 'Ação corretiva:'], ['obs', 'Observações:']], respFim: true },
  'PL-01-10': { freq: 'Semanal', topo: ['data', 'freq', 'resp'], topoTabela: true, rotulo: 'Itens', marcas: ['C', 'NC'], extras: [['desc', 'Observações']], caixas: [['acao', 'Ação corretiva:']] },
  'PL-01-01': { freq: 'mensal', topo: ['freq', 'data'], topoTabela: true },
};
for (const m of CHECKLISTS) if (PAPEL[m.id]) m.papel = PAPEL[m.id];

export const CK = (id) => CHECKLISTS.find((m) => m.id === id);
