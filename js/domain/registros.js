// Gravação dos registros de Boas Práticas.
// Regra: registro NÃO é apagado, só corrigido. Cada correção guarda a versão anterior,
// quem corrigiu, quando e por quê.
import { S, salvar, modo } from '../core/store.js';
import { esc } from '../core/format.js';

const LS_OPERADOR = 'bpf-operador';

// Quem está usando este aparelho (no modo nuvem, o e-mail do login).
export function operador() {
  if (modo() === 'nuvem') return window.firebase?.auth().currentUser?.email || '';
  try { return localStorage.getItem(LS_OPERADOR) || ''; } catch { return ''; }
}
export function setOperador(nome) {
  try { localStorage.setItem(LS_OPERADOR, String(nome || '').trim()); } catch {}
}

// Responsável sugerido: o último nome usado neste aparelho para aquele PAC,
// senão o responsável padrão do PAC em Configurações.
export function responsavelPadrao(pac) {
  try {
    const ult = localStorage.getItem(`bpf-resp-${pac}`);
    if (ult) return ult;
  } catch {}
  const r = S.config.responsaveis || {};
  return r[pac] || r.geral || '';
}
export function lembrarResponsavel(pac, nome) {
  try { if (nome) localStorage.setItem(`bpf-resp-${pac}`, nome); } catch {}
}
export function nomesResponsaveis() {
  return [...new Set(Object.values(S.config.responsaveis || {}).filter(Boolean))];
}

// Novo registro: grava direto. Correção: exige quem e motivo, guarda o histórico.
export async function gravar(col, doc, antigo, correcao) {
  if (!antigo) return salvar(col, doc);
  if (!correcao?.por) throw new Error('Informe quem está corrigindo');
  const { historico = [], ...anterior } = antigo;
  const agora = Date.now();
  return salvar(col, {
    ...doc,
    id: antigo.id,
    criado: antigo.criado,
    editadoEm: agora,
    editadoPor: correcao.por,
    motivoCorrecao: correcao.motivo || '',
    historico: [...historico, { em: agora, por: correcao.por, motivo: correcao.motivo || '', anterior }],
  });
}

// Campos de correção para os formulários de edição.
export const camposCorrecao = (reg) => !reg ? '' : `
  <fieldset class="correcao">
    <legend>Correção</legend>
    <p class="mudo" style="margin:0">Registros de Boas Práticas não podem ser apagados. A versão anterior fica guardada e o PDF mostra que a linha foi corrigida.${reg.editadoEm ? ` Já corrigido ${reg.historico?.length || 1}×, a última vez por ${esc(reg.editadoPor)}.` : ''}</p>
    <div class="linha2">
      <label class="campo"><span>Quem está corrigindo</span><input name="corrPor" value="${esc(operador())}" required></label>
      <label class="campo"><span>Motivo da correção</span><input name="corrMotivo" placeholder="Ex.: digitei o valor errado" required></label>
    </div>
  </fieldset>`;

export function lerCorrecao(v) {
  if (!v.corrPor) return null;
  if (modo() !== 'nuvem') setOperador(v.corrPor);
  return { por: v.corrPor.trim(), motivo: (v.corrMotivo || '').trim() };
}

// Código de lote: código do produto + data (DDMMAA). Ex.: 001-171126.
// Se o mesmo produto for fabricado duas vezes no mesmo dia: 001-171126-B.
export function gerarLote(produto, data, ignorarFabId, jaUsados = []) {
  const [y, m, d] = data.split('-');
  const base = `${produto.codigo}-${d}${m}${y.slice(2)}`;
  const usados = new Set(S.fabricacoes.filter((f) => f.id !== ignorarFabId).flatMap((f) => (f.produtos || []).map((p) => p.lote)).concat(jaUsados));
  if (!usados.has(base)) return base;
  for (let i = 1; i < 26; i++) {
    const c = `${base}-${String.fromCharCode(65 + i)}`;
    if (!usados.has(c)) return c;
  }
  return `${base}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
}
