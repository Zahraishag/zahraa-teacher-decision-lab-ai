const screens=document.querySelectorAll('.screen');function show(id){screens.forEach(s=>s.classList.remove('active'));document.getElementById(id)?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.go)));
const example={subject:'الرياضيات',gradeLevel:'الصف السادس الابتدائي',lessonTopic:'مقارنة الكسور مختلفة المقامات',lessonDuration:'45',studentCount:'28',studentLevel:'متفاوت',learningGoal:'أن يقارن الطلاب بين كسرين مختلفي المقامات، وأن يبرروا المقارنة باستخدام تمثيل بصري أو كسور متكافئة.',classChallenge:'بعض الطلاب يخلطون بين البسط والمقام، وبعضهم يستخدم الضرب التبادلي دون فهم، بينما يستطيع بعض الطلاب الحل لكنهم لا يقدمون تبريرًا واضحًا.',availableResources:'سبورة وأوراق عمل فقط.',additionalConstraints:'تجنب عزل الطلاب المتعثرين أو وصمهم، وعدم تنفيذ أكثر من انتقال تنظيمي واحد داخل الحصة.'};
document.getElementById('fillExample').onclick=()=>Object.entries(example).forEach(([id,v])=>{const f=document.getElementById(id);if(f)f.value=v});
document.getElementById('contextForm').onsubmit=e=>{e.preventDefault();const ids=['subject','gradeLevel','lessonTopic','lessonDuration','learningGoal','classChallenge'];const missing=ids.filter(id=>!document.getElementById(id).value.trim());const msg=document.getElementById('formMessage');if(missing.length){msg.className='message error';msg.textContent='يرجى إكمال الحقول الأساسية قبل المتابعة.';return}const session={sessionId:crypto.randomUUID?crypto.randomUUID():String(Date.now()),sessionStatus:'CONTEXT_SUBMITTED',teacherApproval:false};['subject','gradeLevel','lessonTopic','lessonDuration','studentCount','studentLevel','learningGoal','classChallenge','availableResources','additionalConstraints'].forEach(id=>session[id]=document.getElementById(id).value.trim());localStorage.setItem('zahraaDecisionSession',JSON.stringify(session));msg.className='message success';msg.textContent='تم إنشاء جلسة مستقلة وحفظ السياق.';setTimeout(()=>show('adaptive'),400)};
document.getElementById('saveAnswer').onclick=()=>{const a=document.getElementById('adaptiveAnswer').value.trim();if(!a){alert('اكتبي إجابة موجزة قبل المتابعة.');return}const s=JSON.parse(localStorage.getItem('zahraaDecisionSession')||'{}');s.adaptiveAnswer=a;s.sessionStatus='CONTEXT_QUESTION_ANSWERED';localStorage.setItem('zahraaDecisionSession',JSON.stringify(s));document.getElementById('summaryContent').innerHTML=`<p><strong>المادة:</strong> ${s.subject||''}</p><p><strong>الصف:</strong> ${s.gradeLevel||''}</p><p><strong>الموضوع:</strong> ${s.lessonTopic||''}</p><p><strong>التحدي:</strong> ${s.classChallenge||''}</p><p><strong>الإجابة التشخيصية:</strong> ${a}</p><p><strong>الحالة:</strong> بانتظار موافقة المعلم.</p>`;document.getElementById('summary').classList.remove('hidden')};
document.getElementById('notSure').onclick=()=>document.getElementById('adaptiveAnswer').value='لست متأكدًا؛ أحتاج إلى سؤال تشخيصي قصير يساعدني على تحديد المستوى.';
document.getElementById('generatePlan').onclick=()=>{const ok=document.getElementById('teacherApproval').checked;const msg=document.getElementById('approvalMessage');if(!ok){msg.className='message error';msg.textContent='لا يمكن إنشاء الخطة قبل الموافقة الصريحة.';return}const s=JSON.parse(localStorage.getItem('zahraaDecisionSession')||'{}');s.teacherApproval=true;s.sessionStatus='DECISION_APPROVED';localStorage.setItem('zahraaDecisionSession',JSON.stringify(s));msg.className='message success';msg.textContent='تم تسجيل موافقة المعلم.';document.getElementById('planPreview').classList.remove('hidden')};


// دعم سجل الجلسات السابقة
const SESSIONS_HISTORY_KEY = "zahraaDecisionSessionsHistory";

function getSessionsHistory(){
  try{return JSON.parse(localStorage.getItem(SESSIONS_HISTORY_KEY)||"[]")}catch{return []}
}

function saveCurrentSessionToHistory(){
  const raw=localStorage.getItem("zahraaDecisionSession");
  if(!raw)return;
  let session;
  try{session=JSON.parse(raw)}catch{return}
  if(!session.sessionId)return;
  const history=getSessionsHistory();
  const i=history.findIndex(x=>x.sessionId===session.sessionId);
  const item={...session,updatedAt:new Date().toISOString()};
  if(i>=0)history[i]=item;else history.unshift(item);
  localStorage.setItem(SESSIONS_HISTORY_KEY,JSON.stringify(history.slice(0,20)));
}

const originalSetItem=localStorage.setItem.bind(localStorage);
localStorage.setItem=function(key,value){
  originalSetItem(key,value);
  if(key==="zahraaDecisionSession")setTimeout(saveCurrentSessionToHistory,0);
};

function closeSessionsModal(){document.getElementById("sessions-history-modal")?.classList.add("hidden")}
function showSessionsModal(){
  let modal=document.getElementById("sessions-history-modal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="sessions-history-modal";
    modal.className="sessions-modal hidden";
    modal.innerHTML=`<div class="sessions-modal-overlay"></div><div class="sessions-modal-content card"><div class="sessions-modal-header"><div><span class="eyebrow">السجل المحلي</span><h2>جلساتي السابقة</h2></div><button type="button" id="close-sessions-modal" class="text-button">إغلاق</button></div><div id="sessions-history-list"></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector("#close-sessions-modal")?.addEventListener("click",closeSessionsModal);
    modal.querySelector(".sessions-modal-overlay")?.addEventListener("click",closeSessionsModal);
  }
  const list=modal.querySelector("#sessions-history-list");
  const history=getSessionsHistory();
  if(!history.length){
    list.innerHTML=`<div class="empty-sessions"><h3>لا توجد جلسات محفوظة حتى الآن</h3><p>ابدئي تحليل موقف جديد، وسيُحفظ تلقائيًا في هذا المتصفح.</p></div>`;
  }else{
    list.innerHTML=history.map(s=>`<article class="saved-session-card"><div class="saved-session-info"><h3>${s.lessonTopic||"جلسة دون عنوان"}</h3><p><strong>المادة:</strong> ${s.subject||"غير محدد"}</p><p><strong>الصف:</strong> ${s.gradeLevel||"غير محدد"}</p><p class="session-date">آخر تحديث: ${s.updatedAt?new Date(s.updatedAt).toLocaleString("ar-SA"):"غير محدد"}</p></div><div class="saved-session-actions"><button type="button" class="primary open-session" data-id="${s.sessionId}">فتح الجلسة</button><button type="button" class="secondary delete-session" data-id="${s.sessionId}">حذف</button></div></article>`).join("");
    list.querySelectorAll(".open-session").forEach(btn=>btn.addEventListener("click",()=>{
      const s=history.find(x=>x.sessionId===btn.dataset.id);if(!s)return;
      originalSetItem("zahraaDecisionSession",JSON.stringify(s));
      ["subject","gradeLevel","lessonTopic","lessonDuration","studentCount","studentLevel","learningGoal","classChallenge","availableResources","additionalConstraints"].forEach(id=>{const f=document.getElementById(id);if(f)f.value=s[id]||""});
      closeSessionsModal();showScreen("context-screen");
    }));
    list.querySelectorAll(".delete-session").forEach(btn=>btn.addEventListener("click",()=>{
      if(!confirm("هل تريدين حذف هذه الجلسة؟"))return;
      const updated=getSessionsHistory().filter(x=>x.sessionId!==btn.dataset.id);
      originalSetItem(SESSIONS_HISTORY_KEY,JSON.stringify(updated));showSessionsModal();
    }));
  }
  modal.classList.remove("hidden");
}

document.getElementById("show-sessions")?.addEventListener("click",showSessionsModal);
