/* ============================================================
   INTRO 인트라넷 v5 - 완성도 강화
============================================================ */

// ========== Storage ==========
const ST={
  get(k,d){try{const v=localStorage.getItem('intro_'+k);return v?JSON.parse(v):d}catch{return d}},
  set(k,v){localStorage.setItem('intro_'+k,JSON.stringify(v))},
  del(k){localStorage.removeItem('intro_'+k)}
};

// ========== 사용자 데이터 ==========
const DEFAULT_USERS={
  intro:{name:'관리자',dept:'경영',role:'admin',pw:'dlsxmfh1!',hireDate:'2020-01-01',totalLeave:20,usedLeave:5,partners:[]},
  kim:{name:'김디자인',dept:'디자인',role:'manager',pw:'1234',hireDate:'2023-03-15',totalLeave:16,usedLeave:10,partners:[]},
  lee:{name:'이마케팅',dept:'마케팅',role:'member',pw:'1234',hireDate:'2024-02-15',totalLeave:15,usedLeave:4.5,partners:['(주)뷰티코리아']},
  park:{name:'박개발',dept:'개발',role:'member',pw:'1234',hireDate:'2025-08-01',totalLeave:11,usedLeave:3,partners:[]}
};
function getUsers(){return ST.get('users',DEFAULT_USERS)}
function saveUsers(u){ST.set('users',u)}
function getUser(username){return getUsers()[username]}
let CURRENT=null;

// ========== 테마 ==========
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  const icon=next==='dark'?'☀️':'🌙';
  document.querySelectorAll('#theme-icon,#theme-icon-login,#theme-icon-m').forEach(e=>e&&(e.textContent=icon));
  const tg=document.getElementById('darkToggle');if(tg)tg.checked=next==='dark';
  ST.set('theme',next);
}

// ========== 인증 ==========
function doLogin(){
  const u=document.getElementById('loginUsername').value.trim();
  const p=document.getElementById('loginPassword').value.trim();
  const user=getUser(u);
  if(!user||user.pw!==p){alert('아이디/비밀번호가 잘못되었습니다');return}
  CURRENT={username:u,...user};
  ST.set('currentUser',CURRENT);
  enterDashboard();
}
function logout(){
  if(!confirm('로그아웃 하시겠습니까?'))return;
  ST.del('currentUser');CURRENT=null;
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('dashboard').style.display='none';
  document.getElementById('page-login').classList.add('active');
  document.getElementById('page-login').style.display='flex';
}
function enterDashboard(){
  document.getElementById('page-login').classList.remove('active');
  document.getElementById('page-login').style.display='none';
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('dashboard').style.display='block';
  refreshUserUI();
  // ★ 가입승인 카드는 메인홈에서 제거되었으므로 참조 안 함 (이전 JS 에러로 인해 후속 렌더링 중단되던 문제 수정)
  const h=new Date().getHours();
  document.getElementById('homeGreeting').textContent=(h<12?'좋은 아침이에요':h<18?'좋은 오후예요':'좋은 저녁이에요')+', '+CURRENT.name+'님 👋';
  // URL hash에서 초기 페이지 복원 (예: #/leave → leave 페이지로)
  const initial=parseHashRoute();
  const initPage=initial.page||'home';
  try{history.replaceState({page:initPage,sub:initial.sub},'','#/'+initPage+(initial.sub?'/'+initial.sub:''))}catch{}
  __navInternal=true;
  try{navigateTo(initPage,initial.sub)}finally{__navInternal=false}
  renderAnnouncements();renderNotifications();renderHomeLeave();renderHomePending();
  renderLeaveData();renderPastLeaves();initPartnerTables();initAiModels();renderRequests();renderRoles();renderMembers();renderDeptRole();renderPartnerMgmt();
  renderAds();renderEvents();renderDesign();renderEcommerce();loadProfileForm();
  updateMessengerNavBadge();renderMeetings();startMeetingAlarmChecker();
  setTimeout(()=>{if(window.Sync?.isEnabled&&typeof selectRoom==='function')selectRoom(currentRoom)},500);
  setTimeout(()=>showToast('👋','환영합니다',CURRENT.name+'님'),200);
}
// ========== 회원가입 신청 (로그인 화면) ==========
function openRegisterModal(){
  // 부서 옵션 채우기
  const depts=getDepartments();
  document.getElementById('regDept').innerHTML=depts.map(d=>`<option>${escapeHtml(d.name)}</option>`).join('');
  document.getElementById('regHireDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('registerModal').classList.remove('hidden');
}
function submitRegister(){
  const name=document.getElementById('regName').value.trim();
  const phone=document.getElementById('regPhone').value.trim();
  const username=document.getElementById('regUsername').value.trim();
  const password=document.getElementById('regPassword').value;
  const dept=document.getElementById('regDept').value;
  const hireDate=document.getElementById('regHireDate').value;
  if(!name||!phone||!username||!password||!dept||!hireDate){alert('모든 항목을 입력하세요');return}
  if(password.length<6){alert('비밀번호는 6자 이상이어야 합니다');return}
  // 아이디 중복 체크
  if(getUsers()[username]){alert('이미 사용 중인 아이디입니다');return}
  const reqs=getRequests();
  if(reqs.find(r=>r.username===username)){alert('이미 신청된 아이디입니다');return}
  // 신청 추가
  reqs.unshift({id:Date.now(),name,phone,username,password,requestedDept:dept,hireDate,created:new Date().toISOString().split('T')[0]});
  saveRequests(reqs);
  document.getElementById('registerModal').classList.add('hidden');
  // 입력 초기화
  ['regName','regPhone','regUsername','regPassword'].forEach(id=>document.getElementById(id).value='');
  alert('가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.');
}

// ========== 내 프로필 저장 (입사일 등) ==========
function loadProfileForm(){
  if(!CURRENT)return;
  const u=getUser(CURRENT.username);if(!u)return;
  const hd=document.getElementById('profileHireDate');if(hd)hd.value=u.hireDate||'';
  const tenure=document.getElementById('profileTenure');
  if(tenure&&u.hireDate){const d=Math.floor((new Date()-new Date(u.hireDate))/86400000);tenure.value='D+'+d+'일'}
}
function saveProfile(){
  const hd=document.getElementById('profileHireDate').value;
  if(!hd){alert('입사일을 입력하세요');return}
  const users=getUsers();
  users[CURRENT.username].hireDate=hd;
  saveUsers(users);
  CURRENT.hireDate=hd;ST.set('currentUser',CURRENT);
  loadProfileForm();
  showToast('💾','프로필 저장',`입사일: ${hd}`);
}

function refreshUserUI(){
  document.getElementById('userName').textContent=CURRENT.name;
  document.getElementById('userDept').textContent=CURRENT.dept+' · '+roleLabel(CURRENT.role);
  document.getElementById('userAvatar').textContent=CURRENT.name[0];
  document.getElementById('profileName')&&(document.getElementById('profileName').textContent=CURRENT.name);
  document.getElementById('profileMeta')&&(document.getElementById('profileMeta').textContent='@'+CURRENT.username+' · '+roleLabel(CURRENT.role)+' · '+CURRENT.dept);
  document.getElementById('profileAvatar')&&(document.getElementById('profileAvatar').textContent=CURRENT.name[0]);
  document.getElementById('partnerHeader')&&(document.getElementById('partnerHeader').textContent='소속 거래처: '+(CURRENT.partners?.length?CURRENT.partners.join(', '):'(없음)'));
}
function roleLabel(r){return r==='admin'?'관리자':r==='manager'?'매니저':'멤버'}

// ========== 모바일 사이드바 토글 ==========
function isMobileView(){return window.innerWidth<=768}
// ★ 브라우저 자동 스크롤 복원 비활성화 (콘텐츠 하단 표시 이슈 방지)
if(typeof history!=='undefined'&&'scrollRestoration' in history)history.scrollRestoration='manual';
function toggleMobileSidebar(){
  const aside=document.querySelector('#dashboard>aside');
  const bd=document.getElementById('mobileBackdrop');
  if(!aside)return;
  const open=aside.classList.toggle('sidebar-open');
  if(bd)bd.classList.toggle('show',open);
}
function closeMobileSidebar(){
  const aside=document.querySelector('#dashboard>aside');
  const bd=document.getElementById('mobileBackdrop');
  if(aside)aside.classList.remove('sidebar-open');
  if(bd)bd.classList.remove('show');
}
// ========== 모바일 셸 (헤더/탭바/FAB) ==========
const MOBILE_PAGE_TITLES={home:'홈',messenger:'메신저',chatgpt:'ChatGPT',meetings:'회의','meeting-detail':'회의',leave:'휴가 관리',partners:'거래처',ecommerce:'이커머스',events:'행사',design:'디자인',ads:'마케팅',other:'기타',settings:'설정'};
const MOBILE_FAB_CONFIG={
  home:{action:'__menu__'},
  leave:{action:'openLeaveModal()'},
  meetings:{action:'openCreateMeetingModal()'},
  messenger:{action:'openCreateRoomModal()'},
  chatgpt:{action:'newAiChat()'},
};
function updateMobileShell(page){
  closeFabMenu();
  const t=document.getElementById('mobileHeaderTitle');if(t)t.textContent=MOBILE_PAGE_TITLES[page]||'INTRO';
  document.querySelectorAll('#mobileTabBar .mtab').forEach(b=>{
    const m=b.getAttribute('data-mtab');
    b.classList.toggle('active',m===page);
  });
  const fab=document.getElementById('mobileFab');
  if(fab){
    const cfg=MOBILE_FAB_CONFIG[page];
    if(cfg&&isMobileView()){
      fab.style.display='flex';
      fab.classList.remove('fab-hidden');
      fab.setAttribute('data-action',cfg.action);
    }else{
      fab.style.display='none';
    }
  }
}
function onMobileFabClick(){
  const fab=document.getElementById('mobileFab');
  const action=fab?.getAttribute('data-action');
  if(!action)return;
  if(action==='__menu__'){toggleFabMenu();return}
  try{(new Function(action))()}catch(e){console.warn('FAB action failed',e)}
}
function toggleFabMenu(){
  const menu=document.getElementById('mobileFabMenu');
  const bd=document.getElementById('mobileFabBackdrop');
  const fab=document.getElementById('mobileFab');
  if(!menu)return;
  const open=menu.classList.toggle('show');
  if(open){menu.style.display='flex';bd.style.display='block';bd.classList.add('show');fab?.classList.add('fab-open')}
  else{closeFabMenu()}
}
function closeFabMenu(){
  const menu=document.getElementById('mobileFabMenu');
  const bd=document.getElementById('mobileFabBackdrop');
  const fab=document.getElementById('mobileFab');
  if(menu){menu.classList.remove('show');menu.style.display='none'}
  if(bd){bd.classList.remove('show');bd.style.display='none'}
  fab?.classList.remove('fab-open');
}
function fabAction(fnName){
  closeFabMenu();
  // 모달 동작이 확실히 실행되도록 함수 맵 + setTimeout(0)으로 분리
  const actions={
    openAnnouncementModal:()=>{if(typeof openAnnouncementModal==='function')openAnnouncementModal()},
    openLeaveModal:()=>{if(typeof openLeaveModal==='function')openLeaveModal()},
    openCreateMeetingModal:()=>{if(typeof openCreateMeetingModal==='function')openCreateMeetingModal()},
    openCreateRoomModal:()=>{if(typeof openCreateRoomModal==='function')openCreateRoomModal()},
    newAiChat:()=>{navigateTo('chatgpt');setTimeout(()=>{if(typeof newAiChat==='function')newAiChat()},80)},
  };
  setTimeout(()=>{
    try{const fn=actions[fnName];if(fn)fn();else console.warn('FAB action 미정의:',fnName)}
    catch(e){console.error('FAB action 실패',fnName,e);alert('동작 실패: '+e.message)}
  },0);
}

// ========== 네비게이션 ==========
// History API 연동: 뒤로가기/앞으로가기 지원
let __navInternal=false;
function parseHashRoute(){
  const h=(location.hash||'').replace(/^#\/?/,'');
  if(!h)return {page:null,sub:null};
  const parts=h.split('/');
  return {page:parts[0]||null,sub:parts[1]||null};
}
window.addEventListener('popstate',(e)=>{
  // 로그인 상태 아니면 무시
  if(!CURRENT)return;
  let page='home',sub=null;
  if(e.state&&e.state.page){page=e.state.page;sub=e.state.sub}
  else{const r=parseHashRoute();page=r.page||'home';sub=r.sub}
  __navInternal=true;
  try{navigateTo(page,sub)}finally{__navInternal=false}
});
function navigateTo(page,sub){
  // 히스토리에 push (popstate에서 호출된 경우 skip)
  if(!__navInternal){
    try{
      const url='#/'+page+(sub?'/'+sub:'');
      const state={page,sub};
      if(history.state&&history.state.page===page&&history.state.sub===sub){
        // 동일 페이지 재진입: replaceState로 중복 방지
        history.replaceState(state,'',url);
      }else{
        history.pushState(state,'',url);
      }
    }catch{}
  }
  if(isMobileView())closeMobileSidebar();
  updateMobileShell(page);
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelector(`[data-nav="${page}"]`)?.classList.add('active');
  document.querySelectorAll('[data-submenu]').forEach(s=>s.classList.add('hidden'));
  document.querySelector(`[data-submenu="${page}"]`)?.classList.remove('hidden');
  if(sub)navigateSub(page,sub);
  document.getElementById('notifDropdown').classList.add('hidden');
  if(page==='messenger'){
    renderRoomList();loadMessages();
    if(window.Sync?.isEnabled&&typeof selectRoom==='function'&&!isMobileView())selectRoom(currentRoom);
    if(isMobileView())document.getElementById('page-messenger')?.classList.remove('mobile-show-chat');
  }
  if(page==='chatgpt'&&isMobileView())document.getElementById('page-chatgpt')?.classList.remove('mobile-show-chat');
  if(page==='meetings')renderMeetings();
  if(page==='leave'){renderLeaveData();renderPastLeaves();}
  if(page==='chatgpt')renderAiList();
  if(page==='ads')renderAds();
  if(page==='events')renderEvents();
  if(page==='design')renderDesign();
  if(page==='ecommerce'){renderEcommerce();renderEcOrders();_restoreInvAutoSyncToggle();}
  if(page==='partners'){
    // ★ 거래처 진입 시 CURRENT를 users 저장소와 동기화 (삭제 버그 방지)
    if(CURRENT){const fresh=getUsers()[CURRENT.username];if(fresh){CURRENT.partners=fresh.partners||[];ST.set('currentUser',CURRENT)}}
    refreshUserUI();renderPartnerFilter();
  }
  // ★ 활성 페이지를 mainArea의 첫 자식으로 이동시켜 DOM 순서 leftover 공간 문제 차단
  const ap=document.getElementById('page-'+page);
  const ma=document.getElementById('mainArea');
  if(ap&&ma&&ma.firstElementChild!==ap){
    try{ma.insertBefore(ap,ma.firstChild)}catch{}
  }
  const resetScroll=()=>{
    try{window.scrollTo(0,0)}catch{}
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    if(ma)ma.scrollTop=0;
    const dash=document.getElementById('dashboard');if(dash)dash.scrollTop=0;
    if(ap){
      const rect=ap.getBoundingClientRect();
      if(rect.top<-1||rect.top>1)window.scrollBy(0,rect.top);
    }
  };
  resetScroll();
  requestAnimationFrame(resetScroll);
  setTimeout(resetScroll,30);
  setTimeout(resetScroll,100);
  setTimeout(resetScroll,300);
  // 진단: 콘솔에 활성 페이지 위치 출력 (사용자가 캡처해서 보낼 수 있도록)
  setTimeout(()=>{
    if(!ap)return;
    const r=ap.getBoundingClientRect();
    const ma=document.getElementById('mainArea');
    const mr=ma?ma.getBoundingClientRect():null;
    console.log(`[INTRO Layout][${page}]`,JSON.stringify({
      scrollY:window.scrollY,
      docH:document.documentElement.scrollHeight,
      vpH:window.innerHeight,
      pageTop:Math.round(r.top),pageH:Math.round(r.height),
      mainTop:mr?Math.round(mr.top):null,mainH:mr?Math.round(mr.height):null,
      bodyH:Math.round(document.body.getBoundingClientRect().height)
    }));
  },400);
}
function navigateSub(page,sub){
  document.querySelectorAll(`#page-${page} .sub-page`).forEach(p=>p.classList.remove('active'));
  document.getElementById(`sub-${page}-${sub}`)?.classList.add('active');
  document.querySelectorAll('.sub-nav-item').forEach(n=>{n.classList.remove('active');n.classList.remove('border-black')});
  document.querySelectorAll(`[data-subnav="${page}-${sub}"]`).forEach(s=>{s.classList.add('active');if(s.tagName==='BUTTON')s.classList.add('border-black')});
}
function switchSettingTab(tab){
  document.querySelectorAll('.settings-tab').forEach(t=>t.classList.remove('bg-gray-100','font-semibold'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('bg-gray-100','font-semibold');
  document.querySelectorAll('.setting-content').forEach(c=>c.classList.add('hidden'));
  document.getElementById('tab-'+tab)?.classList.remove('hidden');
  if(tab==='profile')loadProfileForm();
  if(tab==='requests')renderRequests();
  if(tab==='members')renderMembers();
  if(tab==='deptrole'){renderDeptRole();renderRoles()}
  if(tab==='partnersmgmt')renderPartnerMgmt();
  if(tab==='aiapi')renderAiModels();
  if(tab==='extapi')renderExtApiSettings();
}
function openModal(id){document.getElementById(id).classList.remove('hidden')}
function closeModal(id){document.getElementById(id).classList.add('hidden')}
function openLeaveModal(){
  const today=new Date().toISOString().split('T')[0];
  document.getElementById('leaveStart').value=today;
  document.getElementById('leaveEnd').value=today;
  document.getElementById('leaveFileName').textContent='PDF, DOC, DOCX, JPG 지원';
  openModal('leaveModal');
}
function openCreateRoomModal(){
  // populate members
  const mhtml=Object.entries(getUsers()).filter(([k])=>k!==CURRENT.username).map(([k,u])=>`<label class="flex items-center gap-3 p-2 hover-bg rounded cursor-pointer"><input type="checkbox" value="${k}" class="w-4 h-4 accent-black newRoomMember" /><p class="text-sm">${u.name} · ${u.dept}</p></label>`).join('');
  document.getElementById('newRoomMembers').innerHTML=mhtml;
  openModal('createRoomModal');
}
function openRepeatModal(){openModal('repeatModal')}
function openFeedback(){openModal('feedbackModal')}

// ========== 토스트 ==========
function showToast(icon,title,content){
  const t=document.createElement('div');
  t.className='toast toast-anim flex items-start gap-3';
  t.innerHTML=`<span class="text-xl shrink-0">${icon}</span><div class="flex-1 min-w-0"><p class="text-sm font-semibold">${title}</p>${content?'<p class="text-xs text-gray-500 mt-0.5">'+content+'</p>':''}</div><button onclick="this.parentElement.remove()" class="text-gray-400">✕</button>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity 0.3s';setTimeout(()=>t.remove(),300)},4500);
}

// ========== 공지사항 ==========
function getAnnouncements(){return ST.get('announcements',[
  {id:1,title:'2분기 전사 워크샵 안내',content:'6월 첫째 주에 진행됩니다.',author:'관리자',username:'intro',created:'2026-05-12 09:30',start:'2026-05-12T09:00',end:'2026-05-30T18:00',pinned:true}
])}
function saveAnnouncements(a){ST.set('announcements',a)}
function isAnnouncementActive(a){
  if(!a||!a.end)return true;
  const end=new Date(a.end.includes('T')?a.end:a.end+'T23:59:59');
  return end>=new Date();
}
function renderAnnouncements(){
  const all=getAnnouncements();
  const anns=all.filter(isAnnouncementActive);
  const list=document.getElementById('announcementList');if(!list)return;
  if(anns.length===0){list.innerHTML='<div class="px-3 py-8 text-center text-gray-400 text-sm">진행 중인 공지가 없습니다.</div>';const ac=document.getElementById('annCount');if(ac)ac.textContent='0';return}
  list.innerHTML=anns.map(a=>`<div class="flex items-start gap-2 px-3 py-3 cursor-pointer hover-bg" onclick="showAnnouncementDetail(${a.id})">${a.pinned?'<span class="text-red-500 text-xs mt-1">📌</span>':'<span class="w-4"></span>'}<div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">${escapeHtml(a.title)}</p><p class="text-xs text-gray-400 mt-0.5">${a.author} · ${a.created.split(' ')[0]} · 마감 ${a.end.split('T')[0]}</p></div></div>`).join('');
  const ac=document.getElementById('annCount');if(ac)ac.textContent=anns.length;
}
let editingAnnouncementId=null;
function openAnnouncementModal(){
  editingAnnouncementId=null;
  document.getElementById('annModalTitle').textContent='📣 새 공지';
  document.getElementById('annSubmitBtn').textContent='등록';
  document.getElementById('annTitle').value='';
  document.getElementById('annContent').value='';
  document.getElementById('annPinned').checked=false;
  openModal('announcementModal');
}
function submitAnnouncement(){
  const t=document.getElementById('annTitle').value.trim();
  const c=document.getElementById('annContent').value.trim();
  if(!t||!c){alert('제목과 내용을 입력하세요');return}
  const anns=getAnnouncements();
  if(editingAnnouncementId!=null){
    const idx=anns.findIndex(a=>a.id===editingAnnouncementId);
    if(idx>=0){
      anns[idx].title=t;
      anns[idx].content=c;
      anns[idx].start=document.getElementById('annStart').value;
      anns[idx].end=document.getElementById('annEnd').value;
      anns[idx].pinned=document.getElementById('annPinned').checked;
    }
    anns.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
    saveAnnouncements(anns);renderAnnouncements();
    closeModal('announcementModal');
    editingAnnouncementId=null;
    showToast('✏️','공지 수정',t);
    return;
  }
  anns.unshift({id:Date.now(),title:t,content:c,author:CURRENT.name,username:CURRENT.username,created:new Date().toISOString().replace('T',' ').substring(0,16),start:document.getElementById('annStart').value,end:document.getElementById('annEnd').value,pinned:document.getElementById('annPinned').checked});
  anns.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
  saveAnnouncements(anns);renderAnnouncements();
  document.getElementById('annTitle').value='';document.getElementById('annContent').value='';
  closeModal('announcementModal');
  showToast('📣','공지 등록',t);
}
let currentDetailId=null;
function showAnnouncementDetail(id){
  const a=getAnnouncements().find(x=>x.id===id);if(!a)return;
  currentDetailId=id;
  document.getElementById('detailTitle').textContent=a.title;
  document.getElementById('detailPinIcon').textContent=a.pinned?'📌 ':'';
  document.getElementById('detailAuthor').textContent=a.author;
  document.getElementById('detailAvatar').textContent=a.author[0];
  document.getElementById('detailCreated').textContent='작성: '+a.created;
  document.getElementById('detailStart').textContent=a.start.replace('T',' ');
  document.getElementById('detailEnd').textContent=a.end.replace('T',' ');
  document.getElementById('detailContent').textContent=a.content;
  const canManage=a.username===CURRENT.username||CURRENT.role==='admin';
  document.getElementById('detailDeleteBtn').classList.toggle('hidden',!canManage);
  document.getElementById('detailEditBtn').classList.toggle('hidden',!canManage);
  openModal('announcementDetail');
}
function editAnnouncement(){
  const a=getAnnouncements().find(x=>x.id===currentDetailId);if(!a)return;
  if(a.username!==CURRENT.username&&CURRENT.role!=='admin'){alert('수정 권한이 없습니다');return}
  editingAnnouncementId=a.id;
  document.getElementById('annModalTitle').textContent='✏️ 공지 수정';
  document.getElementById('annSubmitBtn').textContent='수정 저장';
  document.getElementById('annTitle').value=a.title;
  document.getElementById('annContent').value=a.content;
  document.getElementById('annStart').value=a.start;
  document.getElementById('annEnd').value=a.end;
  document.getElementById('annPinned').checked=!!a.pinned;
  closeModal('announcementDetail');
  openModal('announcementModal');
}
function deleteAnnouncement(){
  if(!confirm('삭제하시겠습니까?'))return;
  saveAnnouncements(getAnnouncements().filter(a=>a.id!==currentDetailId));
  renderAnnouncements();closeModal('announcementDetail');
  if(!document.getElementById('announcementArchive').classList.contains('hidden'))renderAnnouncementArchive();
  showToast('🗑️','공지 삭제','');
}
function openAnnouncementArchive(){renderAnnouncementArchive();openModal('announcementArchive')}
function renderAnnouncementArchive(){
  const list=document.getElementById('archiveList');if(!list)return;
  const all=getAnnouncements();
  const active=all.filter(isAnnouncementActive);
  const expired=all.filter(a=>!isAnnouncementActive(a));
  if(all.length===0){list.innerHTML='<p class="text-center text-gray-400 py-8 text-sm">등록된 공지가 없습니다.</p>';return}
  const renderItem=(a,dim)=>`<div class="flex items-start gap-2 py-3 cursor-pointer hover-bg px-2 rounded ${dim?'opacity-60':''}" onclick="showAnnouncementDetail(${a.id})">${a.pinned?'<span class="text-red-500 text-xs mt-1">📌</span>':'<span class="w-4"></span>'}<div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">${escapeHtml(a.title)}</p><p class="text-xs text-gray-400 mt-0.5">${a.author} · ${a.created.split(' ')[0]} · 마감 ${a.end.split('T')[0]}${dim?' · <span class="text-red-400">마감됨</span>':''}</p></div></div>`;
  let html='';
  if(active.length){html+='<p class="text-xs font-semibold text-gray-500 px-2 py-2">📌 진행 중 ('+active.length+')</p>'+active.map(a=>renderItem(a,false)).join('');}
  if(expired.length){html+='<p class="text-xs font-semibold text-gray-500 px-2 py-2 mt-2">🗂️ 지난 공지 ('+expired.length+')</p>'+expired.map(a=>renderItem(a,true)).join('');}
  list.innerHTML=html;
}

// ========== 휴가 ==========
function getLeaves(){
  const list=ST.get('leaves',[
    {id:1,username:'kim',name:'김디자인',type:'연차',start:'2026-05-15',end:'2026-05-16',cost:2,reason:'',status:'approved',file:''},
    {id:2,username:'lee',name:'이마케팅',type:'오후 반차',start:'2026-05-14',end:'2026-05-14',cost:0.5,reason:'개인사정',status:'approved',file:''}
  ]);
  // 모든 휴가를 자동 승인
  list.forEach(l=>{if(l.status==='pending')l.status='approved'});
  return list;
}
function saveLeaves(l){ST.set('leaves',l)}
let leaveFile='';
function leaveDropFile(e){
  e.preventDefault();e.currentTarget.classList.remove('drag-over');
  const f=e.dataTransfer.files[0];
  if(f){leaveFile=f.name;document.getElementById('leaveFileName').textContent='📎 '+f.name}
}
function submitLeave(){
  const typeSel=document.getElementById('leaveType');
  const type=typeSel.value;
  const cost=parseFloat(typeSel.options[typeSel.selectedIndex].dataset.cost);
  const start=document.getElementById('leaveStart').value;
  const end=document.getElementById('leaveEnd').value;
  const reason=document.getElementById('leaveReason').value.trim();
  if(!start||!end){alert('시작일과 종료일을 입력하세요');return}
  // 일수 계산 (연차/공가/병가는 일자 차이만큼, 반차류는 하루)
  let days=cost;
  if(type==='연차'){
    const d=Math.floor((new Date(end)-new Date(start))/86400000)+1;
    days=d;
  }
  // 잔여 체크
  const user=getUser(CURRENT.username);
  const remaining=user.totalLeave-user.usedLeave;
  if(days>remaining&&type!=='공가'&&type!=='병가'){
    if(!confirm(`잔여 연차(${remaining}일)를 초과합니다. 그래도 신청하시겠습니까?`))return;
  }
  // 휴가 추가
  const leaves=getLeaves();
  leaves.unshift({id:Date.now(),username:CURRENT.username,name:CURRENT.name,type,start,end,cost:days,reason,status:'approved',file:leaveFile});
  saveLeaves(leaves);
  // 자동 차감 (공가/병가 제외)
  if(type!=='공가'&&type!=='병가'){
    const users=getUsers();
    users[CURRENT.username].usedLeave=(users[CURRENT.username].usedLeave||0)+days;
    saveUsers(users);
    CURRENT.usedLeave=users[CURRENT.username].usedLeave;
    ST.set('currentUser',CURRENT);
  }
  closeModal('leaveModal');leaveFile='';
  document.getElementById('leaveReason').value='';
  renderLeaveData();renderHomeLeave();
  showToast('☕','휴가 신청 완료',`${type} · ${days===0?'미차감':days+'일 차감'}`);
}
function renderLeaveData(){
  // 내 요약
  const user=getUser(CURRENT.username);
  const remaining=Math.max(0,user.totalLeave-user.usedLeave);
  const hireDays=Math.floor((new Date()-new Date(user.hireDate))/86400000);
  const summary=document.getElementById('myLeaveSummary');
  if(summary){
    summary.innerHTML=`
      <div class="border border-gray-200 rounded-lg p-4"><p class="text-xs text-gray-500 mb-1">총 부여</p><p class="text-2xl font-bold">${user.totalLeave}일</p></div>
      <div class="border border-gray-200 rounded-lg p-4"><p class="text-xs text-gray-500 mb-1">사용</p><p class="text-2xl font-bold text-blue-600">${user.usedLeave}일</p></div>
      <div class="border border-gray-200 rounded-lg p-4"><p class="text-xs text-gray-500 mb-1">잔여</p><p class="text-2xl font-bold text-green-600">${remaining}일</p></div>
      <div class="border border-gray-200 rounded-lg p-4"><p class="text-xs text-gray-500 mb-1">근속</p><p class="text-2xl font-bold">D+${hireDays}</p><p class="text-xs text-gray-400 mt-0.5">${user.hireDate} 입사</p></div>
    `;
  }
  // 직원별
  const eb=document.getElementById('employeeLeaveBody');
  if(eb){
    const users=getUsers();
    eb.innerHTML=Object.entries(users).map(([k,u],i)=>`<tr><td class="sheet-row-num">${i+1}</td><td>${u.name}</td><td>${u.dept}</td><td>${u.hireDate}</td><td>${u.totalLeave}일</td><td>${u.usedLeave}일</td><td class="font-semibold">${(u.totalLeave-u.usedLeave).toFixed(2)}일</td></tr>`).join('');
  }
  // 내 사용 내역
  const myBody=document.getElementById('myLeaveBody');
  if(myBody){
    const today=new Date().toISOString().split('T')[0];
    const my=getLeaves().filter(l=>l.username===CURRENT.username);
    myBody.innerHTML=my.length===0?'<tr><td colspan="7" class="text-center text-gray-400 py-4">신청 내역이 없습니다.</td></tr>':my.map((l,i)=>`<tr><td class="sheet-row-num">${i+1}</td><td><span class="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">${l.type}</span></td><td>${l.start}</td><td>${l.end}</td><td>${l.cost===0?'미차감':'-'+l.cost+'일'}</td><td class="text-xs text-gray-500">${escapeHtml(l.reason||'-')}</td><td>${l.start>today?`<button onclick="cancelLeave(${l.id})" class="text-xs text-red-500 hover:underline">취소</button>`:'-'}</td></tr>`).join('');
  }
  // 전체 내역
  const allBody=document.getElementById('allLeaveBody');
  if(allBody){
    const all=getLeaves();
    allBody.innerHTML=all.length===0?'<tr><td colspan="5" class="text-center text-gray-400 py-4">내역 없음</td></tr>':all.map((l,i)=>`<tr><td class="sheet-row-num">${i+1}</td><td>${l.name}</td><td><span class="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">${l.type}</span></td><td>${l.start} ~ ${l.end}</td><td>${l.cost===0?'미차감':'-'+l.cost+'일'}</td></tr>`).join('');
  }
}
function cancelLeave(id){
  if(!confirm('취소하시겠습니까? 차감된 연차가 복구됩니다.'))return;
  const leaves=getLeaves();
  const l=leaves.find(x=>x.id===id);if(!l)return;
  // 차감 복구
  if(l.type!=='공가'&&l.type!=='병가'){
    const users=getUsers();
    users[l.username].usedLeave=Math.max(0,users[l.username].usedLeave-l.cost);
    saveUsers(users);
    if(l.username===CURRENT.username){CURRENT.usedLeave=users[l.username].usedLeave;ST.set('currentUser',CURRENT)}
  }
  saveLeaves(leaves.filter(x=>x.id!==id));
  renderLeaveData();renderHomeLeave();
  showToast('🗑️','휴가 취소','연차 복구됨');
}
function renderHomeLeave(){
  const list=document.getElementById('homeLeaveList');if(!list)return;
  const today=new Date().toISOString().split('T')[0];
  const leaves=getLeaves().filter(l=>l.end>=today).slice(0,4);
  if(leaves.length===0){list.innerHTML='<div class="px-3 py-6 text-center text-gray-400 text-sm">예정 휴가 없음</div>';document.getElementById('todayLeaveCount').textContent='0';return}
  list.innerHTML=leaves.map(l=>`<div class="px-3 py-2.5"><div class="flex items-center gap-2"><div class="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs">${l.name[0]}</div><p class="text-sm font-medium flex-1">${l.name}</p><span class="text-xs px-2 py-0.5 rounded-full ${l.status==='approved'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}">${l.status==='approved'?'승인':'대기'}</span></div><p class="text-xs text-gray-500 mt-1 ml-8">${l.type} · ${l.start}${l.start!==l.end?'~'+l.end:''} (${l.cost===0?'미차감':'-'+l.cost+'일'})</p></div>`).join('');
  document.getElementById('todayLeaveCount').textContent=leaves.filter(l=>l.start<=today&&l.end>=today).length;
}

// ========== 가입 요청 ==========
function getRequests(){return ST.get('signupRequests',[
  {id:1,name:'홍길동',username:'hong',phone:'010-1234-5678',requestedDept:'마케팅',created:'2026-05-13'},
  {id:2,name:'박디자인',username:'parkd',phone:'010-5678-1234',requestedDept:'디자인',created:'2026-05-12'}
])}
function saveRequests(r){ST.set('signupRequests',r)}
function renderRequests(){
  const list=document.getElementById('requestsList');if(!list)return;
  const reqs=getRequests();
  if(reqs.length===0){list.innerHTML='<p class="text-center text-gray-400 py-8 text-sm">대기 요청 없음</p>';return}
  list.innerHTML=reqs.map(r=>`<div class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"><div class="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold">${r.name[0]}</div><div class="flex-1"><p class="font-semibold text-sm">${r.name}</p><p class="text-xs text-gray-500">@${r.username} · 희망 부서: ${r.requestedDept} · ${r.phone}</p><p class="text-xs text-gray-400">신청: ${r.created}${r.hireDate?' · 입사일: '+r.hireDate:''}</p></div><button onclick="openApproveModal(${r.id})" class="px-3 py-1.5 bg-black text-white text-xs rounded-lg">✓ 승인하기</button><button onclick="rejectRequest(${r.id})" class="px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg">✕ 거절</button></div>`).join('');
}
let approveTargetId=null;
function openApproveModal(id){
  const r=getRequests().find(x=>x.id===id);if(!r)return;
  approveTargetId=id;
  document.getElementById('approveInfo').innerHTML=`<p><strong>${r.name}</strong> (@${r.username})</p><p class="text-xs text-gray-500">${r.phone} · 희망 부서: ${r.requestedDept}</p>`;
  const depts=getDepartments();
  document.getElementById('approveDept').innerHTML=depts.map(d=>`<option ${d.name===r.requestedDept?'selected':''}>${d.name}</option>`).join('');
  // ★ 역할 옵션 (커스텀 역할 포함)
  const roles=getRoles();
  document.getElementById('approveRole').innerHTML=roles.map(rr=>`<option value="${rr.id}" ${rr.id==='member'?'selected':''}>${escapeHtml(rr.name)}</option>`).join('');
  // ★ 거래처 선택 옵션
  const partners=getPartners();
  document.getElementById('approvePartnersList').innerHTML=partners.length===0?'<p class="text-xs text-gray-400 text-center py-2">등록된 거래처 없음</p>':partners.map(p=>`<label class="flex items-center gap-2 px-2 py-1 hover-bg rounded text-sm cursor-pointer"><input type="checkbox" class="approvePartnerChk w-4 h-4 accent-black" value="${escapeHtml(p.name)}" /><span>${escapeHtml(p.name)}</span></label>`).join('');
  openModal('approveModal');
}
function confirmApprove(){
  const r=getRequests().find(x=>x.id===approveTargetId);if(!r)return;
  const dept=document.getElementById('approveDept').value;
  const role=document.getElementById('approveRole').value;
  const selectedPartners=Array.from(document.querySelectorAll('.approvePartnerChk:checked')).map(c=>c.value);
  const users=getUsers();
  users[r.username]={
    name:r.name,
    dept,
    role,
    pw:r.password||'1234',
    hireDate:r.hireDate||new Date().toISOString().split('T')[0],
    totalLeave:11,
    usedLeave:0,
    partners:selectedPartners
  };
  saveUsers(users);
  saveRequests(getRequests().filter(x=>x.id!==approveTargetId));
  closeModal('approveModal');renderRequests();renderHomePending();renderMembers();
  showToast('✓','가입 승인 완료',`${r.name} (${dept}/${roleLabel(role)}/거래처 ${selectedPartners.length}개)`);
}
function rejectRequest(id){
  if(!confirm('거절하시겠습니까?'))return;
  saveRequests(getRequests().filter(x=>x.id!==id));renderRequests();renderHomePending();
  showToast('✕','가입 거절','');
}
function renderHomePending(){
  const list=document.getElementById('homePendingList');if(!list)return;
  const reqs=getRequests();
  if(reqs.length===0){list.innerHTML='<div class="px-3 py-6 text-center text-gray-400 text-sm">대기 요청 없음</div>';return}
  list.innerHTML=reqs.slice(0,3).map(r=>`<div class="px-3 py-2.5 flex items-center gap-3"><div class="w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs">${r.name[0]}</div><div class="flex-1"><p class="text-sm font-medium">${r.name} <span class="text-xs text-gray-500">@${r.username}</span></p><p class="text-xs text-gray-500">${r.requestedDept} · ${r.phone}</p></div><button onclick="openApproveModal(${r.id})" class="px-2 py-1 bg-black text-white text-xs rounded">승인</button><button onclick="rejectRequest(${r.id})" class="px-2 py-1 border border-red-200 text-red-600 text-xs rounded">거절</button></div>`).join('');
}

// ========== 부서 ==========
function getDepartments(){return ST.get('departments',[
  {name:'경영',role:'admin'},{name:'마케팅',role:'member'},{name:'디자인',role:'member'},{name:'개발',role:'member'},{name:'영업',role:'member'},{name:'기타',role:'member'}
])}
function saveDepartments(d){ST.set('departments',d)}
function renderDeptRole(){
  const list=document.getElementById('deptRoleList');if(!list)return;
  const depts=getDepartments();const users=getUsers();
  list.innerHTML=depts.map((d,i)=>{
    const count=Object.values(users).filter(u=>u.dept===d.name).length;
    const perm=d.permissions||{};
    const menuCount=(perm.menus||DEFAULT_MENUS).length;
    return `<tr><td class="sheet-row-num">${i+1}</td><td contenteditable class="editable">${d.name}</td><td>${count}명</td><td><select class="text-xs border rounded px-2 py-1 bg-white" onchange="updateDeptRole(${i},this.value)"><option value="admin" ${d.role==='admin'?'selected':''}>관리자</option><option value="manager" ${d.role==='manager'?'selected':''}>매니저</option><option value="member" ${d.role==='member'?'selected':''}>멤버</option></select></td><td><button onclick="openPermissionModal(${i})" class="text-xs px-2 py-1 border border-gray-200 rounded bg-white">🔐 권한 (${menuCount}메뉴) ▾</button></td><td><button onclick="deleteDept(${i})" class="text-xs text-red-500">삭제</button></td></tr>`;
  }).join('');
}
const DEFAULT_MENUS=['홈','메신저','ChatGPT','거래처','이커머스','행사','디자인','마케팅','기타','설정'];
const DEFAULT_FEATURES=[
  {key:'read',label:'읽기'},{key:'write',label:'쓰기/등록'},{key:'edit',label:'수정'},{key:'delete',label:'삭제'},
  {key:'invite',label:'멤버 초대'},{key:'approve',label:'가입 승인'},{key:'kick',label:'멤버 강퇴'},
  {key:'manage_partners',label:'거래처 관리'},{key:'manage_ai',label:'AI API 관리'},{key:'pin',label:'고정/공지 설정'}
];

// ========== 역할(권한) 관리 ==========
function getRoles(){return ST.get('customRoles',[
  {id:'admin',name:'관리자',desc:'전체 시스템 관리',menus:DEFAULT_MENUS.slice(),features:DEFAULT_FEATURES.map(f=>f.key),builtin:true},
  {id:'manager',name:'매니저',desc:'부서 단위 관리',menus:DEFAULT_MENUS.slice(),features:['read','write','edit','invite','approve','pin'],builtin:true},
  {id:'member',name:'멤버',desc:'기본 사용자',menus:DEFAULT_MENUS.filter(m=>m!=='설정'),features:['read','write','edit'],builtin:true}
])}
function saveRoles(r){ST.set('customRoles',r)}
function renderRoles(){
  const list=document.getElementById('roleList');if(!list)return;
  const roles=getRoles();const users=getUsers();
  list.innerHTML=roles.map((r,i)=>{
    const count=Object.values(users).filter(u=>u.role===r.id).length;
    const menuStr=r.menus.length===DEFAULT_MENUS.length?'전체':r.menus.length+'개';
    const featStr=r.features.length===DEFAULT_FEATURES.length?'전체':r.features.length+'개';
    return `<tr><td class="sheet-row-num">${i+1}</td><td><code class="text-xs bg-gray-100 px-1 py-0.5 rounded">${r.id}</code></td><td contenteditable="${!r.builtin}" oninput="updRole('${r.id}','name',this.textContent)" class="${!r.builtin?'editable':''}"><strong>${escapeHtml(r.name)}</strong>${r.builtin?' <span class="text-xs text-gray-400">(기본)</span>':''}</td><td contenteditable="${!r.builtin}" oninput="updRole('${r.id}','desc',this.textContent)">${escapeHtml(r.desc||'')}</td><td>${count}명</td><td><button onclick="openRolePermModal('${r.id}')" class="text-xs px-2 py-1 border border-gray-200 rounded bg-white">메뉴 ${menuStr} · 기능 ${featStr} ▾</button></td><td>${r.builtin?'<span class="text-xs text-gray-400">기본</span>':`<button onclick="delRole('${r.id}')" class="text-xs text-red-500">삭제</button>`}</td></tr>`;
  }).join('');
}
function addRole(){
  const name=prompt('새 역할 이름 (예: 외주, 인턴, 협력사):');if(!name)return;
  const id=prompt('역할 ID (영문, 예: outsource):','role_'+Date.now());if(!id)return;
  if(getRoles().find(r=>r.id===id)){alert('이미 존재하는 ID입니다');return}
  const roles=getRoles();
  roles.push({id,name,desc:'',menus:['홈','메신저'],features:['read'],builtin:false});
  saveRoles(roles);renderRoles();
  showToast('🔐','역할 추가됨',name);
}
function delRole(id){
  const role=getRoles().find(r=>r.id===id);if(!role||role.builtin){alert('기본 역할은 삭제할 수 없습니다');return}
  if(!confirm(`'${role.name}' 역할을 삭제하시겠습니까? (이 역할을 가진 멤버는 '멤버'로 변경됩니다)`))return;
  saveRoles(getRoles().filter(r=>r.id!==id));
  // 해당 역할의 사용자들을 member로 이동
  const users=getUsers();
  Object.keys(users).forEach(k=>{if(users[k].role===id)users[k].role='member'});
  saveUsers(users);
  renderRoles();renderMembers();renderDeptRole();
  showToast('🗑️','역할 삭제됨',role.name);
}
function updRole(id,key,val){
  const roles=getRoles();const r=roles.find(x=>x.id===id);
  if(!r||r.builtin)return;
  r[key]=val;saveRoles(roles);
}
let rolePermTarget=null;
function openRolePermModal(id){
  rolePermTarget=id;
  const r=getRoles().find(x=>x.id===id);if(!r)return;
  document.getElementById('permModalTitle').textContent=`🔐 ${r.name} 권한 설정`;
  document.getElementById('permMenus').innerHTML=DEFAULT_MENUS.map(m=>`<label class="flex items-center gap-2 px-2 py-1.5 hover-bg rounded cursor-pointer text-sm"><input type="checkbox" class="permMenu w-4 h-4 accent-black" value="${m}" ${r.menus.includes(m)?'checked':''} ${r.builtin&&r.id==='admin'?'disabled':''} /><span>${m}</span></label>`).join('');
  document.getElementById('permFeatures').innerHTML=DEFAULT_FEATURES.map(f=>`<label class="flex items-center gap-2 px-2 py-1.5 hover-bg rounded cursor-pointer text-sm border border-gray-100"><input type="checkbox" class="permFeature w-4 h-4 accent-black" value="${f.key}" ${r.features.includes(f.key)?'checked':''} ${r.builtin&&r.id==='admin'?'disabled':''} /><span>${f.label}</span></label>`).join('');
  // 저장 버튼은 별도 핸들러 사용
  document.querySelector('#permissionModal button[onclick="savePermissions()"]').setAttribute('onclick','saveRolePerms()');
  openModal('permissionModal');
}
function saveRolePerms(){
  const menus=Array.from(document.querySelectorAll('.permMenu:checked')).map(c=>c.value);
  const features=Array.from(document.querySelectorAll('.permFeature:checked')).map(c=>c.value);
  const roles=getRoles();const r=roles.find(x=>x.id===rolePermTarget);
  if(!r){closeModal('permissionModal');return}
  if(!r.builtin||r.id!=='admin'){r.menus=menus;r.features=features;saveRoles(roles)}
  closeModal('permissionModal');renderRoles();
  showToast('🔐','권한 저장',r.name);
}
let permTargetIdx=null;
function openPermissionModal(idx){
  permTargetIdx=idx;
  const dept=getDepartments()[idx];
  const perm=dept.permissions||{menus:DEFAULT_MENUS.slice(),features:DEFAULT_FEATURES.map(f=>f.key)};
  document.getElementById('permModalTitle').textContent=`🔐 권한 설정 - ${dept.name}`;
  document.getElementById('permMenus').innerHTML=DEFAULT_MENUS.map(m=>`<label class="flex items-center gap-2 px-2 py-1.5 hover-bg rounded cursor-pointer text-sm"><input type="checkbox" class="permMenu w-4 h-4 accent-black" value="${m}" ${(perm.menus||DEFAULT_MENUS).includes(m)?'checked':''} /><span>${m}</span></label>`).join('');
  document.getElementById('permFeatures').innerHTML=DEFAULT_FEATURES.map(f=>`<label class="flex items-center gap-2 px-2 py-1.5 hover-bg rounded cursor-pointer text-sm border border-gray-100"><input type="checkbox" class="permFeature w-4 h-4 accent-black" value="${f.key}" ${(perm.features||DEFAULT_FEATURES.map(x=>x.key)).includes(f.key)?'checked':''} /><span>${f.label}</span></label>`).join('');
  openModal('permissionModal');
}
function savePermissions(){
  const menus=Array.from(document.querySelectorAll('.permMenu:checked')).map(c=>c.value);
  const features=Array.from(document.querySelectorAll('.permFeature:checked')).map(c=>c.value);
  const depts=getDepartments();
  depts[permTargetIdx].permissions={menus,features};
  saveDepartments(depts);
  closeModal('permissionModal');renderDeptRole();
  showToast('🔐','권한 저장',`${depts[permTargetIdx].name}: 메뉴 ${menus.length}개, 기능 ${features.length}개`);
}
function addDept(){
  const name=prompt('부서명:');if(!name)return;
  const depts=getDepartments();depts.push({name,role:'member'});saveDepartments(depts);renderDeptRole();
}
function deleteDept(i){
  if(!confirm('삭제?'))return;
  const depts=getDepartments();depts.splice(i,1);saveDepartments(depts);renderDeptRole();
}
function updateDeptRole(i,v){const d=getDepartments();d[i].role=v;saveDepartments(d)}
function openMenuMs(e,i){alert('메뉴 가시성 설정 데모')}

// ========== 멤버 관리 + 거래처 매핑 ==========
function renderMembers(){
  const list=document.getElementById('membersList');if(!list)return;
  const users=getUsers();
  const roles=getRoles();
  list.innerHTML=Object.entries(users).map(([k,u],i)=>{
    const isMe=k===CURRENT.username;
    const roleOptions=roles.map(r=>`<option value="${r.id}" ${u.role===r.id?'selected':''}>${escapeHtml(r.name)}</option>`).join('');
    return `<tr><td class="sheet-row-num">${i+1}</td><td><strong>${u.name}</strong> <span class="text-xs text-gray-500">@${k}</span></td><td>${u.dept}</td><td><select class="text-xs border rounded px-2 py-1 bg-white" onchange="updateMemberRole('${k}',this.value)" ${isMe?'disabled':''}>${roleOptions}</select></td><td><button onclick="openMemberPartners(event,'${k}')" class="text-xs px-2 py-1 border border-gray-200 rounded bg-white">${(u.partners||[]).length}개 ▾</button></td><td>${isMe?'<span class="text-xs text-gray-400">본인</span>':`<button onclick="kickMember('${k}')" class="text-xs text-red-500">강퇴</button>`}</td></tr>`;
  }).join('');
}
function updateMemberRole(k,v){const users=getUsers();users[k].role=v;saveUsers(users);showToast('✓','권한 변경됨',users[k].name)}
function kickMember(k){
  if(!confirm(getUsers()[k].name+'을(를) 강퇴하시겠습니까?'))return;
  const users=getUsers();delete users[k];saveUsers(users);renderMembers();showToast('🗑️','강퇴됨','')
}
function openMemberPartners(e,k){
  e.stopPropagation();
  // ★ 항상 최신 데이터로부터 로드 (캐시 무효화)
  const users=getUsers();
  const partners=getPartners().map(p=>p.name);
  const user=users[k];
  if(!user){alert('해당 멤버를 찾을 수 없습니다');return}
  // ★ 사용자 partners에서 더 이상 존재하지 않는 거래처는 자동 정리
  const cleanedSelected=(user.partners||[]).filter(p=>partners.includes(p));
  if(cleanedSelected.length!==(user.partners||[]).length){
    user.partners=cleanedSelected;saveUsers(users);
    if(k===CURRENT.username){CURRENT.partners=cleanedSelected;ST.set('currentUser',CURRENT)}
  }
  const popup=document.getElementById('multiSelectPopup');
  let temp=[...cleanedSelected];
  popup.innerHTML=`<div class="px-2 py-1 mb-2 border-b border-gray-200"><span class="text-xs font-bold">${escapeHtml(user.name)}의 거래처 매핑</span></div>
    <div class="space-y-0.5 max-h-60 overflow-y-auto" id="mpListInner">${partners.map((p,i)=>`<label class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover-bg text-sm"><input type="checkbox" data-partner-idx="${i}" ${cleanedSelected.includes(p)?'checked':''} class="mpChk w-4 h-4 accent-black" /><span>${escapeHtml(p)}</span></label>`).join('')||'<p class="text-center text-gray-400 py-3 text-xs">거래처 없음 (관리자에서 추가)</p>'}</div>
    <div class="mt-2 pt-2 border-t border-gray-200"><button id="mpApplyBtn" class="w-full px-3 py-1.5 bg-black text-white text-xs rounded">적용</button></div>`;
  // ★ 이벤트 위임으로 동기화 (인라인 onchange 대신)
  popup.querySelectorAll('.mpChk').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const idx=parseInt(cb.dataset.partnerIdx);
      const p=partners[idx];
      if(cb.checked){if(!temp.includes(p))temp.push(p)}
      else{temp=temp.filter(x=>x!==p)}
    });
  });
  document.getElementById('mpApplyBtn').addEventListener('click',()=>{
    // ★ 저장 시점에 최신 users 다시 로드 후 업데이트
    const u=getUsers();
    if(!u[k]){alert('멤버가 존재하지 않습니다');popup.classList.add('hidden');return}
    u[k].partners=[...temp];saveUsers(u);
    if(k===CURRENT.username){CURRENT.partners=[...temp];ST.set('currentUser',CURRENT);refreshUserUI();renderPartnerFilter()}
    popup.classList.add('hidden');
    renderMembers();
    showToast('🤝','매핑 저장',`${user.name}: ${temp.length}개 거래처`);
  });
  const rect=e.currentTarget.getBoundingClientRect();
  popup.style.left=Math.min(rect.left,window.innerWidth-280)+'px';
  popup.style.top=(rect.bottom+window.scrollY+4)+'px';
  popup.classList.remove('hidden');
}

// ========== 거래처 관리 ==========
function getPartners(){return ST.get('partnersList',[
  {name:'(주)뷰티코리아',manager:'관리자',phone:'02-1234-5678',note:'주요 거래처'},
  {name:'라이프스타일컴퍼니',manager:'이마케팅',phone:'02-9876-5432',note:'B2B'},
  {name:'(주)코스메틱하우스',manager:'최영업',phone:'02-1111-2222',note:''}
])}
function savePartners(p){ST.set('partnersList',p)}
function renderPartnerMgmt(){
  const list=document.getElementById('partnerMgmtList');if(!list)return;
  const partners=getPartners();
  if(partners.length===0){list.innerHTML='<tr><td colspan="6" class="text-center text-gray-400 py-4">거래처 없음</td></tr>';return}
  list.innerHTML=partners.map((p,i)=>`<tr><td class="sheet-row-num">${i+1}</td><td contenteditable class="editable" oninput="updPartner(${i},'name',this.textContent)">${p.name}</td><td contenteditable class="editable" oninput="updPartner(${i},'manager',this.textContent)">${p.manager}</td><td contenteditable class="editable" oninput="updPartner(${i},'phone',this.textContent)">${p.phone}</td><td contenteditable class="editable" oninput="updPartner(${i},'note',this.textContent)">${p.note}</td><td><button onclick="delPartner(${i})" class="text-xs text-red-500">삭제</button></td></tr>`).join('');
}
function addPartner(){
  const name=prompt('거래처명:');if(!name)return;
  const ps=getPartners();ps.push({name,manager:'',phone:'',note:''});savePartners(ps);renderPartnerMgmt();showToast('🤝','거래처 추가',name);
}
function delPartner(i){
  const ps=getPartners();const name=ps[i].name;
  if(!confirm(name+' 삭제?'))return;
  ps.splice(i,1);savePartners(ps);
  // ★ 1) 모든 멤버의 partners에서 제거
  const users=getUsers();
  Object.keys(users).forEach(k=>{
    if(users[k].partners){users[k].partners=users[k].partners.filter(p=>p!==name)}
  });
  saveUsers(users);
  // ★ 2) 거래처 데이터 테이블(order/sales/inventory/settle)의 해당 partner 행도 모두 제거
  ['order','sales','inventory','settle'].forEach(t=>{
    const data=getPartnerData(t);
    const cleaned=data.filter(r=>r.partner!==name);
    savePartnerData(t,cleaned);
  });
  // ★ 3) CURRENT를 users 저장소와 완전히 재동기화
  if(CURRENT){
    const fresh=getUsers()[CURRENT.username];
    if(fresh){CURRENT.partners=fresh.partners||[];ST.set('currentUser',CURRENT);refreshUserUI()}
  }
  // ★ 4) 현재 필터가 삭제된 거래처면 'all'로 리셋
  if(currentPartnerFilter===name)currentPartnerFilter='all';
  // ★ 5) 모든 관련 UI 갱신
  renderPartnerMgmt();renderMembers();renderPartnerFilter();initPartnerTables();
  showToast('🗑️','거래처 삭제',name+' (멤버/데이터 모두 정리)');
}
function updPartner(i,k,v){const ps=getPartners();ps[i][k]=v;savePartners(ps)}

// ========== 거래처 페이지 테이블 ==========
const PARTNER_SAMPLE={
  // 발주 컬럼 (v2): col1=발주일 / col2=제품 / col3=수량 / col4=단가 / col5=금액 / col6=상태 / col7=택배사 / col8=송장번호
  order:[
    {partner:'(주)뷰티코리아',col1:'2026-05-01',col2:'스킨케어 세트',col3:'200',col4:'18000',col5:'3,600,000',col6:'완료',col7:'CJ대한통운',col8:'1234567890'},
    {partner:'(주)뷰티코리아',col1:'2026-05-03',col2:'선크림 SPF50+',col3:'500',col4:'8000',col5:'4,000,000',col6:'진행중',col7:'',col8:''},
    {partner:'라이프스타일컴퍼니',col1:'2026-05-05',col2:'보습 크림',col3:'150',col4:'12000',col5:'1,800,000',col6:'완료',col7:'한진택배',col8:'5566778899'},
    {partner:'(주)코스메틱하우스',col1:'2026-05-08',col2:'클렌징 폼',col3:'300',col4:'5000',col5:'1,500,000',col6:'대기',col7:'',col8:''}
  ],
  sales:[
    {partner:'(주)뷰티코리아',col1:'2026-05-12',col2:'스킨케어 세트',col3:'네이버',col4:'87',col5:'3,915,000',col6:'3,523,500'},
    {partner:'(주)뷰티코리아',col1:'2026-05-12',col2:'선크림 SPF50+',col3:'쿠팡',col4:'132',col5:'1,980,000',col6:'1,782,000'},
    {partner:'라이프스타일컴퍼니',col1:'2026-05-13',col2:'보습 크림',col3:'11번가',col4:'54',col5:'1,620,000',col6:'1,458,000'}
  ],
  inventory:[
    {partner:'(주)뷰티코리아',col1:'SK-001',col2:'스킨케어 세트',col3:'500',col4:'266',col5:'234',col6:'정상'},
    {partner:'(주)뷰티코리아',col1:'SK-003',col2:'선크림 SPF50+',col3:'500',col4:'500',col5:'0',col6:'품절'},
    {partner:'라이프스타일컴퍼니',col1:'SK-002',col2:'보습 크림',col3:'300',col4:'282',col5:'18',col6:'부족'}
  ],
  settle:[
    {partner:'(주)뷰티코리아',col1:'2026-04',col2:'네이버',col3:'12,540,000',col4:'5,400,000',col5:'5,886,000',col6:'완료'},
    {partner:'라이프스타일컴퍼니',col1:'2026-04',col2:'11번가',col3:'1,620,000',col4:'700,000',col5:'750,000',col6:'완료'}
  ]
};
function getPartnerData(t){
  // 발주는 컬럼 구조 변경(브랜드 제거 + 택배사/송장 추가) 으로 v2 키 사용
  const key=t==='order'?'partner_order_v2':'partner_'+t;
  return ST.get(key,PARTNER_SAMPLE[t]||[]);
}
function savePartnerData(t,d){
  const key=t==='order'?'partner_order_v2':'partner_'+t;
  ST.set(key,d);
}
let currentPartnerFilter='all';
function renderPartnerFilter(){
  const sel=document.getElementById('partnerFilter');if(!sel)return;
  const partners=CURRENT?.partners||[];
  sel.innerHTML='<option value="all">전체 거래처</option>'+partners.map(p=>`<option ${currentPartnerFilter===p?'selected':''}>${escapeHtml(p)}</option>`).join('');
  if(!partners.includes(currentPartnerFilter)&&currentPartnerFilter!=='all')currentPartnerFilter='all';
  const info=document.getElementById('partnerFilterInfo');
  if(info){info.textContent=currentPartnerFilter==='all'?(`전체 ${partners.length}개 거래처 통합 보기`):(`'${currentPartnerFilter}' 단독 보기`)}
}
function changePartnerFilter(v){currentPartnerFilter=v;document.getElementById('partnerFilterInfo')&&(document.getElementById('partnerFilterInfo').textContent=v==='all'?'전체 통합 보기':`'${v}' 단독 보기`);initPartnerTables();showToast('🔍','필터 변경',v==='all'?'전체':v)}
function initPartnerTables(){['order','sales','inventory','settle'].forEach(renderPartnerTable)}
function renderPartnerTable(t){
  const tb=document.querySelector(`#partner-${t}-table tbody`);if(!tb)return;
  const allData=getPartnerData(t);
  // ★ 사용자 거래처 + 필터 적용 (이중 필터링)
  const userPartners=CURRENT?.partners||[];
  // 1) 사용자에게 매핑된 거래처만 일단 표시
  let scoped=allData.filter(r=>!r.partner||userPartners.includes(r.partner));
  // 2) 개별 필터가 'all'이 아니면 정확히 매칭
  let data=scoped;
  if(currentPartnerFilter&&currentPartnerFilter!=='all'){
    data=scoped.filter(r=>r.partner===currentPartnerFilter);
  }
  const cc=document.querySelectorAll(`#partner-${t}-table thead th`).length-1;
  if(data.length===0){tb.innerHTML=`<tr><td colspan="${cc+1}" class="text-center text-gray-400 py-6 text-sm">${currentPartnerFilter==='all'?'데이터 없음':`'${currentPartnerFilter}' 거래처의 데이터가 없습니다`}</td></tr>`;return}
  // 원본 인덱스를 유지하기 위해 origIdx 사용
  const courierOpts=t==='order'?getCourierList().map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(''):'';
  tb.innerHTML=data.map(r=>{
    const origIdx=allData.indexOf(r);
    const linked=t==='order'&&r.sourceOrderIds&&r.sourceOrderIds.length>0;
    let c=`<td class="sheet-row-num"><input type="checkbox" class="row-check" data-type="${t}" data-idx="${origIdx}" />${linked?'<div class="text-[9px] text-purple-600 mt-0.5" title="이커머스 '+r.sourceOrderIds.length+'건과 연동">🔁</div>':''}</td>`;
    for(let j=1;j<=cc;j++){
      const val=r['col'+j]||'';
      // 발주의 col7=택배사 → select (이커머스 주문/출고와 동일)
      if(t==='order'&&j===7){
        const courierList=getCourierList();
        const inList=val&&courierList.includes(val);
        const customOpt=val&&!inList?`<option value="${escapeHtml(val)}" selected>${escapeHtml(val)} (미등록)</option>`:'';
        const opts=courierOpts.replace(`value="${escapeHtml(val)}"`,`value="${escapeHtml(val)}" selected`);
        c+=`<td><select onchange="updPartnerCell('${t}',${origIdx},${j},this.value)" class="text-xs border rounded px-1 py-0.5 bg-white"><option value="">선택</option>${customOpt}${opts}</select></td>`;
      }else{
        c+=`<td contenteditable="true" oninput="updPartnerCell('${t}',${origIdx},${j},this.textContent)">${val}</td>`;
      }
    }
    return `<tr data-partner="${escapeHtml(r.partner||'')}" ${linked?'class="bg-purple-50"':''}>${c}</tr>`;
  }).join('');
}
function addPartnerRow(t){
  const d=getPartnerData(t);const r={};
  const cc=document.querySelectorAll(`#partner-${t}-table thead th`).length-1;
  for(let j=1;j<=cc;j++)r['col'+j]='';
  // 발주(order): 첫 컬럼(발주일)에 오늘 날짜 YY-MM-DD 자동 입력
  if(t==='order'){
    const now=new Date();
    const yy=String(now.getFullYear()).slice(-2);
    const mm=String(now.getMonth()+1).padStart(2,'0');
    const dd=String(now.getDate()).padStart(2,'0');
    r.col1=`${yy}-${mm}-${dd}`;
  }
  // ★ 현재 필터의 partner를 자동 태깅
  if(currentPartnerFilter&&currentPartnerFilter!=='all')r.partner=currentPartnerFilter;
  else if(CURRENT?.partners?.[0])r.partner=CURRENT.partners[0];
  d.push(r);savePartnerData(t,d);renderPartnerTable(t);
  showToast('+','행 추가',r.partner||'(필터: 전체)');
}
function deletePartnerSelected(t){const cs=document.querySelectorAll(`.row-check[data-type="${t}"]:checked`);if(cs.length===0){alert('선택하세요');return}if(!confirm(cs.length+'개 삭제?'))return;const d=getPartnerData(t);Array.from(cs).map(c=>parseInt(c.dataset.idx)).sort((a,b)=>b-a).forEach(i=>d.splice(i,1));savePartnerData(t,d);renderPartnerTable(t);showToast('🗑️','삭제됨','')}
function toggleAllRows(t,c){document.querySelectorAll(`.row-check[data-type="${t}"]`).forEach(x=>x.checked=c)}
function updPartnerCell(t,i,c,v){
  const d=getPartnerData(t);if(!d[i])return;
  d[i]['col'+c]=v;savePartnerData(t,d);
  // 발주(order) 의 col7=택배사 / col8=송장번호 변경 시 이커머스 주문에도 양방향 반영
  if(t==='order'&&(c===7||c===8)){
    const row=d[i];
    const orderIds=row.sourceOrderIds||[];
    if(orderIds.length>0){
      const ecOrders=getEcOrders();let touched=0;
      orderIds.forEach(oid=>{
        const o=ecOrders.find(x=>x.id===oid);if(!o)return;
        if(c===7)o.courier=v;
        if(c===8)o.tracking=v;
        touched++;
      });
      if(touched>0){
        saveEcOrders(ecOrders);
        showToast('🔁','이커머스 동기화',`${touched}건 ${c===7?'택배사':'송장번호'} 반영`);
        if(document.getElementById('ecOrdersBody'))renderEcOrders();
      }
    }
  }
}

// ========== 메신저 ==========
const CHANNEL=new BroadcastChannel('intro-messenger');
function getRooms(){return ST.get('rooms',[
  {id:'전체 공지방',name:'전체 공지방',pinned:true,muted:false,members:['intro','kim','lee','park']},
  {id:'마케팅팀',name:'마케팅팀',pinned:false,muted:false,members:['intro','lee']},
  {id:'디자인팀',name:'디자인팀',pinned:false,muted:false,members:['intro','kim']},
  {id:'개발팀',name:'개발팀',pinned:false,muted:true,members:['intro','park']}
])}
function saveRooms(r){ST.set('rooms',r)}
function getMsgFolders(){return ST.get('msgFolders',[])}
function saveMsgFolders(f){ST.set('msgFolders',f)}
function addMsgFolder(){
  const name=prompt('폴더명:');if(!name)return;
  const fs=getMsgFolders();fs.push({id:'f'+Date.now(),name,expanded:true});saveMsgFolders(fs);renderRoomList();
  showToast('📁','폴더 생성',name);
}
function toggleMsgFolder(id){const fs=getMsgFolders();const f=fs.find(x=>x.id===id);if(f){f.expanded=!f.expanded;saveMsgFolders(fs);renderRoomList()}}
function delMsgFolder(id){
  if(!confirm('폴더 삭제? (내부 채팅방은 폴더 밖으로 이동됩니다)'))return;
  saveMsgFolders(getMsgFolders().filter(f=>f.id!==id));
  const rs=getRooms();rs.forEach(r=>{if(r.folderId===id)delete r.folderId});saveRooms(rs);
  renderRoomList();showToast('🗑️','폴더 삭제','');
}
function renameMsgFolder(id){
  const fs=getMsgFolders();const f=fs.find(x=>x.id===id);if(!f)return;
  const name=prompt('새 이름:',f.name);if(!name)return;
  f.name=name;saveMsgFolders(fs);renderRoomList();
}
function moveRoomToFolder(roomId,folderId){
  const rs=getRooms();const r=rs.find(x=>x.id===roomId);if(!r)return;
  if(folderId)r.folderId=folderId;else delete r.folderId;
  saveRooms(rs);renderRoomList();
  showToast('📁','이동 완료','');
}
let currentRoom='전체 공지방';
function getMessages(room){
  return ST.get('msgs_'+room,room==='전체 공지방'?[
    {id:1,from:'kim',name:'김디자인',content:'안녕하세요! 새 시안 공유 🎨',time:'09:32',type:'text'},
    {id:2,from:'intro',name:'관리자',content:'👍',time:'09:34',type:'text'}
  ]:[]);
}
function saveMessages(room,msgs){ST.set('msgs_'+room,msgs)}
function getUnread(room){return ST.get('unread_'+room,0)}
function setUnread(room,n){ST.set('unread_'+room,n)}

function renderRoomList(){
  const list=document.getElementById('roomListContainer');if(!list)return;
  const rooms=getRooms();
  const folders=getMsgFolders();
  const pinned=rooms.filter(r=>r.pinned&&!r.folderId);
  let html='';
  if(pinned.length){
    html+='<div class="px-2 py-1 text-xs text-gray-400 font-semibold uppercase">📌 고정</div>';
    html+=pinned.map(r=>roomItemHtml(r)).join('');
  }
  // 폴더 추가 버튼
  html+='<div class="flex items-center justify-between px-2 py-1 mt-2"><span class="text-xs text-gray-400 font-semibold uppercase">폴더</span><button onclick="addMsgFolder()" class="text-xs text-gray-400 hover:text-black px-1.5 hover-bg rounded">+ 폴더</button></div>';
  // 폴더들 - 폴더 전체 영역(헤더 + 안쪽)을 드롭존으로
  folders.forEach(f=>{
    html+=`<div class="folder-block" data-folder-id="${f.id}" ondragenter="roomDragOver(event)" ondragover="roomDragOver(event)" ondrop="folderDrop(event,'${f.id}')" style="min-height:32px;border-radius:6px">
      <div class="flex items-center gap-1 px-2 py-1.5 hover-bg rounded cursor-pointer text-sm" onclick="toggleMsgFolder('${f.id}')" oncontextmenu="event.preventDefault();showFolderContext(event,'${f.id}')">
        <span class="text-amber-500">${f.expanded?'📂':'📁'}</span>
        <span class="flex-1 truncate font-medium">${escapeHtml(f.name)}</span>
        <span class="text-xs text-gray-400">${f.expanded?'▾':'▸'}</span>
      </div>`;
    if(f.expanded){
      const inFolder=rooms.filter(r=>r.folderId===f.id);
      if(inFolder.length===0){
        html+='<p class="ml-7 text-xs text-gray-400 py-2 border-2 border-dashed border-gray-200 rounded mr-2">여기로 채팅방을 드래그</p>';
      }else{
        html+='<div class="ml-3 pl-2 border-l border-gray-200" ondragover="roomDragOver(event)" ondrop="folderDrop(event,\''+f.id.replace(/'/g,"\\'")+'\')">'+inFolder.map(r=>roomItemHtml(r)).join('')+'</div>';
      }
    }
    html+='</div>';
  });
  // ★ 폴더 외부(일반) 영역도 확장 - 헤더 포함 전체 드롭존
  html+='<div data-general="msg" ondragenter="roomDragOver(event)" ondragover="roomDragOver(event)" ondrop="folderDrop(event,null)" style="min-height:80px;padding:4px;border-radius:6px">';
  html+='<div class="px-2 py-1 text-xs text-gray-400 font-semibold uppercase">채팅방 (일반)</div>';
  const normal=rooms.filter(r=>!r.pinned&&!r.folderId);
  html+=(normal.map(r=>roomItemHtml(r)).join('')||'<p class="text-center text-xs text-gray-400 p-4 border-2 border-dashed border-gray-200 rounded">여기로 드래그하면 폴더 밖으로 이동</p>');
  html+='</div>';
  list.innerHTML=html;
}
function roomItemHtml(r){
  const msgs=getMessages(r.id);
  const last=msgs[msgs.length-1];
  const lastText=last?(last.name+': '+(last.content||'[파일]')).substring(0,30):'(메시지 없음)';
  const unread=getUnread(r.id);
  const muted=r.muted?' opacity-60':'';
  const sel=r.id===currentRoom?'bg-gray-100':'';
  const safeId=r.id.replace(/'/g,"\\'");
  return `<div class="drag-row relative px-3 py-2.5 cursor-pointer hover-bg ${sel}${muted}" draggable="true" data-room="${r.id}" ondragstart="roomDragStart(event,'${safeId}')" ondragover="roomDragOver(event)" ondrop="roomDrop(event,'${safeId}')" onclick="selectRoom('${safeId}')" oncontextmenu="event.preventDefault();showRoomContext(event,'${safeId}')">
    ${r.pinned?'<span class="pin-indicator"></span>':''}
    <div class="flex items-center gap-2">
      <span class="drag-handle text-gray-400 text-xs">⋮⋮</span>
      <div class="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">${r.name[0]}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold truncate flex items-center gap-1">${r.name}${r.muted?' <span class="text-xs">🔕</span>':''}</p>
        <p class="text-xs text-gray-500 truncate">${escapeHtml(lastText)}</p>
      </div>
      <div class="flex flex-col items-end gap-0.5">
        ${last?`<span class="text-[10px] text-gray-400">${last.time}</span>`:''}
        ${unread>0?`<span class="unread-dot">${unread}</span>`:''}
      </div>
    </div>
  </div>`;
}
// ★ 채팅방 드래그&드랍 핸들러
let dragRoomId=null;
function roomDragStart(e,id){dragRoomId=id;e.dataTransfer.effectAllowed='move';e.stopPropagation()}
function roomDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move'}
function roomDrop(e,targetId){
  e.preventDefault();e.stopPropagation();
  if(!dragRoomId||dragRoomId===targetId){dragRoomId=null;return}
  const rooms=getRooms();
  const moved=rooms.find(r=>r.id===dragRoomId);
  const target=rooms.find(r=>r.id===targetId);
  if(!moved||!target){dragRoomId=null;return}
  // 1) target의 folderId와 맞춤 (폴더 안→폴더 안 또는 일반→일반)
  if(target.folderId)moved.folderId=target.folderId;
  else delete moved.folderId;
  // 2) moved를 제거하고 target 바로 앞에 다시 삽입
  const fi=rooms.indexOf(moved);rooms.splice(fi,1);
  const newTi=rooms.indexOf(target);
  rooms.splice(newTi,0,moved);
  saveRooms(rooms);renderRoomList();
  dragRoomId=null;
  showToast('↕️','이동 완료',moved.folderId?'폴더 안':'일반');
}
function folderDrop(e,folderId){
  e.preventDefault();e.stopPropagation();
  if(!dragRoomId){return}
  const rooms=getRooms();
  const r=rooms.find(x=>x.id===dragRoomId);
  if(r){
    if(folderId)r.folderId=folderId;
    else delete r.folderId;
    saveRooms(rooms);renderRoomList();
    showToast('📁',folderId?'폴더로 이동':'폴더에서 빼냄','');
  }
  dragRoomId=null;
}
// 폴더 우클릭
function showFolderContext(e,fid){
  const f=getMsgFolders().find(x=>x.id===fid);if(!f)return;
  const m=document.getElementById('roomContextMenu');
  const items=[
    {icon:'✏️',label:'폴더 이름 변경',fn:()=>renameMsgFolder(fid)},
    {icon:f.expanded?'▸':'▾',label:f.expanded?'접기':'펼치기',fn:()=>toggleMsgFolder(fid)},
    {divider:true},
    {icon:'🗑️',label:'폴더 삭제',danger:true,fn:()=>delMsgFolder(fid)}
  ];
  m.innerHTML=items.map((it,i)=>it.divider?'<div class="context-menu-divider"></div>':`<div class="context-menu-item ${it.danger?'text-red-500':''}" onclick="window.__fctx[${i}]()"><span>${it.icon}</span>${it.label}</div>`).join('');
  window.__fctx=items.map(it=>it.divider?null:()=>{it.fn();m.classList.add('hidden')});
  m.style.left=Math.min(e.clientX,window.innerWidth-220)+'px';
  m.style.top=Math.min(e.clientY,window.innerHeight-300)+'px';
  m.classList.remove('hidden');
}
function selectRoom(room){
  currentRoom=room;
  document.getElementById('chatTitle').textContent=room;
  setUnread(room,0);
  renderRoomList();loadMessages();updateMessengerNavBadge();
  if(isMobileView())document.getElementById('page-messenger')?.classList.add('mobile-show-chat');
}
function messengerBackToList(){document.getElementById('page-messenger')?.classList.remove('mobile-show-chat')}
function chatgptBackToList(){document.getElementById('page-chatgpt')?.classList.remove('mobile-show-chat')}
function loadMessages(){renderMessages(getMessages(currentRoom))}
function renderMessages(msgs){
  const list=document.getElementById('messageList');if(!list)return;
  list.innerHTML=`<div class="flex items-center gap-3 my-2"><div class="flex-1 h-px bg-gray-200"></div><span class="text-xs text-gray-400">2026년 5월 14일</span><div class="flex-1 h-px bg-gray-200"></div></div>`+msgs.map(renderMessage).join('');
  setTimeout(()=>{list.scrollTop=list.scrollHeight},10);
}
function renderMessage(m){
  const mine=m.from===CURRENT.username;
  let content='';
  if(m.type==='image'||m.type==='gif'){
    content=`<img src="${m.dataUrl}" class="max-w-xs rounded-xl cursor-pointer" />`;
  }else if(m.type==='video'){
    content=`<video src="${m.dataUrl}" controls class="max-w-xs rounded-xl"></video>`;
  }else if(m.type==='file'){
    content=`<a href="${m.dataUrl}" download="${m.fileName}" class="flex items-center gap-2 px-3 py-2 ${mine?'bg-black text-white':'bg-white border border-gray-200'} rounded-2xl text-sm"><span class="text-xl">📄</span><div><p class="font-medium text-xs">${m.fileName}</p><p class="text-[10px] opacity-60">${m.fileSize||''}</p></div></a>`;
  }else if(m.recalled){
    content=`<div class="bg-gray-200 text-gray-500 italic rounded-2xl px-3 py-2 text-sm inline-block">🗑️ 회수됨</div>`;
  }else{
    let txt=escapeHtml(m.content||'').replace(/@(\S+)/g,'<span class="text-amber-300 font-semibold">@$1</span>');
    content=`<div class="${mine?'bg-black text-white':'bg-white border border-gray-200 shadow-sm'} rounded-2xl ${mine?'rounded-tr-sm':'rounded-tl-sm'} px-3 py-2 text-sm inline-block">${txt}${m.edited?'<span class="text-[10px] opacity-60 ml-1">(수정됨)</span>':''}</div>`;
  }
  const avatar=mine?'':(m.from==='ai'?`<div class="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center mt-1 shrink-0">🤖</div>`:`<div class="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold mt-1 shrink-0">${(m.name||'?')[0]}</div>`);
  const nameTag=mine?'':`<p class="text-xs text-gray-500 mb-1 ml-1">${m.name}</p>`;
  return `<div class="flex gap-2 ${mine?'flex-row-reverse':''}" data-msgid="${m.id}" oncontextmenu="event.preventDefault();showMessageContext(event,${m.id},${mine})">${avatar}<div class="max-w-[60%] ${mine?'flex flex-col items-end':''}">${nameTag}<div class="flex items-end gap-1 ${mine?'flex-row-reverse':''}">${content}<span class="text-[10px] text-gray-400 shrink-0">${m.time}</span></div></div></div>`;
}

function sendMsg(){
  const ta=document.getElementById('msgInput');
  const text=ta.value.trim();if(!text)return;
  const mentions=[];
  text.replace(/@(\S+)/g,(m,name)=>{
    if(name==='AI'||name==='ai'){mentions.push('ai');return m}
    for(const [k,v] of Object.entries(getUsers())){if(v.name===name)mentions.push(k)}
    return m;
  });
  const msg={id:Date.now(),from:CURRENT.username,name:CURRENT.name,content:text,time:new Date().toTimeString().substring(0,5),type:'text',mentions};
  const msgs=getMessages(currentRoom);msgs.push(msg);saveMessages(currentRoom,msgs);renderMessages(msgs);
  CHANNEL.postMessage({type:'msg',room:currentRoom,message:msg});
  ta.value='';ta.style.height='auto';
  document.getElementById('emoticonSuggest').classList.add('hidden');
  document.getElementById('mentionDropdown').classList.add('hidden');
  // 멘션 처리
  mentions.forEach(u=>{
    if(u==='ai'){
      // @AI 응답
      setTimeout(()=>aiRespond(text),700);
    }else if(u!==CURRENT.username){
      addNotif({type:'mention',icon:'@',title:`${getUsers()[u].name}님이 멘션됨`,content:CURRENT.name+': '+text.substring(0,30),target:'messenger'});
      showToast('@',`${getUsers()[u].name}님 호출`,'팝업 알림 발송');
    }
  });
}
function aiRespond(question){
  const responses=[
    '좋은 질문이네요. 데이터를 확인해보니, 5월 매출은 전월 대비 +8.2% 증가했습니다.',
    '검토 결과, 다음과 같이 정리할 수 있습니다:\n1. 핵심 KPI 달성\n2. 마케팅 효율 개선\n3. 재고 회전율 양호',
    '관련 데이터를 분석한 결과, 선크림 카테고리가 +28.7%로 가장 높은 성장률을 보였습니다.',
    '말씀해주신 내용을 바탕으로 정리하자면, 다음 회의에서 논의할 안건은 3가지입니다.',
    '도움이 필요하신 부분을 더 구체적으로 알려주시면 더 자세히 답변드릴 수 있어요.'
  ];
  const msg={id:Date.now(),from:'ai',name:'AI Assistant',content:responses[Math.floor(Math.random()*responses.length)],time:new Date().toTimeString().substring(0,5),type:'text'};
  const msgs=getMessages(currentRoom);msgs.push(msg);saveMessages(currentRoom,msgs);renderMessages(msgs);
  CHANNEL.postMessage({type:'msg',room:currentRoom,message:msg});
}
CHANNEL.addEventListener('message',(e)=>{
  if(e.data.type==='msg'){
    const room=e.data.room;
    const msgs=getMessages(room);
    if(msgs.find(m=>m.id===e.data.message.id))return;
    msgs.push(e.data.message);saveMessages(room,msgs);
    if(room===currentRoom){
      renderMessages(msgs);
    }else if(e.data.message.from!==CURRENT.username){
      setUnread(room,getUnread(room)+1);
    }
    renderRoomList();updateMessengerNavBadge();
  }
  if(e.data.type==='reload'&&e.data.room===currentRoom)loadMessages();
});
function updateMessengerNavBadge(){
  const badge=document.getElementById('messengerNavBadge');
  const total=getRooms().reduce((s,r)=>s+(getUnread(r.id)||0),0);
  if(badge){
    if(total>0){badge.textContent=total>99?'99+':total;badge.style.display='inline-flex'}
    else{badge.style.display='none'}
  }
  const mb=document.getElementById('mobileTabMsgBadge');
  if(mb){
    if(total>0){mb.textContent=total>99?'99+':total;mb.style.display='flex'}
    else{mb.style.display='none'}
  }
}

// 채팅방 우클릭
function showRoomContext(e,roomId){
  const room=getRooms().find(r=>r.id===roomId);
  const m=document.getElementById('roomContextMenu');
  const folders=getMsgFolders();
  const items=[
    {icon:room.pinned?'📍':'📌',label:room.pinned?'고정 해제':'상단 고정',fn:()=>{const rs=getRooms();const r=rs.find(x=>x.id===roomId);r.pinned=!r.pinned;saveRooms(rs);renderRoomList();showToast(r.pinned?'📌':'📍',r.pinned?'고정됨':'고정 해제','')}},
    {icon:room.muted?'🔔':'🔕',label:room.muted?'알림 켜기':'알림 끄기',fn:()=>{const rs=getRooms();const r=rs.find(x=>x.id===roomId);r.muted=!r.muted;saveRooms(rs);renderRoomList();showToast(r.muted?'🔕':'🔔','알림 '+(r.muted?'끔':'켬'),'')}},
    {icon:'⬆️',label:'위로 이동',fn:()=>moveRoom(roomId,-1)},
    {icon:'⬇️',label:'아래로 이동',fn:()=>moveRoom(roomId,1)},
    {divider:true},
    ...(folders.length>0?[{icon:'📁',label:'폴더로 이동',fn:()=>{
      const id=prompt('폴더 선택:\n'+folders.map((f,i)=>`${i+1}. ${f.name}`).join('\n')+'\n0. 폴더 밖으로\n번호:','1');
      if(id===null)return;
      const n=parseInt(id);
      if(n===0)moveRoomToFolder(roomId,null);
      else if(folders[n-1])moveRoomToFolder(roomId,folders[n-1].id);
    }}]:[]),
    {icon:'✓',label:'안 읽음 0으로',fn:()=>{setUnread(roomId,0);renderRoomList();showToast('✓','읽음 처리','')}},
    {icon:'🚪',label:'채팅방 나가기',danger:true,fn:()=>{if(confirm('나가기?')){const rs=getRooms().filter(r=>r.id!==roomId);saveRooms(rs);if(currentRoom===roomId)currentRoom=rs[0]?.id||'전체 공지방';renderRoomList();loadMessages();showToast('🚪','나감','')}}}
  ];
  m.innerHTML=items.map((it,i)=>it.divider?'<div class="context-menu-divider"></div>':`<div class="context-menu-item ${it.danger?'text-red-500':''}" onclick="window.__rctx[${i}]()"><span>${it.icon}</span>${it.label}</div>`).join('');
  window.__rctx=items.map(it=>it.divider?null:()=>{it.fn();m.classList.add('hidden')});
  m.style.left=Math.min(e.clientX,window.innerWidth-220)+'px';
  m.style.top=Math.min(e.clientY,window.innerHeight-320)+'px';
  m.classList.remove('hidden');
}
function moveRoom(roomId,dir){
  const rs=getRooms();
  const i=rs.findIndex(r=>r.id===roomId);
  const target=i+dir;
  if(target<0||target>=rs.length)return;
  [rs[i],rs[target]]=[rs[target],rs[i]];
  saveRooms(rs);renderRoomList();
}

// 메시지 우클릭
function showMessageContext(e,msgId,isMine){
  const m=document.getElementById('messageContextMenu');
  const items=[
    {icon:'📋',label:'복사',fn:()=>{const msg=getMessages(currentRoom).find(x=>x.id===msgId);if(msg)navigator.clipboard.writeText(msg.content||'');showToast('📋','복사됨','')}},
    {icon:'↩️',label:'답장',fn:()=>showToast('↩️','답장 모드','')},
    {icon:'➡️',label:'전달',fn:()=>showToast('➡️','전달 선택','')},
    {icon:'📌',label:'공지로 설정',fn:()=>showToast('📌','공지 등록','')},
    {icon:'📝',label:'메모로 저장',fn:()=>showToast('📝','메모 저장','')},
    {icon:'🔁',label:'반복 메시지로',fn:()=>openRepeatModal()}
  ];
  if(isMine){
    items.push({divider:true});
    items.push({icon:'✏️',label:'수정',fn:()=>{const msgs=getMessages(currentRoom);const msg=msgs.find(x=>x.id===msgId);const nc=prompt('수정:',msg.content);if(nc!==null){msg.content=nc;msg.edited=true;saveMessages(currentRoom,msgs);renderMessages(msgs);CHANNEL.postMessage({type:'reload',room:currentRoom})}}});
    items.push({icon:'🗑️',label:'회수',danger:true,fn:()=>{if(confirm('회수?')){const msgs=getMessages(currentRoom);const msg=msgs.find(x=>x.id===msgId);msg.recalled=true;saveMessages(currentRoom,msgs);renderMessages(msgs);CHANNEL.postMessage({type:'reload',room:currentRoom})}}});
  }
  m.innerHTML=items.map((it,i)=>it.divider?'<div class="context-menu-divider"></div>':`<div class="context-menu-item ${it.danger?'text-red-500':''}" onclick="window.__ctx[${i}]()"><span>${it.icon}</span>${it.label}</div>`).join('');
  window.__ctx=items.map(it=>it.divider?null:()=>{it.fn();m.classList.add('hidden')});
  m.style.left=Math.min(e.clientX,window.innerWidth-200)+'px';
  m.style.top=Math.min(e.clientY,window.innerHeight-320)+'px';
  m.classList.remove('hidden');
}

// 채팅 드래그 & 드롭
function onChatDragEnter(e){e.preventDefault();document.getElementById('chatDropOverlay').classList.remove('hidden')}
function onChatDragLeave(e){if(e.relatedTarget&&document.getElementById('chatArea').contains(e.relatedTarget))return;document.getElementById('chatDropOverlay').classList.add('hidden')}
function onChatDrop(e){e.preventDefault();document.getElementById('chatDropOverlay').classList.add('hidden');handleFiles(e.dataTransfer.files)}
function onMsgPaste(e){const items=Array.from(e.clipboardData.items);const files=items.filter(it=>it.kind==='file').map(it=>it.getAsFile()).filter(Boolean);if(files.length>0){e.preventDefault();handleFiles(files)}}
function handleFiles(files){Array.from(files).forEach(file=>{const reader=new FileReader();reader.onload=(e)=>{let type='file';if(file.type.startsWith('image/'))type=file.type==='image/gif'?'gif':'image';else if(file.type.startsWith('video/'))type='video';const msg={id:Date.now()+Math.random(),from:CURRENT.username,name:CURRENT.name,time:new Date().toTimeString().substring(0,5),type,fileName:file.name,fileSize:(file.size/1024).toFixed(1)+' KB',dataUrl:e.target.result};const msgs=getMessages(currentRoom);msgs.push(msg);saveMessages(currentRoom,msgs);renderMessages(msgs);CHANNEL.postMessage({type:'msg',room:currentRoom,message:msg});showToast('📎','파일 전송',file.name)};reader.readAsDataURL(file)})}

// 멘션 자동완성
function onMsgInput(ta){
  ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,120)+'px';
  const val=ta.value,pos=ta.selectionStart;
  const match=val.substring(0,pos).match(/@(\S*)$/);
  if(match){
    const all=[...Object.entries(getUsers()).map(([k,u])=>({k,name:u.name,dept:u.dept})),{k:'ai',name:'AI',dept:'AI Assistant'}];
    const filtered=all.filter(u=>u.name.toLowerCase().includes(match[1].toLowerCase()));
    const dd=document.getElementById('mentionDropdown');
    if(filtered.length){
      dd.innerHTML=filtered.map(u=>`<div class="mention-item" onclick="insertMention('${u.name}')"><div class="w-6 h-6 ${u.k==='ai'?'bg-black':'bg-gray-700'} text-white rounded-full flex items-center justify-center text-xs font-bold">${u.k==='ai'?'🤖':u.name[0]}</div><div><p class="font-medium text-xs">${u.name}</p><p class="text-[10px] text-gray-500">${u.dept}</p></div></div>`).join('');
      dd.style.left='12px';dd.style.bottom='100%';dd.style.marginBottom='4px';
      dd.classList.remove('hidden');
    }else dd.classList.add('hidden');
  }else document.getElementById('mentionDropdown').classList.add('hidden');
  suggestEmoticon(val);
}
function insertMention(name){
  const ta=document.getElementById('msgInput');
  const val=ta.value,pos=ta.selectionStart;
  const before=val.substring(0,pos).replace(/@\S*$/,'@'+name+' ');
  ta.value=before+val.substring(pos);ta.focus();ta.setSelectionRange(before.length,before.length);
  document.getElementById('mentionDropdown').classList.add('hidden');
}
function onMsgKeyDown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}}
function insertChar(c){const ta=document.getElementById('msgInput');ta.value+=c;ta.focus();onMsgInput(ta)}

// 이모티콘
const EMOTICONS={happy:['🥰','😄','😆','🤩','✨','🎉','🙌','💖','😊','🥳','🤗','🌟','💯','🎊'],work:['💪','🔥','⚡','🚀','📈','💼','🎯','✅','⏰','📌','💡','🛠️','📊'],food:['🍕','🍔','☕','🍣','🍜','🍰','🥗','🍺','🥤','🍦'],feeling:['😢','😭','😴','🥱','🤔','😅','🙏','😇','😎','🥺','😍'],intro:['(◍•ᴗ•◍)','( ´ ▽ ` )','＼(^o^)／','╰(*°▽°*)╯','ヾ(≧▽≦*)o','(っ˘ω˘ς)','(ﾉ´ヮ`)ﾉ*: ･ﾟ','✧(>o<)ﾉ✧']};
function suggestEmoticon(text){
  let cat='happy';
  if(/(좋|굿|화이팅|good|축하)/i.test(text))cat='happy';
  else if(/(일|업무|회의|마감)/i.test(text))cat='work';
  else if(/(점심|밥|커피|식사)/i.test(text))cat='food';
  else if(/(슬|울|피곤)/i.test(text))cat='feeling';
  if(text.length<2){document.getElementById('emoticonSuggest').classList.add('hidden');return}
  const list=[...EMOTICONS[cat],...EMOTICONS.intro.slice(0,4)];
  document.getElementById('emoticonList').innerHTML=list.slice(0,12).map(e=>`<span class="emoticon" onclick="insertEmoticon('${e.replace(/'/g,"\\'")}')">${e}</span>`).join('');
  document.getElementById('emoticonSuggest').classList.remove('hidden');
}
function insertEmoticon(e){const ta=document.getElementById('msgInput');ta.value+=' '+e;ta.focus();document.getElementById('emoticonSuggest').classList.add('hidden')}
function toggleEmoticon(){const s=document.getElementById('emoticonSuggest');if(s.classList.contains('hidden')){const all=[].concat(...Object.values(EMOTICONS));document.getElementById('emoticonList').innerHTML=all.sort(()=>Math.random()-0.5).slice(0,15).map(e=>`<span class="emoticon" onclick="insertEmoticon('${e.replace(/'/g,"\\'")}')">${e}</span>`).join('');s.classList.remove('hidden')}else s.classList.add('hidden')}
function openPopupMessenger(){const w=window.open('messenger-popup.html','introMessenger','width=500,height=700');if(!w){alert('팝업 차단을 해제하세요');return}w.focus();showToast('🪟','팝업 열림','메인 창과 동기화됨')}
function createRoom(){
  const name=document.getElementById('newRoomName').value.trim();if(!name){alert('이름 입력');return}
  const members=[CURRENT.username,...Array.from(document.querySelectorAll('.newRoomMember:checked')).map(c=>c.value)];
  const rs=getRooms();rs.push({id:name,name,pinned:false,muted:false,members});saveRooms(rs);
  document.getElementById('newRoomName').value='';
  closeModal('createRoomModal');renderRoomList();showToast('💬','채팅방 생성',name);
}

// ========== 알림 ==========
function getNotifs(){return ST.get('notifs',[
  {id:1,type:'mention',icon:'@',title:'이마케팅이 멘션',content:'@관리자 5월 캠페인 검토',time:'5분 전',read:false,target:'messenger'},
  {id:2,type:'schedule',icon:'📅',title:'회의 알림',content:'주간 회의 1시간 후',time:'방금',read:false,target:'meetings'}
])}
function saveNotifs(n){ST.set('notifs',n)}
function renderNotifications(){
  const ns=getNotifs();
  const unread=ns.filter(n=>!n.read).length;
  const badge=document.getElementById('notifBadge');
  badge.textContent=unread;
  badge.style.display=unread===0?'none':'';
  const mb=document.getElementById('mobileNotifBadge');
  if(mb){mb.textContent=unread;mb.style.display=unread===0?'none':'flex'}
  document.getElementById('notifList').innerHTML=ns.slice(0,8).map(n=>`<div onclick="onNotifClick(${n.id})" class="${n.read?'':'bg-blue-50'} cursor-pointer px-3 py-2.5 hover-bg border-b border-gray-100"><div class="flex items-start gap-2"><span class="text-base">${n.icon}</span><div class="flex-1 min-w-0"><p class="text-xs font-semibold">${n.title}</p><p class="text-xs text-gray-500 truncate">${escapeHtml(n.content)}</p><p class="text-[10px] text-gray-400 mt-0.5">${n.time}</p></div></div></div>`).join('')||'<p class="text-center text-xs text-gray-400 p-4">알림 없음</p>';
}
function toggleNotifDropdown(e){e?.stopPropagation();document.getElementById('notifDropdown').classList.toggle('hidden')}
function onNotifClick(id){const ns=getNotifs();const n=ns.find(x=>x.id===id);if(!n)return;n.read=true;saveNotifs(ns);renderNotifications();document.getElementById('notifDropdown').classList.add('hidden');navigateTo(n.target||'home')}
function markAllRead(){const ns=getNotifs();ns.forEach(n=>n.read=true);saveNotifs(ns);renderNotifications();showToast('✓','모두 읽음','')}
function addNotif(n){const ns=getNotifs();ns.unshift({id:Date.now(),read:false,time:'방금',...n});saveNotifs(ns);renderNotifications()}

// ========== ChatGPT ==========
function getAiChats(){return ST.get('aiChats',[
  {id:1,type:'project',name:'마케팅 분석',prompt:'당신은 마케팅 전문가입니다. 데이터 기반으로 답변하세요.',model:'gpt-4o-mini',chats:[
    {id:11,name:'2분기 매출 분석',prompt:'',model:'',messages:[{role:'user',content:'2분기 매출 인사이트'},{role:'assistant',content:'2분기 매출은 +12.3% 성장했습니다. 핵심 카테고리는 선크림(+28.7%)입니다.'}]}
  ]},
  {id:2,type:'chat',name:'신제품 이름 추천',prompt:'',model:'gpt-4o-mini',messages:[]}
])}
function saveAiChats(c){ST.set('aiChats',c)}
let currentAi=null;

function newAiChat(){
  const chats=getAiChats();
  const newChat={id:Date.now(),type:'chat',name:'새 채팅',prompt:'',model:ST.get('defaultAiModel','gpt-4o-mini'),messages:[]};
  chats.unshift(newChat);
  saveAiChats(chats);currentAi=newChat;
  renderAiList();renderAiChat();
  if(isMobileView())document.getElementById('page-chatgpt')?.classList.add('mobile-show-chat');
  showToast('+','새 채팅 시작','');
}
function newAiProject(){
  const name=prompt('프로젝트 이름:');if(!name)return;
  const chats=getAiChats();
  chats.unshift({id:Date.now(),type:'project',name,prompt:'',model:ST.get('defaultAiModel','gpt-4o-mini'),chats:[]});
  saveAiChats(chats);renderAiList();showToast('📁','프로젝트 생성',name);
}
function renderAiList(){
  const list=document.getElementById('aiList');if(!list)return;
  const chats=getAiChats();
  // 고정 정렬
  chats.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
  const projects=chats.filter(c=>c.type==='project');
  const standalone=chats.filter(c=>c.type==='chat');
  let html='';
  const pinned=standalone.filter(c=>c.pinned);
  if(pinned.length){
    html+='<div class="px-2 py-1 text-xs text-gray-400 font-semibold uppercase">📌 고정</div>';
    html+=pinned.map(c=>aiChatRow(c)).join('');
  }
  if(projects.length){
    html+='<div class="px-2 py-1 text-xs text-gray-400 font-semibold uppercase mt-2">📁 프로젝트</div>';
    html+=projects.map(p=>{
      const expanded=p.expanded!==false;
      const subChats=expanded?(p.chats||[]).map(c=>{
        const sel=currentAi&&currentAi.id===c.id?'bg-gray-100':'';
        return `<div draggable="true" ondragstart="aiDragStart(event,${c.id},${p.id})" ondragover="aiDragOver(event)" ondrop="aiDrop(event,${c.id},${p.id})" class="ml-6 px-2 py-1 hover-bg rounded cursor-pointer flex items-center gap-1 ${sel}" onclick="selectAi(${c.id},${p.id})" oncontextmenu="event.preventDefault();showAiContext(event,${c.id},${p.id})"><span class="drag-handle text-gray-400 text-[10px]">⋮⋮</span><span class="text-gray-400">💬</span><span class="text-xs truncate flex-1">${escapeHtml(c.name)}</span></div>`;
      }).join(''):'';
      const folderIcon=expanded?'📂':'📁';
      const emptyHint=expanded&&(p.chats||[]).length===0?'<p class="ml-6 text-xs text-gray-400 py-2 border-2 border-dashed border-gray-200 rounded mr-2">대화를 여기로 드래그</p>':'';
      // ★ 프로젝트 영역 전체를 드롭존으로 (헤더 + 빈 영역 + 자식들 어디든)
      return `<div class="mb-1" data-project-id="${p.id}" ondragenter="aiDragOver(event)" ondragover="aiDragOver(event)" ondrop="aiDropToProject(event,${p.id})" style="min-height:32px;border-radius:6px"><div draggable="true" ondragstart="aiDragStart(event,${p.id},null,true)" class="flex items-center gap-1 px-2 py-1.5 hover-bg rounded cursor-pointer" onclick="selectAi(${p.id})" oncontextmenu="event.preventDefault();showAiContext(event,${p.id},null,true)"><span class="drag-handle text-gray-400 text-[10px]">⋮⋮</span><span class="text-amber-500">${folderIcon}</span><span class="flex-1 text-sm font-medium truncate">${escapeHtml(p.name)}</span><span class="text-xs text-gray-400">${expanded?'▾':'▸'}</span></div>${subChats}${emptyHint}</div>`;
    }).join('');
  }
  // ★ 일반 대화 영역 - 헤더 + 빈 영역 + 자식들 모두 드롭존
  const normal=standalone.filter(c=>!c.pinned);
  html+=`<div data-general="ai" ondragenter="aiDragOver(event)" ondragover="aiDragOver(event)" ondrop="aiDropToGeneral(event)" style="min-height:80px;padding:4px;border-radius:6px;margin-top:8px">`+
    `<div class="px-2 py-1 text-xs text-gray-400 font-semibold uppercase">💬 대화 (일반)</div>`+
    (normal.map(c=>aiChatRow(c)).join('')||'<p class="text-center text-xs text-gray-400 p-4 border-2 border-dashed border-gray-200 rounded">여기로 드래그하면 프로젝트에서 빠집니다</p>')+
    `</div>`;
  list.innerHTML=html;
}
function aiChatRow(c){
  const sel=currentAi&&currentAi.id===c.id?'bg-gray-100':'';
  return `<div draggable="true" ondragstart="aiDragStart(event,${c.id})" ondragover="aiDragOver(event)" ondrop="aiDrop(event,${c.id})" class="flex items-center gap-2 px-2 py-1.5 hover-bg rounded cursor-pointer ${sel} relative" onclick="selectAi(${c.id})" oncontextmenu="event.preventDefault();showAiContext(event,${c.id})">${c.pinned?'<span class="pin-indicator"></span>':''}<span class="drag-handle text-gray-400 text-[10px]">⋮⋮</span><span class="text-gray-400 text-xs">💬</span><span class="flex-1 text-xs truncate">${escapeHtml(c.name)}</span></div>`;
}

// ★ AI 드래그&드랍
let aiDragId=null,aiDragParent=null,aiDragIsProject=false;
function aiDragStart(e,id,parentId,isProject){aiDragId=id;aiDragParent=parentId||null;aiDragIsProject=!!isProject;e.dataTransfer.effectAllowed='move';e.stopPropagation()}
function aiDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move'}
function aiDrop(e,targetId,targetParent){
  e.preventDefault();e.stopPropagation();
  if(aiDragIsProject||aiDragId===targetId){aiDragId=null;aiDragParent=null;aiDragIsProject=false;return}
  const chats=getAiChats();
  // ★ 1) 일반 → 일반 (순서 변경)
  if(!aiDragParent&&!targetParent){
    const fi=chats.findIndex(c=>c.id===aiDragId);
    const ti=chats.findIndex(c=>c.id===targetId);
    if(fi>=0&&ti>=0){const [m]=chats.splice(fi,1);chats.splice(ti,0,m);saveAiChats(chats);renderAiList();showToast('↕️','순서 변경','')}
  }
  // ★ 2) 프로젝트 안 → 일반 대화 자리 (프로젝트에서 빼기)
  else if(aiDragParent&&!targetParent){
    const src=chats.find(c=>c.id===aiDragParent);
    if(src&&src.chats){
      const idx=src.chats.findIndex(c=>c.id===aiDragId);
      if(idx>=0){
        const [moved]=src.chats.splice(idx,1);
        delete moved.parentId;
        const ti=chats.findIndex(c=>c.id===targetId);
        chats.splice(ti>=0?ti:chats.length,0,moved);
        saveAiChats(chats);renderAiList();
        showToast('📤','프로젝트에서 빼냄','일반 대화로 이동');
      }
    }
  }
  // ★ 3) 프로젝트 안 → 다른 프로젝트 안 (간접 이동)
  else if(aiDragParent&&targetParent&&aiDragParent!==targetParent){
    const src=chats.find(c=>c.id===aiDragParent);
    const dst=chats.find(c=>c.id===targetParent);
    if(src&&dst){
      const idx=src.chats.findIndex(c=>c.id===aiDragId);
      if(idx>=0){
        const [moved]=src.chats.splice(idx,1);
        moved.parentId=targetParent;
        dst.chats=dst.chats||[];
        const ti=dst.chats.findIndex(c=>c.id===targetId);
        dst.chats.splice(ti>=0?ti:dst.chats.length,0,moved);
        saveAiChats(chats);renderAiList();
        showToast('📁','프로젝트 이동',dst.name);
      }
    }
  }
  aiDragId=null;aiDragParent=null;aiDragIsProject=false;
}
// ★ 일반 대화 영역으로 드랍 (프로젝트에서 빼냄)
function aiDropToGeneral(e){
  e.preventDefault();e.stopPropagation();
  if(!aiDragId||aiDragIsProject){aiDragId=null;aiDragParent=null;return}
  if(!aiDragParent){aiDragId=null;return} // 이미 일반인 경우 무시
  const chats=getAiChats();
  const src=chats.find(c=>c.id===aiDragParent);
  if(src&&src.chats){
    const idx=src.chats.findIndex(c=>c.id===aiDragId);
    if(idx>=0){
      const [moved]=src.chats.splice(idx,1);
      delete moved.parentId;
      moved.type='chat';
      const firstChatIdx=chats.findIndex(c=>c.type==='chat');
      if(firstChatIdx>=0)chats.splice(firstChatIdx,0,moved);
      else chats.push(moved);
      saveAiChats(chats);renderAiList();
      showToast('📤','일반 대화로 이동',moved.name);
    }
  }
  aiDragId=null;aiDragParent=null;
}
function aiDropToProject(e,projectId){
  e.preventDefault();e.stopPropagation();
  if(aiDragIsProject||!aiDragId||aiDragParent===projectId)return;
  const chats=getAiChats();
  const proj=chats.find(c=>c.id===projectId);if(!proj)return;
  let moved=null;
  // 소스에서 제거
  if(aiDragParent){
    const src=chats.find(c=>c.id===aiDragParent);
    const idx=src.chats.findIndex(c=>c.id===aiDragId);
    if(idx>=0)[moved]=src.chats.splice(idx,1);
  }else{
    const idx=chats.findIndex(c=>c.id===aiDragId&&c.type==='chat');
    if(idx>=0)[moved]=chats.splice(idx,1);
  }
  if(moved){
    moved.parentId=projectId;
    proj.chats=proj.chats||[];proj.chats.push(moved);
    saveAiChats(chats);renderAiList();showToast('📁','프로젝트로 이동',proj.name);
  }
  aiDragId=null;
}

// ★ AI 우클릭 메뉴
function showAiContext(e,id,parentId,isProject){
  const m=document.getElementById('messageContextMenu');
  const chats=getAiChats();
  let target=null;
  if(isProject){target=chats.find(c=>c.id===id)}
  else if(parentId){target=chats.find(c=>c.id===parentId)?.chats?.find(c=>c.id===id)}
  else{target=chats.find(c=>c.id===id)}
  if(!target)return;
  const items=[
    {icon:target.pinned?'📍':'📌',label:target.pinned?'고정 해제':'상단 고정',fn:()=>toggleAiPin(id,parentId)},
    {icon:'✏️',label:'이름 변경',fn:()=>renameAiItem(id,parentId)},
    {icon:'🔗',label:'공유 링크 생성',fn:()=>shareAi(id,parentId)},
    {icon:'🔁',label:'반복 메시지로',fn:()=>openRepeatModal()}
  ];
  if(!isProject&&!parentId){
    items.push({icon:'📁',label:'프로젝트로 이동',fn:()=>openMoveProject(id)});
  }
  if(parentId){
    items.push({icon:'📤',label:'프로젝트에서 빼기',fn:()=>removeFromProject(id,parentId)});
  }
  items.push({divider:true});
  items.push({icon:'🗑️',label:'삭제',danger:true,fn:()=>deleteAiChat(id,parentId)});
  m.innerHTML=items.map((it,i)=>it.divider?'<div class="context-menu-divider"></div>':`<div class="context-menu-item ${it.danger?'text-red-500':''}" onclick="window.__aictx[${i}]()"><span>${it.icon}</span>${it.label}</div>`).join('');
  window.__aictx=items.map(it=>it.divider?null:()=>{it.fn();m.classList.add('hidden')});
  m.style.left=Math.min(e.clientX,window.innerWidth-220)+'px';
  m.style.top=Math.min(e.clientY,window.innerHeight-320)+'px';
  m.classList.remove('hidden');
}
function toggleAiPin(id,parentId){
  const chats=getAiChats();
  let target=parentId?chats.find(c=>c.id===parentId).chats.find(c=>c.id===id):chats.find(c=>c.id===id);
  if(target){target.pinned=!target.pinned;saveAiChats(chats);renderAiList();showToast(target.pinned?'📌':'📍',target.pinned?'고정':'고정 해제','')}
}
function renameAiItem(id,parentId){
  const chats=getAiChats();
  let target=parentId?chats.find(c=>c.id===parentId).chats.find(c=>c.id===id):chats.find(c=>c.id===id);
  if(!target)return;
  const newName=prompt('새 이름:',target.name);if(!newName)return;
  target.name=newName;saveAiChats(chats);renderAiList();
  if(currentAi&&currentAi.id===id){currentAi.name=newName;renderAiChat()}
}
function openMoveProject(chatId){
  const projects=getAiChats().filter(c=>c.type==='project');
  if(projects.length===0){alert('먼저 프로젝트를 생성하세요');return}
  document.getElementById('moveProjectList').innerHTML=projects.map(p=>`<button onclick="moveToProject(${chatId},${p.id})" class="w-full flex items-center gap-2 px-3 py-2 hover-bg rounded text-left text-sm border border-gray-100"><span class="text-amber-500">📁</span><span class="flex-1">${escapeHtml(p.name)}</span></button>`).join('');
  openModal('moveProjectModal');
}
function moveToProject(chatId,projectId){
  const chats=getAiChats();
  const idx=chats.findIndex(c=>c.id===chatId&&c.type==='chat');
  if(idx<0)return;
  const [moved]=chats.splice(idx,1);
  moved.parentId=projectId;
  const proj=chats.find(c=>c.id===projectId);
  proj.chats=proj.chats||[];proj.chats.push(moved);
  saveAiChats(chats);renderAiList();closeModal('moveProjectModal');
  showToast('📁','프로젝트로 이동',proj.name);
}
function removeFromProject(id,parentId){
  const chats=getAiChats();
  const proj=chats.find(c=>c.id===parentId);
  if(!proj||!proj.chats)return;
  const idx=proj.chats.findIndex(c=>c.id===id);
  if(idx<0)return;
  const [moved]=proj.chats.splice(idx,1);
  delete moved.parentId;
  moved.type='chat'; // ★ 일반 대화 타입 보장
  // ★ 일반 대화 영역 맨 위에 추가 (사용자가 즉시 확인 가능)
  // 프로젝트들은 앞쪽에 있고 일반 대화는 뒤쪽에 있으므로, 첫 일반 대화 자리에 삽입
  const firstChatIdx=chats.findIndex(c=>c.type==='chat');
  if(firstChatIdx>=0)chats.splice(firstChatIdx,0,moved);
  else chats.push(moved);
  saveAiChats(chats);renderAiList();
  showToast('📤','일반 대화로 이동',moved.name);
}
// ★ AI 공유 링크 생성
function shareAi(id,parentId){
  const chats=getAiChats();
  let target=parentId?chats.find(c=>c.id===parentId).chats.find(c=>c.id===id):chats.find(c=>c.id===id);
  if(!target)return;
  const token=Math.random().toString(36).substring(2,12);
  const shares=ST.get('aiShares',{});
  shares[token]={chatName:target.name,messages:target.messages||[],sharedBy:CURRENT.name,sharedAt:new Date().toISOString()};
  ST.set('aiShares',shares);
  const link=`${location.origin}${location.pathname.replace('demo.html','')}ai-share.html?t=${token}`;
  document.getElementById('shareLink').value=link;
  openModal('aiShareModal');
}
function copyShareLink(){
  const inp=document.getElementById('shareLink');
  inp.select();navigator.clipboard.writeText(inp.value);
  showToast('📋','공유 링크 복사','');
}
function selectAi(id,parentId){
  const chats=getAiChats();
  let target=null;
  if(parentId){target=chats.find(c=>c.id===parentId).chats.find(c=>c.id===id)}
  else target=chats.find(c=>c.id===id);
  if(!target)return;
  if(target.type==='project'){
    // ★ 프로젝트 클릭 시: 토글 펼침/접힘 + 프로젝트 뷰 표시
    target.expanded=!target.expanded;
    saveAiChats(chats);
    currentAi={...target,isProjectView:true};
    renderAiList();renderProjectView(id);
    return;
  }
  currentAi={...target,parentId};
  renderAiChat();
  if(isMobileView())document.getElementById('page-chatgpt')?.classList.add('mobile-show-chat');
}
// ★ 프로젝트 전용 뷰 (대화 목록 + 프롬프트)
function renderProjectView(projectId){
  const proj=getAiChats().find(c=>c.id===projectId);if(!proj)return;
  const area=document.getElementById('aiChatArea');
  const chatList=(proj.chats||[]).map(c=>`<div class="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:shadow-md cursor-pointer" onclick="selectAi(${c.id},${proj.id})"><span class="text-gray-400">💬</span><div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">${escapeHtml(c.name)}</p><p class="text-xs text-gray-400">${(c.messages||[]).length}개 메시지</p></div><button onclick="event.stopPropagation();deleteAiChat(${c.id},${proj.id})" class="text-gray-300 hover:text-red-500 text-xs">×</button></div>`).join('');
  const models=getAiModels().filter(m=>m.enabled);
  area.innerHTML=`
    <div class="h-14 px-4 border-b border-gray-200 flex items-center gap-3 bg-white">
      <span class="text-amber-500 text-2xl">📁</span>
      <div class="flex-1 min-w-0"><h3 class="font-bold truncate">${escapeHtml(proj.name)}</h3><p class="text-xs text-gray-400">프로젝트 · ${(proj.chats||[]).length}개 채팅</p></div>
      <div class="flex items-center gap-1"><span class="text-xs text-gray-500">🤖</span><select onchange="updateProjectModel(${proj.id},this.value)" class="px-2 py-1 text-xs border border-gray-200 rounded bg-white"><option value="">(기본)</option>${models.map(m=>`<option ${proj.model===m.name?'selected':''}>${m.name}</option>`).join('')}</select></div>
    </div>
    <div class="flex-1 overflow-y-auto p-6 bg-gray-50">
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="bg-white border border-gray-200 rounded-xl p-5">
          <div class="flex items-center justify-between mb-2"><h3 class="font-bold flex items-center gap-2">📝 프로젝트 프롬프트</h3><span class="text-xs text-gray-400">하위 모든 채팅에 상속</span></div>
          <textarea id="projectPromptInput" rows="5" placeholder="예: 당신은 마케팅 전문가입니다. 한국어로 답변하세요." class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none">${escapeHtml(proj.prompt||'')}</textarea>
          <div class="flex justify-end mt-2"><button onclick="saveProjectPrompt(${proj.id})" class="px-4 py-1.5 bg-black text-white rounded text-xs">저장</button></div>
        </div>
        <div class="bg-white border border-gray-200 rounded-xl p-5">
          <div class="flex items-center justify-between mb-3"><h3 class="font-bold flex items-center gap-2">💬 대화 목록</h3><button onclick="newChatInProject(${proj.id})" class="px-3 py-1.5 bg-black text-white rounded text-xs">+ 새 채팅</button></div>
          <div class="space-y-2">${chatList||'<p class="text-center text-gray-400 text-sm py-6">아직 채팅이 없습니다. "+ 새 채팅"을 눌러 시작하세요.</p>'}</div>
        </div>
      </div>
    </div>
  `;
}
function saveProjectPrompt(projectId){
  const prompt=document.getElementById('projectPromptInput').value;
  const chats=getAiChats();
  const p=chats.find(c=>c.id===projectId);if(!p)return;
  p.prompt=prompt;saveAiChats(chats);showToast('💾','프롬프트 저장','');
}
function updateProjectModel(projectId,model){
  const chats=getAiChats();
  const p=chats.find(c=>c.id===projectId);if(!p)return;
  p.model=model;saveAiChats(chats);showToast('🤖','모델 변경',model||'(기본)');
}
function newChatInProject(projectId){
  const chats=getAiChats();
  const p=chats.find(c=>c.id===projectId);if(!p)return;
  const c={id:Date.now(),type:'chat',name:'새 채팅',messages:[],parentId:projectId};
  p.chats=p.chats||[];p.chats.unshift(c);
  saveAiChats(chats);currentAi={...c,parentId:projectId};
  renderAiList();renderAiChat();
}
function renderAiChat(){
  const area=document.getElementById('aiChatArea');
  if(!currentAi){area.innerHTML=`<div class="flex-1 flex items-center justify-center text-center p-10 text-gray-400"><div><div class="text-6xl mb-4">🤖</div><p class="text-lg font-medium mb-2">ChatGPT</p><p class="text-sm">+ 새 채팅 버튼을 눌러 시작하세요</p></div></div>`;return}
  // 활성 프로젝트의 prompt/model
  let effPrompt=currentAi.prompt||'';
  let effModel=currentAi.model||'';
  if(currentAi.parentId){
    const proj=getAiChats().find(c=>c.id===currentAi.parentId);
    if(proj){effPrompt=effPrompt||proj.prompt;effModel=effModel||proj.model}
  }
  effModel=effModel||ST.get('defaultAiModel','gpt-4o-mini');
  const models=getAiModels().filter(m=>m.enabled);
  const modelOptions='<option value="">(기본)</option>'+models.map(m=>`<option ${effModel===m.name?'selected':''}>${m.name}</option>`).join('');
  area.innerHTML=`
    <div class="h-14 px-4 border-b border-gray-200 flex items-center gap-3 bg-white">
      <button onclick="chatgptBackToList()" class="mobile-back-btn p-1 hover-bg rounded text-lg" style="display:none" aria-label="목록으로">←</button>
      <div class="flex-1 min-w-0"><h3 class="font-bold truncate">${escapeHtml(currentAi.name)}</h3><p class="text-xs text-gray-400">${effPrompt?'프롬프트 설정됨':'프롬프트 없음'}</p></div>
      <div class="flex items-center gap-1">
        <span class="text-xs text-gray-500">🤖</span>
        <select onchange="changeAiModel(this.value)" class="px-2 py-1 text-xs border border-gray-200 rounded bg-white">${modelOptions}</select>
      </div>
      <button onclick="shareAi(${currentAi.id},${currentAi.parentId||null})" class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover-bg">🔗 공유</button>
      <button onclick="openChatSettings()" class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover-bg">⚙️ 프롬프트</button>
    </div>
    <div id="aiMessages" class="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50"></div>
    <div class="border-t border-gray-200 bg-white p-4">
      <div class="max-w-3xl mx-auto">
        <div class="flex items-end gap-2 border border-gray-300 rounded-2xl px-4 py-3 focus-within:border-black bg-white shadow-sm">
          <textarea id="aiInput" rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAiMsg()}" placeholder="메시지 입력..." class="flex-1 text-sm resize-none focus:outline-none bg-transparent"></textarea>
          <button onclick="sendAiMsg()" class="p-1.5 bg-black text-white rounded-xl shrink-0 self-end">➤</button>
        </div>
      </div>
    </div>
  `;
  renderAiMessages();
}
function renderAiMessages(){
  const list=document.getElementById('aiMessages');if(!list)return;
  const msgs=currentAi.messages||[];
  if(msgs.length===0){list.innerHTML='<div class="text-center text-gray-400 py-10"><div class="text-4xl mb-2">💭</div><p class="text-sm">무엇을 도와드릴까요?</p></div>';return}
  list.innerHTML=msgs.map(m=>{
    if(m.role==='user')return `<div class="flex gap-3 flex-row-reverse"><div class="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">나</div><div class="max-w-[80%]"><div class="bg-black text-white rounded-2xl px-4 py-3 text-sm">${escapeHtml(m.content)}</div></div></div>`;
    return `<div class="flex gap-3"><div class="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shrink-0 mt-1">🤖</div><div class="max-w-[80%]"><div class="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap">${escapeHtml(m.content)}</div></div></div>`;
  }).join('');
  list.scrollTop=list.scrollHeight;
}
function sendAiMsg(){
  const ta=document.getElementById('aiInput');
  const text=ta.value.trim();if(!text)return;
  const chats=getAiChats();
  let target=null;
  if(currentAi.parentId){target=chats.find(c=>c.id===currentAi.parentId).chats.find(c=>c.id===currentAi.id)}
  else target=chats.find(c=>c.id===currentAi.id);
  if(!target)return;
  target.messages=target.messages||[];
  target.messages.push({role:'user',content:text});
  // 이름 자동 설정 (첫 메시지)
  if(target.messages.length===1)target.name=text.substring(0,30);
  ta.value='';
  saveAiChats(chats);currentAi=target;renderAiChat();
  // AI 응답 시뮬레이션
  setTimeout(()=>{
    const responses=['이해했습니다. 자세히 분석해드리자면, 다음과 같이 정리할 수 있습니다:\n\n1. 핵심 포인트 A\n2. 추가 고려사항 B\n3. 권장 액션 C\n\n도움이 되셨나요?','좋은 질문입니다! 데이터를 살펴보면, 다음과 같은 트렌드가 보입니다.\n\n• 트렌드 1: 상승세\n• 트렌드 2: 안정적\n• 트렌드 3: 개선 필요','말씀해주신 부분에 대해 답변드리자면, 다음 단계를 추천드립니다.','관련된 정보를 정리해보았습니다. 추가 질문이 있으시면 언제든 말씀해주세요.'];
    target.messages.push({role:'assistant',content:responses[Math.floor(Math.random()*responses.length)]});
    saveAiChats(chats);currentAi=target;renderAiChat();renderAiList();
  },800);
  renderAiList();
}
function deleteAiChat(id,parentId){
  if(!confirm('삭제하시겠습니까?'))return;
  let chats=getAiChats();
  if(parentId){
    const p=chats.find(c=>c.id===parentId);
    if(p)p.chats=(p.chats||[]).filter(c=>c.id!==id);
  }else{
    chats=chats.filter(c=>c.id!==id);
    chats.forEach(c=>{if(c.chats)c.chats=c.chats.filter(x=>x.id!==id)});
  }
  saveAiChats(chats);
  if(currentAi&&currentAi.id===id){currentAi=null;renderAiChat()}
  renderAiList();showToast('🗑️','삭제됨','');
}
function renameAi(){
  if(!currentAi)return;
  const newName=prompt('새 이름:',currentAi.name);if(!newName)return;
  const chats=getAiChats();
  let target=null;
  if(currentAi.parentId){target=chats.find(c=>c.id===currentAi.parentId).chats.find(c=>c.id===currentAi.id)}
  else target=chats.find(c=>c.id===currentAi.id);
  if(target){target.name=newName;saveAiChats(chats);currentAi.name=newName;renderAiList();renderAiChat()}
}
function openChatSettings(){
  if(!currentAi)return;
  document.getElementById('aiSettingsTitle').textContent='⚙️ 프롬프트 설정: '+currentAi.name;
  document.getElementById('aiChatPrompt').value=currentAi.prompt||'';
  openModal('aiSettingsModal');
}
function openProjectSettings(id){
  const proj=getAiChats().find(c=>c.id===id);
  if(!proj)return;
  currentAi=proj;
  document.getElementById('aiSettingsTitle').textContent='⚙️ 프로젝트 프롬프트: '+proj.name+' (하위 모든 채팅에 상속)';
  document.getElementById('aiChatPrompt').value=proj.prompt||'';
  openModal('aiSettingsModal');
}
function saveAiChatSettings(){
  const prompt=document.getElementById('aiChatPrompt').value;
  const chats=getAiChats();
  let target=null;
  if(currentAi.parentId){target=chats.find(c=>c.id===currentAi.parentId).chats.find(c=>c.id===currentAi.id)}
  else target=chats.find(c=>c.id===currentAi.id);
  if(target){target.prompt=prompt;saveAiChats(chats);currentAi=target;renderAiList();if(currentAi.type!=='project')renderAiChat();}
  closeModal('aiSettingsModal');showToast('💾','프롬프트 저장','');
}
// ★ 헤더에서 모델 직접 변경
function changeAiModel(model){
  if(!currentAi)return;
  const chats=getAiChats();
  let target=currentAi.parentId?chats.find(c=>c.id===currentAi.parentId).chats.find(c=>c.id===currentAi.id):chats.find(c=>c.id===currentAi.id);
  if(target){target.model=model;saveAiChats(chats);currentAi.model=model;showToast('🤖','모델 변경',model||'(기본)');}
}

// ========== AI 모델 ==========
const PROVIDERS=['OpenAI','Anthropic Claude','Google Gemini','Mistral','xAI','기타'];
function getAiModels(){return ST.get('aiModels',[
  {id:1,provider:'OpenAI',name:'gpt-4o',apiKey:'',enabled:true},
  {id:2,provider:'OpenAI',name:'gpt-4o-mini',apiKey:'',enabled:true},
  {id:3,provider:'Anthropic Claude',name:'claude-sonnet-4.6',apiKey:'',enabled:true}
])}
function saveAiModels(m){ST.set('aiModels',m)}
function initAiModels(){renderAiModels()}
function renderAiModels(){
  const list=document.getElementById('aiModelsList');if(!list)return;
  const models=getAiModels();
  list.innerHTML=models.map(m=>`<div class="border border-gray-200 rounded-lg p-4 space-y-2"><div class="flex items-center gap-2"><label class="toggle"><input type="checkbox" ${m.enabled?'checked':''} onchange="toggleAiModel(${m.id},this.checked)" /><span class="toggle-slider"></span></label><select onchange="updateAiModel(${m.id},'provider',this.value)" class="px-2 py-1 border border-gray-200 rounded text-xs bg-white">${PROVIDERS.map(p=>`<option ${m.provider===p?'selected':''}>${p}</option>`).join('')}</select><input value="${escapeHtml(m.name)}" oninput="updateAiModel(${m.id},'name',this.value)" placeholder="모델명" class="flex-1 px-2 py-1 border border-gray-200 rounded text-xs" /><button onclick="deleteAiModel(${m.id})" class="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-xs">🗑️</button></div><div class="flex items-center gap-2"><span class="text-xs text-gray-500 shrink-0">🔑</span><input type="password" value="${escapeHtml(m.apiKey)}" oninput="updateAiModel(${m.id},'apiKey',this.value)" placeholder="API 키" class="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-mono" /></div></div>`).join('')||'<p class="text-center text-sm text-gray-400 py-6">모델 없음</p>';
  const sel=document.getElementById('defaultAiModel');
  if(sel){const def=ST.get('defaultAiModel','gpt-4o-mini');sel.innerHTML=models.filter(m=>m.enabled).map(m=>`<option ${m.name===def?'selected':''}>${m.name}</option>`).join('')}
}
function addAiModel(){const m=getAiModels();m.push({id:Date.now(),provider:'OpenAI',name:'',apiKey:'',enabled:true});saveAiModels(m);renderAiModels()}
function deleteAiModel(id){if(!confirm('삭제?'))return;saveAiModels(getAiModels().filter(m=>m.id!==id));renderAiModels();showToast('🗑️','삭제됨','')}
function toggleAiModel(id,e){const m=getAiModels();const x=m.find(y=>y.id===id);if(x){x.enabled=e;saveAiModels(m);renderAiModels()}}
function updateAiModel(id,k,v){const m=getAiModels();const x=m.find(y=>y.id===id);if(x){x[k]=v;saveAiModels(m)}}
function saveAiSettings(){const def=document.getElementById('defaultAiModel').value;ST.set('defaultAiModel',def);showToast('💾','저장됨',def)}

// ========== 광고 ==========
function getAds(){return ST.get('ads',[
  {id:1,name:'쇼핑검색 - 메인',platform:'네이버 SA',account:'A몰 SA계정',start:'2026-05-01',end:'2026-05-31',budget:500000,spent:380000,impr:45230,clicks:1823,status:'진행중'},
  {id:2,name:'쇼핑검색 - 서브',platform:'네이버 SA',account:'B몰 SA계정',start:'2026-05-01',end:'2026-05-31',budget:300000,spent:210000,impr:28100,clicks:910,status:'진행중'},
  {id:3,name:'GFA 브랜딩',platform:'네이버 GFA',account:'A몰 GFA',start:'2026-05-01',end:'2026-05-31',budget:600000,spent:412000,impr:128400,clicks:1650,status:'진행중'},
  {id:4,name:'GFA 리타겟팅',platform:'네이버 GFA',account:'B몰 GFA',start:'2026-05-10',end:'2026-05-25',budget:250000,spent:180000,impr:52300,clicks:870,status:'진행중'},
  {id:5,name:'카카오 디스플레이',platform:'카카오',account:'본사 모먼트',start:'2026-04-01',end:'2026-04-30',budget:300000,spent:300000,impr:32100,clicks:842,status:'종료'},
  {id:6,name:'인스타그램 피드',platform:'인스타그램',account:'Meta 광고계정#1',start:'2026-05-10',end:'2026-05-25',budget:200000,spent:120000,impr:18750,clicks:634,status:'진행중'},
  {id:7,name:'페이스북 리타겟',platform:'페이스북',account:'Meta 광고계정#2',start:'2026-05-12',end:'2026-05-26',budget:150000,spent:88000,impr:14200,clicks:520,status:'진행중'},
  {id:8,name:'구글 검색 광고',platform:'구글',account:'Google Ads 본사',start:'2026-06-01',end:'2026-06-30',budget:400000,spent:0,impr:0,clicks:0,status:'예정'}
])}
function saveAds(a){ST.set('ads',a)}
function renderAds(){
  const all=getAds();
  // 플랫폼 매핑: 표시명 → API 키
  const PLATFORM_KEYS={'네이버 SA':'naver_sa','네이버 GFA':'naver_gfa','네이버':'naver_sa','카카오':'kakao_moment','구글':'google_ads','인스타그램':'meta_ads','페이스북':'meta_ads'};
  const pf=document.getElementById('adsPlatformFilter')?.value||'all';
  const af=document.getElementById('adsAccountFilter')?.value||'all';
  // 계정 필터 옵션 갱신
  const accSel=document.getElementById('adsAccountFilter');
  if(accSel){
    const candidates=pf==='all'?all:all.filter(a=>(PLATFORM_KEYS[a.platform]||'etc')===pf);
    const fromAds=[...new Set(candidates.map(a=>`${PLATFORM_KEYS[a.platform]||'etc'}|${a.account||'(기본)'}`))];
    const fromSettings=getActiveAccounts('ads').filter(a=>pf==='all'||a.platformKey===pf).map(a=>`${a.platformKey}|${a.label}`);
    const allAcc=[...new Set([...fromAds,...fromSettings])].sort();
    const prev=accSel.value;
    accSel.innerHTML='<option value="all">전체 계정</option>'+allAcc.map(k=>{const [p,l]=k.split('|');const pname={naver_sa:'네이버 SA',naver_gfa:'네이버 GFA',kakao_moment:'카카오',google_ads:'구글',meta_ads:'Meta'}[p]||p;return `<option value="${escapeHtml(k)}">${pname} · ${escapeHtml(l)}</option>`}).join('');
    if([...accSel.options].some(o=>o.value===prev))accSel.value=prev;
  }
  let ads=pf==='all'?all:all.filter(a=>(PLATFORM_KEYS[a.platform]||'etc')===pf);
  if(af!=='all'){const [afp,afl]=af.split('|');ads=ads.filter(a=>(PLATFORM_KEYS[a.platform]||'etc')===afp&&(a.account||'(기본)')===afl);}
  const body=document.getElementById('adsBody');if(!body)return;
  if(ads.length===0){body.innerHTML='<tr><td colspan="11" class="text-center text-gray-400 py-4">조건에 맞는 캠페인이 없습니다.</td></tr>';
    document.getElementById('adsBudget')&&(document.getElementById('adsBudget').textContent='₩0');
    document.getElementById('adsSpent')&&(document.getElementById('adsSpent').textContent='₩0');
    document.getElementById('adsImpr')&&(document.getElementById('adsImpr').textContent='0');
    document.getElementById('adsClicks')&&(document.getElementById('adsClicks').textContent='0');
    return;
  }
  body.innerHTML=ads.map((a,i)=>{
    const ctr=a.impr>0?((a.clicks/a.impr)*100).toFixed(2):'0';
    const statusColor=a.status==='진행중'?'bg-green-50 text-green-700':a.status==='예정'?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-500';
    return `<tr><td class="sheet-row-num"><input type="checkbox" class="adChk" data-id="${a.id}" /></td><td contenteditable oninput="updAd(${a.id},'name',this.textContent)">${a.name}</td><td contenteditable oninput="updAd(${a.id},'platform',this.textContent)">${a.platform}</td><td contenteditable oninput="updAd(${a.id},'account',this.textContent)" class="text-xs">${escapeHtml(a.account||'(기본)')}</td><td>${a.start} ~ ${a.end}</td><td contenteditable oninput="updAd(${a.id},'budget',this.textContent)">₩${a.budget.toLocaleString()}</td><td contenteditable oninput="updAd(${a.id},'spent',this.textContent)">₩${a.spent.toLocaleString()}</td><td contenteditable oninput="updAd(${a.id},'impr',this.textContent)">${a.impr.toLocaleString()}</td><td contenteditable oninput="updAd(${a.id},'clicks',this.textContent)">${a.clicks.toLocaleString()}</td><td class="text-blue-600 font-semibold">${ctr}%</td><td><span class="text-xs px-2 py-0.5 rounded ${statusColor}">${a.status}</span></td></tr>`;
  }).join('');
  // 요약 카드
  const totalBudget=ads.reduce((s,a)=>s+a.budget,0);
  const totalSpent=ads.reduce((s,a)=>s+a.spent,0);
  const totalImpr=ads.reduce((s,a)=>s+a.impr,0);
  const totalClicks=ads.reduce((s,a)=>s+a.clicks,0);
  const avgCtr=totalImpr>0?((totalClicks/totalImpr)*100).toFixed(2):'0';
  document.getElementById('adsBudget')&&(document.getElementById('adsBudget').textContent='₩'+totalBudget.toLocaleString());
  document.getElementById('adsSpent')&&(document.getElementById('adsSpent').textContent='₩'+totalSpent.toLocaleString());
  document.getElementById('adsImpr')&&(document.getElementById('adsImpr').textContent=totalImpr.toLocaleString());
  document.getElementById('adsClicks')&&(document.getElementById('adsClicks').textContent=totalClicks.toLocaleString()+' · '+avgCtr+'%');
}
function addAdCampaign(){const ads=getAds();ads.push({id:Date.now(),name:'새 캠페인',platform:'네이버 SA',account:'(기본)',start:new Date().toISOString().split('T')[0],end:new Date().toISOString().split('T')[0],budget:0,spent:0,impr:0,clicks:0,status:'예정'});saveAds(ads);renderAds();showToast('+','캠페인 추가','')}
function deleteSelectedAds(){const ids=Array.from(document.querySelectorAll('.adChk:checked')).map(c=>parseInt(c.dataset.id));if(ids.length===0){alert('선택하세요');return}if(!confirm(ids.length+'개 삭제?'))return;saveAds(getAds().filter(a=>!ids.includes(a.id)));renderAds();showToast('🗑️','삭제됨','')}
function toggleAllAds(c){document.querySelectorAll('.adChk').forEach(x=>x.checked=c)}
function updAd(id,k,v){const ads=getAds();const a=ads.find(x=>x.id===id);if(a){if(['budget','spent','impr','clicks'].includes(k))a[k]=parseInt(v.replace(/[^\d]/g,''))||0;else a[k]=v;saveAds(ads)}}

// ========== 행사 ==========
function getEvents(){return ST.get('events',[
  {id:1,name:'여름 세일',start:'2026-06-01',end:'2026-06-30',discount:20,products:45,channel:'전체',status:'예정'},
  {id:2,name:'신상품 런칭 프로모션',start:'2026-05-15',end:'2026-05-31',discount:10,products:12,channel:'자사몰',status:'진행중'},
  {id:3,name:'어버이날 특별 이벤트',start:'2026-05-01',end:'2026-05-08',discount:15,products:30,channel:'네이버',status:'종료'}
])}
function saveEvents(e){ST.set('events',e)}
function renderEvents(){
  const events=getEvents();const body=document.getElementById('eventsBody');if(!body)return;
  body.innerHTML=events.map(e=>{
    const sc=e.status==='진행중'?'bg-green-50 text-green-700':e.status==='예정'?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-500';
    return `<tr><td class="sheet-row-num"><input type="checkbox" class="evChk" data-id="${e.id}" /></td><td contenteditable oninput="updEvent(${e.id},'name',this.textContent)">${e.name}</td><td contenteditable oninput="updEvent(${e.id},'start',this.textContent)">${e.start}</td><td contenteditable oninput="updEvent(${e.id},'end',this.textContent)">${e.end}</td><td class="text-blue-600 font-semibold" contenteditable oninput="updEvent(${e.id},'discount',this.textContent)">${e.discount}%</td><td contenteditable oninput="updEvent(${e.id},'products',this.textContent)">${e.products}</td><td contenteditable oninput="updEvent(${e.id},'channel',this.textContent)">${e.channel}</td><td><span class="text-xs px-2 py-0.5 rounded ${sc}">${e.status}</span></td></tr>`;
  }).join('');
  document.getElementById('evActive')&&(document.getElementById('evActive').textContent=events.filter(e=>e.status==='진행중').length);
  document.getElementById('evScheduled')&&(document.getElementById('evScheduled').textContent=events.filter(e=>e.status==='예정').length);
  document.getElementById('evEnded')&&(document.getElementById('evEnded').textContent=events.filter(e=>e.status==='종료').length);
}
function addEvent(){const e=getEvents();e.push({id:Date.now(),name:'새 행사',start:new Date().toISOString().split('T')[0],end:new Date().toISOString().split('T')[0],discount:10,products:0,channel:'전체',status:'예정'});saveEvents(e);renderEvents();showToast('+','행사 추가','')}
function deleteSelectedEvent(){const ids=Array.from(document.querySelectorAll('.evChk:checked')).map(c=>parseInt(c.dataset.id));if(ids.length===0){alert('선택하세요');return}if(!confirm(ids.length+'개 삭제?'))return;saveEvents(getEvents().filter(e=>!ids.includes(e.id)));renderEvents();showToast('🗑️','삭제됨','')}
function toggleAllEvents(c){document.querySelectorAll('.evChk').forEach(x=>x.checked=c)}
function updEvent(id,k,v){const e=getEvents();const x=e.find(y=>y.id===id);if(x){if(k==='discount'||k==='products')x[k]=parseInt(v.replace(/[^\d]/g,''))||0;else x[k]=v;saveEvents(e)}}

// ========== 디자인 ==========
function getDesignAssets(){return ST.get('designAssets',[
  {id:1,name:'INTRO 로고 (흑백)',type:'PNG',size:'2.4 MB',color:'blue'},
  {id:2,name:'INTRO 로고 (컬러)',type:'SVG',size:'0.8 MB',color:'purple'},
  {id:3,name:'브랜드 가이드라인',type:'PDF',size:'12.3 MB',color:'red'},
  {id:4,name:'제품 배너 템플릿',type:'PSD',size:'45.2 MB',color:'blue'},
  {id:5,name:'소셜미디어 키트',type:'ZIP',size:'8.7 MB',color:'amber'}
])}
function getDesignRequests(){return ST.get('designRequests',[
  {id:1,requester:'이마케팅',type:'배너',title:'여름 캠페인 메인 배너',deadline:'2026-05-25',status:'진행중'},
  {id:2,requester:'최영업',type:'카탈로그',title:'신제품 카탈로그',deadline:'2026-05-30',status:'대기'},
  {id:3,requester:'관리자',type:'명함',title:'영업팀 명함',deadline:'2026-05-20',status:'완료'}
])}
function saveDesignAssets(a){ST.set('designAssets',a)}
function saveDesignRequests(r){ST.set('designRequests',r)}
function renderDesign(){
  const assets=getDesignAssets();
  const grid=document.getElementById('designAssetsGrid');if(grid){
    grid.innerHTML=assets.map(a=>`<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer"><div class="aspect-video bg-${a.color}-100 text-${a.color}-700 rounded mb-2 flex items-center justify-center text-2xl font-bold">${a.type}</div><p class="text-sm font-medium truncate">${escapeHtml(a.name)}</p><p class="text-xs text-gray-400">${a.size}</p><div class="flex gap-1 mt-2"><button class="flex-1 text-xs py-1 border border-gray-200 rounded hover-bg">⬇</button><button onclick="deleteDesignAsset(${a.id})" class="text-xs py-1 px-2 border border-red-200 text-red-600 rounded">🗑</button></div></div>`).join('');
  }
  const reqs=getDesignRequests();
  const body=document.getElementById('designRequestsBody');if(body){
    body.innerHTML=reqs.map((r,i)=>{const sc=r.status==='진행중'?'bg-amber-50 text-amber-700':r.status==='완료'?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500';return `<tr><td class="sheet-row-num">${i+1}</td><td>${r.requester}</td><td>${r.type}</td><td contenteditable oninput="updDesignReq(${r.id},'title',this.textContent)">${escapeHtml(r.title)}</td><td contenteditable oninput="updDesignReq(${r.id},'deadline',this.textContent)">${r.deadline}</td><td><select onchange="updDesignReq(${r.id},'status',this.value);renderDesign()" class="text-xs border rounded px-2 py-0.5 bg-white"><option ${r.status==='대기'?'selected':''}>대기</option><option ${r.status==='진행중'?'selected':''}>진행중</option><option ${r.status==='완료'?'selected':''}>완료</option></select></td></tr>`}).join('');
  }
}
function addDesignAsset(){const name=prompt('파일명:','새 에셋');if(!name)return;const a=getDesignAssets();a.push({id:Date.now(),name,type:'PNG',size:'0 KB',color:'blue'});saveDesignAssets(a);renderDesign();showToast('⬆','업로드',name)}
function deleteDesignAsset(id){if(!confirm('삭제?'))return;saveDesignAssets(getDesignAssets().filter(a=>a.id!==id));renderDesign();showToast('🗑️','삭제됨','')}
function addDesignRequest(){const title=prompt('의뢰 제목:');if(!title)return;const r=getDesignRequests();r.push({id:Date.now(),requester:CURRENT.name,type:'기타',title,deadline:new Date().toISOString().split('T')[0],status:'대기'});saveDesignRequests(r);renderDesign();showToast('+','의뢰 등록',title)}
function updDesignReq(id,k,v){const r=getDesignRequests();const x=r.find(y=>y.id===id);if(x){x[k]=v;saveDesignRequests(r)}}

// ========== 이커머스 ==========
// 판매 데이터: 일자 단위 거래 기록 {id,date,brand,product,qty,revenue}
function _genMockSales(){
  const brands=['A브랜드','B브랜드','C브랜드'];
  const products=[
    {brand:'A브랜드',product:'스킨케어 세트',price:45000},
    {brand:'A브랜드',product:'프리미엄 보습 크림',price:30000},
    {brand:'B브랜드',product:'선크림 SPF50+',price:15000},
    {brand:'B브랜드',product:'클렌징 폼',price:20000},
    {brand:'C브랜드',product:'토너 세트',price:25000},
  ];
  const rows=[];let id=1;
  const today=new Date();
  for(let d=60;d>=0;d--){
    const dt=new Date(today);dt.setDate(today.getDate()-d);
    const date=dt.toISOString().split('T')[0];
    products.forEach(p=>{
      if(Math.random()<0.7){
        const qty=Math.floor(Math.random()*15)+1;
        rows.push({id:id++,date,brand:p.brand,product:p.product,qty,revenue:qty*p.price});
      }
    });
  }
  return rows;
}
function getEcData(t){
  if(t==='sales'){const v=ST.get('ec_sales_v2',null);if(v)return v;const fresh=_genMockSales();ST.set('ec_sales_v2',fresh);return fresh;}
  if(t==='inventory'){
    const v=ST.get('ec_inventory_v2',null);if(v)return v;
    const fresh=[
      {id:1,sku:'SK-001-50ML',product:'스킨케어 세트',stock:234,source:'naver_store',lastSync:new Date().toISOString()},
      {id:2,sku:'SK-002-80ML',product:'프리미엄 보습 크림',stock:18,source:'coupang',lastSync:new Date().toISOString()},
      {id:3,sku:'SK-003-50ML',product:'선크림 SPF50+',stock:30,source:'ezadmin',lastSync:new Date().toISOString()},
      {id:4,sku:'SK-004-200ML',product:'클렌징 폼',stock:156,source:'cj_eflex',lastSync:new Date().toISOString()},
      {id:5,sku:'SK-005-200ML',product:'토너 세트',stock:88,source:'manual',lastSync:''}
    ];
    ST.set('ec_inventory_v2',fresh);return fresh;
  }
  return ST.get('ec_'+t,{
    cost:[{id:1,product:'스킨케어 세트',cost:18000,price:45000,orderQty:200},{id:2,product:'선크림 SPF50+',cost:8000,price:15000,orderQty:500},{id:3,product:'클렌징 폼',cost:5000,price:20000,orderQty:300}]
  }[t]||[]);
}
function saveEcData(t,d){
  const key=t==='sales'?'ec_sales_v2':t==='inventory'?'ec_inventory_v2':'ec_'+t;
  ST.set(key,d);
}
function getEcSalesFiltered(){
  const all=getEcData('sales');
  const from=document.getElementById('ecSalesFrom')?.value||'';
  const to=document.getElementById('ecSalesTo')?.value||'';
  const brand=document.getElementById('ecSalesBrandFilter')?.value||'all';
  const product=document.getElementById('ecSalesProductFilter')?.value||'all';
  return all.filter(s=>{
    if(from&&s.date<from)return false;
    if(to&&s.date>to)return false;
    if(brand!=='all'&&s.brand!==brand)return false;
    if(product!=='all'&&s.product!==product)return false;
    return true;
  });
}
function _populateEcSalesFilterOpts(){
  const all=getEcData('sales');
  const brandSel=document.getElementById('ecSalesBrandFilter');
  if(brandSel){
    const prev=brandSel.value;
    const brands=[...new Set(all.map(s=>s.brand))].sort();
    brandSel.innerHTML='<option value="all">전체 브랜드</option>'+brands.map(b=>`<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
    if([...brandSel.options].some(o=>o.value===prev))brandSel.value=prev;
  }
  const prodSel=document.getElementById('ecSalesProductFilter');
  if(prodSel){
    const prev=prodSel.value;
    const brand=brandSel?.value||'all';
    const filtered=brand==='all'?all:all.filter(s=>s.brand===brand);
    const products=[...new Set(filtered.map(s=>s.product))].sort();
    prodSel.innerHTML='<option value="all">전체 제품</option>'+products.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    if([...prodSel.options].some(o=>o.value===prev))prodSel.value=prev;
  }
}
function ecSalesResetFilter(){
  ['ecSalesFrom','ecSalesTo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  ['ecSalesBrandFilter','ecSalesProductFilter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='all'});
  renderEcommerce();
}
function renderEcommerce(){
  _populateEcSalesFilterOpts();
  const sales=getEcSalesFiltered();
  document.getElementById('ecSalesBody')&&(document.getElementById('ecSalesBody').innerHTML=sales.length===0?'<tr><td colspan="6" class="text-center text-gray-400 py-4">조건에 맞는 판매 기록이 없습니다.</td></tr>':sales.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<tr><td class="sheet-row-num"><input type="checkbox" class="ecChk-sales" data-id="${s.id}" /></td><td contenteditable oninput="updEc('sales',${s.id},'date',this.textContent)" class="font-mono text-xs">${fmtDateYY(s.date)}</td><td contenteditable oninput="updEc('sales',${s.id},'brand',this.textContent)">${escapeHtml(s.brand||'')}</td><td contenteditable oninput="updEc('sales',${s.id},'product',this.textContent)">${escapeHtml(s.product||'')}</td><td contenteditable oninput="updEc('sales',${s.id},'qty',this.textContent)">${s.qty}</td><td contenteditable oninput="updEc('sales',${s.id},'revenue',this.textContent)">₩${(s.revenue||0).toLocaleString()}</td></tr>`).join(''));
  const totalRev=sales.reduce((s,x)=>s+(x.revenue||0),0),totalQty=sales.reduce((s,x)=>s+(x.qty||0),0);
  const uniqueSku=new Set(sales.map(s=>s.product)).size;
  document.getElementById('ecSalesRevenue')&&(document.getElementById('ecSalesRevenue').textContent='₩'+totalRev.toLocaleString());
  document.getElementById('ecSalesQty')&&(document.getElementById('ecSalesQty').textContent=totalQty.toLocaleString());
  document.getElementById('ecSalesSku')&&(document.getElementById('ecSalesSku').textContent=uniqueSku);
  document.getElementById('ecSalesAvg')&&(document.getElementById('ecSalesAvg').textContent=totalQty>0?'₩'+Math.round(totalRev/totalQty).toLocaleString():'₩0');
  renderEcInventory();
  const cost=getEcData('cost');
  document.getElementById('ecCostBody')&&(document.getElementById('ecCostBody').innerHTML=cost.map(c=>{const m=((c.price-c.cost)/c.price*100).toFixed(1);return `<tr><td class="sheet-row-num"><input type="checkbox" class="ecChk-cost" data-id="${c.id}" /></td><td contenteditable oninput="updEc('cost',${c.id},'product',this.textContent)">${c.product}</td><td contenteditable oninput="updEc('cost',${c.id},'cost',this.textContent)">₩${c.cost.toLocaleString()}</td><td contenteditable oninput="updEc('cost',${c.id},'price',this.textContent)">₩${c.price.toLocaleString()}</td><td class="${m>=50?'text-green-600':'text-amber-600'} font-semibold">${m}%</td><td contenteditable oninput="updEc('cost',${c.id},'orderQty',this.textContent)">${c.orderQty}</td></tr>`}).join(''));
  // 순위: 필터된 데이터에서 제품별 집계
  const byProd={};
  sales.forEach(s=>{const k=s.product;if(!byProd[k])byProd[k]={product:k,brand:s.brand,qty:0,revenue:0};byProd[k].qty+=s.qty||0;byProd[k].revenue+=s.revenue||0;});
  const ranked=Object.values(byProd).sort((a,b)=>b.qty-a.qty).slice(0,10);
  document.getElementById('ecRankingBody')&&(document.getElementById('ecRankingBody').innerHTML=ranked.length===0?'<tr><td colspan="6" class="text-center text-gray-400 py-4">데이터 없음</td></tr>':ranked.map((s,i)=>{const color=i===0?'text-amber-500':i===1?'text-gray-400':i===2?'text-orange-400':'';return `<tr><td class="sheet-row-num">${i+1}</td><td class="${color} font-black">${i+1}</td><td>${escapeHtml(s.product)}<div class="text-[10px] text-gray-400">${escapeHtml(s.brand||'')}</div></td><td>${s.qty}</td><td>₩${s.revenue.toLocaleString()}</td><td class="text-gray-400 text-xs">-</td></tr>`}).join(''));
}
function ecAddRow(t){
  const d=getEcData(t);const newRow={id:Date.now()};
  if(t==='sales')Object.assign(newRow,{date:new Date().toISOString().split('T')[0],brand:'',product:'새 상품',qty:0,revenue:0});
  if(t==='inventory')Object.assign(newRow,{sku:'',product:'새 상품',stock:0,min:0,source:'manual',lastSync:''});
  if(t==='cost')Object.assign(newRow,{product:'새 상품',cost:0,price:0,orderQty:0});
  d.push(newRow);saveEcData(t,d);renderEcommerce();showToast('+','추가됨','');
}
function ecDelRow(t){const ids=Array.from(document.querySelectorAll('.ecChk-'+t+':checked')).map(c=>parseInt(c.dataset.id));if(ids.length===0){alert('선택하세요');return}if(!confirm('삭제?'))return;saveEcData(t,getEcData(t).filter(x=>!ids.includes(x.id)));renderEcommerce();showToast('🗑️','삭제됨','')}
function ecToggleAll(t,c){document.querySelectorAll('.ecChk-'+t).forEach(x=>x.checked=c)}
function updEc(t,id,k,v){
  const d=getEcData(t);const x=d.find(y=>y.id===id);if(!x)return;
  const oldVal=x[k];
  if(['qty','revenue','stock','min','cost','price','orderQty'].includes(k))x[k]=parseFloat(v.replace(/[^\d.-]/g,''))||0;
  else if(k==='date')x[k]=parseDateYY(v);
  else x[k]=v;
  saveEcData(t,d);
  if(t==='inventory'){
    // 재고 수량 변경 시 자동 PUSH (토글 ON일 때)
    if(k==='stock'&&oldVal!==x.stock&&getInvAutoSync()){
      pushInventoryToPlatform(x,oldVal);
    }
    renderEcInventory();
  }
}

// ----- 재고 7일 평균/상태/필터 -----
let _invSourceFilter='all';
function setInvSourceFilter(s){_invSourceFilter=s;renderEcInventory()}
function get7DayAvgForProduct(productName){
  if(!productName)return 0;
  const sales=getEcData('sales');
  const today=new Date();
  const fromDate=new Date(today);fromDate.setDate(today.getDate()-7);
  const from=fromDate.toISOString().split('T')[0];
  const recent=sales.filter(s=>s.product===productName&&s.date>=from);
  if(recent.length===0)return 0;
  const total=recent.reduce((sum,s)=>sum+(s.qty||0),0);
  return total/7;
}
function getPrev7DayAvgForProduct(productName){
  if(!productName)return 0;
  const sales=getEcData('sales');
  const today=new Date();
  const a=new Date(today);a.setDate(today.getDate()-14);
  const b=new Date(today);b.setDate(today.getDate()-8);
  const from=a.toISOString().split('T')[0],to=b.toISOString().split('T')[0];
  const recent=sales.filter(s=>s.product===productName&&s.date>=from&&s.date<=to);
  if(recent.length===0)return 0;
  const total=recent.reduce((sum,s)=>sum+(s.qty||0),0);
  return total/7;
}
// 부족 알림 (하루 1회 SKU당)
function _alertedKey(){return 'invLowAlerted_v1'}
function _checkLowStockAlerts(invList){
  const alerted=ST.get(_alertedKey(),{});
  const today=new Date().toISOString().split('T')[0];
  // 다른 날 데이터 정리
  Object.keys(alerted).forEach(k=>{if(!k.endsWith('|'+today))delete alerted[k]});
  invList.forEach(i=>{
    if(!i.product)return;
    const avg=get7DayAvgForProduct(i.product);
    const threshold=avg*28; // 7일평균 × 4주
    const isLow=i.stock>0&&threshold>0&&i.stock<threshold;
    const key=`${i.sku||i.id}|${today}`;
    if(isLow&&!alerted[key]){
      addNotif({type:'inventory',icon:'⚠️',title:'재고 부족 알림',content:`${i.product} (${i.sku||'-'}) · 현재 ${i.stock}개 / 필요 약 ${Math.round(threshold)}개 (7일평균 ${avg.toFixed(1)}/일 × 4주)`,target:'ecommerce'});
      alerted[key]=true;
    }
  });
  ST.set(_alertedKey(),alerted);
}
function renderEcInventory(){
  const body=document.getElementById('ecInventoryBody');if(!body)return;
  const inv=getEcData('inventory');
  // 출처별 카운트
  const cnt={all:inv.length,naver_store:0,coupang:0,ezadmin:0,cj_eflex:0,manual:0};
  inv.forEach(i=>{const s=i.source||'manual';if(cnt[s]!==undefined)cnt[s]++});
  const ids=[['all','invSrcCntAll'],['naver_store','invSrcCntNaver'],['coupang','invSrcCntCoupang'],['ezadmin','invSrcCntEz'],['cj_eflex','invSrcCntCj'],['manual','invSrcCntManual']];
  ids.forEach(([k,id])=>{const el=document.getElementById(id);if(el)el.textContent=cnt[k]||0});
  document.querySelectorAll('[data-invsource]').forEach(c=>c.classList.toggle('active',c.dataset.invsource===_invSourceFilter));
  // 필터 적용
  const list=_invSourceFilter==='all'?inv:inv.filter(i=>(i.source||'manual')===_invSourceFilter);
  // 부족 알림 (전체 기준으로)
  _checkLowStockAlerts(inv);
  if(list.length===0){body.innerHTML='<tr><td colspan="8" class="text-center text-gray-400 py-4">조건에 맞는 재고가 없습니다.</td></tr>';return}
  body.innerHTML=list.map(i=>{
    const avg=get7DayAvgForProduct(i.product);
    const prevAvg=getPrev7DayAvgForProduct(i.product);
    const trend=avg>prevAvg*1.05?{ico:'▲',c:'text-red-600'}:avg<prevAvg*0.95?{ico:'▼',c:'text-blue-600'}:{ico:'·',c:'text-gray-400'};
    const threshold=avg*28;
    const st=i.stock===0?{l:'품절',c:'bg-red-50 text-red-600'}:(threshold>0&&i.stock<threshold)?{l:'부족',c:'bg-amber-50 text-amber-700'}:{l:'정상',c:'bg-green-50 text-green-700'};
    const sourceLabel=i.source==='naver_store'?'네이버':i.source==='coupang'?'쿠팡':i.source==='ezadmin'?'이지어드민':i.source==='cj_eflex'?'CJ Eflex':'수기';
    const sourceColor=i.source&&i.source!=='manual'?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-600';
    const avgCell=avg>0?`<span class="font-semibold">${avg.toFixed(1)}</span><span class="text-gray-400 text-[10px]">/일</span> <span class="${trend.c}">${trend.ico}</span><div class="text-[10px] text-gray-400">권장재고 ${Math.round(threshold)}개</div>`:`<span class="text-gray-400 text-xs">데이터 부족</span>`;
    return `<tr><td class="sheet-row-num"><input type="checkbox" class="ecChk-inventory" data-id="${i.id}" /></td><td contenteditable oninput="updEc('inventory',${i.id},'sku',this.textContent)" class="font-mono text-xs">${escapeHtml(i.sku||'')}</td><td contenteditable oninput="updEc('inventory',${i.id},'product',this.textContent)">${escapeHtml(i.product||'')}</td><td contenteditable oninput="updEc('inventory',${i.id},'stock',this.textContent)" class="text-center">${i.stock}</td><td class="text-xs">${avgCell}</td><td><span class="text-xs px-2 py-0.5 rounded ${st.c}">${st.l}</span></td><td><span class="text-xs px-2 py-0.5 rounded ${sourceColor}">${sourceLabel}</span></td><td class="text-[10px] text-gray-500">${i.lastSync?fmtDateYY(i.lastSync.slice(0,10))+' '+i.lastSync.slice(11,16):'-'}</td></tr>`;
  }).join('');
}

// ========== 이커머스 판매 분석 ==========
function openEcSalesAnalysis(){
  // 기본값: 기간A = 최근 7일, 기간B = 그 이전 7일
  const today=new Date();
  const d=(n)=>{const x=new Date(today);x.setDate(today.getDate()-n);return x.toISOString().split('T')[0]};
  document.getElementById('ecAnATo').value=d(0);
  document.getElementById('ecAnAFrom').value=d(6);
  document.getElementById('ecAnBTo').value=d(7);
  document.getElementById('ecAnBFrom').value=d(13);
  document.getElementById('ecAnResult').innerHTML='<p class="text-xs text-gray-400 text-center py-8">[▶ 분석 실행]을 눌러 결과를 확인하세요.</p>';
  openModal('ecSalesAnalysisModal');
}
function setEcAnPreset(p){
  const today=new Date();const d=(n)=>{const x=new Date(today);x.setDate(today.getDate()-n);return x.toISOString().split('T')[0]};
  if(p==='thisWeek'){
    const dow=today.getDay()||7;
    document.getElementById('ecAnAFrom').value=d(dow-1);
    document.getElementById('ecAnATo').value=d(0);
    document.getElementById('ecAnBFrom').value=d(dow-1+7);
    document.getElementById('ecAnBTo').value=d(dow);
  }else if(p==='thisMonth'){
    const y=today.getFullYear(),m=today.getMonth();
    const fmt=(dt)=>dt.toISOString().split('T')[0];
    document.getElementById('ecAnAFrom').value=fmt(new Date(y,m,1));
    document.getElementById('ecAnATo').value=d(0);
    document.getElementById('ecAnBFrom').value=fmt(new Date(y,m-1,1));
    document.getElementById('ecAnBTo').value=fmt(new Date(y,m,0));
  }
}
function _aggregate(rows,groupBy){
  if(groupBy==='total')return {'전체':{qty:rows.reduce((s,r)=>s+(r.qty||0),0),revenue:rows.reduce((s,r)=>s+(r.revenue||0),0)}};
  const m={};
  rows.forEach(r=>{const k=r[groupBy]||'(미지정)';if(!m[k])m[k]={qty:0,revenue:0};m[k].qty+=r.qty||0;m[k].revenue+=r.revenue||0;});
  return m;
}
function runEcSalesAnalysis(){
  const aFrom=document.getElementById('ecAnAFrom').value,aTo=document.getElementById('ecAnATo').value;
  const bFrom=document.getElementById('ecAnBFrom').value,bTo=document.getElementById('ecAnBTo').value;
  const groupBy=document.getElementById('ecAnGroupBy').value;
  if(!aFrom||!aTo){alert('기간 A를 입력하세요');return}
  const all=getEcData('sales');
  const inRange=(s,from,to)=>(!from||s.date>=from)&&(!to||s.date<=to);
  const a=all.filter(s=>inRange(s,aFrom,aTo));
  const useB=bFrom&&bTo;
  const b=useB?all.filter(s=>inRange(s,bFrom,bTo)):[];
  const aAgg=_aggregate(a,groupBy);
  const bAgg=_aggregate(b,groupBy);
  const aTotal={qty:a.reduce((s,r)=>s+(r.qty||0),0),revenue:a.reduce((s,r)=>s+(r.revenue||0),0)};
  const bTotal={qty:b.reduce((s,r)=>s+(r.qty||0),0),revenue:b.reduce((s,r)=>s+(r.revenue||0),0)};
  // 결합 키 목록
  const keys=[...new Set([...Object.keys(aAgg),...Object.keys(bAgg)])];
  const maxRev=Math.max(1,...keys.map(k=>Math.max(aAgg[k]?.revenue||0,bAgg[k]?.revenue||0)));
  const result=document.getElementById('ecAnResult');
  const fmt=(n)=>'₩'+(n||0).toLocaleString();
  const pctChg=(av,bv)=>{if(!bv)return av?'<span class="text-green-600">신규</span>':'-';const p=((av-bv)/bv*100);return `<span class="${p>=0?'text-green-600':'text-red-500'} font-semibold">${p>=0?'▲':'▼'} ${Math.abs(p).toFixed(1)}%</span>`};
  result.innerHTML=`
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      <div class="border border-blue-200 bg-blue-50 rounded p-2"><p class="text-[10px] text-blue-700">A 매출</p><p class="font-bold text-sm">${fmt(aTotal.revenue)}</p></div>
      <div class="border border-blue-200 bg-blue-50 rounded p-2"><p class="text-[10px] text-blue-700">A 판매량</p><p class="font-bold text-sm">${aTotal.qty.toLocaleString()}</p></div>
      ${useB?`<div class="border border-amber-200 bg-amber-50 rounded p-2"><p class="text-[10px] text-amber-700">B 매출</p><p class="font-bold text-sm">${fmt(bTotal.revenue)}</p></div>
      <div class="border border-amber-200 bg-amber-50 rounded p-2"><p class="text-[10px] text-amber-700">B 판매량</p><p class="font-bold text-sm">${bTotal.qty.toLocaleString()}</p></div>`:'<div class="col-span-2 border border-gray-200 rounded p-2 flex items-center justify-center text-xs text-gray-400">기간 B 미설정</div>'}
    </div>
    ${useB?`<div class="mb-4 p-3 border border-gray-200 rounded">
      <p class="text-xs text-gray-500 mb-1">전체 변화</p>
      <div class="flex items-center gap-4 text-sm">
        <div>매출: ${pctChg(aTotal.revenue,bTotal.revenue)} <span class="text-xs text-gray-400">(${fmt(aTotal.revenue-bTotal.revenue)})</span></div>
        <div>판매량: ${pctChg(aTotal.qty,bTotal.qty)} <span class="text-xs text-gray-400">(${(aTotal.qty-bTotal.qty).toLocaleString()})</span></div>
      </div>
    </div>`:''}
    <div class="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
      <table class="sheet-table">
        <thead><tr><th>${groupBy==='product'?'제품':groupBy==='brand'?'브랜드':'구분'}</th><th>A 매출</th><th>A 판매량</th>${useB?'<th>B 매출</th><th>B 판매량</th><th>매출 변화</th><th>판매량 변화</th>':''}<th>A 시각화</th></tr></thead>
        <tbody>
          ${keys.sort((x,y)=>(aAgg[y]?.revenue||0)-(aAgg[x]?.revenue||0)).map(k=>{
            const av=aAgg[k]||{qty:0,revenue:0};
            const bv=bAgg[k]||{qty:0,revenue:0};
            const wA=Math.round((av.revenue/maxRev)*100);
            return `<tr>
              <td><strong>${escapeHtml(k)}</strong></td>
              <td>${fmt(av.revenue)}</td>
              <td>${av.qty.toLocaleString()}</td>
              ${useB?`<td>${fmt(bv.revenue)}</td><td>${bv.qty.toLocaleString()}</td><td>${pctChg(av.revenue,bv.revenue)}</td><td>${pctChg(av.qty,bv.qty)}</td>`:''}
              <td style="min-width:120px"><div class="bg-blue-500 h-3 rounded" style="width:${wA}%"></div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ========== 이커머스: 주문/출고 (목업) ==========
const EC_PLATFORM_NAMES={naver:'네이버',coupang:'쿠팡',cafe24:'카페24','11st':'11번가',gmarket:'G마켓',etc:'기타'};
const EC_STATUS_LABELS={paid:{l:'결제완료',c:'bg-blue-50 text-blue-700'},preparing:{l:'출고대기',c:'bg-amber-50 text-amber-700'},onhold:{l:'출고보류',c:'bg-orange-50 text-orange-700'},shipped:{l:'배송중',c:'bg-purple-50 text-purple-700'},delivered:{l:'배송완료',c:'bg-green-50 text-green-700'},cancelled:{l:'취소',c:'bg-red-50 text-red-600'}};
let _ecOrdersStatusFilter='all';
function setEcOrdersStatusFilter(s){_ecOrdersStatusFilter=s;renderEcOrders();}
const COURIER_DEFAULT=['CJ대한통운','한진택배','롯데택배','우체국택배','로젠택배','쿠팡로지스틱스','한국통운'];
function getCourierList(){return ST.get('courier_list_v2',COURIER_DEFAULT.slice())}
function saveCourierList(arr){ST.set('courier_list_v2',arr)}
// 날짜 포맷 헬퍼: '2026-05-16' ↔ '26-05-16'
function fmtDateYY(s){if(!s||typeof s!=='string')return s||'';const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[1].slice(2)}-${m[2]}-${m[3]}`:s;}
function parseDateYY(s){if(!s)return s;s=s.trim();const m=s.match(/^(\d{2})-(\d{2})-(\d{2})$/);if(m){const y=parseInt(m[1]);return `${y<70?2000+y:1900+y}-${m[2]}-${m[3]}`}const m2=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m2?s:s;}
function getEcOrders(){
  return ST.get('ec_orders_v2',[
    {id:1,platform:'naver',accountLabel:'A몰 메인',orderNo:'2026-05-16-N0001',orderDate:'2026-05-16',product:'선크림 SPF50+',option:'50ml / 1+1',qty:2,customer:'홍길동',zipcode:'06236',addr:'서울시 강남구 테헤란로 123',phone:'010-1234-5678',status:'preparing',courier:'',tracking:''},
    {id:2,platform:'coupang',accountLabel:'본사 계정',orderNo:'C-26051600002',orderDate:'2026-05-16',product:'클렌징 폼',option:'대용량 200ml',qty:1,customer:'김영희',zipcode:'13561',addr:'경기도 성남시 분당구 정자동',phone:'010-2345-6789',status:'paid',courier:'',tracking:''},
    {id:3,platform:'cafe24',accountLabel:'공식몰',orderNo:'CF26051500003',orderDate:'2026-05-15',product:'토너 세트',option:'순한 / 200ml×2',qty:1,customer:'이철수',zipcode:'48095',addr:'부산시 해운대구 마린시티1로',phone:'010-3456-7890',status:'shipped',courier:'CJ대한통운',tracking:'1234567890'},
    {id:4,platform:'11st',accountLabel:'기본 계정',orderNo:'11ST-26051500004',orderDate:'2026-05-15',product:'프리미엄 보습 크림',option:'리뉴얼 / 80ml',qty:3,customer:'박지영',zipcode:'42104',addr:'대구시 수성구 동대구로',phone:'010-4567-8901',status:'delivered',courier:'한진택배',tracking:'5566778899'},
    {id:5,platform:'gmarket',accountLabel:'본사 ESM',orderNo:'GM26051600005',orderDate:'2026-05-16',product:'스킨케어 세트',option:'5종 풀세트',qty:1,customer:'최민수',zipcode:'21984',addr:'인천시 연수구 송도동',phone:'010-5678-9012',status:'paid',courier:'',tracking:''},
    {id:6,platform:'naver',accountLabel:'B몰 서브',orderNo:'2026-05-16-N0006',orderDate:'2026-05-16',product:'선크림 SPF50+',option:'50ml / 단품',qty:1,customer:'정수연',zipcode:'61949',addr:'광주시 서구 상무대로',phone:'010-6789-0123',status:'preparing',courier:'',tracking:''},
    {id:7,platform:'naver',accountLabel:'C몰 (할인전용)',orderNo:'2026-05-16-N0007',orderDate:'2026-05-16',product:'스킨케어 세트 (특가)',option:'간편 3종',qty:2,customer:'장미라',zipcode:'30100',addr:'세종시 가람로',phone:'010-7890-1234',status:'paid',courier:'',tracking:''},
    {id:8,platform:'coupang',accountLabel:'자회사 계정',orderNo:'C-26051600008',orderDate:'2026-05-16',product:'클렌징 폼',option:'기획 5+1',qty:5,customer:'한지원',zipcode:'04031',addr:'서울시 마포구 양화로',phone:'010-8901-2345',status:'preparing',courier:'',tracking:''}
  ]);
}
function saveEcOrders(d){ST.set('ec_orders_v2',d)}
function renderEcOrders(){
  const body=document.getElementById('ecOrdersBody');if(!body)return;
  _autoAssignPartners(); // 제품→거래처 매핑 자동 적용
  const orders=getEcOrders();
  // KPI 카운트
  const cnt={paid:0,preparing:0,onhold:0,shipped:0,delivered:0};
  orders.forEach(o=>{if(cnt[o.status]!==undefined)cnt[o.status]++});
  const elAll=document.getElementById('ecOrdersAll');if(elAll)elAll.textContent=orders.length;
  document.getElementById('ecOrdersPaid')&&(document.getElementById('ecOrdersPaid').textContent=cnt.paid);
  document.getElementById('ecOrdersPreparing')&&(document.getElementById('ecOrdersPreparing').textContent=cnt.preparing);
  document.getElementById('ecOrdersOnhold')&&(document.getElementById('ecOrdersOnhold').textContent=cnt.onhold);
  document.getElementById('ecOrdersShipped')&&(document.getElementById('ecOrdersShipped').textContent=cnt.shipped);
  document.getElementById('ecOrdersDelivered')&&(document.getElementById('ecOrdersDelivered').textContent=cnt.delivered);
  // 활성 카드 강조
  document.querySelectorAll('.ec-status-card').forEach(c=>c.classList.toggle('active',c.dataset.statuscard===_ecOrdersStatusFilter));
  // 필터
  const pf=document.getElementById('ecOrdersPlatformFilter')?.value||'all';
  const af=document.getElementById('ecOrdersAccountFilter')?.value||'all';
  const sf=_ecOrdersStatusFilter;
  // 계정 필터 옵션 갱신 (주문 + 등록 계정 합집합)
  const accSel=document.getElementById('ecOrdersAccountFilter');
  if(accSel){
    const fromOrders=[...new Set(orders.filter(o=>pf==='all'||o.platform===pf).map(o=>`${o.platform}|${o.accountLabel||'(기본)'}`))];
    const fromSettings=getActiveAccounts('ecommerce').filter(a=>pf==='all'||a.platformKey===pf).map(a=>`${a.platformKey}|${a.label}`);
    const allAcc=[...new Set([...fromOrders,...fromSettings])].sort();
    const prev=accSel.value;
    accSel.innerHTML='<option value="all">전체 계정</option>'+allAcc.map(k=>{const [p,l]=k.split('|');return `<option value="${escapeHtml(k)}">${EC_PLATFORM_NAMES[p]||p} · ${escapeHtml(l)}</option>`}).join('');
    if([...accSel.options].some(o=>o.value===prev))accSel.value=prev;
  }
  let list=orders;
  if(pf!=='all')list=list.filter(o=>o.platform===pf);
  if(af!=='all'){const [afp,afl]=af.split('|');list=list.filter(o=>o.platform===afp&&(o.accountLabel||'(기본)')===afl);}
  if(sf!=='all')list=list.filter(o=>o.status===sf);
  if(list.length===0){body.innerHTML='<tr><td colspan="16" class="text-center text-gray-400 py-4">조건에 맞는 주문이 없습니다.</td></tr>';return}
  const courierOpts=getCourierList().map(c=>`<option value="${c}">${c}</option>`).join('');
  const statusOpts=Object.entries(EC_STATUS_LABELS).map(([k,v])=>`<option value="${k}">${v.l}</option>`).join('');
  const partnerOpts=getPartners().map(p=>`<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
  body.innerHTML=list.map(o=>{
    const st=EC_STATUS_LABELS[o.status]||{l:o.status,c:'bg-gray-100'};
    const mappedProduct=getMappedProduct(o.product,o.option);
    const mappedOption=getMappedOption(o.product,o.option);
    const productChanged=mappedProduct!==o.product;
    const optionChanged=mappedOption!==(o.option||'');
    return `<tr ${o.sentToPartner?'class="bg-purple-50"':''}>
      <td class="sheet-row-num"><input type="checkbox" class="ecOrderChk" data-id="${o.id}" /></td>
      <td><span class="text-xs px-2 py-0.5 rounded bg-gray-100">${EC_PLATFORM_NAMES[o.platform]||o.platform}</span></td>
      <td class="text-xs text-gray-700">${escapeHtml(o.accountLabel||'(기본)')}</td>
      <td class="font-mono text-xs">${escapeHtml(o.orderNo)}</td>
      <td class="font-mono text-xs">${fmtDateYY(o.orderDate)}</td>
      <td>${escapeHtml(mappedProduct)}${productChanged?`<div class="text-[10px] text-gray-400">원본: ${escapeHtml(o.product)}</div>`:''}</td>
      <td class="text-xs text-gray-600">${escapeHtml(mappedOption||'-')}${optionChanged?`<div class="text-[10px] text-gray-400">원본: ${escapeHtml(o.option||'-')}</div>`:''}</td>
      <td><select onchange="setOrderPartner(${o.id},this.value)" class="text-xs border rounded px-1 py-0.5 bg-white"><option value="">미지정</option>${partnerOpts.replace('value="'+escapeHtml(o.partner||'')+'"','value="'+escapeHtml(o.partner||'')+'" selected')}</select>${o.sentToPartner?'<div class="text-[10px] text-purple-600 mt-0.5">📤 발주 전송됨</div>':''}</td>
      <td class="text-center">${o.qty}</td>
      <td>${escapeHtml(o.customer)}</td>
      <td class="font-mono text-xs">${escapeHtml(o.zipcode||'-')}</td>
      <td class="text-xs text-gray-600 max-w-xs truncate" title="${escapeHtml(o.addr)}">${escapeHtml(o.addr)}</td>
      <td><select onchange="changeEcOrderStatus(${o.id},this.value)" class="text-xs border rounded px-1 py-0.5 ${st.c}">${statusOpts.replace('value="'+o.status+'"','value="'+o.status+'" selected')}</select></td>
      <td><select onchange="updEcOrder(${o.id},'courier',this.value)" class="text-xs border rounded px-1 py-0.5 bg-white"><option value="">선택</option>${courierOpts.replace('value="'+o.courier+'"','value="'+o.courier+'" selected')}</select></td>
      <td><input value="${escapeHtml(o.tracking||'')}" oninput="updEcOrder(${o.id},'tracking',this.value)" placeholder="송장번호" class="text-xs border rounded px-2 py-0.5 w-32 bg-white font-mono" /></td>
      <td>${o.status==='preparing'||o.status==='paid'?`<button onclick="shipEcOrder(${o.id})" class="text-xs px-2 py-0.5 bg-black text-white rounded">출고</button>`:o.status==='shipped'?`<button onclick="deliverEcOrder(${o.id})" class="text-xs px-2 py-0.5 bg-green-600 text-white rounded">완료</button>`:'-'}</td>
    </tr>`;
  }).join('');
  _refreshEcOrderTemplateSel();
}
function changeEcOrderStatus(id,newStatus){
  const d=getEcOrders();const o=d.find(x=>x.id===id);if(!o)return;
  o.status=newStatus;saveEcOrders(d);renderEcOrders();
  showToast('🔄','상태 변경',`${o.customer} → ${EC_STATUS_LABELS[newStatus]?.l||newStatus}`);
}

// ----- 상품명/옵션명 매핑 -----
function _productMapKey(product,option){return `${product||''}|${option||''}`}
function getProductNameMap(){return ST.get('product_name_map_v1',{})}
function saveProductNameMap(m){ST.set('product_name_map_v1',m)}
function getMappedProduct(p,o){const m=getProductNameMap()[_productMapKey(p,o)];return m?.product||p}
function getMappedOption(p,o){const m=getProductNameMap()[_productMapKey(p,o)];return m?.option!==undefined&&m.option!==''?m.option:o}
function updProductNameMap(key,field,val){
  const m=getProductNameMap();
  if(!m[key])m[key]={};
  m[key][field]=val;
  saveProductNameMap(m);
}
function openProductNameMapModal(){renderProductNameMapTable();openModal('productNameMapModal')}
function renderProductNameMapTable(){
  const body=document.getElementById('productNameMapBody');if(!body)return;
  const orders=getEcOrders();
  const grouped={};
  orders.forEach(o=>{const k=_productMapKey(o.product,o.option);if(!grouped[k])grouped[k]={product:o.product||'',option:o.option||'',count:0};grouped[k].count++});
  const list=Object.entries(grouped).sort((a,b)=>b[1].count-a[1].count);
  if(list.length===0){body.innerHTML='<tr><td colspan="5" class="text-center text-gray-400 py-4">매핑할 상품이 없습니다.</td></tr>';return}
  const map=getProductNameMap();
  body.innerHTML=list.map(([k,v])=>{
    const m=map[k]||{};
    return `<tr>
      <td class="text-xs">${escapeHtml(v.product)}</td>
      <td class="text-xs text-gray-600">${escapeHtml(v.option||'-')}</td>
      <td contenteditable oninput="updProductNameMap('${escapeHtml(k).replace(/'/g,'&apos;')}','product',this.textContent);renderEcOrders()" class="text-xs">${escapeHtml(m.product||'')}</td>
      <td contenteditable oninput="updProductNameMap('${escapeHtml(k).replace(/'/g,'&apos;')}','option',this.textContent);renderEcOrders()" class="text-xs">${escapeHtml(m.option||'')}</td>
      <td class="text-center text-xs">${v.count}건</td>
    </tr>`;
  }).join('');
}

// ----- 제품 → 거래처 자동 매핑 -----
function getProductPartnerMap(){return ST.get('product_partner_map_v1',{})}
function saveProductPartnerMap(m){ST.set('product_partner_map_v1',m)}
function setOrderPartner(orderId,partnerName){
  const d=getEcOrders();const o=d.find(x=>x.id===orderId);if(!o)return;
  const oldPartner=o.partner;
  o.partner=partnerName;
  // 같은 상품의 매핑 자동 저장 (이후 같은 상품 주문은 자동 할당)
  if(o.product){
    const m=getProductPartnerMap();
    if(partnerName){
      m[o.product]=partnerName;
      // 같은 상품의 다른 주문에도 적용 (거래처 미지정 행만)
      d.forEach(x=>{if(x.product===o.product&&!x.partner)x.partner=partnerName});
    }else{
      delete m[o.product];
    }
    saveProductPartnerMap(m);
  }
  saveEcOrders(d);renderEcOrders();
  showToast('🤝','거래처 지정',`${o.product}${oldPartner&&oldPartner!==partnerName?'  '+oldPartner+' → ':''} ${partnerName||'(해제)'}`);
}
function _autoAssignPartners(){
  // 거래처 매핑된 상품의 미할당 주문 자동 적용
  const map=getProductPartnerMap();
  const d=getEcOrders();let changed=false;
  d.forEach(o=>{if(!o.partner&&o.product&&map[o.product]){o.partner=map[o.product];changed=true}});
  if(changed)saveEcOrders(d);
}

// ----- 주문 → 거래처 발주 전송 -----
function sendOrdersToPartner(){
  const ids=Array.from(document.querySelectorAll('.ecOrderChk:checked')).map(c=>parseInt(c.dataset.id));
  if(ids.length===0){alert('보낼 주문을 선택하세요');return}
  const d=getEcOrders();const selected=d.filter(o=>ids.includes(o.id));
  const withPartner=selected.filter(o=>o.partner);
  const withoutPartner=selected.length-withPartner.length;
  if(withPartner.length===0){alert('거래처가 지정된 주문이 없습니다. 행에서 거래처를 먼저 선택하세요.');return}
  // 거래처별 그룹핑
  const byPartner={};
  withPartner.forEach(o=>{
    if(!byPartner[o.partner])byPartner[o.partner]=[];
    byPartner[o.partner].push(o);
  });
  const preview=document.getElementById('sendToPartnerPreview');
  preview.innerHTML=Object.entries(byPartner).map(([partner,orders])=>{
    const items=orders.reduce((acc,o)=>{const k=`${o.product}|${o.option||''}`;if(!acc[k])acc[k]={product:o.product,option:o.option,qty:0};acc[k].qty+=parseInt(o.qty)||0;return acc},{});
    return `<div class="border border-gray-200 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2"><strong class="text-sm">${escapeHtml(partner)}</strong><span class="text-xs text-gray-400">주문 ${orders.length}건 · 품목 ${Object.keys(items).length}종</span></div>
      <div class="space-y-1">
        ${Object.values(items).map(i=>`<div class="text-xs flex justify-between border-b border-gray-100 py-1"><span>${escapeHtml(getMappedProduct(i.product,i.option))}${i.option?' / '+escapeHtml(getMappedOption(i.product,i.option)):''}</span><span class="font-mono">× ${i.qty}</span></div>`).join('')}
      </div>
    </div>`;
  }).join('')+(withoutPartner>0?`<div class="text-xs text-amber-600 mt-2">⚠️ 거래처 미지정 ${withoutPartner}건은 전송에서 제외됩니다.</div>`:'');
  // 데이터 임시 보관
  window._pendingSendToPartner={byPartner,orderIds:withPartner.map(o=>o.id)};
  openModal('sendToPartnerModal');
}
function confirmSendToPartner(){
  const data=window._pendingSendToPartner;if(!data)return;
  const today=new Date().toISOString().split('T')[0];
  const partnerOrders=getPartnerData('order');
  let totalAdded=0;
  Object.entries(data.byPartner).forEach(([partner,orders])=>{
    // 발주 항목으로 묶기 (제품+옵션 단위로 집계, 원본 주문 id 보존)
    const items={};
    orders.forEach(o=>{
      const displayProduct=getMappedProduct(o.product,o.option);
      const displayOption=getMappedOption(o.product,o.option);
      const key=`${displayProduct}|${displayOption}`;
      if(!items[key])items[key]={product:displayProduct,option:displayOption,qty:0,sourceOrderIds:[]};
      items[key].qty+=parseInt(o.qty)||0;
      items[key].sourceOrderIds.push(o.id);
    });
    Object.values(items).forEach(item=>{
      // v2 컬럼: col1=발주일 / col2=제품 / col3=수량 / col4=단가 / col5=금액 / col6=상태 / col7=택배사 / col8=송장번호
      partnerOrders.push({
        partner,
        col1:today,
        col2:item.option?`${item.product} / ${item.option}`:item.product,
        col3:String(item.qty),
        col4:'',
        col5:'',
        col6:'대기',
        col7:'',
        col8:'',
        sourceOrderIds:item.sourceOrderIds
      });
      totalAdded++;
    });
  });
  savePartnerData('order',partnerOrders);
  // 보낸 주문에 mark
  const d=getEcOrders();
  data.orderIds.forEach(id=>{const o=d.find(x=>x.id===id);if(o)o.sentToPartner=true});
  saveEcOrders(d);renderEcOrders();
  closeModal('sendToPartnerModal');
  showToast('📤','발주 전송 완료',`거래처 ${Object.keys(data.byPartner).length}곳 · 발주 ${totalAdded}건`);
  // 거래처 페이지로 이동? 일단 알림으로
  addNotif({type:'order',icon:'📤',title:'발주 전송 알림',content:`이커머스에서 ${totalAdded}건 발주 자동 등록`,target:'partners'});
}
function updEcOrder(id,key,val){
  const d=getEcOrders();const o=d.find(x=>x.id===id);
  if(o){o[key]=val;saveEcOrders(d)}
}
function shipEcOrder(id){
  const d=getEcOrders();const o=d.find(x=>x.id===id);if(!o)return;
  if(!o.courier||!o.tracking){alert('택배사와 송장번호를 먼저 입력하세요');return}
  o.status='shipped';saveEcOrders(d);renderEcOrders();
  showToast('📦','출고 처리',`${o.customer} · ${o.tracking}`);
  // TODO: 실제 API 호출 위치 (settings에서 API 키 등록되면 호출)
  // window.ExtAPI?.markShipped(o.platform, o.orderNo, o.courier, o.tracking)
}
function deliverEcOrder(id){
  const d=getEcOrders();const o=d.find(x=>x.id===id);if(!o)return;
  o.status='delivered';saveEcOrders(d);renderEcOrders();
  showToast('✅','배송완료',o.customer);
}
function ecToggleAllOrders(c){document.querySelectorAll('.ecOrderChk').forEach(x=>x.checked=c)}
function bulkShipEcOrders(){
  const ids=Array.from(document.querySelectorAll('.ecOrderChk:checked')).map(c=>parseInt(c.dataset.id));
  if(ids.length===0){alert('주문을 선택하세요');return}
  const d=getEcOrders();let ok=0,fail=0;
  ids.forEach(id=>{
    const o=d.find(x=>x.id===id);
    if(o&&o.courier&&o.tracking&&(o.status==='paid'||o.status==='preparing')){o.status='shipped';ok++}
    else if(o&&(o.status==='paid'||o.status==='preparing'))fail++;
  });
  saveEcOrders(d);renderEcOrders();
  showToast('📦','일괄 출고',`성공 ${ok}건${fail?' / 송장 누락 '+fail+'건':''}`);
}
// ----- 택배사 관리 -----
function openCourierMgmtModal(){renderCourierList();openModal('courierMgmtModal');}
function renderCourierList(){
  const box=document.getElementById('courierListBox');if(!box)return;
  const list=getCourierList();
  box.innerHTML=list.length===0?'<p class="text-xs text-gray-400 text-center py-3">등록된 택배사가 없습니다.</p>':list.map((c,i)=>`<div class="flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded text-xs"><span class="flex-1">${escapeHtml(c)}</span><button onclick="delCourier(${i})" class="text-red-500 hover:text-red-700">🗑</button></div>`).join('');
}
function addCourier(){
  const inp=document.getElementById('newCourierName');const name=inp.value.trim();
  if(!name){inp.focus();return}
  const list=getCourierList();
  if(list.includes(name)){alert('이미 등록된 택배사입니다');return}
  list.push(name);saveCourierList(list);inp.value='';renderCourierList();renderEcOrders();
  showToast('+','택배사 추가',name);
}
function delCourier(idx){
  const list=getCourierList();
  if(!confirm(`'${list[idx]}' 을(를) 삭제하시겠습니까?`))return;
  list.splice(idx,1);saveCourierList(list);renderCourierList();renderEcOrders();
  showToast('🗑','택배사 삭제','');
}

// ----- 엑셀 양식 관리 -----
const EC_ORDER_ALL_COLUMNS=[
  {k:'platform',l:'플랫폼'},{k:'accountLabel',l:'스토어명'},
  {k:'orderNo',l:'주문번호'},{k:'orderDate',l:'주문일'},
  {k:'product',l:'상품'},{k:'option',l:'옵션'},{k:'partner',l:'거래처'},{k:'qty',l:'수량'},
  {k:'customer',l:'주문자'},{k:'zipcode',l:'우편번호'},{k:'addr',l:'주소'},{k:'phone',l:'전화번호'},
  {k:'status',l:'상태'},{k:'courier',l:'택배사'},{k:'tracking',l:'송장번호'}
];
const EC_ORDER_TEMPLATES_DEFAULT=[
  {id:'tpl_ship',name:'출고용',columns:['orderNo','product','option','qty','customer','zipcode','addr','phone','courier','tracking'],builtin:true},
  {id:'tpl_waybill',name:'송장용',columns:['orderNo','customer','zipcode','addr','phone','product','option','qty'],builtin:true}
];
function getEcOrderTemplates(){
  const list=ST.get('ec_order_templates',EC_ORDER_TEMPLATES_DEFAULT.slice());
  // 'tpl_all' 또는 '전체' 라벨 양식 자동 제거 (구버전 잔존 처리)
  const filtered=list.filter(t=>t.id!=='tpl_all'&&t.name!=='전체');
  if(filtered.length!==list.length)ST.set('ec_order_templates',filtered);
  return filtered;
}
function saveEcOrderTemplates(t){ST.set('ec_order_templates',t)}
function _refreshEcOrderTemplateSel(){
  // 양식 dropdown은 제거됨 (이제 다운로드 모달에서 선택)
  return;
  const sel=document.getElementById('ecOrdersTemplateSel');if(!sel)return;
  const prev=sel.value;
  const tpls=getEcOrderTemplates();
  sel.innerHTML=tpls.map(t=>`<option value="${t.id}">${escapeHtml(t.name)} (${t.columns.length}컬럼)</option>`).join('');
  if([...sel.options].some(o=>o.value===prev))sel.value=prev;
}
function openOrderTemplateModal(){
  renderOrderTemplateList();renderNewTemplateCols();
  document.getElementById('newTemplateName').value='';
  openModal('orderTemplateModal');
}
function renderOrderTemplateList(){
  const box=document.getElementById('orderTemplateList');if(!box)return;
  const tpls=getEcOrderTemplates();
  box.innerHTML=tpls.map(t=>{
    const colLabels=t.columns.map(k=>EC_ORDER_ALL_COLUMNS.find(c=>c.k===k)?.l||k).join(', ');
    return `<div class="border border-gray-200 rounded p-2">
      <div class="flex items-center gap-2">
        <strong class="text-sm">${escapeHtml(t.name)}</strong>
        <span class="text-xs text-gray-400">${t.columns.length}컬럼${t.builtin?' · 기본':''}</span>
        ${t.builtin?'':`<button onclick="delOrderTemplate('${t.id}')" class="ml-auto text-red-500 hover:text-red-700 text-sm">🗑</button>`}
      </div>
      <p class="text-xs text-gray-500 mt-1">${escapeHtml(colLabels)}</p>
    </div>`;
  }).join('');
}
function renderNewTemplateCols(){
  const box=document.getElementById('newTemplateCols');if(!box)return;
  box.innerHTML=EC_ORDER_ALL_COLUMNS.map(c=>`<label class="flex items-center gap-1.5 text-xs"><input type="checkbox" class="newTplCol" value="${c.k}" class="w-3.5 h-3.5 accent-black" /><span>${c.l}</span></label>`).join('');
}
function addOrderTemplate(){
  const name=document.getElementById('newTemplateName').value.trim();
  if(!name){alert('양식 이름을 입력하세요');return}
  const cols=Array.from(document.querySelectorAll('.newTplCol:checked')).map(c=>c.value);
  if(cols.length===0){alert('최소 1개 이상의 컬럼을 선택하세요');return}
  const tpls=getEcOrderTemplates();
  tpls.push({id:'tpl_'+Date.now(),name,columns:cols});
  saveEcOrderTemplates(tpls);renderOrderTemplateList();_refreshEcOrderTemplateSel();
  document.getElementById('newTemplateName').value='';
  document.querySelectorAll('.newTplCol:checked').forEach(c=>c.checked=false);
  showToast('+','양식 추가',name);
}
function delOrderTemplate(id){
  const tpls=getEcOrderTemplates();const t=tpls.find(x=>x.id===id);if(!t)return;
  if(t.builtin){alert('기본 양식은 삭제할 수 없습니다');return}
  if(!confirm(`'${t.name}' 양식을 삭제하시겠습니까?`))return;
  saveEcOrderTemplates(tpls.filter(x=>x.id!==id));
  renderOrderTemplateList();_refreshEcOrderTemplateSel();showToast('🗑','양식 삭제','');
}

// ----- CSV 다운로드 (UTF-8 BOM, 엑셀 호환) -----
function downloadCSV(filename,rows){
  const esc=v=>{const s=v==null?'':String(v);return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
  const csv=rows.map(r=>r.map(esc).join(',')).join('\r\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url)},100);
}
function openExcelDownloadModal(){
  const tpls=getEcOrderTemplates();
  if(tpls.length===0){alert('등록된 양식이 없습니다. [양식 관리]에서 먼저 추가하세요.');return}
  const checked=Array.from(document.querySelectorAll('.ecOrderChk:checked')).length;
  document.getElementById('excelDlScope').textContent=checked>0?`(선택된 ${checked}건)`:`(현재 필터 결과 전체)`;
  document.getElementById('excelDlTemplateList').innerHTML=tpls.map(t=>`<button onclick="downloadEcOrdersExcel('${t.id}')" class="w-full text-left border border-gray-200 rounded p-3 hover:border-black hover:bg-gray-50 transition"><strong class="text-sm">${escapeHtml(t.name)}</strong><span class="ml-2 text-xs text-gray-500">${t.columns.length}컬럼</span><p class="text-[10px] text-gray-400 mt-1 truncate">${t.columns.map(k=>EC_ORDER_ALL_COLUMNS.find(c=>c.k===k)?.l||k).join(', ')}</p></button>`).join('');
  openModal('excelDownloadModal');
}
function downloadEcOrdersExcel(tplId){
  const tpl=getEcOrderTemplates().find(t=>t.id===tplId)||getEcOrderTemplates()[0];
  if(!tpl){alert('양식을 선택하세요');return}
  closeModal('excelDownloadModal');
  // 필터된 주문 사용 (체크된 게 있으면 선택분만, 아니면 필터 결과 전체)
  const checked=Array.from(document.querySelectorAll('.ecOrderChk:checked')).map(c=>parseInt(c.dataset.id));
  const orders=getEcOrders();
  const pf=document.getElementById('ecOrdersPlatformFilter')?.value||'all';
  const af=document.getElementById('ecOrdersAccountFilter')?.value||'all';
  const sf=_ecOrdersStatusFilter;
  let list=orders;
  if(checked.length>0)list=list.filter(o=>checked.includes(o.id));
  else{
    if(pf!=='all')list=list.filter(o=>o.platform===pf);
    if(af!=='all'){const [afp,afl]=af.split('|');list=list.filter(o=>o.platform===afp&&(o.accountLabel||'(기본)')===afl);}
    if(sf!=='all')list=list.filter(o=>o.status===sf);
  }
  if(list.length===0){alert('내보낼 주문이 없습니다');return}
  const header=tpl.columns.map(k=>EC_ORDER_ALL_COLUMNS.find(c=>c.k===k)?.l||k);
  const body=list.map(o=>tpl.columns.map(k=>{
    if(k==='platform')return EC_PLATFORM_NAMES[o.platform]||o.platform;
    if(k==='orderDate')return fmtDateYY(o.orderDate);
    if(k==='status')return EC_STATUS_LABELS[o.status]?.l||o.status;
    if(k==='product')return getMappedProduct(o.product,o.option);
    if(k==='option')return getMappedOption(o.product,o.option);
    return o[k]??'';
  }));
  const today=new Date().toISOString().slice(2,10);
  downloadCSV(`주문_${tpl.name}_${today}.csv`,[header,...body]);
  showToast('📥','엑셀 다운로드',`${tpl.name} · ${list.length}건`);
}

function printEcWaybills(){
  const ids=Array.from(document.querySelectorAll('.ecOrderChk:checked')).map(c=>parseInt(c.dataset.id));
  if(ids.length===0){alert('주문을 선택하세요');return}
  // 택배사 선택 모달 오픈
  document.getElementById('bulkShipCount').textContent=ids.length;
  const sel=document.getElementById('bulkShipCourier');
  const couriers=getCourierList();
  sel.innerHTML='<option value="">-- 택배사 선택 --</option>'+couriers.map(c=>`<option value="${c}">${c}</option>`).join('');
  // 기존 송장이 모두 같은 택배사면 기본 선택
  const d=getEcOrders();const list=d.filter(o=>ids.includes(o.id));
  const courierSet=new Set(list.map(o=>o.courier).filter(Boolean));
  if(courierSet.size===1)sel.value=[...courierSet][0];
  openModal('bulkShipPrintModal');
}
function confirmBulkPrint(){
  const courier=document.getElementById('bulkShipCourier').value;
  if(!courier){alert('택배사를 선택하세요');return}
  const autoTracking=document.getElementById('bulkShipAutoTracking').checked;
  const markShipped=document.getElementById('bulkShipMarkShipped').checked;
  const ids=Array.from(document.querySelectorAll('.ecOrderChk:checked')).map(c=>parseInt(c.dataset.id));
  if(ids.length===0){closeModal('bulkShipPrintModal');return}
  const d=getEcOrders();
  ids.forEach(id=>{
    const o=d.find(x=>x.id===id);if(!o)return;
    o.courier=courier;
    if(autoTracking&&!o.tracking){o.tracking=`${Date.now().toString().slice(-10)}${String(id).padStart(3,'0')}`.slice(0,13);}
    if(markShipped&&(o.status==='paid'||o.status==='preparing'))o.status='shipped';
  });
  saveEcOrders(d);
  const list=d.filter(o=>ids.includes(o.id));
  closeModal('bulkShipPrintModal');
  renderEcOrders();
  _doPrintWaybills(list);
  showToast('🖨','송장 출력',`${courier} · ${list.length}건`);
}
function _doPrintWaybills(list){
  const html=`<html><head><title>송장 출력</title><style>
    @page{size:A6;margin:5mm}
    body{font-family:'맑은 고딕',sans-serif;margin:0;padding:8px;font-size:11px}
    .label{border:2px solid #000;padding:8px;margin-bottom:12px;page-break-after:always}
    .label:last-child{page-break-after:auto}
    h3{margin:0 0 6px 0;font-size:13px;border-bottom:1px solid #000;padding-bottom:4px}
    .row{display:flex;gap:8px;margin:3px 0}
    .row strong{min-width:60px}
    .tracking{font-size:14px;font-weight:bold;text-align:center;margin-top:8px;padding:6px;background:#000;color:#fff}
  </style></head><body>
  ${list.map(o=>`<div class="label">
    <h3>${EC_PLATFORM_NAMES[o.platform]||o.platform} · ${o.orderNo}</h3>
    <div class="row"><strong>받는분:</strong>${escapeHtml(o.customer)} (${escapeHtml(o.phone||'-')})</div>
    <div class="row"><strong>우편번호:</strong>${escapeHtml(o.zipcode||'-')}</div>
    <div class="row"><strong>주소:</strong>${escapeHtml(o.addr)}</div>
    <div class="row"><strong>상품:</strong>${escapeHtml(getMappedProduct(o.product,o.option))}${getMappedOption(o.product,o.option)?' / '+escapeHtml(getMappedOption(o.product,o.option)):''} × ${o.qty}</div>
    <div class="row"><strong>택배사:</strong>${escapeHtml(o.courier||'(미지정)')}</div>
    <div class="tracking">${escapeHtml(o.tracking||'송장번호 미입력')}</div>
  </div>`).join('')}
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
  </body></html>`;
  const w=window.open('','_blank','width=400,height=600');
  if(!w){alert('팝업 차단을 해제하세요');return}
  w.document.write(html);w.document.close();
}
async function syncEcOrders(){
  // 실제 API 연동 자리. 현재는 목업.
  // 활성화된 이커머스 계정이 있으면 그 중 랜덤하게 1건 가져오는 형태로 시뮬레이션
  const activeAccs=getActiveAccounts('ecommerce').filter(a=>a.enabled);
  const d=getEcOrders();
  const today=new Date();const yy=String(today.getFullYear()).slice(-2);const mm=String(today.getMonth()+1).padStart(2,'0');const dd=String(today.getDate()).padStart(2,'0');
  let platform,accountLabel;
  if(activeAccs.length>0){
    const picked=activeAccs[Math.floor(Math.random()*activeAccs.length)];
    platform=picked.platformKey;accountLabel=picked.label;
    showToast('🔄',`${EC_PLATFORM_NAMES[platform]||platform} 동기화`,picked.label+' · 신규 주문 1건');
  }else{
    const platforms=Object.keys(EC_PLATFORM_NAMES);
    platform=platforms[Math.floor(Math.random()*platforms.length)];
    accountLabel='(미등록 계정)';
    showToast('🔄','동기화 시뮬레이션','설정 ▸ API 연동에서 계정 추가 시 실연동');
  }
  d.unshift({
    id:Date.now(),platform,accountLabel,orderNo:`MOCK-${yy}${mm}${dd}-${Math.floor(Math.random()*9000+1000)}`,
    orderDate:`20${yy}-${mm}-${dd}`,product:'신규 주문 상품',qty:Math.floor(Math.random()*3)+1,
    customer:'신규고객'+Math.floor(Math.random()*100),zipcode:String(Math.floor(Math.random()*89999+10000)),addr:'주소 정보',phone:'010-0000-0000',option:'기본 옵션',
    status:'paid',courier:'',tracking:''
  });
  saveEcOrders(d);renderEcOrders();
}
async function syncAdsPerformance(){
  const activeAccs=getActiveAccounts('ads').filter(a=>a.enabled);
  if(activeAccs.length===0){
    showToast('🔄','광고 성과 동기화','등록된 계정 없음 (설정 ▸ API 연동에서 추가)');
    return;
  }
  // 활성 계정의 캠페인 성과를 시뮬레이션으로 ±5% 변동
  const ads=getAds();
  ads.forEach(a=>{
    if(a.status==='진행중'){
      a.spent=Math.round(a.spent*(1+(Math.random()*0.1-0.05)));
      a.impr=Math.round(a.impr*(1+(Math.random()*0.1-0.05)));
      a.clicks=Math.round(a.clicks*(1+(Math.random()*0.1-0.05)));
    }
  });
  saveAds(ads);renderAds();
  showToast('🔄','광고 성과 동기화',`${activeAccs.length}개 계정 갱신`);
}

// ========== 외부 API 연동 설정 (이커머스/광고) - 다중 계정 ==========
const EXT_API_PROVIDERS=[
  {id:'naver_store',name:'네이버 스마트스토어',cat:'ecommerce',platformKey:'naver',fields:[{k:'clientId',l:'Client ID'},{k:'clientSecret',l:'Client Secret'}]},
  {id:'coupang',name:'쿠팡 Wing',cat:'ecommerce',platformKey:'coupang',fields:[{k:'accessKey',l:'Access Key'},{k:'secretKey',l:'Secret Key'},{k:'vendorId',l:'Vendor ID'}]},
  {id:'cafe24',name:'카페24',cat:'ecommerce',platformKey:'cafe24',fields:[{k:'mallId',l:'Mall ID'},{k:'clientId',l:'Client ID'},{k:'clientSecret',l:'Client Secret'}]},
  {id:'11st',name:'11번가',cat:'ecommerce',platformKey:'11st',fields:[{k:'apiKey',l:'API Key'}]},
  {id:'gmarket',name:'G마켓 / 옥션 (ESM)',cat:'ecommerce',platformKey:'gmarket',fields:[{k:'esmId',l:'ESM ID'},{k:'apiKey',l:'API Key'}]},
  {id:'naver_sa',name:'네이버 검색광고 (SA)',cat:'ads',platformKey:'naver_sa',fields:[{k:'apiKey',l:'API Key'},{k:'secretKey',l:'Secret Key'},{k:'customerId',l:'Customer ID'}]},
  {id:'naver_gfa',name:'네이버 GFA (디스플레이 광고)',cat:'ads',platformKey:'naver_gfa',fields:[{k:'apiKey',l:'API Key'},{k:'secretKey',l:'Secret Key'},{k:'adAccountId',l:'광고계정 ID'}]},
  {id:'kakao_moment',name:'카카오 모먼트',cat:'ads',platformKey:'kakao_moment',fields:[{k:'apiKey',l:'REST API Key'},{k:'adAccountId',l:'광고계정 ID'}]},
  {id:'google_ads',name:'Google Ads',cat:'ads',platformKey:'google_ads',fields:[{k:'developerToken',l:'Developer Token'},{k:'clientId',l:'Client ID'},{k:'clientSecret',l:'Client Secret'},{k:'refreshToken',l:'Refresh Token'}]},
  {id:'meta_ads',name:'Meta Ads (Facebook/Instagram)',cat:'ads',platformKey:'meta_ads',fields:[{k:'accessToken',l:'Access Token'},{k:'adAccountId',l:'광고계정 ID'}]},
  {id:'goodsflow',name:'굿스플로 (통합 택배 송장)',cat:'shipping',platformKey:'goodsflow',fields:[{k:'apiKey',l:'API Key'}]},
  {id:'ezadmin',name:'이지어드민 (재고/주문 관리)',cat:'erp',platformKey:'ezadmin',fields:[{k:'apiKey',l:'API Key'},{k:'companyCode',l:'업체 코드'}]},
  {id:'cj_eflex',name:'CJ LoIS Eflex (WMS) · API 미지원',cat:'wms',platformKey:'cj_eflex',note:'표준 공개 OpenAPI 미제공 — CSV 업로드 방식으로만 연동 가능',fields:[{k:'centerCode',l:'센터 코드 (선택)'},{k:'memo',l:'메모'}]},
];
const EXT_API_CAT_NAMES={ecommerce:'🛍️ 이커머스',ads:'📣 광고',shipping:'🚚 택배',erp:'📦 ERP / 재고',wms:'🏭 WMS / 물류센터'};
function getExtApiSettings(){
  const raw=ST.get('extApiSettings',{});
  // 구버전 호환: 단일 계정 → accounts 배열로 마이그레이션
  let migrated=false;
  EXT_API_PROVIDERS.forEach(p=>{
    if(!raw[p.id])raw[p.id]={accounts:[]};
    else if(!Array.isArray(raw[p.id].accounts)){
      const old=raw[p.id];
      const hasData=p.fields.some(f=>old[f.k]);
      raw[p.id]={accounts: hasData ? [{id:p.id+'_1',label:p.name,enabled:!!old.enabled,...Object.fromEntries(p.fields.map(f=>[f.k,old[f.k]||'']))}] : []};
      migrated=true;
    }
  });
  if(migrated)ST.set('extApiSettings',raw);
  return raw;
}
function saveExtApiSettings(){
  const all=getExtApiSettings();
  EXT_API_PROVIDERS.forEach(p=>{
    const accounts=all[p.id].accounts||[];
    accounts.forEach(acc=>{
      const labelEl=document.getElementById(`extapi-${acc.id}-label`);
      if(labelEl)acc.label=labelEl.value||p.name;
      acc.enabled=!!document.getElementById(`extapi-${acc.id}-enabled`)?.checked;
      p.fields.forEach(f=>{
        const el=document.getElementById(`extapi-${acc.id}-${f.k}`);
        if(el)acc[f.k]=el.value;
      });
    });
    all[p.id].accounts=accounts;
  });
  ST.set('extApiSettings',all);
  showToast('💾','API 설정 저장','전체 계정 저장됨');
}
function addExtApiAccount(providerId){
  const all=getExtApiSettings();
  const p=EXT_API_PROVIDERS.find(x=>x.id===providerId);if(!p)return;
  const accounts=all[providerId].accounts||[];
  const newAcc={id:`${providerId}_${Date.now()}`,label:`${p.name} #${accounts.length+1}`,enabled:false};
  p.fields.forEach(f=>newAcc[f.k]='');
  accounts.push(newAcc);
  all[providerId].accounts=accounts;
  ST.set('extApiSettings',all);
  renderExtApiSettings();
  showToast('➕','계정 추가됨','저장 후 동기화 가능');
}
function delExtApiAccount(providerId,accountId){
  if(!confirm('이 계정을 삭제하시겠습니까?'))return;
  const all=getExtApiSettings();
  all[providerId].accounts=(all[providerId].accounts||[]).filter(a=>a.id!==accountId);
  ST.set('extApiSettings',all);
  renderExtApiSettings();
  showToast('🗑','계정 삭제됨','');
}
function renderExtApiSettings(){
  const list=document.getElementById('extApiList');if(!list)return;
  const settings=getExtApiSettings();
  const catNames=EXT_API_CAT_NAMES;
  const byCat={};
  EXT_API_PROVIDERS.forEach(p=>{(byCat[p.cat]=byCat[p.cat]||[]).push(p)});
  list.innerHTML=Object.entries(byCat).map(([cat,ps])=>`
    <div class="border border-gray-200 rounded-lg p-4">
      <h3 class="text-sm font-bold mb-3">${catNames[cat]||cat}</h3>
      <div class="space-y-3">
        ${ps.map(p=>{
          const accounts=(settings[p.id]?.accounts)||[];
          const enabledCnt=accounts.filter(a=>a.enabled).length;
          return `<div class="border border-gray-100 rounded-lg p-3">
            ${p.note?`<div class="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2">⚠️ ${escapeHtml(p.note)}</div>`:''}
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-medium">${p.name}</span>
              <span class="text-xs text-gray-400">${accounts.length}개 계정${enabledCnt?` · ${enabledCnt}개 활성`:''}</span>
              <button onclick="addExtApiAccount('${p.id}')" class="ml-auto text-xs px-2 py-1 bg-black text-white rounded">+ 계정 추가</button>
            </div>
            ${accounts.length===0?'<p class="text-xs text-gray-400 py-2 text-center">등록된 계정이 없습니다. [+ 계정 추가]로 시작하세요.</p>':accounts.map(acc=>`
              <details class="border border-gray-100 rounded p-2 mb-2 bg-gray-50" ${acc.enabled?'open':''}>
                <summary class="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" id="extapi-${acc.id}-enabled" ${acc.enabled?'checked':''} onclick="event.stopPropagation()" class="w-3.5 h-3.5 accent-black" />
                  <strong>${escapeHtml(acc.label||p.name)}</strong>
                  <span class="ml-auto text-gray-400">${acc.enabled?'활성':'비활성'}</span>
                  <button onclick="event.preventDefault();event.stopPropagation();delExtApiAccount('${p.id}','${acc.id}')" class="text-red-500 hover:text-red-700" title="삭제">🗑</button>
                </summary>
                <div class="mt-2 space-y-2">
                  <div><label class="block text-xs text-gray-600 mb-1">계정 별칭</label><input id="extapi-${acc.id}-label" type="text" value="${escapeHtml(acc.label||'')}" placeholder="예: A몰 메인스토어" class="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white" /></div>
                  ${p.fields.map(f=>`<div><label class="block text-xs text-gray-600 mb-1">${f.l}</label><input id="extapi-${acc.id}-${f.k}" type="text" value="${escapeHtml(acc[f.k]||'')}" placeholder="${f.l} 입력" class="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono bg-white" /></div>`).join('')}
                </div>
              </details>
            `).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}
// 활성 계정 조회 헬퍼
function getActiveAccounts(cat){
  const settings=getExtApiSettings();
  const result=[];
  EXT_API_PROVIDERS.filter(p=>!cat||p.cat===cat).forEach(p=>{
    (settings[p.id]?.accounts||[]).forEach(acc=>{
      result.push({providerId:p.id,providerName:p.name,platformKey:p.platformKey,accountId:acc.id,label:acc.label||p.name,enabled:!!acc.enabled});
    });
  });
  return result;
}

// ========== 재고 플랫폼 연동 (목업) ==========
async function syncInventoryFromPlatform(providerId){
  const labels={naver_store:'네이버 스마트스토어',coupang:'쿠팡 Wing',ezadmin:'이지어드민'};
  const label=labels[providerId]||providerId;
  // 활성 계정 확인
  const accs=(getExtApiSettings()[providerId]?.accounts||[]).filter(a=>a.enabled);
  if(accs.length===0){
    showToast('⚠️',`${label} 연동 안내`,'활성 계정 없음 — 설정 ▸ API 연동에서 키 등록 필요 (현재 목업 동작)');
  }
  // 목업: 기존 SKU 중 일부의 재고를 랜덤 변경 + 신규 SKU 1개 추가 가능
  const inv=getEcData('inventory');
  const now=new Date().toISOString();
  let updated=0;
  inv.forEach(i=>{
    if(Math.random()<0.6){
      i.stock=Math.max(0,Math.round(i.stock*(0.6+Math.random()*0.8)));
      i.source=providerId;i.lastSync=now;updated++;
    }
  });
  // 50% 확률로 신규 SKU 발견
  if(Math.random()<0.5){
    const newSku='AUTO-'+String(Math.floor(Math.random()*9000+1000));
    inv.push({id:Date.now(),sku:newSku,product:`${label} 신규 상품`,stock:Math.floor(Math.random()*200+10),min:10,source:providerId,lastSync:now});
    updated++;
  }
  saveEcData('inventory',inv);renderEcommerce();
  showToast('🔄',`${label} 재고 동기화`,`${updated}건 갱신 (목업)`);
}
async function uploadCjEflexCsv(input){
  const file=input.files?.[0];if(!file)return;
  const text=await file.text();
  input.value=''; // 같은 파일 재선택 가능하도록 초기화
  // CSV 파싱: 헤더 행 + 데이터
  const lines=text.split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2){alert('CSV에 데이터가 없습니다');return}
  const header=lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
  // 컬럼 자동 인식 (SKU, 제품명, 재고)
  const findCol=(...keys)=>{for(const k of keys){const i=header.findIndex(h=>h.toLowerCase().includes(k.toLowerCase()));if(i>=0)return i}return -1};
  const colSku=findCol('sku','품목코드','상품코드');
  const colProduct=findCol('product','상품명','품목명');
  const colStock=findCol('stock','재고','수량');
  if(colSku<0||colStock<0){alert('CSV 형식을 인식할 수 없습니다.\nSKU/재고 컬럼이 필요합니다.\n\n예: SKU,상품명,재고\nSK-001,스킨케어,234');return}
  const inv=getEcData('inventory');const now=new Date().toISOString();let added=0,updated=0;
  for(let i=1;i<lines.length;i++){
    const parts=lines[i].split(',').map(p=>p.trim().replace(/^"|"$/g,''));
    const sku=parts[colSku];if(!sku)continue;
    const product=colProduct>=0?parts[colProduct]:'';
    const stock=parseInt(parts[colStock])||0;
    const existing=inv.find(x=>x.sku===sku);
    if(existing){existing.stock=stock;if(product)existing.product=product;existing.source='cj_eflex';existing.lastSync=now;updated++;}
    else{inv.push({id:Date.now()+i,sku,product:product||sku,stock,min:10,source:'cj_eflex',lastSync:now});added++;}
  }
  saveEcData('inventory',inv);renderEcommerce();
  showToast('📥','CJ Eflex CSV 업로드',`신규 ${added}건 · 갱신 ${updated}건`);
}

// ========== 재고 양방향 동기화 (자동 PUSH + SKU 매핑 + 로그) ==========
function getInvAutoSync(){return ST.get('inv_auto_sync',false)}
function toggleInvAutoSync(on){ST.set('inv_auto_sync',!!on);showToast(on?'📤':'⏸',`자동 PUSH ${on?'ON':'OFF'}`,on?'재고 수정 시 출처 플랫폼으로 자동 전송':'')}
function _restoreInvAutoSyncToggle(){const el=document.getElementById('invAutoSyncToggle');if(el)el.checked=getInvAutoSync()}

// SKU 매핑 데이터
function getSkuMapping(){return ST.get('sku_mapping_v1',{})}
function saveSkuMapping(m){ST.set('sku_mapping_v1',m)}
function updSkuMapping(sku,field,val){
  const m=getSkuMapping();
  if(!m[sku])m[sku]={};
  m[sku][field]=val;
  saveSkuMapping(m);
}
function openSkuMappingModal(){renderSkuMappingTable();openModal('skuMappingModal')}
function renderSkuMappingTable(){
  const body=document.getElementById('skuMappingBody');if(!body)return;
  const inv=getEcData('inventory');
  const mapping=getSkuMapping();
  if(inv.length===0){body.innerHTML='<tr><td colspan="6" class="text-center text-gray-400 py-4">재고 항목이 없습니다.</td></tr>';return}
  body.innerHTML=inv.map(i=>{
    const sku=i.sku||'';
    const m=mapping[sku]||{};
    return `<tr>
      <td class="font-mono text-xs">${escapeHtml(sku)}</td>
      <td class="text-xs">${escapeHtml(i.product||'')}</td>
      <td contenteditable oninput="updSkuMapping('${escapeHtml(sku)}','naverProductNo',this.textContent)" class="font-mono text-xs">${escapeHtml(m.naverProductNo||'')}</td>
      <td contenteditable oninput="updSkuMapping('${escapeHtml(sku)}','naverOptionId',this.textContent)" class="font-mono text-xs">${escapeHtml(m.naverOptionId||'')}</td>
      <td contenteditable oninput="updSkuMapping('${escapeHtml(sku)}','coupangVendorItemId',this.textContent)" class="font-mono text-xs">${escapeHtml(m.coupangVendorItemId||'')}</td>
      <td contenteditable oninput="updSkuMapping('${escapeHtml(sku)}','ezadminCode',this.textContent)" class="font-mono text-xs">${escapeHtml(m.ezadminCode||'')}</td>
    </tr>`;
  }).join('');
}

// 변경 이력
function getInvSyncLog(){return ST.get('inv_sync_log',[])}
function _saveInvSyncLog(log){ST.set('inv_sync_log',log.slice(0,100))}
function _logInvSync(entry){
  const log=getInvSyncLog();
  log.unshift({ts:new Date().toISOString(),...entry});
  _saveInvSyncLog(log);
}
function openInvSyncLogModal(){renderInvSyncLogTable();openModal('invSyncLogModal')}
function clearInvSyncLog(){
  if(!confirm('전체 변경 이력을 삭제하시겠습니까?'))return;
  ST.set('inv_sync_log',[]);renderInvSyncLogTable();showToast('🗑','이력 삭제','');
}
function renderInvSyncLogTable(){
  const body=document.getElementById('invSyncLogBody');if(!body)return;
  const log=getInvSyncLog();
  if(log.length===0){body.innerHTML='<tr><td colspan="7" class="text-center text-gray-400 py-4">기록 없음</td></tr>';return}
  const sourceLabels={naver_store:'네이버',coupang:'쿠팡',ezadmin:'이지어드민',cj_eflex:'CJ Eflex',manual:'수기'};
  body.innerHTML=log.map(e=>{
    const t=new Date(e.ts);
    const tStr=`${fmtDateYY(t.toISOString().slice(0,10))} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
    const statusColor=e.status==='success'?'bg-green-50 text-green-700':e.status==='failed'?'bg-red-50 text-red-700':e.status==='skipped'?'bg-gray-100 text-gray-500':'bg-amber-50 text-amber-700';
    const dirIcon=e.direction==='push'?'📤 PUSH':e.direction==='pull'?'📥 PULL':e.direction==='local'?'✏️ 수기':'';
    return `<tr>
      <td class="font-mono text-[10px]">${tStr}</td>
      <td class="font-mono text-xs">${escapeHtml(e.sku||'-')}</td>
      <td>${escapeHtml(sourceLabels[e.source]||e.source||'-')}</td>
      <td class="text-xs">${e.oldStock??'-'} → <strong>${e.newStock??'-'}</strong></td>
      <td class="text-xs">${dirIcon}</td>
      <td><span class="text-xs px-2 py-0.5 rounded ${statusColor}">${e.status}</span></td>
      <td class="text-[10px] text-gray-500">${escapeHtml(e.note||'')}</td>
    </tr>`;
  }).join('');
}

// PUSH 시뮬레이션 (실제 API 호출 위치)
async function pushInventoryToPlatform(item,oldStock){
  const source=item.source||'manual';
  if(source==='manual'){
    // 수기 항목은 push 대상 없음
    _logInvSync({sku:item.sku,source:'manual',oldStock,newStock:item.stock,direction:'local',status:'success',note:'수기 변경 (push 대상 없음)'});
    return;
  }
  if(source==='cj_eflex'){
    _logInvSync({sku:item.sku,source,oldStock,newStock:item.stock,direction:'push',status:'skipped',note:'CJ Eflex는 표준 OpenAPI 미제공 (CSV 업로드 전용)'});
    return;
  }
  // 매핑 확인
  const mapping=getSkuMapping()[item.sku]||{};
  const mappingFields={naver_store:['naverProductNo'],coupang:['coupangVendorItemId'],ezadmin:['ezadminCode']};
  const required=mappingFields[source]||[];
  const missing=required.filter(f=>!mapping[f]);
  if(missing.length>0){
    _logInvSync({sku:item.sku,source,oldStock,newStock:item.stock,direction:'push',status:'failed',note:`매핑 누락: ${missing.join(', ')} (🔗 SKU 매핑에서 등록 필요)`});
    showToast('⚠️','PUSH 실패',`${item.sku}: 매핑 누락`);
    return;
  }
  // 활성 계정 확인
  const accs=(getExtApiSettings()[source]?.accounts||[]).filter(a=>a.enabled);
  if(accs.length===0){
    _logInvSync({sku:item.sku,source,oldStock,newStock:item.stock,direction:'push',status:'pending',note:`활성 계정 없음 — 설정 ▸ API 연동에서 등록 필요 (목업)`});
  }else{
    // 실제 API 호출 위치 (현재는 시뮬레이션 - 80% 성공)
    const ok=Math.random()<0.8;
    if(ok){
      _logInvSync({sku:item.sku,source,oldStock,newStock:item.stock,direction:'push',status:'success',note:`${accs[0].label} 계정으로 PUSH 완료 (시뮬레이션)`});
    }else{
      _logInvSync({sku:item.sku,source,oldStock,newStock:item.stock,direction:'push',status:'failed',note:`API 호출 실패 (시뮬레이션 - 재시도 필요)`});
      showToast('⚠️','PUSH 실패',`${item.sku} → ${source}`);
      return;
    }
  }
  showToast('📤',`${source} PUSH`,`${item.sku}: ${oldStock} → ${item.stock}`);
}

// ========== 과거 휴가 내역 ==========
function renderPastLeaves(){
  const body=document.getElementById('pastLeaveBody');if(!body)return;
  const today=new Date().toISOString().split('T')[0];
  const allPast=getLeaves().filter(l=>l.end<today);
  // 연도 옵션
  const yearSel=document.getElementById('pastLeaveYear');
  const years=[...new Set(allPast.map(l=>l.start.split('-')[0]))].sort().reverse();
  if(yearSel.options.length!==years.length+1){
    const prev=yearSel.value;
    yearSel.innerHTML='<option value="all">전체 연도</option>'+years.map(y=>`<option value="${y}">${y}년</option>`).join('');
    if([...yearSel.options].some(o=>o.value===prev))yearSel.value=prev;
  }
  // 신청자 옵션 (이름 단위로 unique)
  const userSel=document.getElementById('pastLeaveUser');
  const applicants=[...new Map(allPast.map(l=>[l.username,l.name])).entries()];
  const desiredUserCount=applicants.length+2;
  if(userSel.options.length!==desiredUserCount){
    const prev=userSel.value;
    userSel.innerHTML='<option value="all">전체 신청자</option><option value="me">나만</option>'+applicants.map(([u,n])=>`<option value="user:${escapeHtml(u)}">${escapeHtml(n)}</option>`).join('');
    if([...userSel.options].some(o=>o.value===prev))userSel.value=prev;
  }
  // 유형 옵션
  const typeSel=document.getElementById('pastLeaveType');
  const types=[...new Set(allPast.map(l=>l.type))];
  if(typeSel.options.length!==types.length+1){
    const prev=typeSel.value;
    typeSel.innerHTML='<option value="all">전체 유형</option>'+types.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    if([...typeSel.options].some(o=>o.value===prev))typeSel.value=prev;
  }
  // 필터 적용
  let leaves=allPast.slice();
  const yf=yearSel.value;if(yf&&yf!=='all')leaves=leaves.filter(l=>l.start.startsWith(yf));
  const uf=userSel.value;
  if(uf==='me')leaves=leaves.filter(l=>l.username===CURRENT.username);
  else if(uf&&uf.startsWith('user:'))leaves=leaves.filter(l=>l.username===uf.slice(5));
  const tf=typeSel.value;if(tf&&tf!=='all')leaves=leaves.filter(l=>l.type===tf);
  if(leaves.length===0){body.innerHTML='<tr><td colspan="6" class="text-center text-gray-400 py-4">조건에 맞는 휴가 내역이 없습니다.</td></tr>';return}
  body.innerHTML=leaves.map((l,i)=>`<tr><td class="sheet-row-num">${i+1}</td><td>${l.name}</td><td><span class="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">${l.type}</span></td><td>${l.start} ~ ${l.end}</td><td>${l.cost===0?'미차감':'-'+l.cost+'일'}</td><td class="text-xs text-gray-500">${escapeHtml(l.reason||'-')}</td></tr>`).join('');
}

// ========== 회의 ==========
function getMeetings(){return ST.get('meetings',[])}
function saveMeetings(m){ST.set('meetings',m)}
function meetingStartTs(m){return new Date(m.date+'T'+m.time+':00').getTime()}
function renderMeetings(){
  const list=document.getElementById('meetingsList');if(!list)return;
  const meetings=getMeetings().slice().sort((a,b)=>meetingStartTs(a)-meetingStartTs(b));
  const legacy=document.getElementById('meetingsLegacy');
  if(meetings.length===0){
    list.innerHTML='<div class="col-span-full border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 text-sm">생성된 회의가 없습니다. 우측 상단의 "+ 회의 생성" 버튼을 눌러주세요.</div>';
    if(legacy)legacy.style.display='';
    return;
  }
  if(legacy)legacy.style.display='none';
  const now=Date.now();
  list.innerHTML=meetings.map(m=>{
    const ts=meetingStartTs(m);
    const status=ts<now-3600000?'종료':ts<now?'진행중':'예정';
    const sc=status==='예정'?'bg-blue-50 text-blue-700':status==='진행중'?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500';
    const users=getUsers();
    const names=(m.attendees||[]).map(u=>users[u]?.name||u).slice(0,4);
    const more=(m.attendees||[]).length>4?` 외 ${(m.attendees||[]).length-4}명`:'';
    const isAttendee=(m.attendees||[]).includes(CURRENT.username);
    const canDelete=m.creator===CURRENT.username||CURRENT.role==='admin';
    return `<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer relative" onclick="navigateTo('meeting-detail')">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-xs ${sc} px-2 py-0.5 rounded-full">${status}</span>
        ${canDelete?`<button onclick="event.stopPropagation();deleteMeeting(${m.id})" class="text-xs text-red-400 hover:text-red-600">✕</button>`:''}
      </div>
      <h3 class="font-bold mt-1 mb-1">${escapeHtml(m.title)}${isAttendee?' <span class="text-xs text-amber-500">★</span>':''}</h3>
      <p class="text-xs text-gray-500">📅 ${m.date.substring(5)} ${m.time}${m.location?' · 📍 '+escapeHtml(m.location):''}</p>
      <p class="text-xs text-gray-400 mt-1">👥 ${names.join(', ')}${more}</p>
    </div>`;
  }).join('');
}
function openCreateMeetingModal(){
  document.getElementById('meetingTitle').value='';
  document.getElementById('meetingLocation').value='';
  const today=new Date();
  const yyyy=today.getFullYear(),mm=String(today.getMonth()+1).padStart(2,'0'),dd=String(today.getDate()).padStart(2,'0');
  document.getElementById('meetingDate').value=`${yyyy}-${mm}-${dd}`;
  document.getElementById('meetingTime').value='10:00';
  const users=getUsers();
  document.getElementById('meetingAttendeesList').innerHTML=Object.entries(users).map(([k,u])=>`<label class="flex items-center gap-2 px-2 py-1 hover-bg rounded text-sm cursor-pointer"><input type="checkbox" class="meetingAttendeeChk w-4 h-4 accent-black" value="${k}" ${k===CURRENT.username?'checked disabled':''} /><span>${escapeHtml(u.name)} <span class="text-xs text-gray-400">· ${escapeHtml(u.dept)}</span></span></label>`).join('');
  openModal('createMeetingModal');
}
function submitMeeting(){
  const title=document.getElementById('meetingTitle').value.trim();
  const date=document.getElementById('meetingDate').value;
  const time=document.getElementById('meetingTime').value;
  const location=document.getElementById('meetingLocation').value.trim();
  if(!title||!date||!time){alert('제목, 날짜, 시간을 입력하세요');return}
  const attendees=Array.from(document.querySelectorAll('.meetingAttendeeChk:checked')).map(c=>c.value);
  if(!attendees.includes(CURRENT.username))attendees.unshift(CURRENT.username);
  const meeting={id:Date.now(),title,date,time,location,attendees,creator:CURRENT.username,createdAt:new Date().toISOString(),alerted10:false,alertedInvite:[CURRENT.username]};
  const meetings=getMeetings();meetings.push(meeting);saveMeetings(meetings);
  // 생성자 본인의 알림 로그
  const users=getUsers();
  const inviteeNames=attendees.filter(u=>u!==CURRENT.username).map(u=>users[u]?.name||u);
  if(inviteeNames.length>0)addNotif({type:'meeting-invite',icon:'📅',title:'회의 생성',content:`${title} · ${date} ${time} · 초대: ${inviteeNames.join(', ')}`,target:'meetings'});
  closeModal('createMeetingModal');renderMeetings();
  showToast('📅','회의 생성',title+' · '+attendees.length+'명 초대');
}
function deleteMeeting(id){
  if(!confirm('회의를 삭제하시겠습니까?'))return;
  const m=getMeetings().find(x=>x.id===id);if(!m)return;
  if(m.creator!==CURRENT.username&&CURRENT.role!=='admin'){alert('삭제 권한이 없습니다');return}
  saveMeetings(getMeetings().filter(x=>x.id!==id));
  renderMeetings();showToast('🗑️','회의 삭제',m.title);
}
let meetingAlarmTimer=null;
function startMeetingAlarmChecker(){
  if(meetingAlarmTimer)clearInterval(meetingAlarmTimer);
  const check=()=>{
    if(!CURRENT)return;
    const now=Date.now();
    const meetings=getMeetings();let dirty=false;
    meetings.forEach(m=>{
      if(!(m.attendees||[]).includes(CURRENT.username))return;
      // 1차 알림: 참석자가 처음 보는 회의 (자기 사용자명이 alertedInvite에 없을 때)
      if(!m.alertedInvite)m.alertedInvite=[m.creator];
      if(!m.alertedInvite.includes(CURRENT.username)){
        m.alertedInvite.push(CURRENT.username);dirty=true;
        const users=getUsers();const creator=users[m.creator]?.name||m.creator;
        addNotif({type:'meeting-invite',icon:'📅',title:'회의 초대',content:`${creator}님이 회의에 초대: ${m.title} · ${m.date} ${m.time}`,target:'meetings'});
        showToast('📅','회의 초대',m.title);
      }
      // 10분 전 팝업 알람
      if(m.alerted10)return;
      const diff=meetingStartTs(m)-now;
      if(diff>0&&diff<=10*60*1000){
        m.alerted10=true;dirty=true;
        const mins=Math.max(1,Math.round(diff/60000));
        showToast('⏰','회의 시작 임박',`${m.title} · ${mins}분 후 시작`);
        addNotif({type:'meeting-alarm',icon:'⏰',title:'회의 시작 10분 전',content:`${m.title} · ${m.time}${m.location?' @ '+m.location:''}`,target:'meetings'});
        try{if(typeof Notification!=='undefined'&&Notification.permission==='granted'){new Notification('회의 시작 임박: '+m.title,{body:`${mins}분 후 시작${m.location?' · '+m.location:''}`})}}catch{}
      }
    });
    if(dirty)saveMeetings(meetings);
  };
  check();
  meetingAlarmTimer=setInterval(check,30000);
  try{if(typeof Notification!=='undefined'&&Notification.permission==='default')Notification.requestPermission()}catch{}
}

// ========== 멤버 생성 ==========
function openCreateMemberModal(){
  document.getElementById('newMemberName').value='';
  document.getElementById('newMemberUsername').value='';
  document.getElementById('newMemberPw').value='1234';
  const today=new Date();const yyyy=today.getFullYear(),mm=String(today.getMonth()+1).padStart(2,'0'),dd=String(today.getDate()).padStart(2,'0');
  document.getElementById('newMemberHireDate').value=`${yyyy}-${mm}-${dd}`;
  document.getElementById('newMemberLeave').value='15';
  const depts=getDepartments();
  document.getElementById('newMemberDept').innerHTML=depts.map(d=>`<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('');
  const roles=getRoles();
  document.getElementById('newMemberRole').innerHTML=roles.map(r=>`<option value="${r.id}" ${r.id==='member'?'selected':''}>${escapeHtml(r.name)}</option>`).join('');
  const partners=getPartners();
  document.getElementById('newMemberPartnersList').innerHTML=partners.length===0?'<p class="text-xs text-gray-400 text-center py-2">등록된 거래처 없음</p>':partners.map(p=>`<label class="flex items-center gap-2 px-2 py-1 hover-bg rounded text-xs cursor-pointer"><input type="checkbox" class="newMemberPartnerChk w-4 h-4 accent-black" value="${escapeHtml(p.name)}" /><span>${escapeHtml(p.name)}</span></label>`).join('');
  openModal('createMemberModal');
}
function submitNewMember(){
  const name=document.getElementById('newMemberName').value.trim();
  const username=document.getElementById('newMemberUsername').value.trim();
  const pw=document.getElementById('newMemberPw').value;
  const dept=document.getElementById('newMemberDept').value;
  const role=document.getElementById('newMemberRole').value;
  const hireDate=document.getElementById('newMemberHireDate').value;
  const totalLeave=parseInt(document.getElementById('newMemberLeave').value)||0;
  const partners=Array.from(document.querySelectorAll('.newMemberPartnerChk:checked')).map(c=>c.value);
  if(!name||!username||!pw){alert('이름, 아이디, 비밀번호를 입력하세요');return}
  if(!/^[a-zA-Z0-9_]+$/.test(username)){alert('아이디는 영문, 숫자, _만 사용 가능합니다');return}
  const users=getUsers();
  if(users[username]){alert('이미 존재하는 아이디입니다');return}
  users[username]={name,dept,role,pw,hireDate,totalLeave,usedLeave:0,partners};
  saveUsers(users);
  closeModal('createMemberModal');
  renderMembers();renderDeptRole();
  showToast('👤','멤버 생성',name+' (@'+username+')');
}

// ========== Helpers ==========
function escapeHtml(s){return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

// ========== 외부 클릭 핸들러 ==========
document.addEventListener('click',(e)=>{
  if(!e.target.closest('#messageContextMenu'))document.getElementById('messageContextMenu')?.classList.add('hidden');
  if(!e.target.closest('#roomContextMenu'))document.getElementById('roomContextMenu')?.classList.add('hidden');
  if(!e.target.closest('#cellContextMenu'))document.getElementById('cellContextMenu')?.classList.add('hidden');
  if(!e.target.closest('#multiSelectPopup')&&!e.target.closest('button'))document.getElementById('multiSelectPopup')?.classList.add('hidden');
  if(!e.target.closest('#notifDropdown')&&!e.target.closest('[onclick*="toggleNotifDropdown"]'))document.getElementById('notifDropdown')?.classList.add('hidden');
  if(!e.target.closest('#slashMenu')&&!e.target.closest('.block-content'))document.getElementById('slashMenu')?.classList.add('hidden');
  if(!e.target.closest('#mentionDropdown')&&e.target.id!=='msgInput')document.getElementById('mentionDropdown')?.classList.add('hidden');
});

// ========== 피드백 ==========
function copyFeedback(){
  const p=document.getElementById('feedbackPage').value;
  const t=document.getElementById('feedbackType').value;
  const c=document.getElementById('feedbackContent').value.trim();
  if(!c){alert('내용을 입력');return}
  navigator.clipboard.writeText(`[INTRO 피드백]\n📍 ${p}\n🏷️ ${t}\n📝 ${c}`).then(()=>{document.getElementById('copyResult').classList.remove('hidden');setTimeout(()=>document.getElementById('copyResult').classList.add('hidden'),2000)});
}

// ========== Init ==========
window.addEventListener('load',()=>{
  if(ST.get('theme','light')==='dark'){document.documentElement.setAttribute('data-theme','dark');const i=document.getElementById('theme-icon');if(i)i.textContent='☀️';const il=document.getElementById('theme-icon-login');if(il)il.textContent='☀️';const im=document.getElementById('theme-icon-m');if(im)im.textContent='☀️';const tg=document.getElementById('darkToggle');if(tg)tg.checked=true}
  const saved=ST.get('currentUser');
  if(saved&&getUser(saved.username)){CURRENT={...getUser(saved.username),username:saved.username};enterDashboard()}
});

/* ============================================================
   ★ 블록 에디터 + 구글시트급 스프레드시트
============================================================ */
let blocks=[],nextBlockId=1;
const TEMPLATES={
  default:[{type:'h1',text:'📋 기본 회의록'},{type:'h3',text:'👥 참석자'},{type:'bullet',text:'관리자'},{type:'bullet',text:'이마케팅'},{type:'h3',text:'📌 안건'},{type:'number',text:'5월 캠페인 리뷰'},{type:'h3',text:'✅ 액션'},{type:'todo',text:'6월 광고안 작성'}],
  weekly:[{type:'h1',text:'📊 주간 회의'},{type:'h2',text:'📈 KPI'},{type:'sheet',sheetData:{A1:'지표',B1:'목표',C1:'실적',D1:'달성률',A2:'매출',B2:'10000',C2:'12300',D2:'=C2/B2*100',A3:'방문자',B3:'5000',C3:'6200',D3:'=C3/B3*100',A4:'합계',B4:'=SUM(B2:B3)',C4:'=SUM(C2:C3)',D4:'=AVG(D2:D3)'}}],
  budget:[{type:'h1',text:'💰 예산 회의'},{type:'sheet',sheetData:{A1:'항목',B1:'예산',C1:'집행',D1:'잔액',E1:'집행률',A2:'인건비',B2:'5000000',C2:'4200000',D2:'=B2-C2',E2:'=C2/B2*100',A3:'마케팅',B3:'2000000',C3:'1800000',D3:'=B3-C3',E3:'=C3/B3*100',A4:'운영비',B4:'1500000',C4:'900000',D4:'=B4-C4',E4:'=C4/B4*100',A5:'합계',B5:'=SUM(B2:B4)',C5:'=SUM(C2:C4)',D5:'=SUM(D2:D4)',E5:'=AVG(E2:E4)'}}],
  brainstorm:[{type:'h1',text:'💡 브레인스토밍'},{type:'callout',text:'주제: '},{type:'bullet',text:''}],
  decision:[{type:'h1',text:'⚖️ 의사결정'},{type:'paragraph',text:''}],
  blank:[{type:'paragraph',text:''}]
};
function useTemplate(n){document.getElementById('templateSelector').style.display='none';document.getElementById('meetingWorkspace').classList.remove('hidden');blocks=TEMPLATES[n].map(b=>({...b,id:nextBlockId++}));renderBlocks()}
const BLOCK_TYPES={paragraph:{icon:'📝',name:'텍스트',ph:'/ 명령'},h1:{icon:'H₁',name:'제목 1',ph:'제목 1'},h2:{icon:'H₂',name:'제목 2',ph:'제목 2'},h3:{icon:'H₃',name:'제목 3',ph:'제목 3'},bullet:{icon:'•',name:'글머리 기호',ph:'목록'},number:{icon:'1.',name:'번호',ph:'번호'},todo:{icon:'☑',name:'할 일',ph:'할 일'},quote:{icon:'❝',name:'인용',ph:'인용'},callout:{icon:'💡',name:'콜아웃',ph:'중요'},divider:{icon:'—',name:'구분선',ph:''},sheet:{icon:'⊞',name:'스프레드시트',ph:''}};
function renderBlocks(){
  const editor=document.getElementById('blockEditor');if(!editor)return;
  editor.innerHTML=blocks.map(renderBlock).join('')+`<div class="text-center mt-4"><button onclick="addBlockEnd()" class="text-xs text-gray-400 hover:text-black px-3 py-1 rounded hover-bg">+ 블록 추가</button></div>`;
  document.querySelectorAll('.block-content').forEach(el=>{el.addEventListener('input',onBlockInput);el.addEventListener('keydown',onBlockKeyDown)});
  blocks.forEach(b=>{if(b.type==='sheet')renderSheetCells(b.id)});
}
function renderBlock(b){
  if(b.type==='divider')return `<div class="notion-block" data-id="${b.id}"><div class="block-handle">+</div><div class="block-handle">⋮⋮</div><div class="flex-1 my-2"><hr/></div></div>`;
  if(b.type==='sheet')return renderSheet(b);
  const t=BLOCK_TYPES[b.type]||BLOCK_TYPES.paragraph;
  let prefix='';
  if(b.type==='bullet')prefix='<span class="pr-1 text-gray-500 select-none">•</span>';
  else if(b.type==='number')prefix='<span class="pr-1 text-gray-500 select-none">1.</span>';
  else if(b.type==='todo')prefix='<input type="checkbox" class="mr-2 accent-black mt-1.5" />';
  else if(b.type==='callout')prefix='<span class="pr-1 select-none">💡</span>';
  return `<div class="notion-block" data-id="${b.id}">
    <div class="flex flex-col gap-0.5 shrink-0 w-7 items-center">
      <div class="block-handle" onclick="addBlockAfter(${b.id})">+</div>
      <div class="block-handle drag-handle" draggable="true" ondragstart="blockDragStart(event,${b.id})">⋮⋮</div>
    </div>
    <div class="flex-1 flex items-start ${b.type==='callout'?'bg-yellow-50 rounded-md px-2':''}">${prefix}<div class="block-content" contenteditable="true" data-id="${b.id}" data-type="${b.type}" data-placeholder="${t.ph}">${escapeHtml(b.text)}</div></div>
  </div>`;
}
function onBlockInput(e){const id=parseInt(e.target.dataset.id);const b=blocks.find(x=>x.id===id);if(!b)return;b.text=e.target.textContent;if(b.text==='/'){const rect=e.target.getBoundingClientRect();showSlashMenu(rect.left,rect.bottom+window.scrollY,id)}}
function onBlockKeyDown(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addBlockAfter(parseInt(e.target.dataset.id))}
  if(e.key==='Backspace'&&e.target.textContent===''){e.preventDefault();const id=parseInt(e.target.dataset.id);if(blocks.length>1){const idx=blocks.findIndex(b=>b.id===id);blocks=blocks.filter(b=>b.id!==id);renderBlocks();const prev=blocks[Math.max(0,idx-1)];if(prev)setTimeout(()=>{const el=document.querySelector(`[data-id="${prev.id}"].block-content`);if(el){el.focus();const r=document.createRange();r.selectNodeContents(el);r.collapse(false);window.getSelection().removeAllRanges();window.getSelection().addRange(r)}},10)}}
}
function addBlockAfter(id){const idx=blocks.findIndex(b=>b.id===id);const newB={id:nextBlockId++,type:'paragraph',text:''};blocks.splice(idx+1,0,newB);renderBlocks();setTimeout(()=>document.querySelector(`[data-id="${newB.id}"].block-content`)?.focus(),10)}
function addBlockEnd(){const newB={id:nextBlockId++,type:'paragraph',text:''};blocks.push(newB);renderBlocks();setTimeout(()=>document.querySelector(`[data-id="${newB.id}"].block-content`)?.focus(),10)}
function showSlashMenu(x,y,blockId){const m=document.getElementById('slashMenu');m.innerHTML=Object.entries(BLOCK_TYPES).map(([k,v])=>`<div class="slash-item" onclick="changeBlockType(${blockId},'${k}')"><div class="slash-icon">${v.icon}</div><div><p class="font-medium">${v.name}</p></div></div>`).join('');m.style.left=Math.min(x,window.innerWidth-300)+'px';m.style.top=y+'px';m.classList.remove('hidden')}
function changeBlockType(id,type){const b=blocks.find(x=>x.id===id);if(b){b.type=type;b.text='';if(type==='sheet')b.sheetData={};renderBlocks();setTimeout(()=>{if(type!=='sheet')document.querySelector(`[data-id="${id}"].block-content`)?.focus()},10)}document.getElementById('slashMenu').classList.add('hidden')}
let draggedBlockId=null;
function blockDragStart(e,id){draggedBlockId=id;e.dataTransfer.effectAllowed='move'}
document.addEventListener('dragover',(e)=>{const block=e.target.closest('.notion-block');if(block&&draggedBlockId&&block.dataset.id!=draggedBlockId){e.preventDefault();block.classList.add('drag-over')}});
document.addEventListener('dragleave',(e)=>e.target.closest('.notion-block')?.classList.remove('drag-over'));
document.addEventListener('drop',(e)=>{const block=e.target.closest('.notion-block');if(block&&draggedBlockId&&block.dataset.id!=draggedBlockId){e.preventDefault();const tid=parseInt(block.dataset.id);const fi=blocks.findIndex(b=>b.id===draggedBlockId);const ti=blocks.findIndex(b=>b.id===tid);const [m]=blocks.splice(fi,1);blocks.splice(ti,0,m);renderBlocks()}draggedBlockId=null;document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'))});

/* ============================================================
   ★ 구글시트급 스프레드시트
   - 클릭 후 바로 타이핑으로 입력 (Google Sheets 방식)
   - 함수: SUM, AVG, MIN, MAX, COUNT, IF, ROUND, ABS, POWER, SQRT,
          CONCATENATE, LEN, UPPER, LOWER, IFERROR, AND, OR, NOT
   - 셀 병합, 행/열 삽입/삭제, 키보드 네비게이션 (화살표, Tab)
   - 복사/붙여넣기
============================================================ */
const ROWS=15,COLS=10;
let activeSheet=null,activeCell=null,editingCell=null,rangeStart=null,rangeEnd=null;
let clipboardCells=null;

function renderSheet(b){
  let head='<thead><tr><th class="corner"></th>';
  for(let c=0;c<COLS;c++)head+='<th>'+String.fromCharCode(65+c)+'</th>';
  head+='</tr></thead>';
  let body='<tbody>';
  for(let r=1;r<=ROWS;r++){
    body+='<tr><th class="row-h">'+r+'</th>';
    for(let c=0;c<COLS;c++){
      const id=String.fromCharCode(65+c)+r;
      body+=`<td data-sid="${b.id}" data-cell="${id}"></td>`;
    }
    body+='</tr>';
  }
  body+='</tbody>';
  return `<div class="notion-block" data-id="${b.id}">
    <div class="flex flex-col gap-0.5 shrink-0 w-7 items-center"><div class="block-handle" onclick="addBlockAfter(${b.id})">+</div><div class="block-handle drag-handle" draggable="true" ondragstart="blockDragStart(event,${b.id})">⋮⋮</div></div>
    <div class="flex-1 sheet-wrap" data-sheet-id="${b.id}" tabindex="0" onclick="activateSheet(${b.id})">
      <div class="sheet-toolbar">
        <button class="sheet-tb-btn" onclick="sheetInsertRow(${b.id})" title="행 삽입">+ 행</button>
        <button class="sheet-tb-btn" onclick="sheetInsertCol(${b.id})" title="열 삽입">+ 열</button>
        <button class="sheet-tb-btn" onclick="sheetDeleteRow(${b.id})" title="행 삭제">- 행</button>
        <button class="sheet-tb-btn" onclick="sheetDeleteCol(${b.id})" title="열 삭제">- 열</button>
        <span class="text-gray-300 mx-1">|</span>
        <button class="sheet-tb-btn" onclick="mergeCells(${b.id})">⊞ 병합</button>
        <button class="sheet-tb-btn" onclick="unmergeCells(${b.id})">⊟ 해제</button>
        <span class="text-gray-300 mx-1">|</span>
        <button class="sheet-tb-btn" onclick="applyCellStyle(${b.id},'bold')"><b>B</b></button>
        <button class="sheet-tb-btn" onclick="applyCellStyle(${b.id},'italic')"><i>I</i></button>
        <button class="sheet-tb-btn" onclick="applyCellStyle(${b.id},'underline')"><u>U</u></button>
        <span class="text-gray-300 mx-1">|</span>
        <button class="sheet-tb-btn" onclick="applyCellStyle(${b.id},'center')">≡</button>
        <button class="sheet-tb-btn" onclick="applyCellStyle(${b.id},'right')">⮕</button>
        <span class="text-gray-300 mx-1">|</span>
        <button class="sheet-tb-btn" onclick="applyCellBg(${b.id},'bg-yellow')" style="background:#fef3c7">●</button>
        <button class="sheet-tb-btn" onclick="applyCellBg(${b.id},'bg-green')" style="background:#d1fae5">●</button>
        <button class="sheet-tb-btn" onclick="applyCellBg(${b.id},'bg-blue')" style="background:#dbeafe">●</button>
        <button class="sheet-tb-btn" onclick="applyCellBg(${b.id},'bg-red')" style="background:#fee2e2">●</button>
        <button class="sheet-tb-btn" onclick="applyCellBg(${b.id},'bg-purple')" style="background:#ede9fe">●</button>
        <button class="sheet-tb-btn" onclick="applyCellBg(${b.id},'')" title="지우기">⌫</button>
        <span class="text-gray-300 mx-1">|</span>
        <span class="text-xs text-gray-500">글자색:</span>
        <button class="sheet-tb-btn" onclick="applyCellColor(${b.id},'#dc2626')" title="빨강" style="color:#dc2626;font-weight:bold">A</button>
        <button class="sheet-tb-btn" onclick="applyCellColor(${b.id},'#2563eb')" title="파랑" style="color:#2563eb;font-weight:bold">A</button>
        <button class="sheet-tb-btn" onclick="applyCellColor(${b.id},'#16a34a')" title="초록" style="color:#16a34a;font-weight:bold">A</button>
        <button class="sheet-tb-btn" onclick="applyCellColor(${b.id},'#ea580c')" title="주황" style="color:#ea580c;font-weight:bold">A</button>
        <button class="sheet-tb-btn" onclick="applyCellColor(${b.id},'#9333ea')" title="보라" style="color:#9333ea;font-weight:bold">A</button>
        <button class="sheet-tb-btn" onclick="applyCellColor(${b.id},'')" title="기본">A</button>
        <span class="ml-auto text-xs text-gray-500">💡 함수 작성 중 다른 셀 클릭 시 참조 자동 삽입</span>
      </div>
      <div class="sheet-formula-bar">
        <span class="sheet-cell-ref" id="cellRef-${b.id}">A1</span>
        <span class="text-xs text-gray-400">fx</span>
        <input class="sheet-formula-input" id="formula-${b.id}" placeholder="값 또는 =수식" onkeydown="if(event.key==='Enter')onFormulaCommit(${b.id})" oninput="onFormulaTyping(${b.id},this.value)" />
      </div>
      <div class="sheet-grid"><table class="sheet" id="sheet-${b.id}">${head}${body}</table></div>
    </div>
  </div>`;
}

function activateSheet(sid){activeSheet=sid;if(!activeCell||activeCell.sid!==sid){selectCell(sid,'A1')}}
function getCellData(sid,cell){const b=blocks.find(x=>x.id===sid);return b?(b.sheetData?.[cell]??''):''}
function setCellData(sid,cell,val){const b=blocks.find(x=>x.id===sid);if(!b)return;b.sheetData=b.sheetData||{};if(val===''||val==null)delete b.sheetData[cell];else b.sheetData[cell]=val}
function evalCell(sid,cell,visited){
  visited=visited||new Set();if(visited.has(cell))return '#CYCLE';visited.add(cell);
  const raw=getCellData(sid,cell);
  if(raw===''||raw==null)return '';
  const str=String(raw);
  if(!str.startsWith('='))return raw;
  return evalFormula(sid,str.substring(1),visited);
}
function evalFormula(sid,expr,visited){
  try{
    // 범위 함수
    expr=expr.replace(/(SUM|AVG|AVERAGE|MIN|MAX|COUNT|COUNTA|PRODUCT)\(([A-Z]+\d+):([A-Z]+\d+)\)/gi,(m,fn,s,e)=>{
      const vals=getRangeVals(sid,s,e,visited);
      const nums=vals.map(v=>parseFloat(v)).filter(v=>!isNaN(v));
      const fname=fn.toUpperCase();
      if(fname==='SUM')return nums.reduce((a,b)=>a+b,0);
      if(fname==='AVG'||fname==='AVERAGE')return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0;
      if(fname==='MIN')return nums.length?Math.min(...nums):0;
      if(fname==='MAX')return nums.length?Math.max(...nums):0;
      if(fname==='COUNT')return nums.length;
      if(fname==='COUNTA')return vals.filter(v=>v!=='').length;
      if(fname==='PRODUCT')return nums.reduce((a,b)=>a*b,1);
    });
    // 단일 인자 함수
    expr=expr.replace(/(ROUND|ABS|SQRT|FLOOR|CEILING|CEIL|INT|LEN|UPPER|LOWER|TRIM)\(([^()]+)\)/gi,(m,fn,arg)=>{
      let v=evalSimple(sid,arg,visited);
      const fname=fn.toUpperCase();
      const n=parseFloat(v);
      if(fname==='ROUND')return Math.round(n);
      if(fname==='ABS')return Math.abs(n);
      if(fname==='SQRT')return Math.sqrt(n);
      if(fname==='FLOOR')return Math.floor(n);
      if(fname==='CEILING'||fname==='CEIL')return Math.ceil(n);
      if(fname==='INT')return Math.trunc(n);
      if(fname==='LEN')return String(v).length;
      if(fname==='UPPER')return String(v).toUpperCase();
      if(fname==='LOWER')return String(v).toLowerCase();
      if(fname==='TRIM')return String(v).trim();
    });
    // IF(cond, t, f)
    expr=expr.replace(/IF\(([^,]+),([^,]+),([^)]+)\)/gi,(m,c,t,f)=>{
      let cond=c.replace(/([A-Z]+\d+)/g,(m,cc)=>{const v=evalCell(sid,cc,new Set(visited));return isNaN(parseFloat(v))?'"'+v+'"':parseFloat(v)});
      try{return eval(cond)?evalSimple(sid,t,visited):evalSimple(sid,f,visited)}catch{return '#ERR'}
    });
    // IFERROR
    expr=expr.replace(/IFERROR\(([^,]+),([^)]+)\)/gi,(m,a,b)=>{try{const v=evalSimple(sid,a,visited);return String(v).startsWith('#')?evalSimple(sid,b,visited):v}catch{return evalSimple(sid,b,visited)}});
    // POWER
    expr=expr.replace(/POWER\(([^,]+),([^)]+)\)/gi,(m,a,b)=>Math.pow(parseFloat(evalSimple(sid,a,visited))||0,parseFloat(evalSimple(sid,b,visited))||0));
    // CONCATENATE
    expr=expr.replace(/CONCATENATE?\(([^)]+)\)/gi,(m,args)=>args.split(',').map(a=>evalSimple(sid,a.trim(),visited)).join(''));
    // AND, OR, NOT
    expr=expr.replace(/AND\(([^)]+)\)/gi,(m,args)=>args.split(',').every(a=>{const v=evalSimple(sid,a.trim(),visited);return v&&v!=='false'&&v!=='0'})?'true':'false');
    expr=expr.replace(/OR\(([^)]+)\)/gi,(m,args)=>args.split(',').some(a=>{const v=evalSimple(sid,a.trim(),visited);return v&&v!=='false'&&v!=='0'})?'true':'false');
    // Cell refs
    expr=expr.replace(/([A-Z]+\d+)/g,(m,c)=>{const v=evalCell(sid,c,new Set(visited));return isNaN(parseFloat(v))?'0':parseFloat(v)});
    // 문자열 리터럴 + 산술
    const result=eval(expr);
    return typeof result==='number'?(Math.round(result*10000)/10000):result;
  }catch(e){return '#ERR'}
}
function evalSimple(sid,expr,visited){
  expr=expr.trim();
  if(/^".*"$/.test(expr))return expr.slice(1,-1);
  if(/^[A-Z]+\d+$/.test(expr))return evalCell(sid,expr,new Set(visited));
  if(!isNaN(parseFloat(expr)))return parseFloat(expr);
  try{return eval(expr.replace(/([A-Z]+\d+)/g,(m,c)=>parseFloat(evalCell(sid,c,new Set(visited)))||0))}catch{return expr}
}
function getRangeVals(sid,s,e,visited){
  const sm=s.match(/([A-Z]+)(\d+)/),em=e.match(/([A-Z]+)(\d+)/);
  if(!sm||!em)return [];
  const vals=[];
  for(let r=parseInt(sm[2]);r<=parseInt(em[2]);r++){
    for(let c=sm[1].charCodeAt(0);c<=em[1].charCodeAt(0);c++){
      vals.push(evalCell(sid,String.fromCharCode(c)+r,new Set(visited)));
    }
  }
  return vals;
}

function renderSheetCells(sid){
  const b=blocks.find(x=>x.id===sid);if(!b)return;
  b.sheetData=b.sheetData||{};b.merged=b.merged||{};b.cellStyle=b.cellStyle||{};
  const hidden=new Set();
  for(const [tl,range] of Object.entries(b.merged)){
    const [s,e]=range.split(':');
    const sm=s.match(/([A-Z]+)(\d+)/),em=e.match(/([A-Z]+)(\d+)/);
    for(let r=parseInt(sm[2]);r<=parseInt(em[2]);r++){
      for(let c=sm[1].charCodeAt(0);c<=em[1].charCodeAt(0);c++){
        const cell=String.fromCharCode(c)+r;
        if(cell!==tl)hidden.add(cell);
      }
    }
  }
  document.querySelectorAll(`#sheet-${sid} td[data-cell]`).forEach(td=>{
    const cell=td.dataset.cell;
    if(hidden.has(cell)){td.style.display='none';return}
    td.style.display='';
    td.removeAttribute('colspan');td.removeAttribute('rowspan');
    td.className='';
    if(b.merged[cell]){
      const [s,e]=b.merged[cell].split(':');
      const sm=s.match(/([A-Z]+)(\d+)/),em=e.match(/([A-Z]+)(\d+)/);
      td.setAttribute('colspan',em[1].charCodeAt(0)-sm[1].charCodeAt(0)+1);
      td.setAttribute('rowspan',parseInt(em[2])-parseInt(sm[2])+1);
      td.classList.add('merged');
    }
    if(activeCell&&activeCell.sid===sid&&activeCell.cell===cell)td.classList.add('selected');
    const val=evalCell(sid,cell);
    td.textContent=val;
    if(!isNaN(parseFloat(val))&&val!=='')td.classList.add('numeric');
    if(String(val).startsWith('#'))td.classList.add('error');
    const st=b.cellStyle[cell];
    if(st){if(st.bold)td.classList.add('bold');if(st.italic)td.classList.add('italic');if(st.underline)td.classList.add('underline');if(st.align)td.classList.add(st.align);if(st.bg)td.classList.add(st.bg);if(st.color)td.style.color=st.color;else td.style.color=''}
  });
}
function selectCell(sid,cell){
  document.querySelectorAll(`#sheet-${sid} td.selected,#sheet-${sid} td.range-sel`).forEach(t=>{t.classList.remove('selected','range-sel')});
  const td=document.querySelector(`#sheet-${sid} td[data-cell="${cell}"]`);
  if(td)td.classList.add('selected');
  activeCell={sid,cell};
  const raw=getCellData(sid,cell);
  document.getElementById('cellRef-'+sid).textContent=cell;
  document.getElementById('formula-'+sid).value=raw;
}
function startEdit(sid,cell,initialChar){
  const td=document.querySelector(`#sheet-${sid} td[data-cell="${cell}"]`);if(!td)return;
  td.contentEditable='true';td.classList.add('editing');
  td.textContent=initialChar!==undefined?initialChar:getCellData(sid,cell);
  td.focus();
  // 커서 끝으로
  const r=document.createRange();r.selectNodeContents(td);r.collapse(false);
  const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);
  editingCell={sid,cell,td};
}
function commitEdit(){
  if(!editingCell)return;
  const {sid,cell,td}=editingCell;
  td.contentEditable='false';td.classList.remove('editing');
  setCellData(sid,cell,td.textContent);
  editingCell=null;
  renderSheetCells(sid);
  selectCell(sid,cell);
}
function cancelEdit(){
  if(!editingCell)return;
  editingCell.td.contentEditable='false';
  editingCell.td.classList.remove('editing');
  editingCell=null;
  renderSheetCells(activeCell.sid);
}
function onFormulaTyping(sid,val){if(editingCell&&editingCell.sid===sid)editingCell.td.textContent=val}
function onFormulaCommit(sid){if(!activeCell)return;const val=document.getElementById('formula-'+sid).value;setCellData(sid,activeCell.cell,val);renderSheetCells(sid);selectCell(sid,activeCell.cell)}

// ★ 키보드: 클릭 후 타이핑으로 바로 입력
document.addEventListener('click',(e)=>{
  // ★ 드래그 종료 후 click 무시 플래그
  if(window.__skipNextSheetClick){window.__skipNextSheetClick=false;return}
  const td=e.target.closest('td[data-cell]');
  if(td){
    const clickedSid=parseInt(td.dataset.sid);
    const clickedCell=td.dataset.cell;
    // ★ 편집 중인 셀에 = 함수 입력 중 → 다른 셀 클릭 시 참조 삽입/교체
    if(editingCell&&editingCell.sid===clickedSid&&editingCell.cell!==clickedCell){
      let cur=editingCell.td.textContent;
      if(cur.startsWith('=')){
        // ★ Ctrl/Cmd+클릭 → 다중 참조 (콤마로 추가)
        if(e.ctrlKey||e.metaKey){
          if(/[A-Z]+\d+(:[A-Z]+\d+)?$/.test(cur.trim()))cur=cur+','+clickedCell;
          else if(/[(,+\-*/<>=:]$|^=$/.test(cur.trim()))cur=cur+clickedCell;
          else cur=cur+','+clickedCell;
        }
        // 일반 클릭 - 마지막 참조를 교체 또는 삽입
        else if(/[(,+\-*/<>=:]$|^=$/.test(cur.trim())){
          cur=cur+clickedCell;
        }else if(/[A-Z]+\d+:[A-Z]+\d+$/.test(cur.trim())){
          cur=cur.replace(/:[A-Z]+\d+$/,':'+clickedCell);
        }else if(/[A-Z]+\d+$/.test(cur.trim())){
          cur=cur.replace(/[A-Z]+\d+$/,clickedCell);
        }else{
          commitEdit();selectCell(clickedSid,clickedCell);activeSheet=clickedSid;
          return;
        }
        editingCell.td.textContent=cur;
        const r=document.createRange();r.selectNodeContents(editingCell.td);r.collapse(false);
        const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);
        editingCell.td.focus();
        e.preventDefault();e.stopPropagation();
        return;
      }
    }
    if(editingCell&&(editingCell.sid!=clickedSid||editingCell.cell!=clickedCell))commitEdit();
    selectCell(clickedSid,clickedCell);
    activeSheet=clickedSid;
    return;
  }
  if(editingCell&&!e.target.closest('.sheet-formula-bar'))commitEdit();
});
document.addEventListener('dblclick',(e)=>{
  const td=e.target.closest('td[data-cell]');
  if(td){startEdit(parseInt(td.dataset.sid),td.dataset.cell)}
});

// ★ 드래그로 셀 범위 선택 → 함수 안에 자동 범위 삽입 (구글시트 방식)
let sheetDragStart=null;
let sheetDragMoved=false;
document.addEventListener('mousedown',(e)=>{
  const td=e.target.closest('td[data-cell]');
  if(!td)return;
  const sid=parseInt(td.dataset.sid);
  const cell=td.dataset.cell;
  // 편집 중이고 = 시작이면 드래그 범위 선택 시작
  if(editingCell&&editingCell.sid===sid&&editingCell.cell!==cell&&editingCell.td.textContent.startsWith('=')){
    sheetDragStart={sid,cell};sheetDragMoved=false;
    e.preventDefault();
  }
});
document.addEventListener('mousemove',(e)=>{
  if(!sheetDragStart||!editingCell)return;
  const td=e.target.closest('td[data-cell]');
  if(!td)return;
  const sid=parseInt(td.dataset.sid);
  if(sid!==sheetDragStart.sid)return;
  const endCell=td.dataset.cell;
  if(endCell===sheetDragStart.cell)return;
  sheetDragMoved=true;
  // 시각적으로 범위 강조
  document.querySelectorAll(`#sheet-${sid} td.range-sel`).forEach(t=>t.classList.remove('range-sel'));
  const range=normalizeRange(sheetDragStart.cell,endCell);
  const [s,en]=range.split(':');
  const sm=s.match(/([A-Z]+)(\d+)/),em=en.match(/([A-Z]+)(\d+)/);
  for(let r=parseInt(sm[2]);r<=parseInt(em[2]);r++){
    for(let c=sm[1].charCodeAt(0);c<=em[1].charCodeAt(0);c++){
      const tc=document.querySelector(`#sheet-${sid} td[data-cell="${String.fromCharCode(c)+r}"]`);
      if(tc&&tc!==editingCell.td)tc.classList.add('range-sel');
    }
  }
});
document.addEventListener('mouseup',(e)=>{
  if(!sheetDragStart||!editingCell){sheetDragStart=null;return}
  const td=e.target.closest('td[data-cell]');
  if(td&&sheetDragMoved){
    const sid=parseInt(td.dataset.sid);
    const endCell=td.dataset.cell;
    if(sid===sheetDragStart.sid&&endCell!==sheetDragStart.cell){
      const range=normalizeRange(sheetDragStart.cell,endCell);
      let cur=editingCell.td.textContent;
      // ★ Ctrl 드래그 → 콤마 추가, 일반 드래그 → 기존 범위 교체
      if(e.ctrlKey||e.metaKey){
        if(/[A-Z]+\d+(:[A-Z]+\d+)?$/.test(cur.trim()))cur=cur+','+range;
        else if(/[(,+\-*/<>=:]$|^=$/.test(cur.trim()))cur=cur+range;
        else cur=cur+','+range;
      }else if(/[(,+\-*/<>=:]$|^=$/.test(cur.trim())){
        cur=cur+range;
      }else if(/[A-Z]+\d+:[A-Z]+\d+$/.test(cur.trim())){
        cur=cur.replace(/[A-Z]+\d+:[A-Z]+\d+$/,range);
      }else if(/[A-Z]+\d+$/.test(cur.trim())){
        cur=cur.replace(/[A-Z]+\d+$/,range);
      }
      editingCell.td.textContent=cur;
      const r=document.createRange();r.selectNodeContents(editingCell.td);r.collapse(false);
      window.getSelection().removeAllRanges();window.getSelection().addRange(r);
      editingCell.td.focus();
      window.__skipNextSheetClick=true; // 다음 click 무시
      // 시각 효과 제거
      document.querySelectorAll('td.range-sel').forEach(t=>t.classList.remove('range-sel'));
      showToast('🔢','범위 삽입',range);
    }
  }
  sheetDragStart=null;sheetDragMoved=false;
});
function normalizeRange(c1,c2){
  const m1=c1.match(/([A-Z]+)(\d+)/),m2=c2.match(/([A-Z]+)(\d+)/);
  const minC=Math.min(m1[1].charCodeAt(0),m2[1].charCodeAt(0));
  const maxC=Math.max(m1[1].charCodeAt(0),m2[1].charCodeAt(0));
  const minR=Math.min(parseInt(m1[2]),parseInt(m2[2]));
  const maxR=Math.max(parseInt(m1[2]),parseInt(m2[2]));
  return String.fromCharCode(minC)+minR+':'+String.fromCharCode(maxC)+maxR;
}
document.addEventListener('keydown',(e)=>{
  if(!activeCell||editingCell&&e.target!==editingCell.td)return;
  if(document.activeElement?.tagName==='INPUT'||document.activeElement?.tagName==='TEXTAREA'){
    // 시트 외 입력 중이면 무시 (단, 시트 td 편집중은 아래에서 처리)
    if(!editingCell)return;
  }
  if(editingCell){
    if(e.key==='Enter'){e.preventDefault();commitEdit();moveCell(0,1)}
    else if(e.key==='Escape'){e.preventDefault();cancelEdit()}
    else if(e.key==='Tab'){e.preventDefault();commitEdit();moveCell(e.shiftKey?-1:1,0)}
    return;
  }
  // 클릭 후 타이핑 → 바로 편집 시작 (구글시트 방식)
  if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    e.preventDefault();
    startEdit(activeCell.sid,activeCell.cell,e.key);
  }
  if(e.key==='Enter'){e.preventDefault();startEdit(activeCell.sid,activeCell.cell)}
  if(e.key==='F2'){e.preventDefault();startEdit(activeCell.sid,activeCell.cell)}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();setCellData(activeCell.sid,activeCell.cell,'');renderSheetCells(activeCell.sid);selectCell(activeCell.sid,activeCell.cell)}
  if(e.key==='ArrowUp'){e.preventDefault();moveCell(0,-1)}
  if(e.key==='ArrowDown'){e.preventDefault();moveCell(0,1)}
  if(e.key==='ArrowLeft'){e.preventDefault();moveCell(-1,0)}
  if(e.key==='ArrowRight'){e.preventDefault();moveCell(1,0)}
  if(e.key==='Tab'){e.preventDefault();moveCell(e.shiftKey?-1:1,0)}
  // 복사/붙여넣기
  if((e.ctrlKey||e.metaKey)&&e.key==='c'){clipboardCells=getCellData(activeCell.sid,activeCell.cell);showToast('📋','복사됨','')}
  if((e.ctrlKey||e.metaKey)&&e.key==='v'&&clipboardCells!==null){setCellData(activeCell.sid,activeCell.cell,clipboardCells);renderSheetCells(activeCell.sid);showToast('📌','붙여넣음','')}
});
function moveCell(dx,dy){
  if(!activeCell)return;
  const m=activeCell.cell.match(/([A-Z]+)(\d+)/);
  let c=m[1].charCodeAt(0)+dx;let r=parseInt(m[2])+dy;
  if(c<65)c=65;if(c>=65+COLS)c=65+COLS-1;
  if(r<1)r=1;if(r>ROWS)r=ROWS;
  selectCell(activeCell.sid,String.fromCharCode(c)+r);
}

// 우클릭 메뉴
document.addEventListener('contextmenu',(e)=>{
  const td=e.target.closest('td[data-cell]');
  if(td){
    e.preventDefault();
    selectCell(parseInt(td.dataset.sid),td.dataset.cell);
    showCellContext(e,parseInt(td.dataset.sid),td.dataset.cell);
  }
});
function showCellContext(e,sid,cell){
  const m=document.getElementById('cellContextMenu');
  const items=[
    {icon:'✏️',label:'편집',fn:()=>startEdit(sid,cell)},
    {icon:'📋',label:'복사',fn:()=>{clipboardCells=getCellData(sid,cell);showToast('📋','복사됨','')}},
    {icon:'📌',label:'붙여넣기',fn:()=>{if(clipboardCells!==null){setCellData(sid,cell,clipboardCells);renderSheetCells(sid)}}},
    {divider:true},
    {icon:'➕',label:'행 위에 삽입',fn:()=>sheetInsertRow(sid)},
    {icon:'➕',label:'열 왼쪽에 삽입',fn:()=>sheetInsertCol(sid)},
    {icon:'➖',label:'행 삭제',fn:()=>sheetDeleteRow(sid)},
    {icon:'➖',label:'열 삭제',fn:()=>sheetDeleteCol(sid)},
    {divider:true},
    {icon:'⊞',label:'우/하단 셀과 병합',fn:()=>mergeCells(sid)},
    {icon:'⊟',label:'병합 해제',fn:()=>unmergeCells(sid)},
    {divider:true},
    {icon:'🗑️',label:'셀 지우기',danger:true,fn:()=>{setCellData(sid,cell,'');renderSheetCells(sid)}}
  ];
  m.innerHTML=items.map((it,i)=>it.divider?'<div class="context-menu-divider"></div>':`<div class="context-menu-item ${it.danger?'text-red-500':''}" onclick="window.__cellCtx[${i}]()"><span>${it.icon}</span>${it.label}</div>`).join('');
  window.__cellCtx=items.map(it=>it.divider?null:()=>{it.fn();m.classList.add('hidden')});
  m.style.left=Math.min(e.clientX,window.innerWidth-260)+'px';
  m.style.top=Math.min(e.clientY,window.innerHeight-400)+'px';
  m.classList.remove('hidden');
}
function mergeCells(sid){if(!activeCell)return;const c=activeCell.cell;const m=c.match(/([A-Z]+)(\d+)/);const range=c+':'+String.fromCharCode(m[1].charCodeAt(0)+1)+(parseInt(m[2])+1);const b=blocks.find(x=>x.id===sid);b.merged=b.merged||{};b.merged[c]=range;renderSheetCells(sid);showToast('⊞','병합됨',range)}
function unmergeCells(sid){if(!activeCell)return;const b=blocks.find(x=>x.id===sid);if(b.merged[activeCell.cell]){delete b.merged[activeCell.cell];renderSheetCells(sid);showToast('⊟','해제됨','')}}
function applyCellStyle(sid,style){if(!activeCell)return;const b=blocks.find(x=>x.id===sid);b.cellStyle=b.cellStyle||{};const c=activeCell.cell;b.cellStyle[c]=b.cellStyle[c]||{};if(style==='center'||style==='right')b.cellStyle[c].align=b.cellStyle[c].align===style?null:style;else b.cellStyle[c][style]=!b.cellStyle[c][style];renderSheetCells(sid)}
function applyCellBg(sid,bg){if(!activeCell)return;const b=blocks.find(x=>x.id===sid);b.cellStyle=b.cellStyle||{};b.cellStyle[activeCell.cell]=b.cellStyle[activeCell.cell]||{};b.cellStyle[activeCell.cell].bg=bg||null;renderSheetCells(sid)}
function applyCellColor(sid,color){if(!activeCell)return;const b=blocks.find(x=>x.id===sid);b.cellStyle=b.cellStyle||{};b.cellStyle[activeCell.cell]=b.cellStyle[activeCell.cell]||{};b.cellStyle[activeCell.cell].color=color||null;renderSheetCells(sid)}
function sheetInsertRow(sid){
  if(!activeCell)return;
  const targetRow=parseInt(activeCell.cell.match(/\d+/)[0]);
  const b=blocks.find(x=>x.id===sid);b.sheetData=b.sheetData||{};
  const newData={};
  for(const [k,v] of Object.entries(b.sheetData)){
    const m=k.match(/([A-Z]+)(\d+)/);
    const r=parseInt(m[2]);
    if(r>=targetRow)newData[m[1]+(r+1)]=v;else newData[k]=v;
  }
  b.sheetData=newData;renderSheetCells(sid);showToast('+','행 삽입','');
}
function sheetInsertCol(sid){
  if(!activeCell)return;
  const targetCol=activeCell.cell.match(/[A-Z]+/)[0].charCodeAt(0);
  const b=blocks.find(x=>x.id===sid);b.sheetData=b.sheetData||{};
  const newData={};
  for(const [k,v] of Object.entries(b.sheetData)){
    const m=k.match(/([A-Z]+)(\d+)/);
    const c=m[1].charCodeAt(0);
    if(c>=targetCol)newData[String.fromCharCode(c+1)+m[2]]=v;else newData[k]=v;
  }
  b.sheetData=newData;renderSheetCells(sid);showToast('+','열 삽입','');
}
function sheetDeleteRow(sid){
  if(!activeCell)return;if(!confirm('현재 행을 삭제?'))return;
  const targetRow=parseInt(activeCell.cell.match(/\d+/)[0]);
  const b=blocks.find(x=>x.id===sid);b.sheetData=b.sheetData||{};
  const newData={};
  for(const [k,v] of Object.entries(b.sheetData)){
    const m=k.match(/([A-Z]+)(\d+)/);const r=parseInt(m[2]);
    if(r===targetRow)continue;
    if(r>targetRow)newData[m[1]+(r-1)]=v;else newData[k]=v;
  }
  b.sheetData=newData;renderSheetCells(sid);showToast('-','행 삭제','');
}
function sheetDeleteCol(sid){
  if(!activeCell)return;if(!confirm('현재 열을 삭제?'))return;
  const targetCol=activeCell.cell.match(/[A-Z]+/)[0].charCodeAt(0);
  const b=blocks.find(x=>x.id===sid);b.sheetData=b.sheetData||{};
  const newData={};
  for(const [k,v] of Object.entries(b.sheetData)){
    const m=k.match(/([A-Z]+)(\d+)/);const c=m[1].charCodeAt(0);
    if(c===targetCol)continue;
    if(c>targetCol)newData[String.fromCharCode(c-1)+m[2]]=v;else newData[k]=v;
  }
  b.sheetData=newData;renderSheetCells(sid);showToast('-','열 삭제','');
}
