// JLPT 무스비 웹 버전 서비스 워커(2.8.0). tools/build_web.py가 d685dfe4befe와 ["index.html", "manifest.webmanifest", "fonts/fonts.css", "icons/icon-192.png", "icons/icon-512.png", "data/exam.json", "data/expr.json", "data/grammar.json", "data/grammar_basic.json", "data/kanji.json", "data/mock.json", "data/test.json", "data/vocab.json", "data/vocab_basic.json", "data/vocab_n1.json"]을 채운다.
// - 화면·데이터(shell): 설치할 때 미리 받아 두고, 새 빌드가 올라오면 통째로 바꾼다.
// - 음성·글꼴(assets): 처음 쓸 때 받아 보관한다. 이름이 내용으로 정해지므로 빌드가 바뀌어도 그대로 쓴다.
const SHELL = 'musubi-shell-d685dfe4befe', ASSETS = 'musubi-assets-v1';
const PRECACHE = ["index.html", "manifest.webmanifest", "fonts/fonts.css", "icons/icon-192.png", "icons/icon-512.png", "data/exam.json", "data/expr.json", "data/grammar.json", "data/grammar_basic.json", "data/kanji.json", "data/mock.json", "data/test.json", "data/vocab.json", "data/vocab_basic.json", "data/vocab_n1.json"];

self.addEventListener('install', event => {
  // GitHub Pages는 10분 동안 캐시하게 하므로, 브라우저 캐시를 건너뛰어야 새 빌드에 옛 화면이 담기지 않는다.
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('musubi-shell-') && key !== SHELL).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

async function fromAssets(request) {
  const cache = await caches.open(ASSETS), hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function fromShell(request) {
  const cache = await caches.open(SHELL);
  return (await cache.match(request, { ignoreSearch: true })) || fetch(request);
}

self.addEventListener('fetch', event => {
  const { request } = event, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // 어떤 경로로 들어와도 앱 화면을 보여 준다(인터넷이 없어도 열린다).
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(SHELL).then(cache => cache.match('index.html')).then(hit => hit || fetch(request)));
    return;
  }
  event.respondWith(/\/audio\/clips\/|\.ttf$/.test(url.pathname) ? fromAssets(request) : fromShell(request));
});
