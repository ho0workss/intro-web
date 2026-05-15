/* INTRO 사내 인트라넷 - 백엔드 동기화 클라이언트
 * Vercel Postgres + KV + Blob과 통신
 * 동일 origin (현재 도메인)으로 /api/* 호출
 */
(function () {
  'use strict';

  const API = {
    base: location.origin,
    get token() { return localStorage.getItem('intro_api_token'); },
    set token(v) { v ? localStorage.setItem('intro_api_token', v) : localStorage.removeItem('intro_api_token'); },
  };

  async function req(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (API.token) headers.Authorization = 'Bearer ' + API.token;
    const res = await fetch(API.base + path, { ...opts, headers });
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(body?.error || ('HTTP ' + res.status));
    return body;
  }

  const Sync = {
    isEnabled: false,  // 토큰 있으면 자동 활성화

    async login(username, password) {
      const r = await req('/api/auth?action=login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      API.token = r.token;
      this.isEnabled = true;
      return r.user;
    },

    async register(data) {
      return await req('/api/auth?action=register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async me() {
      try { return (await req('/api/auth?action=me')).user; } catch { return null; }
    },

    async logout() {
      try { await req('/api/auth?action=logout', { method: 'POST' }); } catch {}
      API.token = null;
      this.isEnabled = false;
    },

    // ===== 메시지 =====
    async getMessages(room, since = 0) {
      return (await req(`/api/messages?room=${encodeURIComponent(room)}&since=${since}`)).messages;
    },
    async sendMessage(room, content, type = 'text', fileUrl = null, fileName = null) {
      return await req('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ room, content, type, fileUrl, fileName }),
      });
    },

    // ===== 실시간 SSE 구독 =====
    _streams: {},  // {room: EventSource}
    subscribeMessages(room, onMessage, since = 0) {
      this.unsubscribeMessages(room);
      let lastId = since;
      const connect = () => {
        const url = `/api/stream?room=${encodeURIComponent(room)}&since=${lastId}&token=${API.token}`;
        const es = new EventSource(url);
        this._streams[room] = es;
        es.addEventListener('message', (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            lastId = Math.max(lastId, msg.id);
            onMessage(msg);
          } catch (e) {}
        });
        es.addEventListener('reconnect', (ev) => {
          try {
            const data = JSON.parse(ev.data);
            lastId = data.since || lastId;
          } catch {}
          es.close();
          // 즉시 재연결 (Vercel 함수 만료 후)
          setTimeout(connect, 100);
        });
        es.onerror = () => {
          // 네트워크 오류 시 3초 후 재연결
          es.close();
          setTimeout(connect, 3000);
        };
      };
      connect();
    },
    unsubscribeMessages(room) {
      if (this._streams[room]) { this._streams[room].close(); delete this._streams[room]; }
    },

    // ===== 공지사항 =====
    async getAnnouncements() { return (await req('/api/announcements')).announcements; },
    async createAnnouncement(data) {
      return (await req('/api/announcements', { method: 'POST', body: JSON.stringify(data) })).announcement;
    },
    async deleteAnnouncement(id) {
      return await req(`/api/announcements?id=${id}`, { method: 'DELETE' });
    },

    // ===== 휴가 =====
    async getLeaves() { return (await req('/api/leaves')).leaves; },
    async createLeave(data) {
      return (await req('/api/leaves', { method: 'POST', body: JSON.stringify(data) })).leave;
    },

    // ===== 사용자 =====
    async getUsers() { return (await req('/api/users')).users; },
    async updateProfile(data) { return await req('/api/users?action=profile', { method: 'PUT', body: JSON.stringify(data) }); },
    async updateMemberRole(username, role) {
      return await req('/api/users?action=role', { method: 'PUT', body: JSON.stringify({ username, role }) });
    },
    async updateMemberPartners(username, partners) {
      return await req('/api/users?action=partners', { method: 'PUT', body: JSON.stringify({ username, partners }) });
    },
    async kickMember(username) { return await req(`/api/users?username=${username}`, { method: 'DELETE' }); },

    // ===== 가입 요청 =====
    async getRequests() { return (await req('/api/requests')).requests; },
    async approveRequest(id, dept, role, partners) {
      return await req('/api/requests?action=approve', {
        method: 'POST',
        body: JSON.stringify({ id, dept, role, partners }),
      });
    },
    async rejectRequest(id) {
      return await req('/api/requests?action=reject', { method: 'POST', body: JSON.stringify({ id }) });
    },

    // ===== 파일 업로드 =====
    async uploadFile(file) {
      const headers = {};
      if (API.token) headers.Authorization = 'Bearer ' + API.token;
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers,
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'upload failed');
      return data;
    },
  };

  // 토큰이 있으면 자동 활성화
  if (API.token) Sync.isEnabled = true;

  window.Sync = Sync;
  window.__API_ENABLED = !!API.token;

  // 콘솔 헬프 메시지
  console.log('%c[INTRO Sync] 백엔드 동기화 클라이언트 로드됨', 'color:#2383e2;font-weight:bold');
  console.log('Sync.isEnabled =', Sync.isEnabled);
  if (!Sync.isEnabled) {
    console.log('Sync.login("intro","dlsxmfh1!") 로 백엔드 로그인 가능');
  }
})();
