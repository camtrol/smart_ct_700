// 서비스 워커 설치
self.addEventListener("install", (event) => {
    console.log("Service Worker 설치됨");
    self.skipWaiting(); // 바로 활성화
});

// 활성화 이벤트
self.addEventListener("activate", (event) => {
    console.log("Service Worker 활성화됨");
    clients.claim(); // 모든 클라이언트에 적용
});

// fetch 이벤트 (오프라인 시에도 요청 처리 가능)
self.addEventListener("fetch", (event) => {
    event.respondWith(fetch(event.request));
});
