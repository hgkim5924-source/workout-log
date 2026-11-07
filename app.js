const DB='workout-log-local', STORE='data';
let db;
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function get(key){return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
function put(key,value){return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(value,key);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2100)}
function dateText(d){return new Date(d+'T00:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'})}
function go(tab){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===tab));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));window.scrollTo(0,0);if(tab==='home')renderHome();if(tab==='history')renderHistory();if(tab==='bodydata')renderBody()}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('#todayLabel').textContent=dateText(today());$('#bodyDate').value=today();

function exerciseCard(name='',setsData=null){
 const card=document.createElement('div');card.className='exercise-card';
 card.innerHTML=`<div class="exercise-top"><input class="input ex-name" placeholder="운동 종목 (예: 랫풀다운)" value="${escapeHTML(name)}"><button class="remove">삭제</button></div><div class="set-head"><span>세트</span><span>중량 (kg)</span><span>횟수</span><span>복사</span><span></span></div><div class="sets"></div><div class="exercise-tools"><button class="copy-all">첫 세트 값 전체 적용</button><button class="finish-exercise">종목 완료</button></div><div class="exercise-summary"></div><button class="add-set">＋ 세트 추가</button>`;
 card.querySelector('.remove').onclick=()=>card.remove();
 const add=(data={})=>{const n=card.querySelectorAll('.set-row').length+1;const row=document.createElement('div');row.className='set-row';row.innerHTML=`<span>${n}</span><input type="number" min="0" step="0.5" placeholder="0" value="${data.weight??''}" aria-label="${n}세트 중량"><input type="number" min="0" step="1" placeholder="0" value="${data.reps??''}" aria-label="${n}세트 횟수"><button class="copy-row" aria-label="이 세트 값을 이후 세트에 복사" title="이 세트 값을 이후 세트에 복사">↓</button><button class="remove-row" aria-label="세트 삭제">×</button>`;
  row.querySelector('.remove-row').onclick=()=>{row.remove();[...card.querySelectorAll('.set-row span')].forEach((x,i)=>x.textContent=i+1);updateExerciseSummary(card)};
  row.querySelector('.copy-row').onclick=()=>{const rows=[...card.querySelectorAll('.set-row')],idx=rows.indexOf(row),w=row.children[1].value,r=row.children[2].value;if(!w&&!r){toast('먼저 중량 또는 횟수를 입력하세요.');return}rows.slice(idx+1).forEach(x=>{x.children[1].value=w;x.children[2].value=r});updateExerciseSummary(card);toast('이후 세트에 동일한 값을 적용했습니다.')};
  row.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>updateExerciseSummary(card)));
  card.querySelector('.sets').append(row);
 };
 card.querySelector('.add-set').onclick=()=>add();
 (setsData&&setsData.length?setsData:[{},{},{}]).forEach(add);
 card.querySelector('.copy-all').onclick=()=>{const rows=[...card.querySelectorAll('.set-row')];if(!rows.length)return;const w=rows[0].children[1].value,r=rows[0].children[2].value;if(!w&&!r){toast('첫 세트의 중량 또는 횟수를 입력하세요.');return}rows.slice(1).forEach(x=>{x.children[1].value=w;x.children[2].value=r});updateExerciseSummary(card);toast('첫 세트 값을 모든 세트에 적용했습니다.')};
 card.querySelector('.finish-exercise').onclick=()=>{card.classList.toggle('completed');card.querySelector('.finish-exercise').textContent=card.classList.contains('completed')?'완료 취소':'종목 완료';updateExerciseSummary(card,true)};
 card.querySelector('.ex-name').addEventListener('input',()=>updateExerciseSummary(card));
 $('#exerciseList').append(card);updateExerciseSummary(card);
}
function exerciseMetrics(card){
 const sets=[...card.querySelectorAll('.set-row')].map(r=>({weight:Number(r.children[1].value)||0,reps:Number(r.children[2].value)||0})).filter(s=>s.reps>0);
 const reps=sets.reduce((n,s)=>n+s.reps,0),volume=sets.reduce((n,s)=>n+s.weight*s.reps,0);
 const oneRM=sets.reduce((m,s)=>s.weight>0?Math.max(m,s.weight*(1+s.reps/30)):m,0);
 return {sets,reps,volume,oneRM};
}
function updateExerciseSummary(card,announce=false){
 const m=exerciseMetrics(card),el=card.querySelector('.exercise-summary');
 el.innerHTML=`<div class="exercise-stat"><span>총 볼륨</span><b>${m.volume.toLocaleString('ko-KR',{maximumFractionDigits:1})} <small>kg</small></b></div><div class="exercise-stat"><span>총 반복</span><b>${m.reps} <small>회</small></b></div><div class="exercise-stat"><span>추정 1RM</span><b>${m.oneRM?m.oneRM.toFixed(1):'—'} <small>kg</small></b></div>${card.classList.contains('completed')?'<p class="completed-note">✓ 종목 기록 완료 · Epley 추정식</p>':''}`;
 if(announce&&card.classList.contains('completed'))toast('종목 기록 완료 · 볼륨과 추정 1RM을 계산했습니다.');
}
function newSession(){go('record');$('#sessionName').value='';$('#exerciseList').innerHTML='';exerciseCard()}

$('#startWorkout').onclick=newSession;$('#addExercise').onclick=()=>exerciseCard();
const CATS=['가슴','등','어깨','이두','삼두','하체','복근','유산소','기타'];
const LIB=[
['가슴','벤치프레스','대흉근 전체','삼두근, 전면 삼각근','바벨','벤치에 누워 바벨을 가슴 중앙까지 내린 뒤 수직으로 밀어 올립니다.'],
['가슴','인클라인 벤치프레스','상부 가슴','전면 삼각근, 삼두근','바벨','벤치 각도를 20~30도로 두고 윗가슴 방향으로 밀어 올립니다.'],
['가슴','디클라인 벤치프레스','하부 가슴','삼두근','바벨','상체가 아래로 기울어진 벤치에서 바벨을 밀어 올립니다.'],
['가슴','덤벨 벤치프레스','대흉근 전체','삼두근, 전면 삼각근','덤벨','덤벨을 가슴 옆까지 내리고 양팔을 모으며 밀어 올립니다.'],
['가슴','인클라인 덤벨프레스','상부 가슴','전면 삼각근, 삼두근','덤벨','인클라인 벤치에서 덤벨을 위쪽으로 밀어 올립니다.'],
['가슴','덤벨 플라이','대흉근 안쪽·바깥쪽','전면 삼각근','덤벨','팔꿈치를 살짝 굽힌 채 양팔을 크게 벌렸다가 가슴 앞에서 모읍니다.'],
['가슴','케이블 플라이','대흉근 전체','전면 삼각근','케이블','케이블 손잡이를 가슴 앞쪽으로 모읍니다.'],
['가슴','펙덱 플라이','대흉근','전면 삼각근','머신','팔꿈치 패드를 가슴 앞에서 모으고 천천히 벌립니다.'],
['가슴','체스트 프레스 머신','대흉근 전체','삼두근, 전면 삼각근','머신','손잡이를 가슴 높이에서 앞으로 밀고 통제하며 돌아옵니다.'],
['가슴','푸시업','대흉근','삼두근, 코어','맨몸','몸통을 일직선으로 유지하고 가슴이 바닥 가까이 오도록 내립니다.'],
['등','데드리프트','척추기립근·둔근·햄스트링','광배근, 승모근, 전완근','바벨','바를 몸 가까이 두고 엉덩이와 무릎을 펴며 들어 올립니다.'],
['등','루마니안 데드리프트','햄스트링·둔근','척추기립근, 광배근','바벨','무릎을 약간 굽힌 채 엉덩이를 뒤로 보내 바를 정강이 쪽으로 내립니다.'],
['등','랫풀다운','광배근','이두근, 능형근','케이블','가슴을 세우고 바를 쇄골 방향으로 당깁니다.'],
['등','와이드 랫풀다운','광배근 상부','이두근, 대원근','케이블','넓은 그립으로 바를 상부 가슴 쪽으로 당깁니다.'],
['등','언더그립 랫풀다운','광배근 하부','이두근','케이블','손바닥이 나를 향하도록 잡고 팔꿈치를 아래로 당깁니다.'],
['등','풀업','광배근','이두근, 능형근','맨몸','어깨를 먼저 아래로 내린 뒤 턱이 바 위로 오도록 당깁니다.'],
['등','친업','광배근','이두근','맨몸','언더그립으로 매달려 가슴을 바 쪽으로 당깁니다.'],
['등','바벨 로우','광배근·능형근','후면 삼각근, 이두근','바벨','상체를 숙이고 바를 배꼽 방향으로 당깁니다.'],
['등','덤벨 원암 로우','광배근','능형근, 이두근','덤벨','몸통을 고정하고 덤벨을 골반 방향으로 당깁니다.'],
['등','시티드 케이블 로우','중부 등','광배근, 이두근','케이블','허리를 세운 채 손잡이를 명치 아래로 당깁니다.'],
['등','체스트 서포티드 로우','능형근·중부 승모근','광배근, 이두근','머신/덤벨','가슴을 패드에 고정하고 팔꿈치를 뒤로 당깁니다.'],
['등','티바 로우','중부 등·광배근','후면 삼각근, 이두근','머신/바벨','상체를 고정하고 손잡이를 몸통 쪽으로 당깁니다.'],
['등','스트레이트 암 풀다운','광배근','대원근, 삼두근 장두','케이블','팔꿈치를 거의 편 상태로 손잡이를 허벅지까지 내립니다.'],
['어깨','오버헤드 프레스','전면·측면 삼각근','삼두근, 상부 승모근','바벨','바를 턱 아래에서 머리 위로 수직으로 밀어 올립니다.'],
['어깨','덤벨 숄더 프레스','전면·측면 삼각근','삼두근','덤벨','덤벨을 어깨 옆에서 머리 위로 밀어 올립니다.'],
['어깨','아놀드 프레스','전면 삼각근','측면 삼각근, 삼두근','덤벨','손바닥을 몸 쪽으로 시작해 밀면서 손바닥을 정면으로 회전합니다.'],
['어깨','사이드 레터럴 레이즈','측면 삼각근','상부 승모근','덤벨','팔꿈치를 살짝 굽혀 양팔을 어깨 높이까지 들어 올립니다.'],
['어깨','케이블 레터럴 레이즈','측면 삼각근','상부 승모근','케이블','케이블 저항을 유지하며 한 팔을 옆으로 들어 올립니다.'],
['어깨','프론트 레이즈','전면 삼각근','상부 가슴','덤벨','팔을 앞쪽으로 어깨 높이까지 들어 올립니다.'],
['어깨','리어 델트 플라이','후면 삼각근','능형근, 중부 승모근','덤벨/머신','상체를 숙이거나 머신에 앉아 팔을 양옆 뒤로 벌립니다.'],
['어깨','페이스 풀','후면 삼각근','회전근개, 승모근','케이블','로프를 눈높이로 당기며 팔꿈치를 바깥으로 벌립니다.'],
['어깨','업라이트 로우','측면 삼각근·승모근','이두근','바벨/케이블','바를 몸 가까이 두고 팔꿈치를 바깥 위쪽으로 들어 올립니다.'],
['이두','바벨 컬','상완이두근','상완근, 전완근','바벨','팔꿈치를 몸통 옆에 고정하고 바를 어깨 방향으로 들어 올립니다.'],
['이두','덤벨 컬','상완이두근','상완근, 전완근','덤벨','손목을 중립으로 유지하며 덤벨을 번갈아 들어 올립니다.'],
['이두','해머 컬','상완근·상완요골근','상완이두근','덤벨','손바닥이 서로 마주 보도록 잡고 들어 올립니다.'],
['이두','인클라인 덤벨 컬','상완이두근 장두','상완근','덤벨','인클라인 벤치에 기대 팔을 뒤로 둔 상태에서 컬합니다.'],
['이두','프리처 컬','상완이두근','상완근','머신/EZ바','상완을 패드에 고정하고 팔꿈치를 굽힙니다.'],
['이두','케이블 컬','상완이두근','상완근','케이블','케이블 장력을 유지하며 손잡이를 위로 당깁니다.'],
['삼두','케이블 푸시다운','삼두근 외측·내측두','-','케이블','팔꿈치를 옆구리에 고정하고 손잡이를 아래로 누릅니다.'],
['삼두','로프 푸시다운','삼두근 외측두','삼두근 내측두','케이블','아래로 누른 끝에서 로프를 양옆으로 벌립니다.'],
['삼두','오버헤드 케이블 익스텐션','삼두근 장두','-','케이블','팔꿈치를 머리 옆에 두고 팔을 위쪽으로 폅니다.'],
['삼두','라잉 트라이셉스 익스텐션','삼두근 장두','외측두','EZ바','누운 자세에서 팔꿈치를 고정하고 바를 이마 뒤쪽으로 내립니다.'],
['삼두','클로즈그립 벤치프레스','삼두근','대흉근, 전면 삼각근','바벨','어깨너비 정도로 잡고 팔꿈치를 몸통 가까이 두어 밀어 올립니다.'],
['삼두','딥스','삼두근','대흉근 하부, 전면 삼각근','맨몸','상체를 비교적 세운 채 팔꿈치를 굽혔다 펴 몸을 들어 올립니다.'],
['하체','바벨 백 스쿼트','대퇴사두근·둔근','햄스트링, 코어','바벨','발바닥 전체로 지면을 밀며 엉덩이를 무릎 높이 아래까지 내립니다.'],
['하체','프론트 스쿼트','대퇴사두근','둔근, 코어','바벨','바를 어깨 앞에 얹고 상체를 세워 앉았다 일어납니다.'],
['하체','고블릿 스쿼트','대퇴사두근·둔근','코어','덤벨','덤벨을 가슴 앞에 들고 무릎과 발끝 방향을 맞춰 앉습니다.'],
['하체','레그 프레스','대퇴사두근·둔근','햄스트링','머신','허리가 패드에서 뜨지 않는 범위로 내린 뒤 발판을 밀어냅니다.'],
['하체','레그 익스텐션','대퇴사두근','-','머신','무릎을 펴 허벅지 앞쪽을 수축하고 천천히 내립니다.'],
['하체','레그 컬','햄스트링','비복근','머신','발목 패드를 엉덩이 방향으로 당깁니다.'],
['하체','불가리안 스플릿 스쿼트','둔근·대퇴사두근','햄스트링, 코어','덤벨/맨몸','뒷발을 벤치에 올리고 앞다리 중심으로 내려갔다 일어납니다.'],
['하체','런지','대퇴사두근·둔근','햄스트링, 코어','덤벨/맨몸','한 발을 내딛고 양쪽 무릎을 굽혀 수직으로 내려갑니다.'],
['하체','힙 쓰러스트','대둔근','햄스트링','바벨/머신','등 상부를 벤치에 대고 골반을 들어 엉덩이를 수축합니다.'],
['하체','카프 레이즈','비복근·가자미근','-','머신/덤벨','발뒤꿈치를 최대한 내렸다가 발끝으로 높이 밀어 올립니다.'],
['하체','힙 어브덕션','중둔근','소둔근','머신','무릎 패드를 바깥으로 밀어 엉덩이 옆을 수축합니다.'],
['하체','힙 어덕션','내전근','-','머신','양쪽 패드를 안쪽으로 모읍니다.'],
['복근','크런치','복직근','-','맨몸','허리를 과하게 들지 않고 갈비뼈를 골반 쪽으로 말아 올립니다.'],
['복근','행잉 레그 레이즈','복직근 하부','장요근, 전완근','맨몸','매달린 상태에서 골반을 말아 무릎 또는 다리를 들어 올립니다.'],
['복근','플랭크','복횡근·복직근','둔근, 어깨 안정근','맨몸','머리부터 발뒤꿈치까지 일직선을 유지하며 버팁니다.'],
['복근','케이블 크런치','복직근','복사근','케이블','골반을 고정하고 갈비뼈를 골반 쪽으로 말아 내립니다.'],
['복근','러시안 트위스트','복사근','복직근','맨몸/원판','상체를 살짝 뒤로 기울이고 몸통을 좌우로 회전합니다.'],
['복근','데드 버그','복횡근·복직근','고관절 굴곡근','맨몸','허리가 뜨지 않게 복압을 유지하며 반대 팔과 다리를 뻗습니다.'],
['유산소','트레드밀 걷기','심폐지구력','하체','트레드밀','대화 가능한 강도로 일정한 보폭과 속도를 유지합니다.'],
['유산소','트레드밀 달리기','심폐지구력','대퇴사두근, 둔근, 종아리','트레드밀','무리하지 않는 속도로 호흡과 페이스를 일정하게 유지합니다.'],
['유산소','실내 자전거','심폐지구력','대퇴사두근, 둔근','사이클','안장 높이를 맞추고 일정한 케이던스로 페달을 밟습니다.'],
['유산소','일립티컬','심폐지구력','하체, 둔근','머신','상체를 세우고 손잡이와 페달을 리듬 있게 움직입니다.'],
['유산소','로잉 머신','심폐지구력','등, 하체, 코어','로잉 머신','다리로 밀고 몸통을 세운 뒤 팔을 당기는 순서로 움직입니다.'],
['기타','파머스 워크','전완근·승모근','코어, 둔근','덤벨','양손에 중량을 들고 몸통을 세운 채 일정 거리를 걷습니다.'],
['기타','백 익스텐션','척추기립근·둔근','햄스트링','머신','허리를 과하게 꺾지 않고 엉덩이 관절을 펴 상체를 들어 올립니다.']
];
let selectedCategory='가슴', selectedExercise=null;
const muscleKey=c=>({'가슴':'chest','등':'back','어깨':'shoulder','이두':'biceps','삼두':'triceps','하체':'legs','복근':'abs','유산소':'cardio','기타':'other'}[c]||'other');
function muscleMap(x){
 const p=(x.primary||'').toLowerCase(),q=(x.secondary||'').toLowerCase();
 const groups={
  pec:['대흉근','가슴','흉근'],deltFront:['전면 삼각근','전면삼각근'],deltSide:['측면 삼각근','측면삼각근'],deltRear:['후면 삼각근','후면삼각근'],
  biceps:['상완이두근','이두근'],brachialis:['상완근'],triceps:['삼두근'],forearm:['전완근','상완요골근'],
  traps:['승모근'],rhomboid:['능형근','중부 등'],lats:['광배근','대원근'],erector:['척추기립근'],
  abs:['복직근','복횡근','복사근','코어'],oblique:['복사근'],serratus:['전거근'],
  glute:['둔근','대둔근','중둔근','소둔근'],quad:['대퇴사두근'],ham:['햄스트링'],calf:['비복근','가자미근','종아리'],adductor:['내전근']
 };
 const st={};Object.keys(groups).forEach(k=>{st[k]=groups[k].some(t=>p.includes(t))?'primary':groups[k].some(t=>q.includes(t))?'secondary':''});
 if(p.includes('삼각근')&&!/전면|측면|후면/.test(p))st.deltFront=st.deltSide='primary';
 if(q.includes('삼각근')&&!/전면|측면|후면/.test(q))st.deltFront=st.deltSide='secondary';
 if(p.includes('대흉근 전체')||p==='대흉근'||p.includes('상부 가슴')||p.includes('하부 가슴'))st.pec='primary';
 const m=(k,d)=>'<path class="muscle '+(st[k]||'')+'" d="'+d+'"/>';
 const line=d=>'<path class="anatomy-line" d="'+d+'"/>';
 const body='<path class="body" d="M47 13 Q39 12 34 19 L25 25 Q19 31 15 45 L22 69 L30 61 L32 46 L34 78 L31 111 L28 146 L25 193 L38 196 L46 153 L54 153 L62 196 L75 193 L72 146 L69 111 L66 78 L68 46 L70 61 L78 69 L85 45 Q81 31 75 25 L66 19 Q61 12 53 13Z"/>';
 const head='<ellipse class="body" cx="50" cy="8" rx="8.5" ry="10"/>';
 const front='<g transform="translate(1 3)">'+head+body+
 m('deltFront','M25 25 Q31 18 41 22 Q45 27 42 39 Q34 42 27 36Z')+m('deltFront','M59 22 Q69 18 75 25 L73 36 Q66 42 58 39Z')+
 m('deltSide','M22 28 Q17 34 21 45 L29 41 L30 29Z')+m('deltSide','M78 28 Q83 34 79 45 L71 41 L70 29Z')+
 m('pec','M30 39 Q37 32 48 38 L48 53 Q41 59 31 53 Q28 47 30 39Z')+m('pec','M52 38 Q63 32 70 39 Q72 47 69 53 Q59 59 52 53Z')+
 m('biceps','M20 47 Q25 42 30 47 L28 65 Q25 70 21 66Z')+m('biceps','M70 47 Q75 42 80 47 L79 66 Q75 70 72 65Z')+
 m('brachialis','M25 55 Q29 53 30 60 L28 69 L24 66Z')+m('brachialis','M70 60 Q71 53 75 55 L76 66 L72 69Z')+
 m('forearm','M18 70 Q22 68 27 71 L24 97 L17 95Z')+m('forearm','M73 71 Q78 68 82 70 L83 95 L76 97Z')+
 m('serratus','M31 57 L37 60 L35 72 L30 68Z')+m('serratus','M63 60 L69 57 L70 68 L65 72Z')+
 m('oblique','M32 61 Q36 60 39 64 L37 98 L31 94Z')+m('oblique','M61 64 Q65 60 69 61 L70 94 L64 98Z')+
 m('abs','M40 59 Q45 57 49 60 L49 72 L40 73Z')+m('abs','M51 60 Q56 57 61 59 L61 73 L51 72Z')+
 m('abs','M40 75 L49 75 L49 87 L39 87Z')+m('abs','M51 75 L61 75 L61 87 L51 87Z')+
 m('abs','M39 89 L49 89 L49 102 L38 100Z')+m('abs','M51 89 L62 89 L62 100 L51 102Z')+
 m('adductor','M39 111 L49 111 L48 143 L42 158 L36 143Z')+m('adductor','M52 111 L62 111 L64 143 L58 158 L52 143Z')+
 m('quad','M31 111 Q38 107 47 112 L44 145 L36 175 L29 166Z')+m('quad','M53 112 Q62 107 69 111 L71 166 L64 175 L56 145Z')+
 m('calf','M30 171 Q34 168 40 172 L36 210 L28 210Z')+m('calf','M60 172 Q66 168 70 171 L72 210 L64 210Z')+
 line('M50 59 L50 104 M29 39 Q39 35 49 39 M51 39 Q61 35 70 39 M34 78 Q40 82 48 79 M52 79 Q60 82 66 78')+'</g>';
 const back='<g transform="translate(112 3)">'+head+body+
 m('deltRear','M25 25 Q32 18 42 22 Q45 28 42 39 Q34 42 27 36Z')+m('deltRear','M58 22 Q68 18 75 25 L73 36 Q66 42 58 39Z')+
 m('deltSide','M22 28 Q17 34 21 45 L29 41 L30 29Z')+m('deltSide','M78 28 Q83 34 79 45 L71 41 L70 29Z')+
 m('traps','M42 21 Q50 17 58 21 L66 42 L50 53 L34 42Z')+
 m('rhomboid','M36 43 L49 51 L49 72 L39 68 L33 54Z')+m('rhomboid','M51 51 L64 43 L67 54 L61 68 L51 72Z')+
 m('lats','M31 55 Q37 49 44 57 L47 91 L38 106 L29 87Z')+m('lats','M56 57 Q63 49 69 55 L71 87 L62 106 L53 91Z')+
 m('triceps','M19 47 Q25 42 30 47 L28 67 L21 68Z')+m('triceps','M70 47 Q75 42 80 47 L79 68 L72 67Z')+
 m('forearm','M18 70 Q22 68 27 71 L24 97 L17 95Z')+m('forearm','M73 71 Q78 68 82 70 L83 95 L76 97Z')+
 m('erector','M45 55 Q49 53 49 58 L48 108 L44 111 L42 82Z')+m('erector','M51 58 Q51 53 55 55 L58 82 L56 111 L52 108Z')+
 m('glute','M31 108 Q39 103 49 109 L49 132 Q42 140 34 134 L29 124Z')+m('glute','M51 109 Q61 103 69 108 L71 124 L66 134 Q58 140 51 132Z')+
 m('ham','M31 137 Q38 133 48 138 L45 169 L37 183 L29 168Z')+m('ham','M52 138 Q62 133 69 137 L71 168 L63 183 L55 169Z')+
 m('calf','M30 171 Q35 168 40 172 L36 210 L28 210Z')+m('calf','M60 172 Q65 168 70 171 L72 210 L64 210Z')+
 line('M50 22 L50 109 M34 43 L43 49 M66 43 L57 49 M36 109 Q50 104 64 109 M38 139 L45 145 M62 139 L55 145')+'</g>';
 return '<svg class="muscle-map" viewBox="0 0 205 226" role="img" aria-label="'+escapeHTML(x.name)+' 근육 해부 도식">'+front+back+'<text x="52" y="224">전면</text><text x="163" y="224">후면</text></svg>';
}
const EXERCISE_IMAGE_PATHS={
  "벤치프레스": [
    "Barbell_Bench_Press_-_Medium_Grip/0.jpg",
    "Barbell_Bench_Press_-_Medium_Grip/1.jpg"
  ],
  "인클라인 벤치프레스": [
    "Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
    "Barbell_Incline_Bench_Press_-_Medium_Grip/1.jpg"
  ],
  "디클라인 벤치프레스": [
    "Decline_Barbell_Bench_Press/0.jpg",
    "Decline_Barbell_Bench_Press/1.jpg"
  ],
  "덤벨 벤치프레스": [
    "Dumbbell_Bench_Press/0.jpg",
    "Dumbbell_Bench_Press/1.jpg"
  ],
  "인클라인 덤벨프레스": [
    "Incline_Dumbbell_Press/0.jpg",
    "Incline_Dumbbell_Press/1.jpg"
  ],
  "덤벨 플라이": [
    "Dumbbell_Flyes/0.jpg",
    "Dumbbell_Flyes/1.jpg"
  ],
  "케이블 플라이": [
    "Cable_Crossover/0.jpg",
    "Cable_Crossover/1.jpg"
  ],
  "펙덱 플라이": [
    "Butterfly/0.jpg",
    "Butterfly/1.jpg"
  ],
  "체스트 프레스 머신": [
    "Machine_Bench_Press/0.jpg",
    "Machine_Bench_Press/1.jpg"
  ],
  "데드리프트": [
    "Barbell_Deadlift/0.jpg",
    "Barbell_Deadlift/1.jpg"
  ],
  "루마니안 데드리프트": [
    "Romanian_Deadlift/0.jpg",
    "Romanian_Deadlift/1.jpg"
  ],
  "랫풀다운": [
    "Full_Range-Of-Motion_Lat_Pulldown/0.jpg",
    "Full_Range-Of-Motion_Lat_Pulldown/1.jpg"
  ],
  "와이드 랫풀다운": [
    "Wide-Grip_Lat_Pulldown/0.jpg",
    "Wide-Grip_Lat_Pulldown/1.jpg"
  ],
  "언더그립 랫풀다운": [
    "Close-Grip_Front_Lat_Pulldown/0.jpg",
    "Close-Grip_Front_Lat_Pulldown/1.jpg"
  ],
  "풀업": [
    "Pullups/0.jpg",
    "Pullups/1.jpg"
  ],
  "친업": [
    "Chin-Up/0.jpg",
    "Chin-Up/1.jpg"
  ],
  "바벨 로우": [
    "Bent_Over_Barbell_Row/0.jpg",
    "Bent_Over_Barbell_Row/1.jpg"
  ],
  "덤벨 원암 로우": [
    "One-Arm_Dumbbell_Row/0.jpg",
    "One-Arm_Dumbbell_Row/1.jpg"
  ],
  "시티드 케이블 로우": [
    "Seated_Cable_Rows/0.jpg",
    "Seated_Cable_Rows/1.jpg"
  ],
  "체스트 서포티드 로우": [
    "Incline_Bench_Pull/0.jpg",
    "Incline_Bench_Pull/1.jpg"
  ],
  "티바 로우": [
    "T-Bar_Row_with_Handle/0.jpg",
    "T-Bar_Row_with_Handle/1.jpg"
  ],
  "스트레이트 암 풀다운": [
    "Straight-Arm_Pulldown/0.jpg",
    "Straight-Arm_Pulldown/1.jpg"
  ],
  "오버헤드 프레스": [
    "Standing_Military_Press/0.jpg",
    "Standing_Military_Press/1.jpg"
  ],
  "덤벨 숄더 프레스": [
    "Dumbbell_Shoulder_Press/0.jpg",
    "Dumbbell_Shoulder_Press/1.jpg"
  ],
  "아놀드 프레스": [
    "Arnold_Dumbbell_Press/0.jpg",
    "Arnold_Dumbbell_Press/1.jpg"
  ],
  "사이드 레터럴 레이즈": [
    "Side_Lateral_Raise/0.jpg",
    "Side_Lateral_Raise/1.jpg"
  ],
  "케이블 레터럴 레이즈": [
    "Cable_Seated_Lateral_Raise/0.jpg",
    "Cable_Seated_Lateral_Raise/1.jpg"
  ],
  "프론트 레이즈": [
    "Front_Dumbbell_Raise/0.jpg",
    "Front_Dumbbell_Raise/1.jpg"
  ],
  "리어 델트 플라이": [
    "Seated_Bent-Over_Rear_Delt_Raise/0.jpg",
    "Seated_Bent-Over_Rear_Delt_Raise/1.jpg"
  ],
  "페이스 풀": [
    "Face_Pull/0.jpg",
    "Face_Pull/1.jpg"
  ],
  "업라이트 로우": [
    "Upright_Barbell_Row/0.jpg",
    "Upright_Barbell_Row/1.jpg"
  ],
  "바벨 컬": [
    "Barbell_Curl/0.jpg",
    "Barbell_Curl/1.jpg"
  ],
  "덤벨 컬": [
    "Dumbbell_Bicep_Curl/0.jpg",
    "Dumbbell_Bicep_Curl/1.jpg"
  ],
  "해머 컬": [
    "Hammer_Curls/0.jpg",
    "Hammer_Curls/1.jpg"
  ],
  "인클라인 덤벨 컬": [
    "Incline_Dumbbell_Curl/0.jpg",
    "Incline_Dumbbell_Curl/1.jpg"
  ],
  "프리처 컬": [
    "Preacher_Curl/0.jpg",
    "Preacher_Curl/1.jpg"
  ],
  "케이블 컬": [
    "Standing_Biceps_Cable_Curl/0.jpg",
    "Standing_Biceps_Cable_Curl/1.jpg"
  ],
  "케이블 푸시다운": [
    "Triceps_Pushdown/0.jpg",
    "Triceps_Pushdown/1.jpg"
  ],
  "로프 푸시다운": [
    "Triceps_Pushdown_-_Rope_Attachment/0.jpg",
    "Triceps_Pushdown_-_Rope_Attachment/1.jpg"
  ],
  "오버헤드 케이블 익스텐션": [
    "Cable_Rope_Overhead_Triceps_Extension/0.jpg",
    "Cable_Rope_Overhead_Triceps_Extension/1.jpg"
  ],
  "라잉 트라이셉스 익스텐션": [
    "EZ-Bar_Skullcrusher/0.jpg",
    "EZ-Bar_Skullcrusher/1.jpg"
  ],
  "클로즈그립 벤치프레스": [
    "Close-Grip_Barbell_Bench_Press/0.jpg",
    "Close-Grip_Barbell_Bench_Press/1.jpg"
  ],
  "딥스": [
    "Dips_-_Triceps_Version/0.jpg",
    "Dips_-_Triceps_Version/1.jpg"
  ],
  "바벨 백 스쿼트": [
    "Barbell_Squat/0.jpg",
    "Barbell_Squat/1.jpg"
  ],
  "프론트 스쿼트": [
    "Front_Barbell_Squat/0.jpg",
    "Front_Barbell_Squat/1.jpg"
  ],
  "고블릿 스쿼트": [
    "Goblet_Squat/0.jpg",
    "Goblet_Squat/1.jpg"
  ],
  "레그 프레스": [
    "Leg_Press/0.jpg",
    "Leg_Press/1.jpg"
  ],
  "레그 익스텐션": [
    "Leg_Extensions/0.jpg",
    "Leg_Extensions/1.jpg"
  ],
  "레그 컬": [
    "Lying_Leg_Curls/0.jpg",
    "Lying_Leg_Curls/1.jpg"
  ],
  "불가리안 스플릿 스쿼트": [
    "Split_Squat_with_Dumbbells/0.jpg",
    "Split_Squat_with_Dumbbells/1.jpg"
  ],
  "런지": [
    "Dumbbell_Lunges/0.jpg",
    "Dumbbell_Lunges/1.jpg"
  ],
  "힙 쓰러스트": [
    "Barbell_Hip_Thrust/0.jpg",
    "Barbell_Hip_Thrust/1.jpg"
  ],
  "카프 레이즈": [
    "Standing_Calf_Raises/0.jpg",
    "Standing_Calf_Raises/1.jpg"
  ],
  "힙 어브덕션": [
    "Thigh_Abductor/0.jpg",
    "Thigh_Abductor/1.jpg"
  ],
  "힙 어덕션": [
    "Thigh_Adductor/0.jpg",
    "Thigh_Adductor/1.jpg"
  ],
  "크런치": [
    "Crunches/0.jpg",
    "Crunches/1.jpg"
  ],
  "행잉 레그 레이즈": [
    "Hanging_Leg_Raise/0.jpg",
    "Hanging_Leg_Raise/1.jpg"
  ],
  "플랭크": [
    "Plank/0.jpg",
    "Plank/1.jpg"
  ],
  "케이블 크런치": [
    "Cable_Crunch/0.jpg",
    "Cable_Crunch/1.jpg"
  ],
  "러시안 트위스트": [
    "Russian_Twist/0.jpg",
    "Russian_Twist/1.jpg"
  ],
  "데드 버그": [
    "Dead_Bug/0.jpg",
    "Dead_Bug/1.jpg"
  ],
  "트레드밀 걷기": [
    "Walking_Treadmill/0.jpg",
    "Walking_Treadmill/1.jpg"
  ],
  "트레드밀 달리기": [
    "Running_Treadmill/0.jpg",
    "Running_Treadmill/1.jpg"
  ],
  "실내 자전거": [
    "Recumbent_Bike/0.jpg",
    "Recumbent_Bike/1.jpg"
  ],
  "일립티컬": [
    "Elliptical_Trainer/0.jpg",
    "Elliptical_Trainer/1.jpg"
  ],
  "로잉 머신": [
    "Rowing_Stationary/0.jpg",
    "Rowing_Stationary/1.jpg"
  ],
  "파머스 워크": [
    "Farmers_Walk/0.jpg",
    "Farmers_Walk/1.jpg"
  ],
  "백 익스텐션": [
    "Hyperextensions_Back_Extensions/0.jpg",
    "Hyperextensions_Back_Extensions/1.jpg"
  ],
  "푸시업": [
    "Pushups/0.jpg",
    "Pushups/1.jpg"
  ]
};;
const EXERCISE_IMAGE_BASE='https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
function imagePair(x){const paths=EXERCISE_IMAGE_PATHS[x.name];return paths?paths.map(p=>EXERCISE_IMAGE_BASE+p):null}
function exerciseArt(x){const pair=imagePair(x);return pair?'<img class="movement-thumb" loading="lazy" decoding="async" src="'+pair[0]+'" alt="'+escapeHTML(x.name)+' 운동 일러스트" onerror="this.replaceWith(document.createTextNode(\'그림 준비 중\'))">':muscleMap(x)}
function exerciseGallery(x){const pair=imagePair(x);const moves=pair?'<div class="movement-gallery single"><figure><img loading="lazy" decoding="async" src="'+pair[0]+'" alt="'+escapeHTML(x.name)+' 실제 운동 모습"></figure></div>':'<div class="movement-missing">이 운동의 사진 자료를 찾지 못했습니다.</div>';return '<div class="exercise-visuals">'+moves+'<div class="detail-anatomy">'+muscleMap(x)+'</div></div>'}
function allExercises(){return [...LIB.map((x,i)=>({id:'lib'+i,category:x[0],name:x[1],primary:x[2],secondary:x[3],equipment:x[4],desc:x[5],builtin:true})),...(window.customExerciseCache||[])];}
async function refreshCustom(){window.customExerciseCache=await get('customExercises');}
function renderCategories(){ $('#categoryChips').innerHTML=CATS.map(c=>`<button class="category-chip ${c===selectedCategory?'active':''}" data-cat="${c}">${c}</button>`).join('');document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;renderCategories();renderLibrary()});}
function renderLibrary(){const q=$('#exerciseSearch').value.trim().toLowerCase();const arr=allExercises().filter(x=>(x.category===selectedCategory||q)&&(!q||x.name.toLowerCase().includes(q)||x.primary.toLowerCase().includes(q)||x.category.includes(q)));$('#libraryList').innerHTML=arr.length?arr.map(x=>`<button class="library-item ${selectedExercise?.id===x.id?'chosen':''}" data-ex="${x.id}"><span class="mini-anatomy">${exerciseArt(x)}</span><span><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.primary)}</small></span></button>`).join(''):'<p class="empty">검색 결과가 없습니다.</p>';document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{selectedExercise=allExercises().find(x=>x.id===b.dataset.ex);renderLibrary();renderDetail()})}
function renderDetail(){const x=selectedExercise;if(!x){$('#exerciseDetail').innerHTML='<div class="detail-empty">운동을 선택하면 타겟 부위와 설명이 표시됩니다.</div>';return}$('#exerciseDetail').innerHTML=`<div class="detail-art">${exerciseGallery(x)}</div><div class="muscle-legend"><span><i class="muscle-dot primary-dot"></i> 주 타겟 근육</span><span><i class="muscle-dot secondary-dot"></i> 보조 근육</span></div><h3>${escapeHTML(x.name)}</h3><span class="target-pill">주 타겟 · ${escapeHTML(x.primary)}</span><p class="detail-meta">보조 근육 · ${escapeHTML(x.secondary)}</p><p class="detail-meta">운동 도구 · ${escapeHTML(x.equipment)}</p><p class="detail-desc">${escapeHTML(x.desc)}</p><button class="primary wide" id="selectThisExercise">＋ 오늘 운동에 추가</button>`;$('#selectThisExercise').onclick=()=>{exerciseCard(x.name);toast(`${x.name} 추가 완료`)}}
$('#exerciseSearch').oninput=()=>renderLibrary();
$('#customExerciseBtn').onclick=async()=>{const name=prompt('추가할 운동 이름을 입력하세요.');if(!name||!name.trim())return;const category=prompt('운동 분류를 입력하세요: 가슴, 등, 어깨, 이두, 삼두, 하체, 복근, 유산소, 기타','기타');if(!CATS.includes(category)){toast('분류를 정확히 입력해주세요.');return}const primary=prompt('주 타겟 부위 (예: 광배근)','직접 입력 운동 부위')||'직접 입력';const custom=await get('customExercises');custom.push({id:'custom'+crypto.randomUUID(),category,name:name.trim(),primary,secondary:'직접 지정',equipment:'직접 입력',desc:'사용자가 직접 등록한 운동입니다.',builtin:false});await put('customExercises',custom);await refreshCustom();selectedCategory=category;selectedExercise=allExercises().find(x=>x.name===name.trim()&&!x.builtin);renderCategories();renderLibrary();renderDetail();toast('나만의 운동을 추가했습니다.')};


// Load the most recently saved workout into the current form. It does not save a new log until Save is pressed.
$('#loadPrevious').onclick=async()=>{
 const logs=await get('logs');
 if(!logs.length){toast('불러올 이전 운동 기록이 없습니다.');return}
 const last=logs[0];
 $('#sessionName').value=last.name||'';
 $('#exerciseList').innerHTML='';
 last.exercises.forEach(ex=>exerciseCard(ex.name,ex.sets));
 toast(`${dateText(last.date)} 기록을 불러왔습니다. 중량과 횟수를 수정해 저장하세요.`);
};
$('#saveWorkout').onclick=async()=>{const exercises=[...document.querySelectorAll('.exercise-card')].map(c=>{const m=exerciseMetrics(c);return {name:c.querySelector('.ex-name').value.trim(),sets:m.sets,totalReps:m.reps,totalVolume:m.volume,estimated1RM:m.oneRM,completed:c.classList.contains('completed')}}).filter(e=>e.name&&e.sets.length);if(!exercises.length){toast('운동 종목과 유효한 세트를 입력하세요.');return}const logs=await get('logs');logs.unshift({id:crypto.randomUUID(),date:today(),name:$('#sessionName').value.trim()||'운동',exercises});await put('logs',logs);toast('운동 기록을 저장했습니다.');go('home')};
async function renderHome(){const logs=await get('logs');const week=new Date();week.setDate(week.getDate()-6);const count=logs.filter(x=>new Date(x.date+'T00:00:00')>=new Date(week.toDateString())).length;$('#weekCount').innerHTML=`${count}<span> 회</span>`;$('#totalSets').innerHTML=`${logs.reduce((a,l)=>a+l.exercises.reduce((b,e)=>b+e.sets.length,0),0)}<span> 세트</span>`;const todayLog=logs.find(x=>x.date===today());$('#todayTitle').textContent=todayLog?todayLog.name:'운동을 시작해볼까요?';$('#todaySub').textContent=todayLog?`${todayLog.exercises.length}개 종목 기록 완료`:'오늘의 기록을 남겨보세요.';const recent=logs.slice(0,3);$('#recentList').className='stack'+(recent.length?'':' empty');$('#recentList').innerHTML=recent.length?recent.map(l=>`<article class="item-card"><h4>${escapeHTML(l.name)}</h4><p>${dateText(l.date)} · ${l.exercises.length}개 종목 · ${l.exercises.reduce((a,e)=>a+e.sets.length,0)}세트</p></article>`).join(''):'아직 기록이 없습니다.'}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function renderHistory(){const logs=await get('logs');$('#historyList').className='stack'+(logs.length?'':' empty');$('#historyList').innerHTML=logs.length?logs.map(l=>`<article class="item-card"><h4>${escapeHTML(l.name)} <button class="remove" data-delete="${l.id}">삭제</button></h4><p>${dateText(l.date)}</p>${l.exercises.map(e=>`<p><b>${escapeHTML(e.name)}</b> · ${e.sets.map(s=>`${s.weight}kg × ${s.reps}`).join(' / ')}<br><span class="muted">볼륨 ${Number(e.totalVolume??e.sets.reduce((n,s)=>n+s.weight*s.reps,0)).toLocaleString('ko-KR')}kg · ${Number(e.totalReps??e.sets.reduce((n,s)=>n+s.reps,0))}회 · 추정 1RM ${Number(e.estimated1RM??Math.max(0,...e.sets.map(s=>s.weight*(1+s.reps/30)))).toFixed(1)}kg</span></p>`).join('')}</article>`).join(''):'저장된 운동이 없습니다.';document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('이 운동 기록을 삭제할까요?')){await put('logs',(await get('logs')).filter(x=>x.id!==b.dataset.delete));renderHistory()}})}
$('#saveBody').onclick=async()=>{const entry={id:crypto.randomUUID(),date:$('#bodyDate').value||today(),weight:Number($('#weight').value)||null,muscle:Number($('#muscle').value)||null,fat:Number($('#fat').value)||null};if(!entry.weight&&!entry.muscle&&!entry.fat){toast('측정값을 하나 이상 입력하세요.');return}const arr=await get('body');arr.push(entry);arr.sort((a,b)=>b.date.localeCompare(a.date));await put('body',arr);$('#weight').value=$('#muscle').value=$('#fat').value='';toast('신체 기록을 저장했습니다.');renderBody()};
async function renderBody(){const arr=await get('body');$('#bodyList').className='stack'+(arr.length?'':' empty');$('#bodyList').innerHTML=arr.length?arr.map(x=>`<article class="item-card"><h4>${dateText(x.date)}</h4><p>체중 ${x.weight??'-'}kg · 골격근량 ${x.muscle??'-'}kg · 체지방량 ${x.fat??'-'}kg</p></article>`).join(''):'아직 측정 기록이 없습니다.'}
async function exportData(){const data={version:1,exportedAt:new Date().toISOString(),logs:await get('logs'),body:await get('body'),customExercises:await get('customExercises')};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`workout-log-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('백업 파일을 내보냈습니다.')}
async function importData(file){try{const data=JSON.parse(await file.text());if(!Array.isArray(data.logs)||!Array.isArray(data.body))throw Error();if(!confirm('가져온 데이터로 현재 기록을 교체할까요?'))return;await put('logs',data.logs);await put('body',data.body);if(Array.isArray(data.customExercises))await put('customExercises',data.customExercises);await refreshCustom();renderCategories();renderLibrary();toast('백업 데이터를 복원했습니다.');renderHome()}catch{toast('올바른 백업 파일이 아닙니다.')}}
$('#backupBtn').onclick=exportData;$('#exportBtn').onclick=exportData;$('#importFile').onchange=e=>e.target.files[0]&&importData(e.target.files[0]);$('#clearBtn').onclick=async()=>{if(confirm('모든 운동 및 신체 기록을 영구 삭제할까요?')){await put('logs',[]);await put('body',[]);toast('모든 기록을 삭제했습니다.');renderHome()}};
(async()=>{db=await openDB();await refreshCustom();renderCategories();renderLibrary();renderHome();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});})();
