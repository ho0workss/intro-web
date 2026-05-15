/* INTRO 동기화 브릿지
 * demo-app.js의 localStorage 기반 함수들을 백엔드 API로 연결
 * Sync가 활성화된 경우에만 백엔드 호출, 아니면 localStorage 폴백
 */
(function () {
  'use strict';
  if (!window.Sync) return;

  // ========== 로그인 백엔드 연동 ==========
  const origDoLogin = window.doLogin;
  window.doLogin = async function () {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    // 백엔드 시도
    try {
      const user = await window.Sync.login(u, p);
      // demo-app.js의 CURRENT 형식에 맞춰 매핑
      window.CURRENT = {
        username: user.username,
        name: user.name,
        dept: user.dept,
        role: user.role,
        hireDate: user.hire_date,
        totalLeave: user.total_leave,
        usedLeave: user.used_leave,
        partners: user.partners || [],
        pw: '',
      };
      window.ST.set('currentUser', window.CURRENT);
      console.log('%c[Backend] 로그인 성공', 'color:green', user.username);
      // demo-app의 화면 전환 호출
      if (typeof window.enterDashboard === 'function') window.enterDashboard();
      // 백엔드 데이터 초기 동기화
      await syncFromBackend();
      return;
    } catch (e) {
      console.warn('[Backend] 로그인 실패, localStorage로 폴백:', e.message);
    }
    // 폴백
    if (typeof origDoLogin === 'function') origDoLogin();
  };

  // ========== 회원가입 백엔드 연동 ==========
  const origSubmitRegister = window.submitRegister;
  window.submitRegister = async function () {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const dept = document.getElementById('regDept').value;
    const hireDate = document.getElementById('regHireDate').value;
    if (!name || !username || !password || !dept) { alert('필수 항목 입력'); return; }
    if (password.length < 6) { alert('비밀번호 6자 이상'); return; }
    try {
      await window.Sync.register({ name, phone, username, password, dept, hireDate });
      document.getElementById('registerModal').classList.add('hidden');
      ['regName', 'regPhone', 'regUsername', 'regPassword'].forEach(id => document.getElementById(id).value = '');
      alert('가입 신청 완료. 관리자 승인 후 로그인 가능합니다.');
      return;
    } catch (e) {
      console.warn('[Backend] 회원가입 실패, localStorage로 폴백:', e.message);
      if (typeof origSubmitRegister === 'function') origSubmitRegister();
    }
  };

  // ========== 로그아웃 ==========
  const origLogout = window.logout;
  window.logout = async function () {
    if (window.Sync.isEnabled) {
      try { await window.Sync.logout(); } catch {}
    }
    if (typeof origLogout === 'function') origLogout();
  };

  // ========== 메시지 전송 백엔드 동기화 ==========
  // 백엔드 활성화 시 sendMsg를 후킹
  let currentRoomStreamId = null;

  function hookSendMsg() {
    const origSendMsg = window.sendMsg;
    if (!origSendMsg) return setTimeout(hookSendMsg, 200);
    window.sendMsg = async function () {
      const ta = document.getElementById('msgInput');
      const text = ta && ta.value.trim();
      if (!text) return;
      if (window.Sync.isEnabled) {
        try {
          await window.Sync.sendMessage(window.currentRoom || '전체 공지방', text);
          ta.value = '';
          ta.style.height = 'auto';
          document.getElementById('emoticonSuggest')?.classList.add('hidden');
          document.getElementById('mentionDropdown')?.classList.add('hidden');
          // SSE가 자동으로 화면 갱신
          return;
        } catch (e) {
          console.warn('[Backend] 메시지 전송 실패, 로컬로 폴백:', e.message);
        }
      }
      origSendMsg();
    };
  }
  hookSendMsg();

  // ========== 채팅방 진입 시 SSE 구독 ==========
  function hookSelectRoom() {
    const origSelectRoom = window.selectRoom;
    if (!origSelectRoom) return setTimeout(hookSelectRoom, 200);
    window.selectRoom = function (room) {
      origSelectRoom(room);
      if (window.Sync.isEnabled) {
        subscribeRoom(room);
      }
    };
  }
  hookSelectRoom();

  async function subscribeRoom(room) {
    if (!window.Sync.isEnabled) return;
    if (currentRoomStreamId) {
      window.Sync.unsubscribeMessages(currentRoomStreamId);
    }
    currentRoomStreamId = room;
    try {
      // 백엔드에서 메시지 로드
      const msgs = await window.Sync.getMessages(room);
      const localMsgs = msgs.map(m => ({
        id: Number(m.id),
        from: m.username,
        name: m.name,
        content: m.content,
        type: m.type,
        time: new Date(m.created_at).toTimeString().substring(0, 5),
        edited: m.edited,
        recalled: m.recalled,
        fileName: m.file_name,
        dataUrl: m.file_url,
      }));
      window.ST.set('msgs_' + room, localMsgs);
      if (typeof window.renderMessages === 'function') window.renderMessages(localMsgs);
      // 실시간 구독
      const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
      window.Sync.subscribeMessages(room, (msg) => {
        const all = window.ST.get('msgs_' + room, []) || [];
        const exists = all.find(m => m.id === Number(msg.id));
        if (exists) return;
        all.push({
          id: Number(msg.id),
          from: msg.username,
          name: msg.name,
          content: msg.content,
          type: msg.type,
          time: new Date(msg.created_at).toTimeString().substring(0, 5),
          edited: msg.edited,
          recalled: msg.recalled,
          fileName: msg.file_name,
          dataUrl: msg.file_url,
        });
        window.ST.set('msgs_' + room, all);
        if (window.currentRoom === room && typeof window.renderMessages === 'function') {
          window.renderMessages(all);
        }
        if (typeof window.renderRoomList === 'function') window.renderRoomList();
      }, lastId);
    } catch (e) {
      console.warn('[Backend] 메시지 구독 실패:', e.message);
    }
  }

  // ========== 공지/휴가/사용자 - 초기 로드 ==========
  async function syncFromBackend() {
    if (!window.Sync.isEnabled) return;
    try {
      // 공지사항
      const anns = await window.Sync.getAnnouncements();
      const localAnns = anns.map(a => ({
        id: Number(a.id), title: a.title, content: a.content,
        author: a.author_name || '관리자', username: a.author_username || 'intro',
        created: new Date(a.created_at).toISOString().replace('T', ' ').substring(0, 16),
        start: a.start_at, end: a.end_at, pinned: a.pinned,
      }));
      window.ST.set('announcements', localAnns);
      if (typeof window.renderAnnouncements === 'function') window.renderAnnouncements();

      // 휴가
      const leaves = await window.Sync.getLeaves();
      const localLeaves = leaves.map(l => ({
        id: Number(l.id), username: l.username, name: l.name, type: l.type,
        start: l.start_date, end: l.end_date, cost: Number(l.cost), reason: l.reason,
        status: l.status, file: l.file_name,
      }));
      window.ST.set('leaves', localLeaves);

      // 사용자 → 폴백 시 사용할 수 있게 저장
      const users = await window.Sync.getUsers();
      const localUsers = {};
      users.forEach(u => {
        localUsers[u.username] = {
          name: u.name, dept: u.dept, role: u.role, pw: '',
          hireDate: u.hire_date, totalLeave: Number(u.total_leave),
          usedLeave: Number(u.used_leave), partners: u.partners || [], phone: u.phone,
        };
      });
      window.ST.set('users', localUsers);

      // 가입 요청
      try {
        const reqs = await window.Sync.getRequests();
        window.ST.set('signupRequests', reqs.map(r => ({
          id: Number(r.id), name: r.name, username: r.username, phone: r.phone,
          requestedDept: r.requested_dept, hireDate: r.hire_date,
          created: new Date(r.created_at).toISOString().split('T')[0],
        })));
      } catch {}

      // 화면 새로고침
      if (typeof window.renderLeaveData === 'function') window.renderLeaveData();
      if (typeof window.renderHomeLeave === 'function') window.renderHomeLeave();
      if (typeof window.renderMembers === 'function') window.renderMembers();
      if (typeof window.renderRequests === 'function') window.renderRequests();
      console.log('%c[Backend] 데이터 동기화 완료', 'color:green');
    } catch (e) {
      console.warn('[Backend] 데이터 동기화 실패:', e.message);
    }
  }

  // ========== 공지/휴가 등록도 백엔드 동기화 ==========
  function hookSubmitAnnouncement() {
    const orig = window.submitAnnouncement;
    if (!orig) return setTimeout(hookSubmitAnnouncement, 200);
    window.submitAnnouncement = async function () {
      const t = document.getElementById('annTitle').value.trim();
      const c = document.getElementById('annContent').value.trim();
      if (!t || !c) { alert('제목/내용 입력'); return; }
      if (window.Sync.isEnabled) {
        try {
          await window.Sync.createAnnouncement({
            title: t, content: c,
            pinned: document.getElementById('annPinned').checked,
            start_at: document.getElementById('annStart').value || null,
            end_at: document.getElementById('annEnd').value || null,
          });
          document.getElementById('annTitle').value = '';
          document.getElementById('annContent').value = '';
          window.closeModal('announcementModal');
          await syncFromBackend();
          window.showToast('📣', '공지 등록', t);
          return;
        } catch (e) { console.warn('[Backend] 공지 등록 실패:', e.message); }
      }
      orig();
    };
  }
  hookSubmitAnnouncement();

  function hookSubmitLeave() {
    const orig = window.submitLeave;
    if (!orig) return setTimeout(hookSubmitLeave, 200);
    window.submitLeave = async function () {
      const typeSel = document.getElementById('leaveType');
      const type = typeSel.value;
      const cost = parseFloat(typeSel.options[typeSel.selectedIndex].dataset.cost);
      const start = document.getElementById('leaveStart').value;
      const end = document.getElementById('leaveEnd').value;
      const reason = document.getElementById('leaveReason').value.trim();
      if (!start || !end) { alert('날짜 입력'); return; }
      let days = cost;
      if (type === '연차') {
        days = Math.floor((new Date(end) - new Date(start)) / 86400000) + 1;
      }
      if (window.Sync.isEnabled) {
        try {
          await window.Sync.createLeave({ type, start_date: start, end_date: end, cost: days, reason });
          window.closeModal('leaveModal');
          await syncFromBackend();
          window.showToast('☕', '휴가 신청', `${type} · ${days === 0 ? '미차감' : days + '일 차감'}`);
          return;
        } catch (e) { console.warn('[Backend] 휴가 신청 실패:', e.message); }
      }
      orig();
    };
  }
  hookSubmitLeave();

  // ========== 프로필 저장 (입사일 등) ==========
  function hookSaveProfile() {
    const orig = window.saveProfile;
    if (!orig) return setTimeout(hookSaveProfile, 200);
    window.saveProfile = async function () {
      const hd = document.getElementById('profileHireDate').value;
      if (!hd) { alert('입사일 입력'); return; }
      if (window.Sync.isEnabled) {
        try {
          await window.Sync.updateProfile({ hire_date: hd });
          window.CURRENT.hireDate = hd;
          window.ST.set('currentUser', window.CURRENT);
          if (typeof window.loadProfileForm === 'function') window.loadProfileForm();
          window.showToast('💾', '프로필 저장', `입사일: ${hd}`);
          return;
        } catch (e) { console.warn('[Backend] 프로필 저장 실패:', e.message); }
      }
      orig();
    };
  }
  hookSaveProfile();

  // ========== 자동 로그인 (이미 토큰 있으면 백엔드 me 호출) ==========
  if (window.Sync.isEnabled) {
    window.Sync.me().then(user => {
      if (user) {
        window.CURRENT = {
          username: user.username, name: user.name, dept: user.dept, role: user.role,
          hireDate: user.hire_date, totalLeave: user.total_leave, usedLeave: user.used_leave,
          partners: user.partners || [], pw: '',
        };
        window.ST.set('currentUser', window.CURRENT);
        if (typeof window.enterDashboard === 'function') window.enterDashboard();
        syncFromBackend();
      }
    }).catch(() => {});
  }

  // ========== 백엔드 상태 표시 ==========
  function addBackendIndicator() {
    if (!document.body) return setTimeout(addBackendIndicator, 100);
    const ind = document.createElement('div');
    ind.id = 'backendStatus';
    ind.style.cssText = 'position:fixed;bottom:24px;left:24px;background:#16a34a;color:#fff;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:bold;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer';
    const update = () => {
      if (window.Sync.isEnabled) {
        ind.style.background = '#16a34a';
        ind.textContent = '🟢 백엔드 연동 (실시간)';
      } else {
        ind.style.background = '#6b7280';
        ind.textContent = '⚫ 로컬 모드';
      }
    };
    update();
    ind.onclick = () => alert(`${window.Sync.isEnabled ? '백엔드 연동 활성' : '로컬 모드 (localStorage)'}\n토큰: ${localStorage.getItem('intro_api_token')?.substring(0, 20) || '없음'}...`);
    document.body.appendChild(ind);
    window.__updateBackendStatus = update;
    setInterval(update, 3000);
  }
  addBackendIndicator();

  console.log('%c[INTRO Bridge] 백엔드 브릿지 로드됨', 'color:#2383e2;font-weight:bold');
})();
