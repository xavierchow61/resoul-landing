
(function(){
  "use strict";
  var body = document.getElementById('widgetBody');
  var text = document.getElementById('widgetText');
  var sendBtn = document.getElementById('widgetSend');
  var widget = document.getElementById('widget');
  var fab = document.getElementById('fab');

  // ★ 情緒傾聽 Gemini 後端。部署到 Vercel 後，/api/grief-chat 會自動生效（同網域）。
  //   本機或未部署時會 404 → 自動回落內置規則引擎。設定見 VERCEL_SETUP.md
  var GRIEF_API = "/api/grief-chat";
  var history = [];

  var TEMPLATE = "寵物類型：\n最近發生的事：\n我現在的感受：\n我最想得到的幫助：";
  var EXAMPLE = "寵物類型：貓\n最近發生的事：牠最近食慾變差，我已經預約了獸醫，但還是很擔心。\n我現在的感受：焦慮、自責，覺得自己可能沒有早點發現問題。\n我最想得到的幫助：想先冷靜下來，知道現在可以做甚麼。";

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function scrollDown(){
    body.scrollTop = body.scrollHeight;
    requestAnimationFrame(function(){ body.scrollTop = body.scrollHeight; });
  }
  function esc(s){ return s.replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }

  function addUser(t){
    var m = el('div','msg user', esc(t).replace(/\n/g,'<br>'));
    body.appendChild(m); scrollDown();
  }
  function addBotHTML(html){
    var m = el('div','msg bot', html);
    body.appendChild(m); scrollDown();
  }
  function addNote(head, items){
    var lis = items.map(function(i){return '<div class="noteitem">・'+i+'</div>';}).join('');
    var m = el('div','msg note', '<div class="notehead">'+head+'</div>'+lis);
    body.appendChild(m); scrollDown();
  }

  // Welcome message — 依對話手冊「開場與建立關係」語氣，按時間個人化
  var _h = new Date().getHours();
  var _greet = (_h>=0 && _h<5) ? '而家夜深咯，如果瞓唔著、心裡面好亂，我喺度陪你。'
             : (_h<12) ? '早晨。無論你昨晚點過，今日我都喺度陪你。'
             : (_h<18) ? '午安。喺呢個時候停低一陣，同我傾兩句都好。'
             : '夜晚喇。忙咗一日，如果心裡面仲掛住啲嘢，可以慢慢同我講。';
  addBotHTML(
    _greet + '<br><br>你好，我係 Resoul 嘅「情緒傾聽」。你唔需要急住講好多，我會喺度陪你。'
  );
  addNote('傾之前，想你知：', [
    '我唔會提供寵物疾病診斷、用藥或治療建議，唔可以取代獸醫。',
    '我唔會提供心理診斷或治療，唔可以取代心理健康專業人士。',
    '請唔好輸入真實姓名、電話、地址、付款資料或完整病歷等可識別身份嘅內容。'
  ]);

  // ---- 關鍵字偵測（依手冊特殊情況）----
  function detectCrisis(t){ return /想死|唔想活|唔想再.*(活|喺)|冇意思|冇晒意思|撐唔住|頂唔住|傷害自己|自殺|想跟(佢|牠|你)去|想跟佢走|活唔落去|結束生命|结束生命|唔想生存/.test(t); }
  function detectSelfBlame(t){ return /自責|後悔|責怪|係咪我|係我|我嘅錯|我錯|如果當時|如果我|如果早|怪自己|對唔住佢|對不起牠/.test(t); }
  function detectNumb(t){ return /麻木|冇感覺|冇晒感覺|喊唔出|喊唔到|冇眼淚|唔識喊|空洞|好空|冇反應/.test(t); }
  function detectHealth(t){ return /病|病重|重病|唔食|冇胃口|食慾|嘔|抽筋|呼吸|流血|虛弱|癌|腫瘤|獸醫|睇醫生|開刀|手術/.test(t); }
  function detectLoss(t){ return /走(咗|了)|離世|過身|過咗身|離開|去世|唔喺|冇咗|離去|安樂死|火化|走佬|過世|離我而去/.test(t); }

  // ---- 危機處理（最優先，依手冊情況 C）----
  function crisisResponse(){
    addBotHTML(
      '<div class="blk">🤍 我喺度陪你</div>'
      + '我聽到你而家好辛苦，多謝你願意講出嚟。你並唔孤單，我會喺度陪你。'
      + '<div class="blk">📞 請即刻搵人幫手</div>'
      + '如果你有啲想法會傷害自己，請即刻聯絡以下 24 小時專線，佢哋有專業人士可以即刻幫到你：'
      + '<div class="hot">・撒瑪利亞會（24 小時）：2389 2222</div>'
      + '<div class="hot">・醫院管理局精神健康專線：2466 7350</div>'
      + '<div class="hot">・東華三院芷若園：18281</div>'
      + '如果情況緊急、有即時危險，請即刻致電 999。'
      + '<div class="disc">我只係情緒陪伴用途，唔可以取代專業或緊急支援。你嘅安全好重要，請即刻搵上面嘅專線傾一傾。</div>'
    );
  }

  // Block 1 — 接住感受 ＋ 正常化哀傷（依手冊）
  function feelingReflect(t){
    var head;
    if(detectSelfBlame(t))
      head='好多主人都會咁諗。或者可以先記得，你當時係喺有限資訊下盡咗力去決定；呢份心疼，正正說明你有幾在乎佢。';
    else if(detectNumb(t))
      head='「喊唔出」或者「冇感覺」，都係哀傷嘅一種反應。你唔需要逼自己有感覺，當你準備好，感受會自然浮現。';
    else if(detectLoss(t))
      head='佢嘅離開，一定喺你心裡面留低好大嘅空。聽落你真係好掛住佢，你嘅眼淚，係因為你好愛佢。';
    else if(detectHealth(t))
      head='睇住佢身體唔舒服，你會擔心、會心痛，都係因為你好愛佢。你已經好努力咁陪住佢。';
    else
      head='多謝你願意講出嚟。無論而家係傷心、混亂，定係講唔出嘅沉重，你都唔係一個人。';
    return head + '<br><span style="color:var(--ink-faint)">哀傷冇標準時間表，有人會喊、有人會麻木、有人會發嬲，全部都係正常。慢慢嚟，已經係最好。</span>';
  }

  // Block 2 — 整理情況（如有格式就解析）
  function situationSummary(t){
    var type = (t.match(/寵物類型[：:]\s*(.+)/)||[])[1];
    var evt  = (t.match(/最近發生的事[：:]\s*(.+)/)||[])[1];
    var feel = (t.match(/我現在的感受[：:]\s*(.+)/)||[])[1];
    var help = (t.match(/我最想得到的幫助[：:]\s*(.+)/)||[])[1];
    if(type||evt||feel||help){
      var parts=[];
      if(type) parts.push('你隻' + esc(type.trim()));
      if(evt)  parts.push('最近' + esc(evt.trim()));
      if(feel) parts.push('心情上係' + esc(feel.trim()));
      var line = parts.join('，');
      var tail = help ? '你而家最想要嘅，係' + esc(help.trim()) + '。' : '';
      return '如果我理解啱：' + line + '。' + tail + '我哋可以就由呢度，一小步一小步咁整理。';
    }
    var clip = t.trim();
    if(clip.length>46) clip = clip.slice(0,46)+'…';
    return '我聽到你而家面對緊嘅係：「' + esc(clip) + '」。呢件事而家佔咗你唔少心力，我哋先擺喺眼前，慢慢睇清楚。';
  }

  // Block 3 — 探索支持系統 ＋ 低風險行動（非指令式）
  function nextSteps(t){
    var items = [
      '如果得，先畀自己抖一抖，飲啖暖水，等身體慢返落嚟。',
      '身邊有冇一個你信得過嘅人，可以同佢講下呢段感受？例如家人、朋友，或者同樣養過寵物嘅人。',
      '睇返啲相、寫低想同佢講嘅一句話，都可以畀想念一個出口。'
    ];
    if(detectHealth(t)) items.push('如果係關於佢嘅身體狀況，可以先問下獸醫，畀專業幫你分擔決定（例如 SPCA 動物拯救熱線 2711 1000）。');
    return items.map(function(i){return '<div style="margin:5px 0;">・'+i+'</div>';}).join('');
  }

  // 轉介選項（依手冊，溫和）
  function referralNote(){
    return '<div class="disc">如果呢種難受持續咗好耐、影響到日常生活，搵專業傾下唔代表你「有問題」，而係願意好好照顧自己。可以聯絡 <b>香港心理衞生會 2528 0196</b>，或 <b>撒瑪利亞會（24 小時）2389 2222</b>。</div>';
  }

  function respond(t){
    if(detectCrisis(t)){ crisisResponse(); return; }
    var html =
      '<div class="blk">🤍 接住你此刻嘅感受</div>' + feelingReflect(t) +
      '<div class="blk">🧭 我聽到嘅情況</div>' + situationSummary(t) +
      '<div class="blk">🌿 或者可以慢慢咁試</div>' + nextSteps(t) +
      referralNote() +
      '<div class="disc">以上由 AI 生成，只作情緒陪伴同初步整理，唔可以取代獸醫或心理健康專業人士，請按實際情況人手核對。</div>';
    addBotHTML(html);
  }

  function needsClarify(t){
    var clean = t.replace(/\s/g,'');
    return clean.length < 6;
  }
  function clarify(){
    addBotHTML(
      '想更貼近你嘅情況，可以再多同我講少少嗎？'
      + '<div style="margin-top:8px;">1. 你而家最強烈嘅感受係咩？例如傷心、自責、失落、焦慮，定係無助？</div>'
      + '<div style="margin-top:4px;">2. 呢件事大約發生咗幾耐？係啱啱先發生，定係持續咗一段時間？</div>'
      + '<div style="margin-top:4px;">3. 你而家最需要嘅係情緒支持、整理下一步，定係判斷應唔應該搵專業協助？</div>'
    );
  }

  function addTyping(){
    var m = el('div','msg bot','<span class="typing"><i></i><i></i><i></i></span>');
    body.appendChild(m); scrollDown(); return m;
  }

  // 呼叫 Gemini 後端；失敗或空回應自動回落規則引擎
  function callLLM(t){
    var typing = addTyping();
    fetch(GRIEF_API, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ messages: history })
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      typing.remove();
      var reply = (d && d.reply || '').trim();
      if(!reply){ respond(t); return; }
      history.push({role:'model', text:reply});
      addBotHTML(
        esc(reply).replace(/\n/g,'<br>')
        + '<div class="disc">以上由 AI 生成，只作情緒陪伴用途，唔可以取代獸醫或心理健康專業人士。</div>'
      );
    })
    .catch(function(){ typing.remove(); respond(t); });
  }

  function submit(){
    var t = text.value.trim();
    if(!t) return;
    addUser(t);
    text.value=''; autoGrow();
    history.push({role:'user', text:t});
    // 危機情況：即時保底，唔經 API
    if(detectCrisis(t)){ setTimeout(crisisResponse, 250); return; }
    if(GRIEF_API){ callLLM(t); return; }
    setTimeout(function(){
      if(needsClarify(t)) clarify();
      else respond(t);
    }, 260);
  }

  sendBtn.addEventListener('click', submit);
  text.addEventListener('keydown', function(e){
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); submit(); }
  });

  function autoGrow(){ text.style.height='auto'; text.style.height=Math.min(text.scrollHeight,260)+'px'; }
  text.addEventListener('input', autoGrow);

  var chipsEl = document.getElementById('widgetChips');
  if(chipsEl){ chipsEl.addEventListener('click', function(e){
    var b = e.target.closest('.chip'); if(!b) return;
    if(b.dataset.fill==='template'){ text.value=TEMPLATE; text.focus(); autoGrow(); }
    else if(b.dataset.fill==='example'){ text.value=EXAMPLE; text.focus(); autoGrow(); }
    else if(b.dataset.send){ text.value=b.dataset.send; submit(); }
  }); }

  // Open / close floating widget
  function openWidget(){ widget.classList.add('open'); fab.classList.add('hide'); setTimeout(function(){ text.focus(); },260); }
  function closeWidget(){ widget.classList.remove('open'); fab.classList.remove('hide'); }
  fab.addEventListener('click', openWidget);
  document.getElementById('wClose').addEventListener('click', closeWidget);
  var openBtn = document.getElementById('openListen');
  if(openBtn) openBtn.addEventListener('click', openWidget);
  document.querySelectorAll('[data-open-chat]').forEach(function(a){
    a.addEventListener('click', function(e){ e.preventDefault(); openWidget(); });
  });

  // Mood accordion
  document.querySelectorAll('.faq2-q').forEach(function(q){
    q.addEventListener('click', function(){
      var item = q.parentElement;
      var open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      var ic = q.querySelector('.faq2-ic');
      if(ic) ic.textContent = open ? '×' : '＋';
    });
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeWidget(); } });

  // Reveal on scroll
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target);} });
  },{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(n){ io.observe(n); });
})();


(function(){
  "use strict";
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var root=document.documentElement;

  /* ---- Theme toggle ---- */
  var themeBtn=document.getElementById('themeBtn');
  try{var st=localStorage.getItem('resoul-theme'); if(st) root.setAttribute('data-theme',st);}catch(e){}
  function updTheme(){var d=root.getAttribute('data-theme')==='dark'; themeBtn.textContent=d?'☀':'☾'; themeBtn.classList.toggle('active',d);}
  updTheme();
  themeBtn.addEventListener('click',function(){
    var d=root.getAttribute('data-theme')==='dark';
    root.setAttribute('data-theme', d?'light':'dark');
    try{localStorage.setItem('resoul-theme', d?'light':'dark');}catch(e){}
    updTheme();
  });

  /* ---- Quiet mode (reduce motion) ---- */
  var quietBtn=document.getElementById('quietBtn');
  try{ if(localStorage.getItem('resoul-quiet')==='on') root.setAttribute('data-quiet','on'); }catch(e){}
  function updQuiet(){ quietBtn.classList.toggle('active', root.getAttribute('data-quiet')==='on'); }
  updQuiet();
  quietBtn.addEventListener('click',function(){
    var q=root.getAttribute('data-quiet')==='on';
    if(q) root.removeAttribute('data-quiet'); else root.setAttribute('data-quiet','on');
    try{localStorage.setItem('resoul-quiet', q?'off':'on');}catch(e){}
    updQuiet();
  });

  /* ---- Collapsible tools (candle / memory) ---- */
  document.querySelectorAll('.tool-toggle').forEach(function(btn){
    btn.addEventListener('click',function(){
      var t=document.getElementById(btn.dataset.target); if(!t) return;
      var open=t.classList.toggle('open');
      btn.classList.toggle('active',open);
      btn.setAttribute('aria-expanded', open?'true':'false');
      if(open) t.scrollIntoView({block:'nearest',behavior:'smooth'});
    });
  });

  /* ---- Crisis support popup ---- */
  var supportModal=document.getElementById('supportModal');
  var supportBtn=document.getElementById('supportBtn');
  function closeSupport(){ supportModal.classList.remove('open'); supportModal.setAttribute('aria-hidden','true'); }
  if(supportBtn) supportBtn.addEventListener('click',function(){ supportModal.classList.add('open'); supportModal.setAttribute('aria-hidden','false'); });
  supportModal.querySelectorAll('[data-sclose]').forEach(function(x){ x.addEventListener('click', closeSupport); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeSupport(); });

  /* ---- Back to top ---- */
  var toTop=document.getElementById('toTop');
  function onScroll(){ if(window.scrollY>640) toTop.classList.add('show'); else toTop.classList.remove('show'); }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  toTop.addEventListener('click', function(){
    window.scrollTo({top:0, behavior: root.getAttribute('data-quiet')==='on'?'auto':'smooth'});
  });

  /* ---- Mood filter ---- */
  var mf=document.querySelector('.mood-filter');
  if(mf){
    mf.addEventListener('click', function(e){
      var b=e.target.closest('.mf-chip'); if(!b) return;
      mf.querySelectorAll('.mf-chip').forEach(function(c){ c.classList.toggle('active', c===b); });
      var g=b.dataset.g;
      document.querySelectorAll('.mood-group').forEach(function(grp){
        grp.classList.toggle('hidden', g!=='all' && grp.dataset.g!==g);
      });
    });
  }

  /* ---- Grief board (localStorage prototype) ---- */
  var boardList=document.getElementById('boardList');
  if(boardList){
    var boardPhotoData=null;
    var boardSeed=[
      {n:'Bailey 的家人',m:'謝謝你陪伴我們走過十年，家裡每個角落都還記得你。',t:Date.now()-86400000*2},
      {n:'',m:'想念你的氣味，想念你等我回家的樣子。願你在那邊自由奔跑。',t:Date.now()-3600000*5}
    ];
    function bLoad(){try{return JSON.parse(localStorage.getItem('resoul-board')||'[]');}catch(e){return [];}}
    function bSave(a){try{localStorage.setItem('resoul-board',JSON.stringify(a.slice(0,80)));}catch(e){}}
    function bEsc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
    function bTime(t){var h=Math.floor((Date.now()-t)/3600000);if(h<1)return '剛剛';if(h<24)return h+' 小時前';return Math.floor(h/24)+' 天前';}
    function bRender(){
      boardList.innerHTML='';
      bLoad().concat(boardSeed).forEach(function(p){
        var el=document.createElement('div');el.className='bpost';
        el.innerHTML=(p.img?'<img src="'+p.img+'" alt="留言相片">':'')
          +'<div class="bp-name">'+(p.n?bEsc(p.n):'一位同路人')+'</div>'
          +'<div class="bp-msg">'+bEsc(p.m)+'</div>'
          +'<div class="bp-time">'+bTime(p.t)+'</div>';
        boardList.appendChild(el);
      });
    }
    document.getElementById('boardPhoto').addEventListener('change',function(e){
      var f=e.target.files&&e.target.files[0];if(!f)return;
      var r=new FileReader();
      r.onload=function(ev){
        var img=new Image();
        img.onload=function(){
          var mx=560,sc=Math.min(1,mx/Math.max(img.width,img.height));
          var c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
          c.getContext('2d').drawImage(img,0,0,c.width,c.height);
          boardPhotoData=c.toDataURL('image/jpeg',0.75);
          var pv=document.getElementById('boardPreview');pv.src=boardPhotoData;pv.style.display='block';
        };
        img.src=ev.target.result;
      };
      r.readAsDataURL(f);
    });
    document.getElementById('boardPost').addEventListener('click',function(){
      var msg=document.getElementById('boardMsg').value.trim();
      if(!msg && !boardPhotoData) return;
      var arr=bLoad();
      arr.unshift({n:document.getElementById('boardName').value.trim(),m:msg,img:boardPhotoData,t:Date.now()});
      bSave(arr);
      document.getElementById('boardMsg').value='';document.getElementById('boardName').value='';
      boardPhotoData=null;var pv=document.getElementById('boardPreview');pv.style.display='none';pv.src='';
      bRender();
    });
    bRender();
  }

  /* ---- Candle wall (localStorage) ---- */
  var wall=document.getElementById('candleWall');
  var seed=[
    {n:'Bailey',m:'謝謝你陪伴了我十年，我很想念你。'},
    {n:'',m:'願你在那邊無病無痛，繼續快樂地玩耍。'},
    {n:'Miku',m:'你永遠是我最乖的寶貝。'}
  ];
  function loadC(){try{return JSON.parse(localStorage.getItem('resoul-candles')||'[]');}catch(e){return [];}}
  function saveC(a){try{localStorage.setItem('resoul-candles',JSON.stringify(a.slice(0,60)));}catch(e){}}
  function candleEl(c){var d=document.createElement('div');d.className='candle';
    d.innerHTML='<div class="flame" aria-hidden="true"></div>'+(c.n?'<div class="c-name">'+esc(c.n)+'</div>':'')+'<div class="c-msg">'+esc(c.m)+'</div>';return d;}
  function renderWall(){ if(!wall)return; wall.innerHTML=''; loadC().concat(seed).forEach(function(c){wall.appendChild(candleEl(c));}); }
  var lightBtn=document.getElementById('candleLight');
  if(lightBtn){
    lightBtn.addEventListener('click',function(){
      var msgEl=document.getElementById('candleMsg'), nameEl=document.getElementById('candleName');
      var m=msgEl.value.trim(); if(!m) return;
      var arr=loadC(); arr.unshift({n:nameEl.value.trim(), m:m}); saveC(arr);
      msgEl.value=''; nameEl.value=''; renderWall();
    });
    renderWall();
  }

  /* ---- Memory card (live preview + canvas download) ---- */
  var mName=document.getElementById('memName');
  if(mName){
    var mDates=document.getElementById('memDates'), mWords=document.getElementById('memWords'), mPhoto=document.getElementById('memPhoto');
    var cName=document.getElementById('memCName'), cDates=document.getElementById('memCDates'), cWords=document.getElementById('memCWords'), photoBox=document.getElementById('memPhotoBox');
    var photoURL=null;
    function bindMem(){
      cName.textContent=mName.value.trim()||'牠的名字';
      cDates.textContent=mDates.value.trim();
      cWords.textContent=mWords.value.trim()||'在這裡寫下最想記住的回憶…';
    }
    [mName,mDates,mWords].forEach(function(el){el.addEventListener('input',bindMem);});
    mPhoto.addEventListener('change',function(e){
      var f=e.target.files&&e.target.files[0]; if(!f) return;
      var r=new FileReader(); r.onload=function(ev){ photoURL=ev.target.result; photoBox.style.backgroundImage='url("'+photoURL+'")'; photoBox.textContent=''; }; r.readAsDataURL(f);
    });
    function wrapC(ctx,text,x,y,maxW,lh,maxLines){
      var line='',lines=[];
      for(var i=0;i<text.length;i++){var t=line+text[i]; if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=text[i];}else line=t;}
      if(line)lines.push(line);
      if(maxLines&&lines.length>maxLines){lines=lines.slice(0,maxLines); lines[maxLines-1]+='…';}
      lines.forEach(function(ln,i){ctx.fillText(ln,x,y+i*lh);});
    }
    document.getElementById('memDownload').addEventListener('click',function(){
      var W=680,H=880,c=document.createElement('canvas');c.width=W;c.height=H;var ctx=c.getContext('2d');
      var dark=root.getAttribute('data-theme')==='dark';
      ctx.fillStyle=dark?'#2b231c':'#fdfaf4';ctx.fillRect(0,0,W,H);
      function draw(){
        var cy=580; ctx.textAlign='center';
        ctx.fillStyle=dark?'#efe6d8':'#3b2f27';ctx.font='600 46px "Noto Serif TC",serif';
        ctx.fillText(cName.textContent,W/2,cy);
        if(cDates.textContent){ctx.fillStyle=dark?'#9a8b78':'#9a8d80';ctx.font='24px "Noto Sans TC",sans-serif';ctx.fillText(cDates.textContent,W/2,cy+36);}
        ctx.fillStyle=dark?'#c6b6a2':'#6f6156';ctx.font='27px "Noto Sans TC",sans-serif';
        wrapC(ctx,cWords.textContent,W/2,cy+92,560,40,4);
        ctx.fillStyle=dark?'#dcc298':'#9c7f52';ctx.font='italic 27px "Cormorant Garamond",serif';
        ctx.fillText('Resoul · 願想念被溫柔安放',W/2,H-40);
        var a=document.createElement('a');a.download='resoul-memory-card.png';a.href=c.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();
      }
      if(photoURL){var im=new Image();im.onload=function(){
        var iw=im.width,ih=im.height,tw=W,th=520,sc=Math.max(tw/iw,th/ih),dw=iw*sc,dh=ih*sc;
        ctx.save();ctx.beginPath();ctx.rect(0,0,tw,th);ctx.clip();ctx.drawImage(im,(tw-dw)/2,(th-dh)/2,dw,dh);ctx.restore();draw();
      };im.onerror=draw;im.src=photoURL;}
      else{ctx.fillStyle=dark?'#33291f':'#efe4d2';ctx.fillRect(0,0,W,520);ctx.fillStyle=dark?'#c9ac80':'#b89a6e';ctx.font='150px serif';ctx.textAlign='center';ctx.fillText('🐾',W/2,370);draw();}
    });
  }
})();
