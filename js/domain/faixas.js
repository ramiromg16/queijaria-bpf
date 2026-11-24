// Faixas de alerta. Valor fora da faixa = Não Conforme (NC) e pede ação corretiva.
import { S } from '../core/store.js';
import { dec, num } from '../core/format.js';

// min/max null = sem limite (a queijaria define em Configurações).
export const FAIXAS_PADRAO = {
  cloro: { nome: 'Cloro da água', un: 'ppm', min: 0.2, max: 5.0, casas: 1, nota: 'Igual à PL 03/01 (0,2 a 5 ppm). O texto do PAC 01 fala em máximo 2,0 ppm: confirmar com o dono.' },
  ph: { nome: 'pH da água', un: '', min: 6.0, max: 9.0, casas: 1 },
  // Os documentos da queijaria não dão limite de Dornic nem de densidade: sem alerta.
  dornic: { nome: 'Acidez do leite (Dornic)', un: '°D', min: null, max: null, casas: 0, nota: 'Os documentos (PACs e Manual) não informam. Só preencha se a queijaria definir.' },
  densidade: { nome: 'Densidade do leite', un: 'g/mL', min: null, max: null, casas: 3, nota: 'Os documentos (PACs e Manual) não informam. Só preencha se a queijaria definir.' },
  tempCozimento: { nome: 'Temperatura do cozimento/mexedura', un: '°C', min: 45, max: 51, casas: 0 },
  tempoMexedura: { nome: 'Tempo de mexedura', un: 'min', min: 30, max: 45, casas: 0 },
  matTemp: { nome: 'Temperatura da sala de maturação', un: '°C', min: null, max: 15, casas: 1, nota: 'PAC 06: a temperatura dos queijos em maturação não deve ser superior a 15 °C.' },
  matUR: { nome: 'Umidade da sala de maturação', un: '%', min: null, max: null, casas: 0, nota: 'Os documentos (PACs e Manual) não informam. Definir com o dono.' },
};

export function faixa(chave) {
  const p = FAIXAS_PADRAO[chave];
  const c = S.config.faixas?.[chave] || {};
  const val = (k) => (c[k] === undefined ? p[k] : c[k]);
  return { ...p, min: val('min'), max: val('max') };
}

const vazio = (v) => v === '' || v == null;

// Densidade: aceita 1,030 · 1030 · 30 (leitura do termolactodensímetro)
export function normDensidade(v) {
  if (vazio(v)) return null;
  let n = num(v);
  if (n >= 1000) n /= 1000;
  else if (n >= 20 && n < 40) n = 1 + n / 1000;
  return Math.round(n * 10000) / 10000;
}

export const fmtFaixa = (chave) => {
  const f = faixa(chave);
  const u = f.un ? ` ${f.un}` : '';
  if (f.min != null && f.max != null) return `${dec(f.min, f.casas)} a ${dec(f.max, f.casas)}${u}`;
  if (f.max != null) return `até ${dec(f.max, f.casas)}${u}`;
  if (f.min != null) return `a partir de ${dec(f.min, f.casas)}${u}`;
  return 'sem faixa definida';
};

// Devolve null se está dentro da faixa, ou um texto curto do problema.
export function fora(chave, v) {
  if (vazio(v)) return null;
  const f = faixa(chave);
  const n = Number(v);
  if (!isFinite(n)) return null;
  const u = f.un ? ` ${f.un}` : '';
  if (f.min != null && n < f.min) return `${f.nome} abaixo de ${dec(f.min, f.casas)}${u}`;
  if (f.max != null && n > f.max) return `${f.nome} acima de ${dec(f.max, f.casas)}${u}`;
  return null;
}
