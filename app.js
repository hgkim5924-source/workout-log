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
const CATS=['전체','가슴','등','어깨','이두','삼두','하체','복근','유산소','기타'];
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
let selectedCategory='가슴', selectedExercise=null;
const muscleKey=c=>({'가슴':'chest','등':'back','어깨':'shoulder','이두':'biceps','삼두':'triceps','하체':'legs','복근':'abs','유산소':'cardio','기타':'other'}[c]||'other');
function muscleMap(x){
 const read=(x.primary||'')+' '+(x.secondary||'');
 const groups=[
  {keys:['대흉근','가슴','흉근','상부 가슴','하부 가슴'],slug:'chest'},
  {keys:['전면 삼각근','측면 삼각근','후면 삼각근','삼각근','어깨'],slug:'deltoids'},
  {keys:['이두근','상완이두근','이두'],slug:'biceps'},
  {keys:['삼두근','삼두'],slug:'triceps'},
  {keys:['전완근','상완요골근'],slug:'forearm'},
  {keys:['승모근','상부 승모근'],slug:'trapezius'},
  {keys:['광배근','대원근','등'],slug:'upper-back'},
  {keys:['능형근','중부 등'],slug:'upper-back'},
  {keys:['척추기립근','허리'],slug:'lower-back'},
  {keys:['복직근','복횡근','코어'],slug:'abs'},
  {keys:['복사근'],slug:'obliques'},
  {keys:['둔근','대둔근','중둔근','소둔근'],slug:'gluteal'},
  {keys:['대퇴사두근','허벅지 앞'],slug:'quadriceps'},
  {keys:['햄스트링','허벅지 뒤'],slug:'hamstring'},
  {keys:['비복근','가자미근','종아리'],slug:'calves'},
  {keys:['내전근'],slug:'adductors'},
  {keys:['고관절 굴곡근','장요근'],slug:'abs'}
 ];
 const has=(arr)=>arr.some(k=>read.includes(k));
 let primary=[...new Set(groups.filter(g=>has(g.keys)&&g.keys.some(k=>(x.primary||'').includes(k))).map(g=>g.slug))];
 let secondary=[...new Set(groups.filter(g=>has(g.keys)&&g.keys.some(k=>(x.secondary||'').includes(k))).map(g=>g.slug))];
 if(!primary.length&&/심폐지구력/.test(read)) primary=['quadriceps','gluteal','calves'];
 if(!secondary.length&&/심폐지구력/.test(read)) secondary=['abs'];
 secondary=secondary.filter(v=>!primary.includes(v));
 const layers=[primary.length?'B6F36B:'+primary.join(','):'',secondary.length?'60A5FA:'+secondary.join(','):''].filter(Boolean).join('|');
 const src='https://api.anatome.dev/generateImage?gender=male&view=dual&width=460&layers='+encodeURIComponent(layers||'B6F36B:chest')+'&output=raw';
 return '<img class="muscle-map external-anatomy" loading="lazy" decoding="async" src="'+src+'" alt="'+escapeHTML(x.name)+' 전면·후면 근육 타겟 도식" onerror="this.outerHTML=\'<div class=&quot;anatomy-fallback&quot;>근육 도식을 불러오지 못했습니다</div>\'">';
}
function targetMuscles(text,category,allowFallback=true){
 const t=String(text||'').toLowerCase(), out=new Set();
 const rules=[
  [/대흉근|가슴|흉근|pector/,'chest'],
  [/삼각근|어깨|회전근개/,'deltoids'],
  [/삼두/,'triceps'],
  [/이두|상완이두|상완근/,'biceps'],
  [/전완|상완요골/,'forearm'],
  [/승모/,'trapezius'],
  [/광배|능형|중부 등|상부 등|하부 등|등 전체|등 근육|등,/,'upper-back'],
  [/척추기립|척추세움|허리/,'lower-back'],
  [/복사근/,'obliques'],
  [/복직근|복횡근|복근|복부|코어/,'abs'],
  [/둔근|대둔근|중둔근|소둔근|엉덩이/,'gluteal'],
  [/햄스트링|대퇴이두/,'hamstring'],
  [/대퇴사두|대퇴 전면|허벅지 앞/,'quadriceps'],
  [/내전근/,'adductors'],
  [/비복근|가자미근|종아리/,'calves'],
  [/전경골근/,'tibialis']
 ];
 for(const [re,slug] of rules)if(re.test(t))out.add(slug);
 if(!out.size&&allowFallback){
  const fallback={
   '가슴':['chest'],'등':['upper-back','trapezius'],'어깨':['deltoids'],
   '이두':['biceps'],'삼두':['triceps'],'하체':['quadriceps','hamstring','gluteal','calves'],
   '복근':['abs','obliques'],'유산소':['quadriceps','gluteal','calves','abs'],
   '기타':['abs','upper-back']
  };
  (fallback[category]||[]).forEach(x=>out.add(x));
 }
 return [...out];
}
function renderMuscleMap(x,cls){
 if(!window.BODY_PATHS)return '<div class="image-placeholder">근육 도식 불러오는 중</div>';
 const primary=targetMuscles(x.primary,x.category);
 const secondary=targetMuscles(x.secondary,x.category,false).filter(s=>!primary.includes(s));
 const paint=(parts)=>parts.map(part=>{
  const slug=part.slug;
  const isPrimary=primary.includes(slug),isSecondary=secondary.includes(slug);
  const fill=isPrimary?'#b8f45e':isSecondary?'#63a9ff':'#59645e';
  const state=isPrimary?'target-primary':isSecondary?'target-secondary':'target-neutral';
  const paths=[...(part.path?.common||[]),...(part.path?.left||[]),...(part.path?.right||[])];
  return paths.map(d=>'<path class="'+state+'" d="'+d+'" fill="'+fill+'" stroke="#18231d" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>').join('');
 }).join('');
 const data=window.BODY_PATHS.male;
 const svg='<svg class="'+cls+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1448 1448" role="img" aria-label="'+escapeHTML(x.name)+' 주 타겟 근육 '+escapeHTML(x.primary)+' 및 보조 근육 '+escapeHTML(x.secondary)+'"><rect width="1448" height="1448" fill="#101712"/>'+paint(data.front)+paint(data.back)+'</svg>';
 return svg;
}
function exerciseImageMarkup(x,detail=false){return renderMuscleMap(x,detail?'movement-detail-image':'movement-thumb')}
function exerciseArt(x){return exerciseImageMarkup(x,false)}
function exerciseGallery(x){
 return '<div class="exercise-visuals">'+
  '<figure class="exercise-visual-panel"><figcaption>운동 동작</figcaption><div class="movement-frame" data-movement-frame><div class="movement-loading">동작 GIF를 불러오는 중…</div></div></figure>'+
  '<figure class="exercise-visual-panel"><figcaption>자극 근육</figcaption><div class="anatomy-frame">'+exerciseImageMarkup(x,true)+'</div></figure>'+
  '</div>';
}

const EXERCISE_GIF_QUERIES={
 '벤치프레스':'barbell bench press','인클라인 벤치프레스':'incline barbell bench press','디클라인 벤치프레스':'decline barbell bench press',
 '덤벨 벤치프레스':'dumbbell bench press','인클라인 덤벨프레스':'incline dumbbell press','덤벨 플라이':'dumbbell fly',
 '케이블 플라이':'cable crossover','펙덱 플라이':'lever pec deck fly','체스트 프레스 머신':'lever chest press','푸시업':'push up',
 '데드리프트':'barbell deadlift','루마니안 데드리프트':'romanian deadlift','랫풀다운':'lat pulldown',
 '와이드 랫풀다운':'wide grip lat pulldown','언더그립 랫풀다운':'reverse grip lat pulldown',
 '풀업':'pull up','친업':'chin up','바벨 로우':'barbell bent over row','덤벨 원암 로우':'single arm dumbbell row',
 '시티드 케이블 로우':'seated cable row','체스트 서포티드 로우':'chest supported row','티바 로우':'t bar row',
 '스트레이트 암 풀다운':'straight arm pulldown','바벨 슈러그':'barbell shrug','덤벨 슈러그':'dumbbell shrug','오버헤드 프레스':'barbell shoulder press','덤벨 숄더 프레스':'dumbbell shoulder press',
 '아놀드 프레스':'arnold press','사이드 레터럴 레이즈':'dumbbell lateral raise','케이블 레터럴 레이즈':'cable lateral raise',
 '프론트 레이즈':'dumbbell front raise','리어 델트 플라이':'rear delt fly','페이스 풀':'face pull','업라이트 로우':'upright row',
 '바벨 컬':'barbell curl','덤벨 컬':'dumbbell curl','해머 컬':'hammer curl','인클라인 덤벨 컬':'incline dumbbell curl',
 '프리처 컬':'preacher curl','케이블 컬':'cable curl','케이블 푸시다운':'cable triceps pushdown',
 '로프 푸시다운':'rope triceps pushdown','오버헤드 케이블 익스텐션':'overhead cable triceps extension',
 '라잉 트라이셉스 익스텐션':'lying triceps extension','클로즈그립 벤치프레스':'close grip bench press','딥스':'triceps dip',
 '바벨 백 스쿼트':'barbell squat','프론트 스쿼트':'front squat','고블릿 스쿼트':'goblet squat','레그 프레스':'leg press',
 '레그 익스텐션':'leg extension','레그 컬':'lying leg curl','불가리안 스플릿 스쿼트':'bulgarian split squat',
 '런지':'dumbbell lunge','힙 쓰러스트':'barbell hip thrust','카프 레이즈':'standing calf raise',
 '힙 어브덕션':'lever hip abduction','힙 어덕션':'lever hip adduction','크런치':'crunch',
 '행잉 레그 레이즈':'hanging leg raise','플랭크':'plank','케이블 크런치':'cable crunch',
 '러시안 트위스트':'russian twist','데드 버그':'dead bug','트레드밀 걷기':'treadmill walking',
 '트레드밀 달리기':'treadmill running','실내 자전거':'stationary bike','일립티컬':'elliptical machine',
 '로잉 머신':'rowing machine','파머스 워크':'farmers walk','백 익스텐션':'back extension'
};
window.EXERCISE_GIF_CACHE=window.EXERCISE_GIF_CACHE||{};
window.EXERCISE_GIF_REQUEST=0;
function exerciseGifQuery(x){return EXERCISE_GIF_QUERIES[x.name]||''}
const EXERCISE_GIF_STATIC={'바벨 슈러그':'https://d205bpvrqc9yn1.cloudfront.net/0095.gif','덤벨 슈러그':'https://d205bpvrqc9yn1.cloudfront.net/0331.gif'};
async function loadExerciseAnimation(x){
 const frame=document.querySelector('[data-movement-frame]');
 if(!frame)return;
 const request=++window.EXERCISE_GIF_REQUEST;
 const direct=EXERCISE_GIF_STATIC[x.name];
 if(direct){
  const img=document.createElement('img');img.className='movement-gif';img.alt=x.name+' 운동 동작 애니메이션';img.loading='eager';img.decoding='async';img.onload=()=>{if(request===window.EXERCISE_GIF_REQUEST){frame.innerHTML='';frame.appendChild(img)}};img.onerror=()=>{if(request===window.EXERCISE_GIF_REQUEST)frame.innerHTML='<div class="movement-empty">동작 GIF를 표시하지 못했습니다.<small>원본 이미지 주소에 접근할 수 없습니다.</small></div>'};img.src=direct;return;
 }
 const query=exerciseGifQuery(x);
 if(!query){frame.innerHTML='<div class="movement-empty">이 종목의 동작 자료를 아직 찾지 못했습니다.<small>근육 도식은 오른쪽에 표시됩니다.</small></div>';return}
 const cached=window.EXERCISE_GIF_CACHE[x.name];
 const show=url=>{
  if(request!==window.EXERCISE_GIF_REQUEST)return;
  const img=document.createElement('img');
  img.className='movement-gif';img.alt=x.name+' 운동 동작 애니메이션';img.loading='eager';img.decoding='async';
  img.onload=()=>{if(request!==window.EXERCISE_GIF_REQUEST)return;frame.innerHTML='';frame.appendChild(img);};
  img.onerror=()=>{if(request!==window.EXERCISE_GIF_REQUEST)return;frame.innerHTML='<div class="movement-empty">원본 GIF를 표시하지 못했습니다.<small>다른 자료 주소를 다시 확인해 주세요.</small></div>';};
  img.src=url;
 };
 if(cached){show(cached);return}
 frame.innerHTML='<div class="movement-loading">운동 동작 검색 중…</div>';
 try{
  const params=['search','q','name'];
  const endpoints=params.map(key=>'https://oss.exercisedb.dev/api/v1/exercises/search?'+key+'='+encodeURIComponent(query))
   .concat(['https://oss.exercisedb.dev/api/v1/exercises?search='+encodeURIComponent(query)]);
  let match=null,lastError=null;
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const target=norm(query);
  for(const url of endpoints){
   try{
    const response=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!response.ok){lastError=new Error('ExerciseDB '+response.status);continue}
    const payload=await response.json();
    const candidates=[];
    const collect=value=>{
     if(Array.isArray(value)){value.forEach(v=>{if(v&&typeof v==='object')candidates.push(v)});return}
     if(value&&typeof value==='object'){
      for(const key of ['data','exercises','results','items'])if(value[key]!==undefined)collect(value[key]);
     }
    };
    collect(payload);
    const ranked=candidates.map(item=>{
     const name=norm(item.name||item.exerciseName||item.title);
     const words=target.split(' ').filter(w=>w.length>2);
     const overlap=words.filter(w=>name.includes(w)).length;
     const score=name===target?100:name.includes(target)?90:target.includes(name)?80:overlap*10;
     return {item,score};
    }).sort((a,b)=>b.score-a.score);
    const found=ranked.find(v=>v.score>=Math.max(10,Math.ceil(target.split(' ').filter(w=>w.length>2).length*5)));
    if(found){match=found.item;break}
   }catch(e){lastError=e}
  }
  const gif=match&&(match.gifUrl||match.gif_url||match.gif||match.animationUrl||match.animation_url||match.media?.gifUrl);
  if(!gif)throw lastError||new Error('검색 결과에서 일치하는 GIF를 찾지 못함');
  window.EXERCISE_GIF_CACHE[x.name]=gif;
  show(gif);
 }catch(error){
  console.warn('운동 동작 GIF 로딩 실패:',x.name,error);
  if(request===window.EXERCISE_GIF_REQUEST)frame.innerHTML='<div class="movement-empty">동작 GIF를 불러오지 못했습니다.<small>검색 방식과 응답 형식을 보완했습니다. 다시 선택해 주세요.</small></div>';
 }
}

function allExercises(){return [...LIB.map((x,i)=>({id:'lib'+i,category:x[0],name:x[1],primary:x[2],secondary:x[3],equipment:x[4],desc:x[5],builtin:true})),...(window.customExerciseCache||[])];}
async function refreshCustom(){window.customExerciseCache=await get('customExercises');}
function renderCategories(){ $('#categoryChips').innerHTML=CATS.map(c=>`<button class="category-chip ${c===selectedCategory?'active':''}" data-cat="${c}">${c}</button>`).join('');document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;renderCategories();renderLibrary()});}
function renderLibrary(){const q=$('#exerciseSearch').value.trim().toLowerCase();const arr=allExercises().filter(x=>(selectedCategory==='전체'||x.category===selectedCategory||!!q)&&(!q||x.name.toLowerCase().includes(q)||x.primary.toLowerCase().includes(q)||x.category.includes(q)));$('#libraryList').innerHTML=arr.length?arr.map(x=>`<button class="library-item ${selectedExercise?.id===x.id?'chosen':''}" data-ex="${x.id}"><span class="mini-anatomy">${exerciseArt(x)}</span><span><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.primary)}</small></span></button>`).join(''):'<p class="empty">검색 결과가 없습니다.</p>';document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{selectedExercise=allExercises().find(x=>x.id===b.dataset.ex);renderLibrary();renderDetail()})}
function renderDetail(){const x=selectedExercise;if(!x){$('#exerciseDetail').innerHTML='<div class="detail-empty">운동을 선택하면 타겟 부위와 설명이 표시됩니다.</div>';return}$('#exerciseDetail').innerHTML=`<div class="detail-art">${exerciseGallery(x)}</div><div class="muscle-legend"><span><i class="muscle-dot primary-dot"></i> 주 타겟 근육</span><span><i class="muscle-dot secondary-dot"></i> 보조 근육</span></div><h3>${escapeHTML(x.name)}</h3><span class="target-pill">주 타겟 · ${escapeHTML(x.primary)}</span><p class="detail-meta">보조 근육 · ${escapeHTML(x.secondary)}</p><p class="detail-meta">운동 도구 · ${escapeHTML(x.equipment)}</p><p class="detail-desc">${escapeHTML(x.desc)}</p><button class="primary wide" id="selectThisExercise">＋ 오늘 운동에 추가</button>`;loadExerciseAnimation(x);$('#selectThisExercise').onclick=()=>{exerciseCard(x.name);toast(`${x.name} 추가 완료`)}}
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
(async()=>{db=await openDB();const savedSettings=await get('settings');weightUnit=savedSettings&&savedSettings.weightUnit==='lbs'?'lbs':'kg';$('#weightUnit').value=weightUnit;try{const r=await fetch('./body-paths.json');if(!r.ok)throw Error('body paths unavailable');window.BODY_PATHS=await r.json()}catch(e){console.error('근육 도식 데이터 로딩 실패',e)}await refreshCustom();renderCategories();renderLibrary();renderDetail();renderHome();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});})();
