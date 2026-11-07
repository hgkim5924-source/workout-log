const DB='workout-log-local', STORE='data';
window.BODY_PATHS=null;
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

function weightConvert(value,from,to){const n=Number(value);if(!Number.isFinite(n))return 0;if(from===to)return n;return from==='kg'?n*2.2046226218:n/2.2046226218;}
let weightUnit='kg';
function applyWeightUnit(next){if(!['kg','lbs'].includes(next)||next===weightUnit)return;document.querySelectorAll('.exercise-card .set-row').forEach(row=>{const input=row.children[1];if(input.value!=='')input.value=String(Math.round(weightConvert(input.value,weightUnit,next)*10)/10)});weightUnit=next;document.querySelectorAll('.set-head span:nth-child(2)').forEach(x=>x.textContent=`중량 (${weightUnit})`);document.querySelectorAll('.exercise-card').forEach(updateExerciseSummary);}
function exerciseCard(name='',setsData=null){
 const card=document.createElement('div');card.className='exercise-card';
 card.innerHTML=`<div class="exercise-top"><input class="input ex-name" placeholder="운동 종목 (예: 랫풀다운)" value="${escapeHTML(name)}"><button class="remove">삭제</button></div><div class="set-head"><span>세트</span><span>중량 (${weightUnit})</span><span>횟수</span><span>복사</span><span></span></div><div class="sets"></div><div class="exercise-tools"><button class="copy-all">첫 세트 값 전체 적용</button><button class="finish-exercise">종목 완료</button></div><div class="exercise-summary"></div><button class="add-set">＋ 세트 추가</button>`;
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
 el.innerHTML=`<div class="exercise-stat"><span>총 볼륨</span><b>${m.volume.toLocaleString('ko-KR',{maximumFractionDigits:1})} <small>${weightUnit}</small></b></div><div class="exercise-stat"><span>총 반복</span><b>${m.reps} <small>회</small></b></div><div class="exercise-stat"><span>추정 1RM</span><b>${m.oneRM?m.oneRM.toFixed(1):'—'} <small>${weightUnit}</small></b></div>${card.classList.contains('completed')?'<p class="completed-note">✓ 종목 기록 완료 · Epley 추정식</p>':''}`;
 if(announce&&card.classList.contains('completed'))toast('종목 기록 완료 · 볼륨과 추정 1RM을 계산했습니다.');
}
function newSession(){go('record');$('#sessionName').value='';$('#exerciseList').innerHTML='';exerciseCard()}

$('#startWorkout').onclick=newSession;$('#addExercise').onclick=()=>exerciseCard();
const CATS=['전체','가슴','등','어깨','이두','삼두','전완','팔','하체','복근','유산소','전신','스트레칭','기타'];
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
['등','바벨 슈러그','상부 승모근','견갑거근, 중부 승모근','바벨','양손으로 바벨을 잡고 팔꿈치를 편 상태에서 어깨를 귀 방향으로 들어 올린 뒤 천천히 내립니다.'],
['등','덤벨 슈러그','상부 승모근','견갑거근, 중부 승모근','덤벨','양손에 덤벨을 들고 팔을 편 채 어깨를 위로 으쓱 들어 올린 뒤 천천히 내립니다.'],
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

const LEGACY_SOURCE_IDS={
'벤치프레스':'Barbell_Bench_Press_-_Medium_Grip',
'인클라인 벤치프레스':'Barbell_Incline_Bench_Press_-_Medium_Grip',
'디클라인 벤치프레스':'Decline_Barbell_Bench_Press',
'덤벨 벤치프레스':'Dumbbell_Bench_Press',
'인클라인 덤벨프레스':'Incline_Dumbbell_Press',
'덤벨 플라이':'Dumbbell_Flyes',
'케이블 플라이':'Cable_Crossover',
'체스트 프레스 머신':'Leverage_Chest_Press',
'데드리프트':'Barbell_Deadlift',
'루마니안 데드리프트':'Romanian_Deadlift',
'랫풀다운':'Full_Range-Of-Motion_Lat_Pulldown',
'와이드 랫풀다운':'Wide-Grip_Lat_Pulldown',
'언더그립 랫풀다운':'Underhand_Cable_Pulldowns',
'친업':'Chin-Up',
'바벨 로우':'Bent_Over_Barbell_Row',
'덤벨 원암 로우':'One-Arm_Dumbbell_Row',
'시티드 케이블 로우':'Seated_Cable_Rows',
'티바 로우':'T-Bar_Row_with_Handle',
'스트레이트 암 풀다운':'Straight-Arm_Pulldown',
'바벨 슈러그':'Barbell_Shrug',
'덤벨 슈러그':'Dumbbell_Shrug',
'오버헤드 프레스':'Barbell_Shoulder_Press',
'덤벨 숄더 프레스':'Dumbbell_Shoulder_Press',
'아놀드 프레스':'Arnold_Dumbbell_Press',
'사이드 레터럴 레이즈':'Side_Lateral_Raise',
'케이블 레터럴 레이즈':'Cable_Seated_Lateral_Raise',
'프론트 레이즈':'Front_Dumbbell_Raise',
'리어 델트 플라이':'Cable_Rear_Delt_Fly',
'페이스 풀':'Face_Pull',
'업라이트 로우':'Upright_Barbell_Row',
'바벨 컬':'Barbell_Curl',
'덤벨 컬':'Dumbbell_Bicep_Curl',
'해머 컬':'Alternate_Hammer_Curl',
'인클라인 덤벨 컬':'Incline_Dumbbell_Curl',
'프리처 컬':'Preacher_Curl',
'케이블 컬':'Standing_Biceps_Cable_Curl',
'케이블 푸시다운':'Triceps_Pushdown',
'로프 푸시다운':'Triceps_Pushdown_-_Rope_Attachment',
'오버헤드 케이블 익스텐션':'Cable_Rope_Overhead_Triceps_Extension',
'클로즈그립 벤치프레스':'Close-Grip_Barbell_Bench_Press',
'딥스':'Dips_-_Triceps_Version',
'바벨 백 스쿼트':'Barbell_Squat',
'프론트 스쿼트':'Front_Barbell_Squat',
'고블릿 스쿼트':'Goblet_Squat',
'레그 프레스':'Leg_Press',
'레그 익스텐션':'Leg_Extensions',
'레그 컬':'Lying_Leg_Curls',
'힙 쓰러스트':'Barbell_Hip_Thrust',
'카프 레이즈':'Standing_Calf_Raises',
'힙 어덕션':'Cable_Hip_Adduction',
'크런치':'Crunches',
'행잉 레그 레이즈':'Hanging_Leg_Raise',
'플랭크':'Plank',
'케이블 크런치':'Cable_Crunch',
'러시안 트위스트':'Russian_Twist',
'데드 버그':'Dead_Bug',
'트레드밀 걷기':'Walking_Treadmill',
'트레드밀 달리기':'Running_Treadmill',
'실내 자전거':'Bicycling_Stationary',
'일립티컬':'Elliptical_Trainer',
'로잉 머신':'Rowing_Stationary',
'파머스 워크':'Farmers_Walk',
'백 익스텐션':'Hyperextensions_Back_Extensions'
};
const EXERCISE_SOURCE_COMMIT='ed41bb3a262fee9dd8d7d0aa3437696dcef601ed';
const EXERCISE_ASSET_BASE='https://raw.githubusercontent.com/gengyueworks/gym-exercise-guide/'+EXERCISE_SOURCE_COMMIT+'/assets';
const EXERCISE_DATA_URL='https://raw.githubusercontent.com/gengyueworks/gym-exercise-guide/'+EXERCISE_SOURCE_COMMIT+'/data/exercises.zh.json';
let exerciseCatalogCache=[];
let exerciseCatalogById=new Map();
const MUSCLE_NAMES_KO={
abdominals:'복근',abs:'복근',pectorals:'대흉근',chest:'가슴',lats:'광배근',latissimus_dorsi:'광배근',
deltoids:'삼각근',biceps:'이두근',triceps:'삼두근',forearms:'전완근',brachialis:'상완근',
quadriceps:'대퇴사두근',hamstrings:'햄스트링',glutes:'둔근',calves:'종아리',traps:'승모근',
middle_back:'중부 등',lower_back:'척추기립근',adductors:'내전근',abductors:'중둔근',
obliques:'복사근',neck:'목 주변 근육',cardiovascular_system:'심폐지구력'
};
function muscleNamesKo(list){
 return (list||[]).map(v=>MUSCLE_NAMES_KO[String(v).toLowerCase().replace(/[ -]/g,'_')]||MUSCLE_NAMES_KO[String(v).toLowerCase()]||String(v)).filter(Boolean).join(' · ')||'정보 없음';
}
function sourceCategory(e){
 if((e.category_zh||'').includes('拉伸'))return '스트레칭';
 if((e.category_zh||'').includes('有氧'))return '유산소';
 const part=e.bodyPart_zh||'';
 if(part==='胸')return '가슴';
 if(part==='背')return '등';
 if(part==='肩')return '어깨';
 if(part==='腿臀')return '하체';
 if(part==='核心')return '복근';
 if(part==='全身')return '전신';
 if(part==='手臂'){
  const m=(e.primaryMuscles||[]).join(' ').toLowerCase();
  if(m.includes('biceps'))return '이두';
  if(m.includes('triceps'))return '삼두';
  if(m.includes('forearm'))return '전완';
  return '팔';
 }
 return '기타';
}
function sourceEquipmentKo(e){
 const v=String(e.equipment||'').toLowerCase();
 const map={'body only':'맨몸','barbell':'바벨','dumbbell':'덤벨','cable':'케이블','machine':'머신','kettlebells':'케틀벨','bands':'밴드','medicine ball':'메디신볼','exercise ball':'짐볼','foam roll':'폼롤러','e-z curl bar':'EZ바','other':'기타'};
 return map[v]||e.equipment_zh||'기타';
}
function translateExerciseName(en){
 const rules=[
 [/Barbell Bench Press/gi,'바벨 벤치프레스'],[/Dumbbell Bench Press/gi,'덤벨 벤치프레스'],[/Incline Dumbbell Press/gi,'인클라인 덤벨프레스'],[/Incline Barbell/gi,'바벨 인클라인'],[/Decline Barbell/gi,'바벨 디클라인'],[/Bench Press/gi,'벤치프레스'],
 [/Romanian Deadlift/gi,'루마니안 데드리프트'],[/Deadlift/gi,'데드리프트'],[/Lat Pulldown/gi,'랫풀다운'],[/Pulldown/gi,'풀다운'],[/Pull Ups?/gi,'풀업'],[/Pull-Ups?/gi,'풀업'],[/Chin-Ups?/gi,'친업'],[/Push-Ups?/gi,'푸시업'],
 [/T-Bar Row/gi,'티바 로우'],[/Bent Over Barbell Row/gi,'바벨 벤트오버 로우'],[/Cable Crossover/gi,'케이블 크로스오버'],[/Face Pull/gi,'페이스 풀'],[/Lateral Raise/gi,'레터럴 레이즈'],[/Front Raise/gi,'프론트 레이즈'],[/Rear Delt Fly/gi,'리어 델트 플라이'],
 [/Hip Thrust/gi,'힙 쓰러스트'],[/Leg Press/gi,'레그 프레스'],[/Leg Extensions?/gi,'레그 익스텐션'],[/Leg Curls?/gi,'레그 컬'],[/Calf Raise/gi,'카프 레이즈'],[/Farmer'?s Walk/gi,'파머스 워크'],[/Russian Twist/gi,'러시안 트위스트'],[/Hanging Leg Raise/gi,'행잉 레그 레이즈'],[/Back Extensions?/gi,'백 익스텐션'],
 [/Triceps Pushdown/gi,'삼두 푸시다운'],[/Overhead Triceps Extension/gi,'오버헤드 삼두 익스텐션'],[/Triceps Extension/gi,'삼두 익스텐션'],[/Biceps Curl/gi,'이두 컬'],[/Preacher Curl/gi,'프리처 컬'],[/Hammer Curl/gi,'해머 컬'],
 [/Smith Machine/gi,'스미스 머신'],[/Barbell/gi,'바벨'],[/Dumbbell/gi,'덤벨'],[/Kettlebell/gi,'케틀벨'],[/Cable/gi,'케이블'],[/Machine/gi,'머신'],[/Lever/gi,'머신'],[/Incline/gi,'인클라인'],[/Decline/gi,'디클라인'],[/Wide-Grip/gi,'와이드 그립'],[/Close-Grip/gi,'클로즈 그립'],[/Overhead/gi,'오버헤드'],[/Seated/gi,'시티드'],[/Standing/gi,'스탠딩'],[/Lying/gi,'라잉'],[/One-Arm/gi,'원암'],[/Alternating/gi,'얼터네이팅'],[/Single-Leg/gi,'싱글 레그'],
 [/Squat/gi,'스쿼트'],[/Row/gi,'로우'],[/Curl/gi,'컬'],[/Press/gi,'프레스'],[/Extension/gi,'익스텐션'],[/Raise/gi,'레이즈'],[/Flyes/gi,'플라이'],[/Fly/gi,'플라이'],[/Lunge/gi,'런지'],[/Crunch/gi,'크런치'],[/Plank/gi,'플랭크'],[/Shrug/gi,'슈러그'],[/Stretch/gi,'스트레칭'],[/Walking/gi,'걷기'],[/Running/gi,'달리기'],[/Treadmill/gi,'트레드밀'],[/Elliptical Trainer/gi,'일립티컬'],[/Rowing/gi,'로잉']
 ];
 let out=String(en||'');
 for(const [re,value] of rules)out=out.replace(re,value);
 return out.replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\s+,/g,',').trim();
}
function sourceFor(x){return x.sourceData||(x.sourceId?exerciseCatalogById.get(x.sourceId):null)||null}
function sourceImageUrl(x,index=0){
 const e=sourceFor(x),path=e&&e.images&&e.images[index];
 return path?EXERCISE_ASSET_BASE+'/exercises/'+path:'';
}
function sourceMuscleUrl(x){
 const e=sourceFor(x);
 return e?EXERCISE_ASSET_BASE+'/muscle/'+e.id+'.svg':'';
}
function exerciseArt(x){
 const src=sourceImageUrl(x,0);
 return src?'<img class="movement-thumb" loading="lazy" decoding="async" src="'+src+'" alt="'+escapeHTML(x.name)+' 동작 자세" onerror="this.style.display=\\'none\\'">':'<span class="no-exercise-art">—</span>';
}
function exerciseGallery(x){
 const start=sourceImageUrl(x,0),end=sourceImageUrl(x,1),muscle=sourceMuscleUrl(x);
 if(!start||!muscle)return '<div class="source-visual-empty">이 종목과 정확히 연결된 공개 이미지 자료가 아직 없습니다.<small>다른 운동의 그림을 대신 표시하지 않습니다.</small></div>';
 const pose=(src,label)=>'<figure class="source-pose"><img src="'+src+'" alt="'+escapeHTML(x.name)+' '+label+'" loading="lazy" decoding="async" onerror="this.closest(\\'figure\\').classList.add(\\'image-failed\\')"><figcaption>'+label+'</figcaption></figure>';
 return '<div class="source-visuals"><section class="source-movement"><h4>운동 동작</h4><div class="source-pose-pair">'+pose(start,'시작 자세')+(end?pose(end,'끝 자세'):'')+'</div></section><section class="source-anatomy"><h4>타깃 근육</h4><img class="source-muscle-svg" src="'+muscle+'" alt="'+escapeHTML(x.name)+' 전면·후면 타깃 근육" loading="lazy" decoding="async" onerror="this.closest(\\'section\\').classList.add(\\'image-failed\\')"><p>빨강 · 주요 근육　 주황 · 협력 근육</p></section></div>';
}
function allExercises(){
 const legacy=LIB.map((x,i)=>{
  const sourceId=LEGACY_SOURCE_IDS[x[1]]||null;
  return {id:'lib'+i,category:x[0],name:x[1],primary:x[2],secondary:x[3],equipment:x[4],desc:x[5],builtin:true,sourceId,sourceData:sourceId?exerciseCatalogById.get(sourceId)||null:null};
 });
 const used=new Set(Object.values(LEGACY_SOURCE_IDS));
 const imported=exerciseCatalogCache.filter(e=>!used.has(e.id)).map(e=>({
  id:'src_'+e.id,sourceId:e.id,sourceData:e,category:sourceCategory(e),name:translateExerciseName(e.name_en),
  nameEn:e.name_en,primary:muscleNamesKo(e.primaryMuscles),secondary:muscleNamesKo(e.secondaryMuscles),
  equipment:sourceEquipmentKo(e),desc:'운동 자세와 타깃 근육 자료가 연결된 운동입니다.',builtin:true
 }));
 return [...legacy,...imported,...(window.customExerciseCache||[])];
}

async function refreshCustom(){window.customExerciseCache=await get('customExercises');}
function renderCategories(){ $('#categoryChips').innerHTML=CATS.map(c=>`<button class="category-chip ${c===selectedCategory?'active':''}" data-cat="${c}">${c}</button>`).join('');document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;renderCategories();renderLibrary()});}
function renderLibrary(){const q=$('#exerciseSearch').value.trim().toLowerCase();const arr=allExercises().filter(x=>(selectedCategory==='전체'||x.category===selectedCategory||!!q)&&(!q||[x.name,x.nameEn,x.primary,x.secondary,x.equipment,x.category].join(' ').toLowerCase().includes(q)));$('#libraryList').innerHTML=arr.length?arr.map(x=>`<button class="library-item ${selectedExercise?.id===x.id?'chosen':''}" data-ex="${x.id}"><span class="mini-anatomy">${exerciseArt(x)}</span><span><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.primary)}</small></span></button>`).join(''):'<p class="empty">검색 결과가 없습니다.</p>';document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{selectedExercise=allExercises().find(x=>x.id===b.dataset.ex);renderLibrary();renderDetail()})}
function renderDetail(){const x=selectedExercise;if(!x){$('#exerciseDetail').innerHTML='<div class="detail-empty">운동을 선택하면 타겟 부위와 설명이 표시됩니다.</div>';return}$('#exerciseDetail').innerHTML=`<div class="detail-art">${exerciseGallery(x)}</div><div class="muscle-legend"><span>빨강 · 주요 타깃 근육</span><span>주황 · 협력 근육</span></div><h3>${escapeHTML(x.name)}</h3><span class="target-pill">주 타겟 · ${escapeHTML(x.primary)}</span><p class="detail-meta">보조 근육 · ${escapeHTML(x.secondary)}</p><p class="detail-meta">운동 도구 · ${escapeHTML(x.equipment)}</p><p class="detail-desc">${escapeHTML(x.desc)}</p><button class="primary wide" id="selectThisExercise">＋ 오늘 운동에 추가</button>`;$('#selectThisExercise').onclick=()=>{exerciseCard(x.name);toast(`${x.name} 추가 완료`)}}
$('#exerciseSearch').oninput=()=>renderLibrary();
$('#customExerciseBtn').onclick=async()=>{const name=prompt('추가할 운동 이름을 입력하세요.');if(!name||!name.trim())return;const category=prompt('운동 분류를 입력하세요: 가슴, 등, 어깨, 이두, 삼두, 하체, 복근, 유산소, 기타','기타');if(!CATS.includes(category)||category==='전체'){toast('운동 분류를 정확히 입력해주세요.');return}const primary=prompt('주 타겟 부위 (예: 광배근)','직접 입력 운동 부위')||'직접 입력';const custom=await get('customExercises');custom.push({id:'custom'+crypto.randomUUID(),category,name:name.trim(),primary,secondary:'직접 지정',equipment:'직접 입력',desc:'사용자가 직접 등록한 운동입니다.',builtin:false});await put('customExercises',custom);await refreshCustom();selectedCategory=category;selectedExercise=allExercises().find(x=>x.name===name.trim()&&!x.builtin);renderCategories();renderLibrary();renderDetail();toast('나만의 운동을 추가했습니다.')};


// Load the most recently saved workout into the current form. It does not save a new log until Save is pressed.
$('#loadPrevious').onclick=async()=>{
 const logs=await get('logs');
 if(!logs.length){toast('불러올 이전 운동 기록이 없습니다.');return}
 const last=logs[0];
 $('#sessionName').value=last.name||'';
 $('#exerciseList').innerHTML='';
 last.exercises.forEach(ex=>{const from=ex.weightUnit||'kg';const converted=(ex.sets||[]).map(s=>({...s,weight:s.weight==null?'':Math.round(weightConvert(s.weight,from,weightUnit)*10)/10}));exerciseCard(ex.name,converted)});
 toast(`${dateText(last.date)} 기록을 불러왔습니다. 중량과 횟수를 수정해 저장하세요.`);
};
$('#saveWorkout').onclick=async()=>{const exercises=[...document.querySelectorAll('.exercise-card')].map(c=>{const m=exerciseMetrics(c);return {name:c.querySelector('.ex-name').value.trim(),sets:m.sets,weightUnit,totalReps:m.reps,totalVolume:m.volume,estimated1RM:m.oneRM,completed:c.classList.contains('completed')}}).filter(e=>e.name&&e.sets.length);if(!exercises.length){toast('운동 종목과 유효한 세트를 입력하세요.');return}const logs=await get('logs');logs.unshift({id:crypto.randomUUID(),date:today(),name:$('#sessionName').value.trim()||'운동',exercises});await put('logs',logs);toast('운동 기록을 저장했습니다.');go('home')};
async function renderHome(){const logs=await get('logs');const week=new Date();week.setDate(week.getDate()-6);const count=logs.filter(x=>new Date(x.date+'T00:00:00')>=new Date(week.toDateString())).length;$('#weekCount').innerHTML=`${count}<span> 회</span>`;$('#totalSets').innerHTML=`${logs.reduce((a,l)=>a+l.exercises.reduce((b,e)=>b+e.sets.length,0),0)}<span> 세트</span>`;const todayLog=logs.find(x=>x.date===today());$('#todayTitle').textContent=todayLog?todayLog.name:'운동을 시작해볼까요?';$('#todaySub').textContent=todayLog?`${todayLog.exercises.length}개 종목 기록 완료`:'오늘의 기록을 남겨보세요.';const recent=logs.slice(0,3);$('#recentList').className='stack'+(recent.length?'':' empty');$('#recentList').innerHTML=recent.length?recent.map(l=>`<article class="item-card"><h4>${escapeHTML(l.name)}</h4><p>${dateText(l.date)} · ${l.exercises.length}개 종목 · ${l.exercises.reduce((a,e)=>a+e.sets.length,0)}세트</p></article>`).join(''):'아직 기록이 없습니다.'}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function renderHistory(){const logs=await get('logs');$('#historyList').className='stack'+(logs.length?'':' empty');$('#historyList').innerHTML=logs.length?logs.map(l=>`<article class="item-card"><h4>${escapeHTML(l.name)} <button class="remove" data-delete="${l.id}">삭제</button></h4><p>${dateText(l.date)}</p>${l.exercises.map(e=>`<p><b>${escapeHTML(e.name)}</b> · ${e.sets.map(s=>`${s.weight}${e.weightUnit||'kg'} × ${s.reps}`).join(' / ')}<br><span class="muted">볼륨 ${Number(e.totalVolume??e.sets.reduce((n,s)=>n+s.weight*s.reps,0)).toLocaleString('ko-KR')}${e.weightUnit||'kg'} · ${Number(e.totalReps??e.sets.reduce((n,s)=>n+s.reps,0))}회 · 추정 1RM ${Number(e.estimated1RM??Math.max(0,...e.sets.map(s=>s.weight*(1+s.reps/30)))).toFixed(1)}${e.weightUnit||'kg'}</span></p>`).join('')}</article>`).join(''):'저장된 운동이 없습니다.';document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('이 운동 기록을 삭제할까요?')){await put('logs',(await get('logs')).filter(x=>x.id!==b.dataset.delete));renderHistory()}})}
$('#saveBody').onclick=async()=>{const entry={id:crypto.randomUUID(),date:$('#bodyDate').value||today(),weight:Number($('#weight').value)||null,muscle:Number($('#muscle').value)||null,fat:Number($('#fat').value)||null};if(!entry.weight&&!entry.muscle&&!entry.fat){toast('측정값을 하나 이상 입력하세요.');return}const arr=await get('body');arr.push(entry);arr.sort((a,b)=>b.date.localeCompare(a.date));await put('body',arr);$('#weight').value=$('#muscle').value=$('#fat').value='';toast('신체 기록을 저장했습니다.');renderBody()};
async function renderBody(){const arr=await get('body');$('#bodyList').className='stack'+(arr.length?'':' empty');$('#bodyList').innerHTML=arr.length?arr.map(x=>`<article class="item-card"><h4>${dateText(x.date)}</h4><p>체중 ${x.weight??'-'}kg · 골격근량 ${x.muscle??'-'}kg · 체지방량 ${x.fat??'-'}kg</p></article>`).join(''):'아직 측정 기록이 없습니다.'}
async function exportData(){const data={version:1,exportedAt:new Date().toISOString(),logs:await get('logs'),body:await get('body'),customExercises:await get('customExercises'),settings:{weightUnit}};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`workout-log-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('백업 파일을 내보냈습니다.')}
async function importData(file){try{const data=JSON.parse(await file.text());if(!Array.isArray(data.logs)||!Array.isArray(data.body))throw Error();if(!confirm('가져온 데이터로 현재 기록을 교체할까요?'))return;await put('logs',data.logs);await put('body',data.body);if(Array.isArray(data.customExercises))await put('customExercises',data.customExercises);if(data.settings?.weightUnit){weightUnit=data.settings.weightUnit==='lbs'?'lbs':'kg';await put('settings',{weightUnit});$('#weightUnit').value=weightUnit;}await refreshCustom();renderCategories();renderLibrary();toast('백업 데이터를 복원했습니다.');renderHome()}catch{toast('올바른 백업 파일이 아닙니다.')}}
$('#weightUnit').onchange=async e=>{applyWeightUnit(e.target.value);await put('settings',{weightUnit});toast(`중량 단위를 ${weightUnit}로 변경했습니다.`)};
$('#backupBtn').onclick=exportData;$('#exportBtn').onclick=exportData;$('#importFile').onchange=e=>e.target.files[0]&&importData(e.target.files[0]);$('#clearBtn').onclick=async()=>{if(confirm('모든 운동 및 신체 기록을 영구 삭제할까요?')){await put('logs',[]);await put('body',[]);toast('모든 기록을 삭제했습니다.');renderHome()}};
async function loadExerciseCatalog(){const cached=await get('exerciseCatalog');if(Array.isArray(cached)&&cached.length){exerciseCatalogCache=cached;exerciseCatalogById=new Map(cached.map(e=>[e.id,e]));return true}try{const response=await fetch(EXERCISE_DATA_URL);if(!response.ok)throw new Error('운동 자료 서버 응답 오류 '+response.status);const data=await response.json();if(!Array.isArray(data)||data.length<800)throw new Error('운동 자료 형식 또는 개수 확인 실패');await put('exerciseCatalog',data);exerciseCatalogCache=data;exerciseCatalogById=new Map(data.map(e=>[e.id,e]));return true}catch(error){console.error('운동 자료 불러오기 실패',error);exerciseCatalogCache=[];exerciseCatalogById=new Map();return false}}
(async()=>{db=await openDB();const savedSettings=await get('settings');weightUnit=savedSettings&&savedSettings.weightUnit==='lbs'?'lbs':'kg';$('#weightUnit').value=weightUnit;const catalogLoaded=await loadExerciseCatalog();await refreshCustom();renderCategories();renderLibrary();renderDetail();renderHome();if(!catalogLoaded)toast('추가 운동 자료를 불러오지 못했습니다. 인터넷 연결을 확인하세요.');if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});})();
