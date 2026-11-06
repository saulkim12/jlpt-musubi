// JLPT 무스비 웹 버전 서비스 워커(2.8.0, 2.10.0 음성 캐시 정리). tools/build_web.py가 9e9fcdad2b41와 ["index.html", "manifest.webmanifest", "fonts/fonts.css", "icons/icon-192.png", "icons/icon-512.png", "data/exam.json", "data/expr.json", "data/grammar.json", "data/grammar_basic.json", "data/kanji.json", "data/mock.json", "data/stories.json", "data/test.json", "data/vocab.json", "data/vocab_basic.json", "data/vocab_n1.json"]을 채운다.
// - 화면·데이터(shell): 설치할 때 미리 받아 두고, 새 빌드가 올라오면 통째로 바꾼다.
// - 음성·글꼴(assets): 처음 쓸 때 받아 보관한다. 음성 파일 이름은 문장(음성 열쇠)의 해시라 소리를 다시 만들어도 이름이
//   그대로다. 그래서 이미 공개한 음성·글꼴을 같은 이름으로 바꿔 올릴 때는 ASSETS 번호를 올린다. 새 워커가 옛 번호의
//   캐시를 지워, 다시 찾는 사람도 새 소리를 듣는다(tools/publish_web.py가 마지막 공개본과 견줘 확인한다).
//   v2(2.10.0): 2.9.0에서 VOICEVOX로 바꾼 음성이 2.8.0 때 받아 둔 옛 음성에 가려지던 것을 정리한다.
//   v3(2.10.1): 숫자를 한 덩어리로 다시 읽은 음성 124개(1300円, 15分 등)가 2.10.0 때 받아 둔 음성에 가려지지 않게 한다.
const SHELL = 'musubi-shell-9e9fcdad2b41', ASSETS = 'musubi-assets-v3';
const PRECACHE = ["index.html", "manifest.webmanifest", "fonts/fonts.css", "icons/icon-192.png", "icons/icon-512.png", "data/exam.json", "data/expr.json", "data/grammar.json", "data/grammar_basic.json", "data/kanji.json", "data/mock.json", "data/stories.json", "data/test.json", "data/vocab.json", "data/vocab_basic.json", "data/vocab_n1.json"];

self.addEventListener('install', event => {
  // GitHub Pages는 10분 동안 캐시하게 하므로, 브라우저 캐시를 건너뛰어야 새 빌드에 옛 화면이 담기지 않는다.
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  const old = key => (key.startsWith('musubi-shell-') && key !== SHELL) || (key.startsWith('musubi-assets-') && key !== ASSETS);
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(old).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

async function fromAssets(request) {
  const cache = await caches.open(ASSETS), hit = await cache.match(request);
  if (hit) return hit;
  // 처음 받을 때는 서버에 확인한다(no-cache). 그대로면 304로 짧게 끝나고, 바뀌었으면 새 소리를 받는다.
  // 브라우저 HTTP 캐시(GitHub Pages 10분)에 남은 옛 음성이 새 캐시에 다시 담기지 않게 한다.
  const response = await fetch(request, { cache: 'no-cache' });
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
