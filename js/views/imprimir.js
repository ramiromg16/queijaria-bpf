// Imprimir mês: escolher mês e planilhas → PDF para assinar (Imprimir → Salvar como PDF).
import { ICON, pagina, imprimir, toast } from '../core/ui.js';
import { esc, hoje, mesDe, nomeMes } from '../core/format.js';
import { TODAS, resumo } from '../domain/catalogo.js';
import { pacote, tituloImpressao, corrigidosNaFolha } from '../domain/impressao.js';

let mes = '';
let marcadas = null;
let previa = false;

// Folhas do ano (aferição, calibração, caixa d'água, laudos) só vêm marcadas se houve registro no mês.
const padrao = (ym) => new Set(TODAS.filter((p) => (p.periodo !== 'ano' && p.id !== 'TREIN') || resumo(p.id, ym).preenchidos > 0).map((p) => p.id));
const selecionadas = () => TODAS.map((p) => p.id).filter((id) => marcadas.has(id));

function render() {
  mes = mes || mesDe(hoje());
  marcadas = marcadas || padrao(mes);
  const linhas = TODAS.map((pl) => {
    const r = resumo(pl.id, mes);
    return `<tr>
      <td data-t=""><label class="check"><input type="checkbox" data-pl="${pl.id}" ${marcadas.has(pl.id) ? 'checked' : ''}><span><b class="cod">${pl.codigo}</b> ${esc(pl.titulo)}${pl.periodo === 'ano' ? ' <span class="mudo">(folha do ano)</span>' : ''}</span></label></td>
      <td data-t="Preenchidos" class="num">${r.evento ? `${r.preenchidos} ${r.unidade ? 'reg.' : 'receb.'}` : r.dias ? `${r.preenchidos} de ${r.dias}` : "em andamento"}</td>
      <td data-t="Não preenchidos" class="num">${r.faltando.length ? `<span class="mal-t">${r.faltando.length}</span>` : '0'}</td>
      <td data-t="NC" class="num">${r.nc || '—'}</td>
      <td data-t="Corrigidos" class="num">${corrigidosNaFolha(pl.id, mes) || '—'}</td>
      <td data-t="" class="num"><button class="btn peq" data-um="${pl.id}">${ICON.imprimir} Só esta</button></td>
    </tr>`;
  }).join('');
  const faltam = TODAS.filter((pl) => marcadas.has(pl.id)).reduce((s, pl) => s + resumo(pl.id, mes).faltando.length, 0);

  return pagina('Imprimir mês', 'Uma folha por planilha, no formato do papel, para assinar', '', `
    <div class="filtros"><input type="month" value="${mes}" max="${mesDe(hoje())}" data-mes aria-label="Mês"><strong>${nomeMes(mes)}</strong></div>
    ${faltam ? `<div class="aviso">${ICON.alerta}<div>Há <b>${faltam} dia(s) ou semana(s) sem registro</b> nas planilhas escolhidas. Nas planilhas diárias eles saem como <b>"não preenchido"</b>; nos checklists, que têm uma folha por verificação como no papel, a folha daquela data simplesmente não existe. O app nunca preenche sozinho.</div></div>` : ''}
    <div class="painel plano"><div class="tab-wrap"><table class="tab cartoes"><thead><tr><th>Planilha</th><th class="num">Preenchidos</th><th class="num">Não preenchidos</th><th class="num">NC</th><th class="num">Corrigidos</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div></div>
    <div class="pg-acoes" style="margin:16px 0">
      <button class="btn" data-todas>${marcadas.size === TODAS.length ? 'Desmarcar todas' : 'Marcar todas'}</button>
      <button class="btn pri" data-pacote>${ICON.imprimir} Imprimir pacote do mês</button>
      <button class="btn" data-previa>${previa ? 'Esconder prévia' : 'Ver prévia aqui'}</button>
    </div>
    <p class="mudo">Na janela de impressão, escolha <b>Salvar como PDF</b> (ou a impressora) e deixe o tamanho <b>A4</b>. Cada folha já sai na posição do papel (os checklists em pé, as planilhas mensais deitadas). Se nada abrir, libere as janelas pop-up para este site.</p>
    ${previa ? `<div class="previa"><iframe title="Prévia das planilhas" data-frame></iframe></div>` : ''}`);
}

export function htmlPrevia(ids, ym) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="${new URL('css/print.css', location.href)}"></head><body>${pacote(ids, ym)}</body></html>`;
}

function mount(el) {
  el.querySelector('[data-mes]').addEventListener('change', (e) => { if (e.target.value) { mes = e.target.value; marcadas = padrao(mes); window.dispatchEvent(new Event('rerender')); } });
  el.querySelectorAll('[data-pl]').forEach((c) => c.addEventListener('change', () => {
    if (c.checked) marcadas.add(c.dataset.pl); else marcadas.delete(c.dataset.pl);
    window.dispatchEvent(new Event('rerender'));
  }));
  el.querySelector('[data-todas]').onclick = () => { marcadas = marcadas.size === TODAS.length ? new Set() : new Set(TODAS.map((p) => p.id)); window.dispatchEvent(new Event('rerender')); };
  el.querySelector('[data-pacote]').onclick = () => {
    const ids = selecionadas();
    if (!ids.length) return toast('Marque pelo menos uma planilha', 'erro');
    imprimir(pacote(ids, mes), tituloImpressao(ids, mes));
  };
  el.querySelectorAll('[data-um]').forEach((b) => b.addEventListener('click', () => imprimir(pacote([b.dataset.um], mes), tituloImpressao([b.dataset.um], mes))));
  el.querySelector('[data-previa]').onclick = () => { previa = !previa; window.dispatchEvent(new Event('rerender')); };
  const fr = el.querySelector('[data-frame]');
  if (fr) {
    fr.srcdoc = htmlPrevia(selecionadas(), mes);
    const ajustar = () => {
      const doc = fr.contentDocument;
      if (!doc?.body) return;
      const escala = Math.min(1, fr.clientWidth / 1150);
      doc.body.style.zoom = escala;
      fr.style.height = `${Math.max(400, doc.documentElement.scrollHeight * (CSS.supports('zoom', '1') ? 1 : escala) + 20)}px`;
    };
    fr.onload = () => { ajustar(); setTimeout(ajustar, 300); };
  }
}

export default { render, mount };
