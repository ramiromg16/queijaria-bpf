// Agenda das tarefas periódicas: última vez feita → próxima data, com lembrete na tela Hoje.
// Prazos tirados dos PACs: aferição mensal (PAC 07), calibração da balança anual (PAC 07),
// higiene da caixa d'água semestral (PL 02/01), laudos de leite a cada 3 meses e de queijo e água a cada 6 (PAC 08).
import { S } from '../core/store.js';
import { hoje, addMeses, diffDias, mesDe } from '../core/format.js';
import { LAUDOS, itensCaixa } from './eventos.js';

const ultimaData = (regs) => regs.map((r) => r.data).filter(Boolean).sort().pop() || null;
const DIAS_AVISO = 30;

export function tarefas() {
  const regs = (id) => S.bpf_registros.filter((r) => r.modeloId === id);
  const lista = [
    { id: 'afericao', t: 'Aferição dos instrumentos', s: 'PL 01/07 · termômetro, balança, termolactodensímetro e aerômetro de Baumé', meses: 1, abre: { tipo: 'PL-01-07' }, ultima: ultimaData(regs('PL-01-07')) },
    { id: 'calibracao', t: 'Calibração da balança', s: 'PL 02/07 · por empresa especializada (guardar o certificado)', meses: 12, abre: { tipo: 'PL-02-07' }, ultima: ultimaData(regs('PL-02-07')) },
    ...itensCaixa().map((item) => ({
      id: `caixa:${item}`, t: /filtro/i.test(item) ? 'Troca do filtro' : `Higiene: ${item}`, s: 'PL 02/01 · semestral', meses: 6, abre: { tipo: 'PL-02-01', item },
      ultima: ultimaData(regs('PL-02-01').filter((r) => (r.valores?.itens || []).some((i) => i.item === item))),
    })),
    ...['leite', 'queijo', 'agua'].map((tipo) => ({
      id: `laudo:${tipo}`, t: `Análise de ${LAUDOS[tipo].nome.toLowerCase()}`, s: `PAC 08 · ${LAUDOS[tipo].meses === 3 ? 'a cada 3 meses' : 'a cada 6 meses'}`, meses: LAUDOS[tipo].meses, abre: { tipo: 'laudo', laudo: tipo },
      ultima: ultimaData(S.laudos.filter((l) => l.tipo === tipo)),
    })),
  ];
  return lista.map((x) => ({ ...x, ...situacao(x) }));
}

// status: 'ok' · 'breve' (vence em até 30 dias) · 'vencido' · 'nunca' · 'mes' (mensal ainda não feito neste mês)
function situacao(x) {
  const h = hoje();
  if (x.meses === 1) {
    if (x.ultima && mesDe(x.ultima) === mesDe(h)) return { status: 'ok', proxima: `${mesDe(addMeses(`${mesDe(h)}-01`, 1))}-01`, dias: null };
    return { status: 'mes', proxima: h, dias: 0 };
  }
  if (!x.ultima) return { status: 'nunca', proxima: null, dias: null };
  const proxima = addMeses(x.ultima, x.meses);
  const dias = diffDias(h, proxima);
  return { status: dias < 0 ? 'vencido' : dias <= DIAS_AVISO ? 'breve' : 'ok', proxima, dias };
}

// Para a tela Hoje: o que está vencido, nunca foi registrado ou vence logo.
export const atencao = () => tarefas().filter((x) => x.status !== 'ok');
