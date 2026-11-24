// Service worker: guarda os arquivos do app para abrir sem internet.
// Rede primeiro (para receber atualizações), cache como reserva.
// TROQUE o número do CACHE a cada versão publicada.
const CACHE = 'queijaria-bpf-v11';

// Arquivos do app guardados já na instalação (sem esperar a segunda visita).
const ARQUIVOS = [
  './', 'index.html', 'config.js', 'manifest.webmanifest', 'css/app.css', 'css/print.css', 'icons/icon.svg', 'icons/icon-192.png',
  'js/main.js', 'js/core/store.js', 'js/core/ui.js', 'js/core/format.js',
  'js/domain/padrao.js', 'js/domain/faixas.js', 'js/domain/registros.js', 'js/domain/planilhas.js', 'js/domain/impressao.js', 'js/domain/modelos.js', 'js/domain/checklists.js', 'js/domain/catalogo.js', 'js/domain/eventos.js', 'js/domain/agenda.js', 'js/domain/impressao-eventos.js', 'js/domain/pacs.js', 'img/logo-queijaria.png',
  'js/views/hoje.js', 'js/views/fabricacao.js', 'js/views/medicoes.js', 'js/views/checklists.js', 'js/views/expedicao.js', 'js/views/ocorrencias.js', 'js/views/agenda.js', 'js/views/colaboradores.js', 'js/views/imprimir.js', 'js/views/configuracoes.js', 'js/demo/exemplo.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const proprio = url.origin === location.origin;
  const cdn = /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|www\.gstatic\.com\/firebasejs/.test(url.href);
  if (!proprio && !cdn) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok || res.type === 'opaque') { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('./') : undefined)))
  );
});
