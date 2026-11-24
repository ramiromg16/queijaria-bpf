// Dados de EXEMPLO para a demonstração (link publicado para mostrar o app).
// Só é carregado quando config.js tem window.DEMO_EXEMPLO = true e o aparelho ainda está vazio.
// Novembro/2026: fabricação e medições de 16 a 20, checklists semanais e mensais,
// ocorrências, agenda, laudos, colaboradores e treinamento. Grava pelas mesmas funções das telas.
import * as st from '../core/store.js';
import { S } from '../core/store.js';
import { gravar, gerarLote } from '../domain/registros.js';
import { CHECKLISTS, itensDe, esperadoDe, opcoes } from '../domain/checklists.js';
import { itensCaixa } from '../domain/eventos.js';

const TUCA = 'Luiz Antônio Guimarães (Tuca)', MARC = 'Marcelo Lúcio', ADR = 'Adriana';
const DIAS = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];

// Respostas de checklist: tudo conforme, menos os itens em `nc` (com descrição e ação corretiva).
const respostas = (m, nc = {}) => itensDe(m).map((item) => {
  const r = {};
  m.colunas.forEach((c) => { r[c.id] = esperadoDe(item, c); });
  const x = nc[item.id];
  if (x) { const c = m.colunas[x.col || 0]; r[c.id] = opcoes(item, c).find((o) => o !== esperadoDe(item, c)); }
  return { item: item.id, texto: item.t, r, descricaoNC: x?.desc || '', acaoCorretiva: x?.acao || '' };
});
const M = (id) => CHECKLISTS.find((m) => m.id === id);
const prod = (id) => S.produtos.find((p) => p.id === id);
const lote = (d, pid) => S.fabricacoes.find((f) => f.data === d).produtos.find((p) => p.produtoId === pid).lote;
const ck = (modeloId, data, responsavel, extra = {}) => gravar('bpf_registros', { modeloId, data, hora: extra.hora || '15:00', valores: extra.valores || {}, respostas: respostas(M(modeloId), extra.nc), responsavel });

export async function preencherExemplo() {
  if (S.fabricacoes.length || S.bpf_registros.length) return;
  await st.setConfig({ demo: true });

  // ---- Fabricação do dia (PL 01/05, 01/06, 01/09, 02/09) ----
  const fabs = [
    { vol: 600, tl: 32.5, dor: 16, den: '1,031', cz: 47, mx: 38, al: 16, so: 18, rend: 61.2, hr: '06:40', itens: [['p001', 22, 24.6], ['p002', 8, 9.8], ['p010', 6, 6.9]] },
    { vol: 650, tl: 33.0, dor: 17, den: '1,032', cz: 48, mx: 40, al: 17, so: 18, rend: 66.0, hr: '06:35', itens: [['p001', 24, 26.8], ['p003', 8, 9.1], ['p012', 6, 6.7]] },
    { vol: 580, tl: 32.0, dor: 16, den: '1,030', cz: 46, mx: 35, al: 16, so: 17, rend: 58.4, hr: '06:50', itens: [['p001', 20, 22.3], ['p005', 10, 12.1], ['p011', 5, 5.6]] },
    { vol: 620, tl: 32.8, dor: 17, den: '1,031', cz: 48, mx: 42, al: 17, so: 19, rend: 63.1, hr: '06:45', itens: [['p001', 22, 24.9], ['p006', 8, 9.4], ['p007', 6, 6.8]] },
    { vol: 640, tl: 33.2, dor: 16, den: '1,032', cz: 47, mx: 39, al: 16, so: 18, rend: 65.0, hr: '06:30', itens: [['p001', 24, 26.5], ['p002', 8, 10.1], ['p009', 6, 7.0]] },
  ];
  for (let i = 0; i < 5; i++) {
    const d = DIAS[i], f = fabs[i], usados = [];
    const produtos = f.itens.map(([pid, pecas, kg]) => { const l = gerarLote(prod(pid), d, null, usados); usados.push(l); return { produtoId: pid, pecas, kg, lote: l }; });
    await gravar('fabricacoes', { data: d, responsavel: i % 2 ? MARC : TUCA, semFabricacao: false, horaRecepcao: f.hr, volumeLeite: f.vol, tempLeite: f.tl, sensorial: 'C', alizarol: 'C', dornic: f.dor, densidade: f.den, tempCozimento: f.cz, tempoMexedura: f.mx, acidezLeite: f.al, fermento: '6 L', acidezSoro: f.so, coalho: '30 mL', rendimento: f.rend, produtos, acao: '', obs: '' });
  }

  // ---- Medições rápidas (PL 03/01, 02/06, 03/09), com 2 NC de exemplo ----
  const agua = [[1.2, 7.1], [0.1, 7.0], [1.5, 7.2], [1.1, 6.9], [1.3, 7.0]];
  const mat = [[12.5, 85], [12.8, 86], [16.2, 88], [13.1, 85], [12.9, 84]];
  const salm = [[11.0, 'Não precisou'], [11.5, '2 kg'], [11.2, 'Não precisou'], [11.8, '1,5 kg'], [11.4, 'Não precisou']];
  for (let i = 0; i < 5; i++) {
    const d = DIAS[i];
    const [cl, ph] = agua[i];
    await gravar('bpf_registros', { modeloId: 'PL-03-01', data: d, hora: '07:00', valores: { cloro: cl, ph, cor: 'C', odor: 'C', obs: '', acao: cl < 0.2 ? 'Clorador reabastecido; nova medição 1,0 ppm às 7h40' : '' }, respostas: [], responsavel: TUCA });
    const [t, ur] = mat[i]; const nc = t > 15;
    await gravar('bpf_registros', { modeloId: 'PL-02-06', data: d, hora: '08:00', valores: { temp: t, ur, cnc: nc ? 'NC' : 'C', nc: nc ? 'Temperatura acima de 15 °C' : '', acao: nc ? 'Termostato ajustado; nova leitura 13,5 °C às 10h' : '' }, respostas: [], responsavel: MARC });
    const [tt, sal] = salm[i];
    await gravar('bpf_registros', { modeloId: 'PL-03-09', data: d, hora: '09:00', valores: { volume: 200, temp: tt, sal, acidez: 'Não precisou', obs: '' }, respostas: [], responsavel: MARC });
  }
  // Uma correção de exemplo (mostra como a folha marca a linha corrigida)
  const a19 = S.bpf_registros.find((r) => r.modeloId === 'PL-03-01' && r.data === '2026-11-19');
  const { historico, ...semHist } = a19;
  await gravar('bpf_registros', { ...semHist, valores: { ...a19.valores, ph: 7.1 } }, a19, { por: TUCA, motivo: 'pH digitado errado (era 7,1)' });

  // ---- Checklists ----
  for (let i = 0; i < 5; i++) {
    const nc = i === 3 ? { Panos: { col: 0, desc: 'Panos com resíduo de massa', acao: 'Lavados de novo e fervidos antes do uso' } } : {};
    await ck('PL-03-02', DIAS[i], MARC, { hora: '16:30', nc });
  }
  for (const [id, resp] of [['PL-01-02', ADR], ['PL-02-02', MARC], ['PL-01-03', ADR], ['PL-01-04', TUCA], ['PL-01-10', TUCA]]) await ck(id, '2026-11-19', resp);
  await ck('PL-01-01', '2026-11-20', TUCA, { hora: '14:00' });
  await ck('PL-04-01', '2026-11-20', TUCA, { hora: '14:30' });
  await ck('PL-03-07', '2026-11-20', TUCA, { valores: { obs: '' } });
  await ck('PL-02-05', '2026-11-17', TUCA, { hora: '10:00', valores: { ingrediente: 'Sal', fornecedor: 'Distribuidora (exemplo)', lote: 'S2611', validade: '2028-10-31', obs: '' } });

  // ---- Expedição (PL 01/11 e 02/11) ----
  await gravar('expedicoes', { data: '2026-11-18', produtoId: 'p001', lote: lote('2026-11-16', 'p001'), kg: 12.4, destino: 'Feira de sábado (exemplo)', obs: '', responsavel: ADR });
  await gravar('expedicoes', { data: '2026-11-20', produtoId: 'p002', lote: lote('2026-11-16', 'p002'), kg: 4.9, destino: 'Empório (exemplo)', obs: '', responsavel: ADR });

  // ---- Ocorrências ----
  await gravar('bpf_ocorrencias', { tipo: 'praga', data: '2026-11-18', hora: '07:30', valores: { setor: 'Recepção do leite', praga: '2', outra: '', situacao: 'vivo', obs: 'Formigas na soleira da porta; limpeza do local e vedação da fresta' }, responsavel: TUCA });
  await gravar('bpf_ocorrencias', { tipo: 'recolhimento', data: '2026-11-19', hora: '11:00', valores: { lote: lote('2026-11-17', 'p012'), produtoId: 'p012', kg: 1.1, cliente: 'Empório (exemplo)', motivo: 'Embalagem a vácuo estufada', separado: 'Sala de maturação, prateleira identificada', destino: 'Descarte adequado', dataDestino: '2026-11-20' }, responsavel: ADR });
  await gravar('bpf_ocorrencias', { tipo: 'nc', data: '2026-11-17', hora: '06:20', valores: { setor: 'Barreira sanitária', descricao: 'Falta de papel toalha no suporte', acao: 'Papel reposto; estoque conferido no início do dia' }, responsavel: MARC });

  // ---- Agenda e laudos ----
  await gravar('bpf_registros', { modeloId: 'PL-01-07', data: '2026-11-16', hora: '', valores: { termometro: 'C', balanca: 'C', termolacto: 'C', baume: 'C', obs: '', acao: '' }, respostas: [], responsavel: TUCA });
  await gravar('bpf_registros', { modeloId: 'PL-02-07', data: '2026-11-10', hora: '', valores: { balanca: 'C', obs: 'Certificado de calibração arquivado no escritório', acao: '' }, respostas: [], responsavel: TUCA });
  await gravar('bpf_registros', { modeloId: 'PL-02-01', data: '2026-11-14', hora: '', valores: { itens: itensCaixa().map((item) => ({ item, obs: '' })) }, respostas: [], responsavel: TUCA });
  const lab = 'Laboratório credenciado (exemplo)';
  for (const [tipo, data, resultadoEm] of [['leite', '2026-11-05', '2026-11-12'], ['agua', '2026-11-10', '2026-11-18'], ['queijo', '2026-11-10', '2026-11-19']])
    await gravar('laudos', { tipo, data, analises: tipo === 'leite' ? 'CCS e CPP' : 'Físico-química e microbiológica', laboratorio: lab, dataResultado: resultadoEm, resultado: 'C', arquivo: 'Pasta PAC 08', obs: '', acao: '', responsavel: ADR });

  // ---- Colaboradores, exames (PL 02/03) e treinamento ----
  const col = [];
  for (const [nome, cargo] of [[TUCA, 'Proprietário'], [MARC, 'Queijeiro'], [ADR, 'Administrativo']]) col.push(await st.salvar('colaboradores', { nome, nascimento: '', cargo, ativo: true }));
  for (const [c, programar, realizar] of [[col[0], '2026-11-06', '2026-11-06'], [col[1], '2026-11-06', '2026-11-06'], [col[2], '2026-12-04', '']])
    await st.salvar('bpf_registros', { modeloId: 'PL-02-03', data: realizar || programar, valores: { tipo: 'exame', colaboradorId: c.id, ano: '2026', programar, realizar }, responsavel: ADR });
  await gravar('treinamentos', { data: '2026-11-13', assunto: 'Higienização das mãos e conduta na fabricação', instrutor: TUCA, conteudo: 'Lavagem correta das mãos, uso de uniforme e touca, proibição de adornos.', participantes: col.map((c) => c.id), responsavel: ADR });
}
