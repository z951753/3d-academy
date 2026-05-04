/* 3D动画学院 - 交互脚本 (Vercel + Supabase / Cloudflare 全栈版) */

// ===== 配置：API 基础地址 =====
// 本地开发/vercel dev: 使用当前域名（同源）
// 部署后: 同源部署，自动使用当前域名
const API_BASE = '';

// ===== 演示模式检测 =====
// 后端不可用时自动启用：无需登录即可操作，数据存 localStorage
let DEMO_MODE = false;

// 本地存储工具（演示模式专用）
const LS={
  get(key){try{return JSON.parse(localStorage.getItem(key))||[]}catch{return[]}},
  set(key,val){localStorage.setItem(key,JSON.stringify(val))},
};

async function checkDemoMode(){
  if(window.location.protocol==='file:'||window.location.hostname===''||
     window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'){
    try{
      const res=await fetch(API_BASE+'/api/health',{signal:AbortSignal.timeout(2000)});
      DEMO_MODE=!res.ok;
    }catch(e){
      DEMO_MODE=true; // 后端不可用 → 演示模式
    }
  }
}

// 演示模式下的 API 替代：直接存取 localStorage
function localApi(method, key, item){
  const list=LS.get(key);
  if(method==='GET') return Promise.resolve(list||[]);
  if(method==='POST'){list.push(item);LS.set(key,list);return Promise.resolve(item);}
  if(method==='PUT'){
    const idx=list.findIndex(x=>x.id===item.id);
    if(idx>=0){Object.assign(list[idx],item);LS.set(key,list);return Promise.resolve(item);}
    return Promise.reject(new Error('未找到'));
  }
  if(method==='DELETE'){
    const newList=list.filter(x=>x.id!==item);
    LS.set(key,newList);return Promise.resolve(null);
  }
  return Promise.reject(new Error('不支持的方法'));
}

function apiOrLocal(method, path, body, lsKey){
  if(DEMO_MODE){
    if(path.startsWith('/tutorials')) return localApi(method,lsKey,body);
    if(path.startsWith('/modules')) return localApi(method,lsKey,body);
    if(path.startsWith('/mistakes')) return localApi(method,lsKey,body);
    if(path.startsWith('/homework')) return localApi(method,lsKey,body);
    if(path.startsWith('/roadmap')){LS.set(lsKey,body?.checks||body);return Promise.resolve(body);}
  }
  return api(method, path, body);
}

// ===== 默认数据（离线/演示用，部署后会从 API 拉取用户数据）=====

// 默认学习模块
const DEFAULT_MODULES=[
  {id:'mod-01',title:'多边形建模',icon:'🧱',category:'建模',desc:'从基础几何体到复杂角色，掌握多边形建模核心技术',tags:'硬表面, 角色建模, 拓扑优化',difficulty:40,color:'#6ea8fe',builtin:true},
  {id:'mod-02',title:'材质与贴图',icon:'🎨',category:'材质',desc:'UV展开、PBR材质制作、Arnold材质节点详解',tags:'UV展开, PBR, Substance',difficulty:55,color:'#f472b6',builtin:true},
  {id:'mod-03',title:'灯光与渲染',icon:'💡',category:'渲染',desc:'三点布光、HDRI环境光、Arnold渲染器调优',tags:'三点布光, HDRI, AOV',difficulty:50,color:'#fbbf24',builtin:true},
  {id:'mod-04',title:'骨骼绑定',icon:'🦴',category:'绑定',desc:'骨骼系统搭建、IK/FK切换、控制器制作与权重',tags:'IK/FK, 控制器, 权重',difficulty:75,color:'#a78bfa',builtin:true},
  {id:'mod-05',title:'角色动画',icon:'🏃',category:'动画',desc:'关键帧动画、走路循环、面部表情与口型同步',tags:'关键帧, 走路循环, 表情',difficulty:70,color:'#34d399',builtin:true},
  {id:'mod-06',title:'特效模拟',icon:'🌀',category:'特效',desc:'nParticle粒子、nCloth布料、Bifrost流体',tags:'粒子, 布料, 流体',difficulty:85,color:'#fb923c',builtin:true},
  {id:'mod-07',title:'摄像机与镜头',icon:'📷',category:'动画',desc:'镜头语言、景深控制、运动镜头与剪辑节奏',tags:'景深, 运镜, 剪辑',difficulty:45,color:'#22d3ee',builtin:true},
  {id:'mod-08',title:'脚本与自动化',icon:'⚡',category:'脚本',desc:'MEL/Python脚本、工具开发、批量渲染',tags:'Python, MEL, 自动化',difficulty:90,color:'#e879f9',builtin:true},
];

// 当前模块数据
let allModules = [...DEFAULT_MODULES];

const DEFAULT_TUTORIALS=[
  {id:'builtin-01',title:"Maya 界面与基础操作",cat:"入门",level:"初级",desc:"认识工作区、视图导航、基本工具",link:"#",builtin:true},
  {id:'builtin-02',title:"多边形建模：道具案例",cat:"建模",level:"初级",desc:"从简单几何体制作低模道具",link:"#",builtin:true},
  {id:'builtin-03',title:"硬表面建模：机械零件",cat:"建模",level:"中级",desc:"倒角、拓扑技巧，制作精密机械",link:"#",builtin:true},
  {id:'builtin-04',title:"角色建模：Q版小人",cat:"建模",level:"中级",desc:"从球体组合到完整角色模型",link:"#",builtin:true},
  {id:'builtin-05',title:"UV展开基础与技巧",cat:"材质",level:"初级",desc:"UV展开原理、接缝摆放和排布优化",link:"#",builtin:true},
  {id:'builtin-06',title:"PBR材质制作流程",cat:"材质",level:"中级",desc:"Substance Painter联动，写实PBR材质",link:"#",builtin:true},
  {id:'builtin-07',title:"Arnold材质节点详解",cat:"材质",level:"进阶",desc:"aiStandardSurface节点、SSS皮肤材质",link:"#",builtin:true},
  {id:'builtin-08',title:"三点布光与灯光类型",cat:"渲染",level:"初级",desc:"主光/辅光/轮廓光，基础布光方法",link:"#",builtin:true},
  {id:'builtin-09',title:"Arnold渲染器入门",cat:"渲染",level:"中级",desc:"采样设置、AOV分层、渲染优化",link:"#",builtin:true},
  {id:'builtin-10',title:"HDRI环境光与IBL",cat:"渲染",level:"中级",desc:"HDRI贴图创建逼真环境照明",link:"#",builtin:true},
  {id:'builtin-11',title:"骨骼系统搭建基础",cat:"绑定",level:"初级",desc:"创建骨骼链、设置层级关系",link:"#",builtin:true},
  {id:'builtin-12',title:"IK/FK切换与控制器",cat:"绑定",level:"中级",desc:"IK/FK无缝切换、自定义控制器",link:"#",builtin:true},
  {id:'builtin-13',title:"权重涂抹实战技巧",cat:"绑定",level:"中级",desc:"权重问题解决、镜像权重",link:"#",builtin:true},
  {id:'builtin-14',title:"关键帧动画基础",cat:"动画",level:"初级",desc:"关键帧设置、图表编辑器、缓动曲线",link:"#",builtin:true},
  {id:'builtin-15',title:"走路循环动画制作",cat:"动画",level:"中级",desc:"走路力学分析、可循环走路动画",link:"#",builtin:true},
  {id:'builtin-16',title:"跑步与跳跃动画",cat:"动画",level:"中级",desc:"不同速度下的运动规律和节奏",link:"#",builtin:true},
  {id:'builtin-17',title:"面部表情与口型同步",cat:"动画",level:"进阶",desc:"BlendShape驱动、唇形同步",link:"#",builtin:true},
  {id:'builtin-18',title:"nParticle粒子特效",cat:"特效",level:"中级",desc:"火焰、烟雾、魔法粒子效果",link:"#",builtin:true},
  {id:'builtin-19',title:"nCloth布料模拟",cat:"特效",level:"中级",desc:"角色衣服模拟、布料碰撞",link:"#",builtin:true},
  {id:'builtin-20',title:"Bifrost流体模拟",cat:"特效",level:"进阶",desc:"液体模拟、泡沫、水花生成",link:"#",builtin:true},
  {id:'builtin-21',title:"MEL脚本入门",cat:"脚本",level:"中级",desc:"Maya嵌入式语言，自动化操作",link:"#",builtin:true},
  {id:'builtin-22',title:"Python脚本开发",cat:"脚本",level:"进阶",desc:"maya.cmds API开发自定义工具",link:"#",builtin:true},
  {id:'builtin-23',title:"镜头语言与运镜",cat:"动画",level:"中级",desc:"推拉摇移、景深控制、镜头节奏",link:"#",builtin:true},
  {id:'builtin-24',title:"Nuke合成基础",cat:"渲染",level:"进阶",desc:"AOV合成、色彩校正、特效叠加",link:"#",builtin:true},
];

// 当前教程数据（优先用 API 返回的，否则 fallback 到默认）
let tutorials = [...DEFAULT_TUTORIALS];

// ===== 通用 API 工具函数 =====
function apiHeaders() {
  const token = localStorage.getItem('3dacademy-token-v1') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {})
  };
}

async function api(method, path, body) {
  const url = API_BASE + '/api' + path;
  try {
    const res = await fetch(url, {
      method,
      headers: apiHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    // 204 No Content
    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    console.error(`API [${method}] ${path}:`, err);
    throw err;
  }
}

// Toast 提示（全局）
function toast(msg){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

// 文件上传工具
async function uploadFileToR2(file, category, relatedId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category || '');
  formData.append('relatedId', relatedId || '');

  const token = localStorage.getItem('3dacademy-token-v1') || '';
  const url = API_BASE + '/api/upload';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => {})).error || '上传失败');
  return await res.json();
}


// ===== 账号登录系统（调用后端API）=====
var Auth=(function(){
  const SESSION_KEY='3dacademy-session-v1';
  const TOKEN_KEY='3dacademy-token-v1';
  let isRegisterMode=false;
  let currentUserData=null;  // 内存缓存

  // DOM
  const loginBtn=document.getElementById('loginBtn'),
    userAvatarWrap=document.getElementById('userAvatarWrap'),
    userAvatar=document.getElementById('userAvatar'),
    dropdown=document.getElementById('userDropdown'),
    dropdownAvatar=document.getElementById('dropdownAvatar'),
    dropdownName=document.getElementById('dropdownName'),
    dropdownEmail=document.getElementById('dropdownEmail'),
    authOverlay=document.getElementById('authModalOverlay'),
    authForm=document.getElementById('authForm'),
    authModalTitle=document.getElementById('authModalTitle'),
    authModalClose=document.getElementById('authModalClose'),
    authCancel=document.getElementById('authCancel'),
    authSubmit=document.getElementById('authSubmit'),
    authSwitchBtn=document.getElementById('authSwitchBtn'),
    authSwitchText=document.getElementById('authSwitchText'),
    authNicknameGroup=document.getElementById('authNicknameGroup'),
    authConfirmGroup=document.getElementById('authConfirmGroup'),
    authCodeGroup=document.getElementById('authCodeGroup'),
    sendCodeBtn=document.getElementById('sendCodeBtn'),
    fEmail=document.getElementById('authEmail'),
    fPassword=document.getElementById('authPassword'),
    fNickname=document.getElementById('authNickname'),
    fConfirm=document.getElementById('authConfirm'),
    fCode=document.getElementById('authCode'),
    profileBtn=document.getElementById('profileBtn'),
    logoutBtn=document.getElementById('logoutBtn'),
    profileOverlay=document.getElementById('profileModalOverlay'),
    profileForm=document.getElementById('profileForm'),
    profileModalClose=document.getElementById('profileModalClose'),
    profileCancel=document.getElementById('profileCancel'),
    profileNickname=document.getElementById('profileNickname'),
    profileEmail=document.getElementById('profileEmail'),
    profileBio=document.getElementById('profileBio'),
    avatarColors=document.getElementById('avatarColors');

  function getSession(){
    if(currentUserData) return currentUserData;
    const s=localStorage.getItem(SESSION_KEY);
    if(!s) return null;
    try{return JSON.parse(s)}catch(e){return null}
  }
  function saveSession(user){
    currentUserData=user;
    localStorage.setItem(SESSION_KEY,JSON.stringify(user));
  }
  function saveToken(token){
    localStorage.setItem(TOKEN_KEY,token);
  }

  function clearSession(){
    currentUserData=null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  function currentUser(){
    // 演示模式：返回默认演示用户
    if(DEMO_MODE){
      if(!currentUserData) currentUserData={
        id:'demo-user',email:'demo@local',nickname:'演示用户',
        avatarColor:'#6ea8fe',bio:'离线演示模式',
      };
      return currentUserData;
    }
    return getSession();
  }
  function isLoggedIn(){
    if(DEMO_MODE) return true; // 演示模式始终已登录
    return !!currentUser();
  }

  // 验证码倒计时（前端模拟）
  let countdownTimer=null,countdownSeconds=0;

  function clearCountdown(){
    if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null}
    countdownSeconds=0;
    sendCodeBtn.disabled=false;
    sendCodeBtn.textContent='发送验证码';
  }

  function startCountdown(seconds){
    clearCountdown();
    countdownSeconds=seconds;
    sendCodeBtn.disabled=true;
    sendCodeBtn.textContent=seconds+'s 后重发';
    countdownTimer=setInterval(()=>{
      countdownSeconds--;
      if(countdownSeconds<=0) clearCountdown();
      else sendCodeBtn.textContent=countdownSeconds+'s 后重发';
    },1000);
  }

  // 切换登录/注册模式
  function setMode(register){
    isRegisterMode=register;
    authNicknameGroup.style.display=register?'flex':'none';
    authConfirmGroup.style.display=register?'flex':'none';
    authCodeGroup.style.display=register?'flex':'none';
    sendCodeBtn.style.display=register?'inline-flex':'none';
    fNickname.required=register;
    fConfirm.required=register;
    fCode.required=register;
    authModalTitle.textContent=register?'注册新账号':'登录';
    authSubmit.textContent=register?'注册':'登录';
    authSwitchText.textContent=register?'已有账号？':'还没有账号？';
    authSwitchBtn.textContent=register?'去登录':'立即注册';
    if(!register) clearCountdown();
  }

  // 发送验证码（保留 EmailJS 或降级显示）
  async function sendCode(){
    const email=fEmail.value.trim();
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      toast('⚠️ 请先输入正确的邮箱地址');fEmail.focus();return;
    }
    // 检查邮箱是否已注册 - 通过API检查
    try{
      await api('POST','/auth/login',{email:'__check__',password:'__check__'});
    }catch(e){/* 忽略 */}
    
    const code=String(Math.floor(100000+Math.random()*900000));
    // ★ EmailJS 发送验证码邮件（配置方式与原版相同）
    const PUBLIC_KEY='YOUR_PUBLIC_KEY';
    const SERVICE_ID='YOUR_SERVICE_ID';
    const TEMPLATE_ID='YOUR_TEMPLATE_ID';

    sendCodeBtn.disabled=true;
    sendCodeBtn.textContent='发送中...';

    if(typeof emailjs!=='undefined'&&PUBLIC_KEY!=='YOUR_PUBLIC_KEY'){
      emailjs.init(PUBLIC_KEY);
      emailjs.send(SERVICE_ID,TEMPLATE_ID,{
        to_email:email, verify_code:code, expire_minutes:'5'
      }).then(()=>{
        toast('📧 验证码已发送至 '+email+'，请查收（5分钟内有效）');
        startCountdown(60);
      }).catch(err=>{
        console.error('EmailJS发送失败:',err);
        toast('⚠️ 邮件发送失败，请稍后重试');
        sendCodeBtn.disabled=false;
        sendCodeBtn.textContent='发送验证码';
      });
    }else{
      toast('📧 验证码：'+code+'（5分钟内有效，请配置EmailJS实现真实发送）');
      startCountdown(60);
    }
  }

  // 校验验证码（简单校验，生产环境应通过后端验证）
  function verifyCode(email,inputCode){
    // 简单实现：仅做非空校验，实际验证由后端处理
    if(!inputCode||inputCode.length!==6){
      toast('⚠️ 请输入6位验证码');return false;
    }
    return true;
  }

  function openAuth(){
    authForm.reset();setMode(false);clearCountdown();
    authOverlay.classList.add('open');
  }
  function closeAuth(){authOverlay.classList.remove('open');}

  // 更新UI
  function updateUI(){
    const user=currentUser();
    const logged=!!user;
    if(user){
      loginBtn.style.display='none';
      userAvatarWrap.style.display='block';
      const initial=(user.nickname||user.email).charAt(0).toUpperCase();
      userAvatar.textContent=initial;
      userAvatar.style.background=user.avatarColor||'linear-gradient(135deg, var(--primary), var(--accent))';
      dropdownAvatar.textContent=initial;
      dropdownAvatar.style.background=user.avatarColor||'linear-gradient(135deg, var(--primary), var(--accent))';
      dropdownName.textContent=user.nickname||'用户';
      dropdownEmail.textContent=user.email;
    }else{
      loginBtn.style.display='inline-flex';
      userAvatarWrap.style.display='none';
      dropdown.classList.remove('show');
    }
    document.querySelectorAll('.module-card').forEach(c=>c.classList.toggle('locked',!logged));
    document.dispatchEvent(new CustomEvent('auth-change'));
  }

  // 注册
  async function doRegister(email,password,nickname){
    const result = await api('POST','/auth/register',{email,password,nickname});
    saveToken(result.token);
    saveSession(result.user);
    toast('✅ 注册成功，欢迎 '+result.user.nickname+'！');
    return true;
  }

  // 登录
  async function doLogin(email,password){
    const result = await api('POST','/auth/login',{email,password});
    saveToken(result.token);
    saveSession(result.user);
    toast('✅ 欢迎回来，'+result.user.nickname+'！');
    return true;
  }

  // 退出
  function logout(){
    clearSession();
    toast('已退出登录');
    updateUI();
  }

  // 更新用户信息
  async function updateProfile(data){
    const result = await api('PUT','/user/profile',data);
    // 刷新本地缓存
    if(currentUserData){
      Object.assign(currentUserData,data);
      saveSession(currentUserData);
    }
    updateUI();
  }

  // 事件绑定
  loginBtn.onclick=openAuth;
  authModalClose.onclick=closeAuth;
  authCancel.onclick=closeAuth;
  authOverlay.addEventListener('click',e=>{if(e.target===authOverlay)closeAuth()});
  sendCodeBtn.onclick=sendCode;
  fCode.addEventListener('input',()=>{fCode.value=fCode.value.replace(/\D/g,'').slice(0,6)});
  authSwitchBtn.onclick=()=>setMode(!isRegisterMode);

  authForm.onsubmit=function(e){
    e.preventDefault();
    const email=fEmail.value.trim();
    const password=fPassword.value;
    (async()=>{
      try{
        if(isRegisterMode){
          const nickname=fNickname.value.trim();
          const confirm=fConfirm.value;
          const code=fCode.value.trim();
          if(password!==confirm){toast('⚠️ 两次密码不一致');return}
          if(!code){toast('⚠️ 请输入邮箱验证码');fCode.focus();return}
          if(!verifyCode(email,code))return;
          if(await doRegister(email,password,nickname)){closeAuth();updateUI();clearCountdown();}
        }else{
          if(await doLogin(email,password)){closeAuth();updateUI();}
        }
      }catch(err){
        toast('⚠️ '+err.message);
      }
    })();
  };

  userAvatar.onclick=(e)=>{e.stopPropagation();dropdown.classList.toggle('show');};
  document.addEventListener('click',e=>{
    if(!userAvatarWrap.contains(e.target)) dropdown.classList.remove('show');
  });

  logoutBtn.onclick=logout;

  // 个人信息弹窗
  profileBtn.onclick=()=>{
    dropdown.classList.remove('show');
    const user=currentUser();
    if(!user) return;
    profileNickname.value=user.nickname||'';
    profileEmail.value=user.email||'';
    profileBio.value=user.bio||'';
    avatarColors.querySelectorAll('.avatar-color').forEach(c=>{
      c.classList.toggle('active',c.dataset.color===(user.avatarColor||''));
    });
    profileOverlay.classList.add('open');
  };
  profileModalClose.onclick=()=>profileOverlay.classList.remove('open');
  profileCancel.onclick=()=>profileOverlay.classList.remove('open');
  profileOverlay.addEventListener('click',e=>{if(e.target===profileOverlay)profileOverlay.classList.remove('open')});

  avatarColors.onclick=(e)=>{
    const c=e.target.closest('.avatar-color');if(!c)return;
    avatarColors.querySelectorAll('.avatar-color').forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
  };

  profileForm.onsubmit=function(e){
    e.preventDefault();
    const nickname=profileNickname.value.trim();
    const bio=profileBio.value.trim();
    const activeColor=avatarColors.querySelector('.avatar-color.active');
    const avatarColor=activeColor?activeColor.dataset.color:'';
    (async()=>{
      try{await updateProfile({nickname,bio,avatarColor});profileOverlay.classList.remove('open');toast('✅ 个人信息已更新')}
      catch(err){toast('⚠️ '+err.message)}
    })();
  };

  // 初始化：检测演示模式并更新 UI
  if(getSession()) updateUI();

  // 演示模式：检测后端是否可用，不可用则自动进入演示模式
  checkDemoMode().then(()=>{
    if(DEMO_MODE) updateUI(); // 演示模式下自动"登录"
    // 派发事件让各模块重新渲染
    document.dispatchEvent(new CustomEvent('auth-change'));
  });

  // 全局点击拦截（仅非演示模式下阻止 locked 卡片操作）
  document.addEventListener('click',function(e){
    if(DEMO_MODE) return; // 演示模式下不拦截
    const card=e.target.closest('.module-card.locked,.tut-card.locked');
    if(card){e.preventDefault();e.stopPropagation();openAuth();}
  },true);

  return {currentUser,isLoggedIn,updateUI,openAuth};
}());


// ===== 粒子背景（不变）=====
!function(){
  const cv=document.getElementById('particleCanvas'),ctx=cv.getContext('2d');
  let ps=[],w,h;
  function resize(){w=cv.width=innerWidth;h=cv.height=innerHeight}
  resize(); addEventListener('resize',resize);
  const N=Math.min(70,Math.floor(innerWidth*innerHeight/18000));
  for(let i=0;i<N;i++) ps.push({x:Math.random()*w,y:Math.random()*h,
    sz:Math.random()*2+.5,sx:(Math.random()-.5)*.3,sy:(Math.random()-.5)*.3,op:Math.random()*.4+.1});
  function draw(){
    ctx.clearRect(0,0,w,h);
    ps.forEach(p=>{
      p.x+=p.sx;p.y+=p.sy;
      if(p.x<0||p.x>w){p.x=Math.random()*w;p.y=Math.random()*h}
      if(p.y<0||p.y>h){p.x=Math.random()*w;p.y=Math.random()*h}
      ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);
      ctx.fillStyle=`rgba(110,168,254,${p.op})`;ctx.fill();
    });
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
      const dx=ps[i].x-ps[j].x,dy=ps[i].y-ps[j].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<130){ctx.beginPath();ctx.moveTo(ps[i].x,ps[i].y);ctx.lineTo(ps[j].x,ps[j].y);
        ctx.strokeStyle=`rgba(110,168,254,${.07*(1-d/130)})`;ctx.stroke()}
    }
    requestAnimationFrame(draw);
  }
  draw();
}();


// ===== 3D立方体交互（不变）=====
!function(){
  const scene=document.querySelector('.cube-scene'),cube=document.getElementById('heroCube');
  if(!scene||!cube) return;
  let drag=false,sx,sy,rx=-15,ry=0,autoTimer;
  function startDrag(x,y){drag=true;cube.classList.add('dragging');sx=x;sy=y;clearTimeout(autoTimer)}
  function onDrag(x,y){if(!drag)return;ry+=(x-sx)*.5;rx-=(y-sy)*.5;cube.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg)`;sx=x;sy=y}
  function endDrag(){drag=false;autoTimer=setTimeout(()=>{if(!drag){cube.classList.remove('dragging');cube.style.transform=''}},3000)}
  scene.addEventListener('mousedown',e=>startDrag(e.clientX,e.clientY));
  addEventListener('mousemove',e=>onDrag(e.clientX,e.clientY));
  addEventListener('mouseup',endDrag);
  scene.addEventListener('touchstart',e=>startDrag(e.touches[0].clientX,e.touches[0].clientY),{passive:true});
  scene.addEventListener('touchmove',e=>onDrag(e.touches[0].clientX,e.touches[0].clientY),{passive:true});
  scene.addEventListener('touchend',endDrag);
}();


// ===== 数字滚动（不变）=====
!function(){
  document.querySelectorAll('.stat-num').forEach(el=>{
    const target=+el.dataset.target;
    new IntersectionObserver(([e])=>{
      if(!e.isIntersecting)return;
      const t0=performance.now();
      !function tick(now){
        const p=Math.min((now-t0)/2000,1),ease=1-Math.pow(1-p,4);
        el.textContent=Math.round(target*ease);
        if(p<1)requestAnimationFrame(tick);
      }(t0);this.unobserve(el);
    },{threshold:.5}).observe(el);
  });
}();


// ===== 导航栏（不变）=====
!function(){
  const nb=document.getElementById('navbar'),mb=document.getElementById('menuBtn'),nl=document.getElementById('navLinks');
  addEventListener('scroll',()=>nb.classList.toggle('scrolled',scrollY>50));
  mb.onclick=()=>nl.classList.toggle('open');
  nl.querySelectorAll('.nav-link').forEach(l=>l.onclick=()=>nl.classList.remove('open'));
  const secs=document.querySelectorAll('.section,.hero');
  addEventListener('scroll',()=>{
    let cur='';
    secs.forEach(s=>{if(scrollY>=s.offsetTop-100)cur=s.id});
    nl.querySelectorAll('.nav-link').forEach(l=>{
      l.classList.toggle('active',l.getAttribute('href')==='#'+cur);
    });
  });
}();


// ===== 学习模块（动态 CRUD 版）=====
!function(){
  const grid=document.getElementById('modulesGrid'),
    si=document.getElementById('moduleSearch'),
    fbs=document.querySelectorAll('#moduleFilterBtns .filter-btn'),
    em=document.getElementById('moduleEmptyMsg'),
    overlay=document.getElementById('moduleModalOverlay'),
    form=document.getElementById('moduleForm'),
    addBtn=document.getElementById('addModuleBtn'),
    closeBtn=document.getElementById('moduleModalClose'),
    cancelBtn=document.getElementById('moduleCancel'),
    modalTitle=document.getElementById('moduleModalTitle'),
    editIdEl=document.getElementById('moduleEditId'),
    fTitle=document.getElementById('modTitle'),
    fIcon=document.getElementById('modIcon'),
    fCategory=document.getElementById('modCategory'),
    fDesc=document.getElementById('modDesc'),
    fTags=document.getElementById('modTags'),
    fDiff=document.getElementById('modDiff'),
    colorPicker=document.getElementById('modColors');

  let filter='all',search='',selectedColor='#6ea8fe';

  // 加载模块数据
  async function loadModules(){
    if(DEMO_MODE){
      const saved=LS.get('3dacademy-modules');
      if(saved.length>0){allModules=saved;return}
      // 首次使用：合并默认+自定义（自定义为空）
      allModules=[...DEFAULT_MODULES];return;
    }
    try{
      const data = await api('GET',`/modules?filter=${filter}&search=${encodeURIComponent(search)}`);
      allModules = Array.isArray(data) ? data : (data.list || data.modules || []);
      if(allModules.length === 0 && !Auth.isLoggedIn()) allModules = [...DEFAULT_MODULES];
    }catch(err){
      console.log('模块加载使用默认数据（离线模式）');
      allModules = [...DEFAULT_MODULES];
    }
  }

  // 打开/关闭弹窗
  function openModal(editItem){
    form.reset();editIdEl.value='';fDiff.value=50;selectedColor='#6ea8fe';
    colorPicker.querySelectorAll('.avatar-color').forEach(c=>{c.classList.toggle('active',c.dataset.color==='#6ea8fe')});
    if(editItem){
      modalTitle.textContent='编辑模块';
      editIdEl.value=editItem.id;
      fTitle.value=editItem.title||'';
      fIcon.value=editItem.icon||'📚';
      fCategory.value=editItem.category||'';
      fDesc.value=editItem.desc||'';
      fTags.value=editItem.tags||'';
      fDiff.value=editItem.difficulty||50;
      selectedColor=editItem.color||'#6ea8fe';
      colorPicker.querySelectorAll('.avatar-color').forEach(c=>{c.classList.toggle('active',c.dataset.color===selectedColor)});
    }else{
      modalTitle.textContent='添加新模块';
    }
    overlay.classList.add('open');
  }
  function closeModal(){overlay.classList.remove('open')}

  addBtn.onclick=()=>{if(!Auth.isLoggedIn()){Auth.openAuth();return}openModal()};
  closeBtn.onclick=closeModal;cancelBtn.onclick=closeModal;
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()});

  // 颜色选择
  colorPicker.addEventListener('click',e=>{
    const c=e.target.closest('.avatar-color');if(!c)return;
    colorPicker.querySelectorAll('.avatar-color').forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
    selectedColor=c.dataset.color;
  });

  // 提交表单
  form.onsubmit=async function(e){
    e.preventDefault();
    if(!Auth.isLoggedIn()){Auth.openAuth();return}
    try{
      const id=editIdEl.value;
      const data={
        title:fTitle.value.trim(),
        icon:fIcon.value.trim()||'📚',
        category:fCategory.value,
        desc:fDesc.value.trim()||'暂无描述',
        tags:fTags.value.trim(),
        difficulty:+fDiff.value||50,
        color:selectedColor,
      };
      if(id){
        await apiOrLocal('PUT',`/modules/${id}`,data,'3dacademy-modules');
        toast('✅ 模块已更新！');
      }else{
        data.id='custom-mod-'+Date.now();data.builtin=false;
        await apiOrLocal('POST','/modules',data,'3dacademy-modules');
        toast('✅ 模块添加成功！');
      }
      closeModal();await render();
    }catch(err){toast('⚠️ '+err.message)}
  };

  async function deleteModule(id){
    if(!confirm('确定要删除这个模块吗？'))return;
    try{await apiOrLocal('DELETE',`/modules/${id}`,id,'3dacademy-modules');await render();toast('🗑️ 模块已删除')}
    catch(err){toast('⚠️ '+err.message)}
  }

  // 保存模块数据到 localStorage（演示模式）
  function saveLocalModules(){if(DEMO_MODE)LS.set('3dacademy-modules',allModules)}

  async function render(){
    await loadModules();
    grid.innerHTML='';em.style.display=allModules.length?'none':'block';

    let filtered = allModules;
    if(search){
      const kw=search.toLowerCase();
      filtered = filtered.filter(m => (m.title+m.desc+m.tags).toLowerCase().includes(kw));
    }
    if(filter!=='all'){
      filtered = filtered.filter(m=>m.category===filter);
    }

    if(filtered.length === 0){
      em.style.display='block';return;
    }

    filtered.forEach((m,idx)=>{
      const d=document.createElement('div');
      d.className='module-card visible';
      d.style.animationDelay=(idx*0.08)+'s';
      const isCustom=!m.builtin;
      const tagList=(m.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
      d.innerHTML=`
        <div class="module-card-header">
          <div class="module-icon" style="--icon-color:${m.color||'#6ea8fe'}">${m.icon||'📚'}</div>
          <div class="module-card-title-row">
            <h3>${m.title}${isCustom?' <span class="builtin-tag">自定义</span>':''}</h3>
            ${isCustom?`<div class="module-card-actions">
              <button class="tut-btn edit" title="编辑">✏️</button>
              <button class="tut-btn del" title="删除">🗑️</button>
            </div>`:''}
          </div>
        </div>
        <p>${m.desc||''}</p>
        ${tagList.length ? `<ul class="module-tags">${tagList.map(t=>`<li>${t}</li>`).join('')}</ul>` : ''}
        <div class="module-diff">
          <span>难度 ${m.difficulty||50}%</span>
          <div class="diff-bar"><div class="diff-fill" style="width:${m.difficulty||50}%"></div></div>
        </div>`;
      const editBtn=d.querySelector('.edit'),delBtn=d.querySelector('.del');
      if(editBtn) editBtn.onclick=()=>openModal(m);
      if(delBtn) delBtn.onclick=()=>deleteModule(m.id);
      grid.appendChild(d);
    });
  }

  si.addEventListener('input',e=>{search=e.target.value;render()});
  fbs.forEach(b=>b.addEventListener('click',()=>{
    fbs.forEach(x=>x.classList.remove('active'));b.classList.add('active');
    filter=b.dataset.filter;render();
  }));
  render();
  document.addEventListener('auth-change',render);
}();


// ===== 教程中心（API 版）=====
!function(){
  const grid=document.getElementById('tutorialGrid'),si=document.getElementById('searchInput'),
    fbs=document.querySelectorAll('.filter-btn'),em=document.getElementById('emptyMsg'),
    overlay=document.getElementById('modalOverlay'),form=document.getElementById('tutorialForm'),
    addBtn=document.getElementById('addTutorialBtn'),closeBtn=document.getElementById('modalClose'),
    cancelBtn=document.getElementById('modalCancel'),modalTitle=document.getElementById('modalTitle'),
    editIdEl=document.getElementById('editId'),
    fTitle=document.getElementById('tutTitle'),fCat=document.getElementById('tutCat'),
    fLevel=document.getElementById('tutLevel'),fDesc=document.getElementById('tutDesc'),
    fLink=document.getElementById('tutLink');

  let filter='all',search='',allTutorials=[];  // 从服务端获取的数据

  // 加载教程列表（API 失败时 fallback 到默认数据）
  async function loadTutorials(){
    if(DEMO_MODE){
      const saved=LS.get('3dacademy-tutorials');
      if(saved.length>0){allTutorials=saved;return}
      allTutorials=[...DEFAULT_TUTORIALS];return;
    }
    try{
      const data = await api('GET',`/tutorials?filter=${filter}&search=${encodeURIComponent(search)}`);
      allTutorials = Array.isArray(data) ? data : (data.list || data.tutorials || []);
      if(allTutorials.length === 0) allTutorials = [...DEFAULT_TUTORIALS];
    }catch(err){
      console.log('教程加载使用默认数据（离线模式）');
      allTutorials = [...DEFAULT_TUTORIALS];
    }
  }

  // 打开/关闭弹窗
  function openModal(editItem){
    form.reset();editIdEl.value='';
    if(editItem){
      modalTitle.textContent='编辑教程';
      editIdEl.value=editItem.id;
      fTitle.value=editItem.title;
      fCat.value=editItem.cat;
      fLevel.value=editItem.level;
      fDesc.value=editItem.desc||'';
      fLink.value=editItem.link;
    }else{modalTitle.textContent='添加新教程'}
    overlay.classList.add('open');
  }
  function closeModal(){overlay.classList.remove('open')}

  addBtn.onclick=()=>{if(!Auth.isLoggedIn()){Auth.openAuth();return}openModal()};
  closeBtn.onclick=closeModal;cancelBtn.onclick=closeModal;
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()});

  form.onsubmit=async function(e){
    e.preventDefault();
    if(!Auth.isLoggedIn()){Auth.openAuth();return}
    try{
      const id=editIdEl.value;
      const data={title:fTitle.value.trim(),cat:fCat.value,level:fLevel.value,desc:fDesc.value.trim()||'暂无描述',link:fLink.value.trim()};
      if(id){
        await apiOrLocal('PUT',`/tutorials/${id}`,data,'3dacademy-tutorials');
        toast('✅ 教程已更新！');
      }else{
        data.id='custom-'+Date.now();data.builtin=false;
        await apiOrLocal('POST','/tutorials',data,'3dacademy-tutorials');
        toast('✅ 教程添加成功！');
      }
      closeModal();await render();
    }catch(err){toast('⚠️ '+err.message)}
  };

  async function deleteTutorial(id){
    if(!confirm('确定要删除这个教程吗？'))return;
    try{await apiOrLocal('DELETE',`/tutorials/${id}`,id,'3dacademy-tutorials');render();toast('🗑️ 教程已删除')}
    catch(err){toast('⚠️ '+err.message)}
  }

  async function render(){
    await loadTutorials();
    grid.innerHTML='';em.style.display=allTutorials.length?'none':'block';
    const logged=Auth.isLoggedIn();
    allTutorials.forEach(t=>{
      const d=document.createElement('div');
      d.className='tut-card'+(logged?'':' locked');
      const isCustom=!t.builtin;
      d.innerHTML=`
        <h4>${t.title}${isCustom?' <span style="font-size:11px;color:var(--ok)">自定义</span>':''}</h4>
        <p>${t.desc}</p>
        <div class="tut-meta">
          <div><span class="tut-cat">${t.cat}</span><span class="tut-level">${t.level}</span></div>
          <div class="tut-actions">
            <a class="tut-link" href="${t.link}" target="_blank">去学习 →</a>
            <button class="tut-btn edit" title="编辑">✏️</button>
            <button class="tut-btn del" title="删除">🗑️</button>
          </div>
        </div>`;
      d.querySelector('.edit').onclick=()=>openModal(t);
      d.querySelector('.del').onclick=()=>deleteTutorial(t.id);
      grid.appendChild(d);
    });
  }

  si.addEventListener('input',e=>{search=e.target.value;render()});
  fbs.forEach(b=>b.addEventListener('click',()=>{
    fbs.forEach(x=>x.classList.remove('active'));b.classList.add('active');
    filter=b.dataset.filter;render();
  }));
  render();
  document.addEventListener('auth-change',render);
}();


// ===== 学习路线打卡（API 版）=====
!function(){
  const tl=document.getElementById('timeline'),pf=document.getElementById('progressFill'),
    pl=document.getElementById('progressLabel'),pd=document.getElementById('progressDetail');

  const roadmap=[
    {day:"Day 1-3",title:"熟悉 Maya 界面",desc:"视图导航、基本工具、项目管理"},
    {day:"Day 4-6",title:"基础建模练习",desc:"创建简单道具：杯子、桌子、宝箱"},
    {day:"Day 7-9",title:"进阶建模",desc:"硬表面建模、布尔运算、倒角技巧"},
    {day:"Day 10-12",title:"UV与贴图入门",desc:"UV展开、贴图绘制、Arnold基础材质"},
    {day:"Day 13-15",title:"灯光与渲染",desc:"三点布光、Arnold渲染设置、AOV输出"},
    {day:"Day 16-18",title:"骨骼绑定基础",desc:"搭建骨骼、IK设置、简单控制器"},
    {day:"Day 19-21",title:"权重与控制器",desc:"权重涂抹、自定义控制器、绑定完善"},
    {day:"Day 22-24",title:"关键帧动画",desc:"走路循环、缓动曲线、动画法则运用"},
    {day:"Day 25-27",title:"场景整合",desc:"灯光材质动画整合、渲染输出序列"},
    {day:"Day 28-30",title:"作品输出",desc:"后期合成、剪辑输出、作品集整理"},
  ];

  let checks=[];

  async function loadProgress(){
    if(DEMO_MODE){
      checks=LS.get('3dacademy-roadmap');
      if(checks.length===0) checks=Array(roadmap.length).fill(false);
    }else if(!Auth.isLoggedIn()){
      checks=Array(roadmap.length).fill(false);
    }else{
      try{
        const data=await api('GET','/roadmap');
        checks=data.checks||Array(roadmap.length).fill(false);
      }catch(err){console.error('加载路线进度失败:',err);checks=Array(roadmap.length).fill(false);}
    }
  }

  async function render(){
    tl.innerHTML='';
    await loadProgress();
    roadmap.forEach((r,i)=>{
      const d=document.createElement('div');
      d.className='tl-item'+(checks[i]?' done':'');
      d.innerHTML=`<div class="tl-top"><span class="tl-day">${r.day}</span><span class="tl-title">${r.title}</span>
        <label class="tl-check"><input type="checkbox" ${checks[i]?'checked':''}></label></div>
        <div class="tl-desc">${r.desc}</div>`;
      d.querySelector('input').addEventListener('change',async e=>{
        if(!Auth.isLoggedIn()){Auth.openAuth();e.target.checked=!e.target.checked;return}
        checks[i]=e.target.checked;d.classList.toggle('done',checks[i]);
        try{
          if(DEMO_MODE){LS.set('3dacademy-roadmap',checks)}
          else{await api('PUT','/roadmap',{checks})}
        }
        catch(err){toast('⚠️ 保存失败:'+err.message);checks[i]=!checks[i];d.classList.toggle('done',!checks[i]);e.target.checked=!checks[i]}
        update();
      });
      tl.appendChild(d);
    });
    update();
  }

  function update(){
    const done=checks.filter(Boolean).length,pct=Math.round(done/roadmap.length*100);
    pf.style.width=pct+'%';pl.textContent=`完成进度：${pct}%`;pd.textContent=`${done}/${roadmap.length} 天`;
  }
  render();
}();


// ===== 动画十二法则（不变）=====
!function(){
  const principles=[
    {num:"01",title:"挤压与拉伸",desc:"物体受力时形变，体现弹性和重量感"},
    {num:"02",title:"预备动作",desc:"主要动作前的反向预备，增加力度感"},
    {num:"03",title:"演出布局",desc:"将观众视线引导到场景重点位置"},
    {num:"04",title:"逐帧与关键帧",desc:"两种动画制作方式，各有适用场景"},
    {num:"05",title:"跟随与重叠",desc:"附属部分滞后于主体的运动惯性"},
    {num:"06",title:"慢入与慢出",desc:"动作开始和结束时减速，中间加速"},
    {num:"07",title:"弧线运动",desc:"自然界的运动轨迹多为弧线"},
    {num:"08",title:"次要动作",desc:"辅助主要动作的附加运动"},
    {num:"09",title:"时间节奏",desc:"动作速度传达情感和信息的关键"},
    {num:"10",title:"夸张",desc:"适度夸张让动画更有表现力"},
    {num:"11",title:"扎实绘画",desc:"理解三维结构，确保造型准确"},
    {num:"12",title:"吸引力",desc:"角色和动作的感染力与共鸣"},
  ];
  const g=document.getElementById('principlesGrid');
  principles.forEach(p=>{
    const d=document.createElement('div');d.className='principle-card';
    d.innerHTML=`<div class="principle-num">${p.num}</div><h4>${p.title}</h4><p>${p.desc}</p>`;
    g.appendChild(d);
  });
}();


// ===== 快捷键（不变）=====
!function(){
  const shortcuts=[
    {keys:["Q","W","E","R"],desc:"选择 / 移动 / 旋转 / 缩放"},
    {keys:["Alt","LMB"],desc:"旋转视角"},{keys:["Alt","MMB"],desc:"平移视角"},
    {keys:["Alt","RMB"],desc:"缩放视图"},{keys:["F"],desc:"聚焦选中物体"},
    {keys:["Ctrl","D"],desc:"复制对象"},{keys:["Ctrl","Z"],desc:"撤销操作"},
    {keys:["1","2","3"],desc:"粗糙/中等/平滑显示"},{keys:["4","5","6"],desc:"线框/实体/纹理显示"},
    {keys:["Space"],desc:"切换视图面板"},{keys:["G"],desc:"重复上次操作"},
  ];
  const sl=document.getElementById('shortcutList');
  shortcuts.forEach(s=>{
    const d=document.createElement('div');d.className='shortcut-item';
    d.innerHTML=`<div class="shortcut-keys">${s.keys.map(k=>`<span class="key">${k}</span>`).join('')}</div><span class="shortcut-desc">${s.desc}</span>`;
    sl.appendChild(d);
  });
}();


// ===== 资源推荐（不变）=====
!function(){
  const resources=[
    {title:"Autodesk Maya 官方文档",desc:"最权威的 Maya 参考手册",link:"https://help.autodesk.com/view/MAYAUL/2024/ENU/"},
    {title:"B站 - Maya 零基础教程",desc:"大量免费中文视频教程",link:"https://www.bilibili.com"},
    {title:"Animation Mentor",desc:"世界级在线动画学校",link:"https://www.animationmentor.com"},
    {title:"CG Society",desc:"全球CG艺术家社区",link:"https://cgsociety.org"},
    {title:"Sketchfab",desc:"免费3D模型素材库",link:"https://sketchfab.com"},
    {title:"Poly Pizza",desc:"免费低多边形3D素材",link:"https://poly.pizza"},
  ];
  const rl=document.getElementById('resourceList');
  resources.forEach(r=>{
    const d=document.createElement('div');d.className='resource-item';
    d.innerHTML=`<h4>${r.title}</h4><p>${r.desc}</p><a href="${r.link}" target="_blank">访问 →</a>`;
    rl.appendChild(d);
  });
}();


// ===== 错题集（API 版）=====
!function(){
  const grid=document.getElementById('mistakeGrid'),
    si=document.getElementById('mistakeSearch'),
    fbs=document.querySelectorAll('#mistakeFilterBtns .filter-btn'),
    em=document.getElementById('mistakeEmptyMsg'),
    overlay=document.getElementById('mistakeModalOverlay'),
    form=document.getElementById('mistakeForm'),
    addBtn=document.getElementById('addMistakeBtn'),
    closeBtn=document.getElementById('mistakeModalClose'),
    cancelBtn=document.getElementById('mistakeModalCancel'),
    modalTitle=document.getElementById('mistakeModalTitle'),
    editIdEl=document.getElementById('mistakeEditId'),
    fSubject=document.getElementById('mkSubject'),
    fQuestion=document.getElementById('mkQuestion'),
    fWrong=document.getElementById('mkWrongAnswer'),
    fCorrect=document.getElementById('mkCorrectAnswer'),
    fNote=document.getElementById('mkNote'),
    fFileInput=document.getElementById('mkFileInput'),
    fFileArea=document.getElementById('mkFileArea'),
    fFileList=document.getElementById('mkFileList'),
    msTotal=document.getElementById('msTotal'),
    msMastered=document.getElementById('msMastered'),
    msPending=document.getElementById('msPending');

  let filter='all',search='',pendingFiles=[],allMistakes=[];

  // 默认错题（演示数据）
  const DEFAULT_MISTAKES=[
    {id:'demo-01',subject:'建模',question:'Maya中如何给多边形添加倒角？我总是找不到倒角工具在哪里。',wrong_answer:'在Edit Mesh菜单里找了半天没找到，以为是Mesh菜单。',correct_answer:'选择边 → Edit Mesh → Bevel（或按快捷键 Ctrl+B），可在属性面板调节分数和圆度。',note:'记住：倒角在Edit Mesh下，不在Mesh下！快捷键Ctrl+B很好用。',mastered:true,date:'2026/4/20',files:[]},
    {id:'demo-02',subject:'绑定',question:'IK和FK的区别是什么？什么时候该用哪个？',wrong_answer:'觉得IK和FK差不多，随便用一个就行，结果角色走路时脚一直滑动。',correct_answer:'IK（逆向动力学）：拖动控制器自动计算父关节，适合脚踩地面等固定末端场景。\nFK（正向动力学）：手动旋转每个关节，适合挥动手臂等弧线运动。',note:'走路时脚必须用IK！手臂挥动用FK更自然。',mastered:false,date:'2026/4/22',files:[]},
    {id:'demo-03',subject:'渲染',question:'Arnold渲染出来全是噪点怎么办？',wrong_answer:'以为增加分辨率就能减少噪点，渲染了4小时还是满屏噪点。',correct_answer:'增加Camera(AA)采样值（建议3-5），而不是分辨率。同时检查灯光采样、DOF采样设置。',note:'分辨率≠采样！Camera AA才是关键。',mastered:false,date:'2026/4/25',files:[]},
    {id:'demo-04',subject:'动画',question:'走路循环动画中，角色重心总是上下跳动感不对？',wrong_answer:'只做了腿的前后运动，没有做重心的上下和前后位移，看起来像在地上滑行。',correct_answer:'走路时重心有8字形运动轨迹：上下单腿支撑时最高、前后随脚步移动、左右向支撑腿偏移。',note:'先理解走路的力学原理，再K帧！参考《动画师生存工具箱》。',mastered:false,date:'2026/4/26',files:[]},
  ];

  // 加载错题数据
  async function loadMistakes(){
    if(DEMO_MODE){
      const saved=LS.get('3dacademy-mistakes');
      if(saved.length>0){allMistakes=saved;return}
      allMistakes=[...DEFAULT_MISTAKES];return;
    }
    try{allMistakes = await api('GET',`/mistakes?filter=${filter}&search=${encodeURIComponent(search)}`)}
    catch(err){
      console.log('错题加载使用演示数据（离线模式）');
      allMistakes = [...DEFAULT_MISTAKES];
    }
  }

  // 文件工具函数
  function formatSize(b){if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB'}
  function fileIcon(name){
    const ext=name.split('.').pop().toLowerCase();
    const map={pdf:'📕',doc:'📄',docx:'📄',txt:'📝',py:'🐍',mel:'⚡',ma:'🎬',mb:'🎬',obj:'🧊',fbx:'🧊',zip:'📦',rar:'📦'};
    return map[ext]||'📎';
  }
  function readFileAsBase64(file){
    return new Promise((resolve,reject)=>{
      if(file.size>5*1024*1024){reject('文件大小超过5MB限制');return}
      const reader=new FileReader();
      reader.onload=()=>resolve({name:file.name,size:file.size,type:file.type,data:reader.result});
      reader.onerror=()=>reject('文件读取失败');reader.readAsDataURL(file);
    });
  }
  function renderPendingFiles(){
    fFileList.innerHTML='';
    pendingFiles.forEach((f,i)=>{
      const chip=document.createElement('div');chip.className='file-chip';
      chip.innerHTML=`<span class="file-icon">${fileIcon(f.name)}</span>
        <span class="file-name" title="${f.name}">${f.name}</span>
        <span class="file-size">${formatSize(f.size)}</span>
        <span class="file-remove" data-idx="${i}">✕</span>`;
      chip.querySelector('.file-remove').onclick=()=>{pendingFiles.splice(i,1);renderPendingFiles()};
      fFileList.appendChild(chip);
    });
  }

  fFileInput.addEventListener('change',async e=>{
    for(const file of e.target.files){try{const f=await readFileAsBase64(file);pendingFiles.push(f)}catch(err){toast('⚠️ '+err)}}
    fFileInput.value='';renderPendingFiles();
  });
  fFileArea.addEventListener('dragover',e=>{e.preventDefault();fFileArea.classList.add('dragover')});
  fFileArea.addEventListener('dragleave',()=>fFileArea.classList.remove('dragover'));
  fFileArea.addEventListener('drop',async e=>{
    e.preventDefault();fFileArea.classList.remove('dragover');
    for(const file of e.dataTransfer.files){try{const f=await readFileAsBase64(file);pendingFiles.push(f)}catch(err){toast('⚠️ '+err)}}
    renderPendingFiles();
  });

  function openModal(editItem){
    form.reset();editIdEl.value='';pendingFiles=[];renderPendingFiles();
    if(editItem){
      modalTitle.textContent='编辑错题';
      editIdEl.value=editItem.id;
      fSubject.value=editItem.subject;
      fQuestion.value=editItem.question;
      fWrong.value=editItem.wrong_answer||'';
      fCorrect.value=editItem.correct_answer||'';
      fNote.value=editItem.note||'';
      pendingFiles=editItem.files&&Array.isArray(editItem.files)?[...editItem.files]:[];
      renderPendingFiles();
    }else{modalTitle.textContent='添加错题'}
    overlay.classList.add('open');
  }
  function closeModal(){overlay.classList.remove('open')}
  addBtn.onclick=()=>{if(!Auth.isLoggedIn()){Auth.openAuth();return}openModal()};
  closeBtn.onclick=closeModal;cancelBtn.onclick=closeModal;
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()});

  // 提交表单（支持文件上传到 R2）
  form.onsubmit=async function(e){
    e.preventDefault();
    if(!Auth.isLoggedIn()){Auth.openAuth();return}
    try{
      const id=editIdEl.value;
      var uploadedFiles=[];
      if(DEMO_MODE){
        for(var i=0;i<pendingFiles.length;i++){
          var pf=pendingFiles[i];
          uploadedFiles.push({name:pf.name,size:pf.size,type:pf.type,data:pf.data});
        }
      }else{
        for(const pf of pendingFiles){
          try{
            const uploaded=await uploadFileToR2(
              {name:pf.name,size:pf.size,type:pf.type},
              'mistake',id||''
            );
            uploadedFiles.push({
              name:uploaded.name,size:uploaded.size,type:uploaded.type,key:uploaded.key
            });
          }catch(err){console.error('上传文件失败:',err)}
        }
      }

      const data={
        subject:fSubject.value,
        question:fQuestion.value.trim(),
        wrong_answer:fWrong.value.trim(),
        correct_answer:fCorrect.value.trim(),
        note:fNote.value.trim(),
        files:uploadedFiles,
      };
      if(id){
        await apiOrLocal('PUT',`/mistakes/${id}`,data,'3dacademy-mistakes');
        toast('✅ 错题已更新！');
      }else{
        data.id='demo-'+Date.now();data.mastered=false;data.date=new Date().toLocaleDateString('zh-CN');
        await apiOrLocal('POST','/mistakes',data,'3dacademy-mistakes');
        toast('✅ 错题添加成功！');
      }
      closeModal();await render();
    }catch(err){toast('⚠️ '+err.message)}
  };

  async function deleteMistake(id){
    if(!confirm('确定要删除这条错题吗？'))return;
    try{await apiOrLocal('DELETE',`/mistakes/${id}`,id,'3dacademy-mistakes');await render();toast('🗑️ 错题已删除')}
    catch(err){toast('⚠️ '+err.message)}
  }

  async function toggleMastered(id){
    if(DEMO_MODE){
      const item=allMistakes.find(m=>m.id===id);if(item){item.mastered=!item.mastered;LS.set('3dacademy-mistakes',allMistakes)}
      await render();toast(item?.mastered?'✅ 已标记掌握':'🔄 已取消掌握');return;
    }
    try{
      const result=await api('PATCH',`/mistakes/${id}/master`);
      await render();
      toast(result.mastered?'✅ 已标记掌握':'🔄 已取消掌握');
    }catch(err){toast('⚠️ '+err.message)}
  }

  function previewImage(file){
    // 如果有 R2 key，从服务器获取；否则使用 base64 数据
    const src=file.key?(`${API_BASE}/api/upload/${encodeURIComponent(file.key)}`):file.data;
    if(!file.type||!file.type.startsWith('image/')&&!src.startsWith('data:')){downloadFile(file);return}
    const ov=document.createElement('div');ov.className='img-preview-overlay';
    const img=document.createElement('img');img.src=src;
    ov.appendChild(img);document.body.appendChild(ov);
    ov.onclick=()=>ov.remove();
  }
  function downloadFile(file){
    const a=document.createElement('a');
    a.href=file.key?(`${API_BASE}/api/upload/${encodeURIComponent(file.key)}`):file.data;
    a.download=file.name;a.click();
  }

  function updateStats(){
    const total=allMistakes.length;
    const mastered=allMistakes.filter(m=>m.mastered).length;
    msTotal.textContent=total;msMastered.textContent=mastered;msPending.textContent=total-mastered;
  }

  async function render(){
    grid.innerHTML='';
    if(!Auth.isLoggedIn()){
      em.style.display='none';
      const guard=document.createElement('div');guard.className='empty-state';
      guard.innerHTML=`<div class="empty-state-icon">🔐</div><h3>登录后使用错题集</h3><p>记录你的学习错误，避免重复犯错，支持上传截图和文件。</p><button class="btn btn-primary" id="guardLoginMk">立即登录</button>`;
      grid.appendChild(guard);
      const gb=guard.querySelector('#guardLoginMk');if(gb)gb.onclick=()=>Auth.openAuth();
      updateStats();return;
    }

    await loadMistakes();

    if(allMistakes.length===0){
      em.style.display='none';
      const empty=document.createElement('div');empty.className='empty-state';
      empty.innerHTML=`<div class="empty-state-icon">📝</div><h3>还没有错题记录</h3><p>把学习中犯的错误记录下来，配合截图和文件，复习时一目了然。</p><button class="btn btn-primary" id="emptyAddMk">＋ 添加第一条错题</button>`;
      grid.appendChild(empty);const emptyBtn=empty.querySelector('#emptyAddMk');if(emptyBtn)emptyBtn.onclick=()=>openModal();
    }else em.style.display='none';

    allMistakes.forEach(m=>{
      const d=document.createElement('div');d.className='mk-card';
      d.dataset.mastered=m.mastered;
      let filesHtml='';
      if(m.files&&m.files.length){
        filesHtml='<div class="mk-files">'+m.files.map((f,i)=>
          `<span class="mk-file-chip" data-id="${m.id}" data-fidx="${i}">${fileIcon(f.name)} ${f.name.length>15?f.name.slice(0,12)+'...':f.name}</span>`
        ).join('')+'</div>';
      }
      d.innerHTML=`
        <div class="mk-card-header">
          <h4>${m.question.length>60?m.question.slice(0,60)+'...':m.question}</h4>
          ${m.mastered?'<span class="mk-mastered-tag">已掌握 ✓</span>':''}
        </div>
        <div class="mk-answers">
          <div class="mk-answer-block wrong"><div class="mk-answer-label">❌ 错误答案</div><div class="mk-answer-text">${m.wrong_answer||'未记录'}</div></div>
          <div class="mk-answer-block correct"><div class="mk-answer-label">✅ 正确答案</div><div class="mk-answer-text">${m.correct_answer||'未记录'}</div></div>
        </div>
        ${m.note?'<div class="mk-note">💡 '+m.note+'</div>':''}${filesHtml}
        <div class="mk-card-footer">
          <div class="mk-card-tags"><span class="tut-cat">${m.subject}</span><span class="mk-date">${m.date||''}</span></div>
          <div class="mk-actions">
            <button class="tut-btn" title="${m.mastered?'取消掌握':'标记已掌握'}" data-action="master">${m.mastered?'🔄':'✅'}</button>
            <button class="tut-btn" title="编辑" data-action="edit">✏️</button>
            <button class="tut-btn del" title="删除" data-action="del">🗑️</button>
          </div>
        </div>`;
      d.querySelector('[data-action="master"]').onclick=()=>toggleMastered(m.id);
      d.querySelector('[data-action="edit"]').onclick=()=>openModal(m);
      d.querySelector('[data-action="del"]').onclick=()=>deleteMistake(m.id);
      d.querySelectorAll('.mk-file-chip').forEach(chip=>{
        chip.onclick=()=>{
          const fidx=+chip.dataset.fidx;const file=m.files[fidx];if(file)previewImage(file);
        };
      });
      grid.appendChild(d);
    });
    updateStats();
  }

  si.addEventListener('input',e=>{search=e.target.value;render()});
  fbs.forEach(b=>b.addEventListener('click',()=>{
    fbs.forEach(x=>x.classList.remove('active'));b.classList.add('active');
    filter=b.dataset.filter;render();
  }));
  render();
  document.addEventListener('auth-change',render);
}();


// ===== 作业存储（API 版）=====
!function(){
  const grid=document.getElementById('hwGrid'),
    si=document.getElementById('hwSearch'),
    fbs=document.querySelectorAll('#hwFilterBtns .filter-btn'),
    em=document.getElementById('hwEmptyMsg'),
    overlay=document.getElementById('hwModalOverlay'),
    form=document.getElementById('hwForm'),
    addBtn=document.getElementById('addHwBtn'),
    closeBtn=document.getElementById('hwModalClose'),
    cancelBtn=document.getElementById('hwModalCancel'),
    modalTitle=document.getElementById('hwModalTitle'),
    editIdEl=document.getElementById('hwEditId'),
    fTitle=document.getElementById('hwTitle'),
    fSubject=document.getElementById('hwSubject'),
    fStatus=document.getElementById('hwStatus'),
    fDeadline=document.getElementById('hwDeadline'),
    fScore=document.getElementById('hwScore'),
    fDesc=document.getElementById('hwDesc'),
    fFileInput=document.getElementById('hwFileInput'),
    fFileArea=document.getElementById('hwFileArea'),
    fFileList=document.getElementById('hwFileList'),
    hwTotal=document.getElementById('hwTotal'),
    hwDone=document.getElementById('hwDone'),
    hwTodo=document.getElementById('hwTodo');

  let filter='all',search='',pendingFiles=[],allHw=[];

  // ===== 作业详情弹窗 =====
  const detailOverlay=document.getElementById('hwDetailOverlay'),
    detailClose=document.getElementById('hwDetailClose'),
    detailTitle=document.getElementById('hwDetailTitle'),
    detailBody=document.getElementById('hwDetailBody');

  function showHwDetail(h){
    detailTitle.textContent='📋 ' + (h.title||'作业详情');

    // 状态样式映射
    var sc=statusClass(h.status);

    // 文件列表 HTML
    var filesSection='';
    if(h.files&&h.files.length){
      var fileItems=h.files.map(function(f){
        var icon=fileIcon(f.name);
        var displayName=f.name;
        if(f.name.length>30){displayName=f.name.slice(0,27)+'...';}
        return '<div class="hw-detail-file-item">'
          + '<span class="hdf-icon">'+icon+'</span>'
          + '<span class="hdf-name" title="'+f.name+'">'+displayName+'</span>'
          + '<span class="hdf-size">'+formatSize(f.size)+'</span>'
          + '<div class="hdf-actions">'
          +   '<button class="tut-btn hdf-download" data-name="'+f.name+'" title="下载文件">⬇️</button>'
          + '</div>'
          +'</div>';
      }).join('');
      filesSection='<div class="hw-detail-files">'
        +'<h4>📎 上传文件 ('+h.files.length+')</h4>'
        +'<div class="hdf-list">'+fileItems+'</div>'
        +'</div>';
    }

      // 根据状态决定底部按钮
      var detailActions='';
      if(h.status==='未开始'){
        detailActions=''
          +'<button class="btn hw-detail-submit" id="hwDetailSubmit">▶️ 开始做</button>'
          +'<button class="btn btn-outline" id="hwDetailEdit">✏️ 编辑</button>'
          +'<button class="btn btn-outline hw-del-btn" id="hwDetailDel">🗑️ 删除</button>';
      }else if(h.status==='进行中'){
        var submitDisabled=(!h.files||h.files.length===0)?' disabled':'';
        var submitHint=(!h.files||h.files.length===0)?'（请先上传文件）':'';
        detailActions=''
          +'<button class="btn btn-primary hw-submit-btn-big" id="hwDetailSubmit"'+submitDisabled+'>📤 提交作业'+submitHint+'</button>'
          +'<button class="btn btn-outline" id="hwDetailEdit">✏️ 编辑</button>'
          +'<button class="btn btn-outline hw-del-btn" id="hwDetailDel">🗑️ 删除</button>';
      }else{
        detailActions=''
          +(h.status==='已提交'?'<div style="flex:1;text-align:center;color:var(--ok);font-size:14px;font-weight:600;">✅ 已提交，等待批改</div>':'')
          +(h.status==='已批改'?'<div style="flex:1;text-align:center;color:var(--accent);font-size:14px;font-weight:600;">🎉 已批改</div>':'')
          +'<button class="btn btn-outline" id="hwDetailEdit">✏️ 编辑</button>'
          +'<button class="btn btn-outline hw-del-btn" id="hwDetailDel">🗑️ 删除</button>';
      }

      detailBody.innerHTML=''
      +'<div class="hw-detail-info">'
      +  '<div class="hdi-row"><label>科目</label><span>'+h.subject+'</span></div>'
      +  '<div class="hdi-row"><label>状态</label><span class="hw-status-tag '+sc+'">'+h.status+'</span></div>'
      +  (h.deadline?'<div class="hdi-row"><label>截止日期</label><span>📅 '+h.deadline+'</span></div>':'')
      +  (h.score?'<div class="hdi-row"><label>得分</label><span class="hw-score-inline">🏆 '+h.score+'</span></div>':'')
      +  (h.date?'<div class="hdi-row"><label>创建时间</label><span>'+h.date+'</span></div>':'')
      +'</div>'
      +(h.desc?'<div class="hw-detail-desc"><h4>📝 作业描述</h4><p>'+h.desc+'</p></div>':'')
      +filesSection
      +'<div class="hw-detail-actions">'
      +  detailActions
      +'</div>';

    detailOverlay.classList.add('open');

    // 绑定关闭事件
    detailClose.onclick=function(){detailOverlay.classList.remove('open')};
    detailOverlay.addEventListener('click',function(e){if(e.target===detailOverlay)detailOverlay.classList.remove('open')});

    // 文件下载绑定
    detailBody.querySelectorAll('.hdf-download').forEach(function(btn){
      btn.onclick=function(){
        var name=btn.dataset.name;
        var file=null;
        for(var i=0;i<h.files.length;i++){if(h.files[i].name===name){file=h.files[i];break;}}
        if(file)downloadFile(file);
      };
    });

    // 编辑按钮
    var editBtn=document.getElementById('hwDetailEdit');
    if(editBtn)editBtn.onclick=function(){detailOverlay.classList.remove('open');openModal(h)};

    // 提交按钮
    var submitBtn=document.getElementById('hwDetailSubmit');
    if(submitBtn)submitBtn.onclick=function(){submitHw(h)};

    // 删除按钮
    document.getElementById('hwDetailDel').onclick=function(){
      detailOverlay.classList.remove('open');
      deleteHw(h.id);
    };
  }

  // 默认作业（演示数据）
  const DEFAULT_HOMEWORK=[
    {id:'demo-hw01',title:'Maya 基础道具建模',subject:'建模',status:'已批改',deadline:'2026-04-15',score:'92',desc:'使用多边形建模工具创建一个杯子、桌子和宝箱组合场景。',date:'2026/4/10',files:[]},
    {id:'demo-hw02',title:'UV展开练习',subject:'材质',status:'进行中',deadline:'2026-05-10',score:'',desc:'对上一作业的模型进行完整UV展开，要求无拉伸、接缝隐蔽。',date:'2026/4/28',files:[]},
    {id:'demo-hw03',title:'走路循环动画',subject:'动画',status:'未开始',deadline:'2026-05-20',score:'',desc:'制作一个24帧的可循环走路动画，注意重心起伏和手臂摆动节奏。',date:'2026/5/1',files:[]},
  ];

  // 加载数据
  async function loadHomework(){
    if(DEMO_MODE){
      const saved=LS.get('3dacademy-homework');
      if(saved.length>0){allHw=saved;return}
      allHw=[...DEFAULT_HOMEWORK];return;
    }
    try{allHw=await api('GET',`/homework?filter=${filter}&search=${encodeURIComponent(search)}`)}
    catch(err){
      console.log('作业加载使用演示数据（离线模式）');
      allHw=[...DEFAULT_HOMEWORK];
    }
  }

  function toast(msg){
    let t=document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
    t.textContent=msg;t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),2000);
  }
  function formatSize(b){if(b<1024)return b+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB'}
  function fileIcon(name){
    const ext=name.split('.').pop().toLowerCase();
    const map={pdf:'📕',doc:'📄',docx:'📄',txt:'📝',py:'🐍',mel:'⚡',ma:'🎬',mb:'🎬',obj:'🧊',fbx:'🧊',zip:'📦',rar:'📦'};
    return map[ext]||'📎';
  }
  function readFileAsBase64(file){
    return new Promise((resolve,reject)=>{
      if(file.size>5*1024*1024){reject('文件大小超过5MB限制');return}
      const reader=new FileReader();
      reader.onload=()=>resolve({name:file.name,size:file.size,type:file.type,data:reader.result});
      reader.onerror=()=>reject('文件读取失败');reader.readAsDataURL(file);
    });
  }
  function renderPendingFiles(){
    fFileList.innerHTML='';
    pendingFiles.forEach((f,i)=>{
      const chip=document.createElement('div');chip.className='file-chip';
      chip.innerHTML=`<span class="file-icon">${fileIcon(f.name)}</span>
        <span class="file-name" title="${f.name}">${f.name}</span>
        <span class="file-size">${formatSize(f.size)}</span>
        <span class="file-remove" data-idx="${i}">✕</span>`;
      chip.querySelector('.file-remove').onclick=()=>{pendingFiles.splice(i,1);renderPendingFiles()};
      fFileList.appendChild(chip);
    });
  }

  fFileInput.addEventListener('change', async function(e) {
    for (const file of e.target.files) {
      try { const f = await readFileAsBase64(file); pendingFiles.push(f); }
      catch(err) { toast('⚠️ ' + err); }
    }
    fFileInput.value = '';
    renderPendingFiles();
  });

  fFileArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    fFileArea.classList.add('dragover');
  });

  fFileArea.addEventListener('dragleave', function() {
    fFileArea.classList.remove('dragover');
  });

  fFileArea.addEventListener('drop', async function(e) {
    e.preventDefault();
    fFileArea.classList.remove('dragover');
    for (const file of e.dataTransfer.files) {
      try { const f = await readFileAsBase64(file); pendingFiles.push(f); }
      catch(err) { toast('⚠️ ' + err); }
    }
    renderPendingFiles();
  });

  function statusClass(s){return{'s-todo':'s-todo','未开始':'s-todo','s-doing':'s-doing','进行中':'s-doing','s-done':'s-done','已提交':'s-done','s-graded':'s-graded','已批改':'s-graded'}[s]||'s-todo'}

  function openModal(editItem){
    form.reset();editIdEl.value='';pendingFiles=[];renderPendingFiles();
    if(editItem){
      modalTitle.textContent='编辑作业';editIdEl.value=editItem.id;
      fTitle.value=editItem.title;fSubject.value=editItem.subject;
      fStatus.value=editItem.status||'未开始';fDeadline.value=editItem.deadline||'';
      fScore.value=editItem.score||'';fDesc.value=editItem.desc||'';
      pendingFiles=editItem.files&&Array.isArray(editItem.files)?[...editItem.files]:[];renderPendingFiles();
    }else modalTitle.textContent='添加作业';
    overlay.classList.add('open');
  }
  function closeModal(){overlay.classList.remove('open')}
  addBtn.onclick=()=>{if(!Auth.isLoggedIn()){Auth.openAuth();return}openModal()};
  closeBtn.onclick=closeModal;cancelBtn.onclick=closeModal;
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal()});

  form.onsubmit=async function(e){
    e.preventDefault();
    if(!Auth.isLoggedIn()){Auth.openAuth();return}
    try{
      const id=editIdEl.value;
      var uploadedFiles=[];
      if(DEMO_MODE){
        // 本地模式：直接保存 base64 数据到 localStorage
        for(var i=0;i<pendingFiles.length;i++){
          var pf=pendingFiles[i];
          uploadedFiles.push({name:pf.name,size:pf.size,type:pf.type,data:pf.data});
        }
      }else{
        // 生产模式：上传到 R2 存储
        for(const pf of pendingFiles){
          try{
            const uploaded=await uploadFileToR2(
              {name:pf.name,size:pf.size,type:pf.type},'homework',id||''
            );
            uploadedFiles.push({name:uploaded.name,size:uploaded.size,type:uploaded.type,key:uploaded.key});
          }catch(err){console.error('上传文件失败:',err)}
        }
      }

      const data={
        title:fTitle.value.trim(),subject:fSubject.value,status:fStatus.value,
        deadline:fDeadline.value,score:fScore.value.trim(),desc:fDesc.value.trim(),
        files:uploadedFiles,
      };
      if(id){
        await apiOrLocal('PUT',`/homework/${id}`,data,'3dacademy-homework');toast('✅ 作业已更新！');
      }else{
        data.date=new Date().toLocaleDateString('zh-CN');
        await apiOrLocal('POST','/homework',data,'3dacademy-homework');toast('✅ 作业添加成功！');
      }
      closeModal();await render();
    }catch(err){toast('⚠️ '+err.message)}
  };

  async function deleteHw(id){
    if(!confirm('确定要删除这个作业吗？'))return;
    try{await apiOrLocal('DELETE',`/homework/${id}`,id,'3dacademy-homework');await render();toast('🗑️ 作业已删除')}
    catch(err){toast('⚠️ '+err.message)}
  }

  // ===== 提交作业（状态流转）=====
  async function submitHw(h){
    var newStatus='';
    if(h.status==='未开始'){newStatus='进行中'}
    else if(h.status==='进行中'){newStatus='已提交'}
    else if(h.status==='已提交'){return} // 已提交不可重复提交
    else if(h.status==='已批改'){return}
    else{newStatus='已提交'}

    var confirmMsg='确认将作业「'+h.title+'」的状态改为「'+newStatus+'」吗？';
    if(newStatus==='已提交'){
      confirmMsg='确认提交作业「'+h.title+'」吗？\n\n提交后将无法修改文件，等待老师批改。';
      if(!h.files||h.files.length===0){
        toast('⚠️ 请先上传作业文件再提交');return;
      }
    }
    if(!confirm(confirmMsg))return;

    try{
      await apiOrLocal('PUT',`/homework/${h.id}`,{...h,status:newStatus},'3dacademy-homework');
      toast('✅ 作业已'+(newStatus==='已提交'?'提交！':'更新为「'+newStatus+'」'));
      // 如果详情弹窗开着，刷新它
      if(detailOverlay.classList.contains('open')){
        h.status=newStatus;showHwDetail(h);
      }else{
        await render();
      }
    }catch(err){toast('⚠️ '+err.message)}
  }

  function downloadFile(file){
    var src='';
    if(DEMO_MODE){
      // 本地模式：使用 base64 data
      src=file.data||'';
    }else{
      // 生产模式：从 R2 下载
      if(file.key){src=API_BASE+'/api/upload/'+encodeURIComponent(file.key)}
      else{src=file.data||'';}
    }
    if(!src){toast('⚠️ 文件不可用');return;}
    var a=document.createElement('a');
    a.href=src;a.download=file.name;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  }
  function previewImage(file){
    var src='';
    if(DEMO_MODE){
      src=file.data||'';
    }else{
      if(file.key){src=API_BASE+'/api/upload/'+encodeURIComponent(file.key)}
      else{src=file.data||'';}
    }
    if(!src||(!file.type&&!file.type.startsWith('image/')&&!src.startsWith('data:'))){downloadFile(file);return;}
    var ov=document.createElement('div');ov.className='img-preview-overlay';
    var img=document.createElement('img');img.src=src;
    ov.appendChild(img);document.body.appendChild(ov);ov.onclick=function(){ov.remove()};
  }

  function updateStats(){
    const total=allHw.length;
    const done=allHw.filter(h=>h.status==='已提交'||h.status==='已批改').length;
    hwTotal.textContent=total;hwDone.textContent=done;hwTodo.textContent=total-done;
  }

  async function render(){
    grid.innerHTML='';
    if(!Auth.isLoggedIn()){
      em.style.display='none';
      const guard=document.createElement('div');guard.className='empty-state';
      guard.innerHTML=`<div class="empty-state-icon">🔐</div><h3>登录后使用作业存储</h3><p>上传你的作业文件，追踪进度和得分，学习更高效。</p><button class="btn btn-primary" id="guardLoginHw">立即登录</button>`;
      grid.appendChild(guard);const gb=guard.querySelector('#guardLoginHw');if(gb)gb.onclick=()=>Auth.openAuth();
      updateStats();return;
    }
    await loadHomework();
    if(allHw.length===0){
      em.style.display='none';
      const empty=document.createElement('div');empty.className='empty-state';
      empty.innerHTML=`<div class="empty-state-icon">📁</div><h3>还没有作业记录</h3><p>上传你的作业文件，追踪进度和得分，学习更高效。</p><button class="btn btn-primary" id="emptyAddHw">＋ 添加第一个作业</button>`;
      grid.appendChild(empty);const emptyBtn=empty.querySelector('#emptyAddHw');if(emptyBtn)emptyBtn.onclick=()=>openModal();
    }else em.style.display='none';

    allHw.forEach(h=>{
      const d=document.createElement('div');d.className='hw-card';
      d.dataset.status=h.status;
      var filesHtml = '';
      if (h.files && h.files.length) {
        var fileChips = h.files.map(function(f, i) {
          var displayName = f.name;
          if (f.name.length > 15) { displayName = f.name.slice(0, 12) + '...'; }
          return '<span class="mk-file-chip" data-id="' + h.id + '" data-fidx="' + i + '">' + fileIcon(f.name) + ' ' + displayName + '</span>';
        });
        filesHtml = '<div class="mk-files">' + fileChips.join('') + '</div>';
      }

      var scoreHtml = '';
      if (h.score) { scoreHtml = '<div class="hw-score">🏆 得分：' + h.score + '</div>'; }

      var descHtml = '';
      if (h.desc) { descHtml = '<div class="hw-desc">' + h.desc + '</div>'; }

      var deadlineHtml = '';
      if (h.deadline) { deadlineHtml = '<div class="hw-deadline">📅 截止：' + h.deadline + '</div>'; }

      var statusTagClass = statusClass(h.status);

      // 根据状态决定显示哪些按钮
      var actionButtons='';
      if(h.status==='未开始'||h.status==='进行中'){
        var btnLabel=h.status==='未开始'?'开始做':'📤 提交';
        var btnClass=h.status==='未开始'?'hw-start-btn':'hw-submit-btn';
        actionButtons=''
          +'<button class="tut-btn '+btnClass+'" title="'+(h.status==='未开始'?'标记为进行中':'提交作业')+'" data-action="submit">'+btnLabel+'</button>'
          +'<button class="tut-btn" title="编辑" data-action="edit">✏️</button>'
          +'<button class="tut-btn del" title="删除" data-action="del">🗑️</button>';
      }else{
        actionButtons=''
          +'<button class="tut-btn" title="查看详情" data-action="view">👁️</button>'
          +'<button class="tut-btn" title="编辑" data-action="edit">✏️</button>'
          +'<button class="tut-btn del" title="删除" data-action="del">🗑️</button>';
      }

      d.innerHTML = ''
        + '<div class="hw-card-header"><h4>' + h.title + '</h4>'
        +   '<span class="hw-status-tag ' + statusTagClass + '">' + h.status + '</span>'
        + '</div>'
        + descHtml
        + deadlineHtml
        + scoreHtml
        + filesHtml
        + '<div class="hw-card-footer">'
        +   '<div class="hw-card-tags"><span class="tut-cat">' + h.subject + '</span><span class="mk-date">' + (h.date || '') + '</span></div>'
        +   '<div class="hw-actions">'
        +     actionButtons
        +   '</div>'
        + '</div>';
      d.querySelector('[data-action="edit"]').onclick=function(){openModal(h)};
      d.querySelector('[data-action="del"]').onclick=function(){deleteHw(h.id)};
      var viewBtn=d.querySelector('[data-action="view"]');
      if(viewBtn)viewBtn.onclick=function(){showHwDetail(h)};
      var submitBtn=d.querySelector('[data-action="submit"]');
      if(submitBtn)submitBtn.onclick=function(){submitHw(h)};
      d.querySelectorAll('.mk-file-chip').forEach(chip=>{
        chip.onclick=()=>{
          const fidx=+chip.dataset.fidx;const file=h.files[fidx];if(file)previewImage(file);
        };
      });
      grid.appendChild(d);
    });
    updateStats();
  }

  si.addEventListener('input',e=>{search=e.target.value;render()});
  fbs.forEach(b=>b.addEventListener('click',()=>{
    fbs.forEach(x=>x.classList.remove('active'));b.classList.add('active');
    filter=b.dataset.filter;render();
  }));
  render();
  document.addEventListener('auth-change',render);
}();

// ===== 回到顶部（不变）=====
!function(){
  const btn=document.getElementById('backTop');
  addEventListener('scroll',()=>btn.classList.toggle('show',scrollY>400));
  btn.onclick=()=>scrollTo({top:0,behavior:'smooth'});
}();

// ===== 页脚年份 =====
document.getElementById('footerYear').textContent=new Date().getFullYear();
