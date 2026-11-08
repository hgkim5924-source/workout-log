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
function go(tab){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===tab));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));window.scrollTo(0,0);if(tab==='home')renderHome();if(tab==='history')renderHistory();if(tab==='bodydata')renderBody();if(tab==='analysis')renderAnalysis()}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('#todayLabel').textContent=dateText(today());$('#bodyDate').value=today();

function weightConvert(value,from,to){const n=Number(value);if(!Number.isFinite(n))return 0;if(from===to)return n;return from==='kg'?n*2.2046226218:n/2.2046226218;}
let weightUnit='kg';
function applyWeightUnit(next){
 if(!['kg','lbs'].includes(next))return;
 if(next!==weightUnit){
  document.querySelectorAll('.exercise-card .set-row').forEach(row=>{
   const input=row.children[1];
   if(input.value!==''){
    const storedKg=Number(input.dataset.weightKg);
    const kg=Number.isFinite(storedKg)?storedKg:weightConvert(input.value,weightUnit,'kg');
    input.value=String(Math.round(weightConvert(kg,'kg',next)*10)/10);
   }
  });
  weightUnit=next;
 }
 $('#recordWeightUnit').value=weightUnit;
 document.querySelectorAll('.set-head span:nth-child(2)').forEach(x=>x.textContent=`중량 (${weightUnit})`);
 document.querySelectorAll('.exercise-card').forEach(updateExerciseSummary);
}
function exerciseCard(name='',setsData=null){
 const card=document.createElement('div');card.className='exercise-card';
 card.innerHTML=`<div class="exercise-top"><input class="input ex-name" placeholder="운동 종목 (예: 랫풀다운)" value="${escapeHTML(name)}"><button class="remove">삭제</button></div><div class="set-head"><span>세트</span><span>중량 (${weightUnit})</span><span>횟수</span><span>복사</span><span></span></div><div class="sets"></div><div class="exercise-tools"><button class="copy-all">첫 세트 값 전체 적용</button><button class="finish-exercise">종목 완료</button></div><div class="exercise-summary"></div><button class="add-set">＋ 세트 추가</button>`;
 card.querySelector('.remove').onclick=()=>card.remove();
 const add=(data={})=>{
  const n=card.querySelectorAll('.set-row').length+1,row=document.createElement('div');
  const initialWeight=data.weight??'';
  const initialKg=initialWeight===''?'':(data.weightKg??weightConvert(initialWeight,data.weightUnit||weightUnit,'kg'));
  row.className='set-row';
  row.innerHTML=`<span>${n}</span><input type="number" min="0" step="0.5" placeholder="0" value="${initialWeight}" aria-label="${n}세트 중량"><input type="number" min="0" step="1" placeholder="0" value="${data.reps??''}" aria-label="${n}세트 횟수"><button class="copy-row" aria-label="이 세트 값을 이후 세트에 복사" title="이 세트 값을 이후 세트에 복사">↓</button><button class="remove-row" aria-label="세트 삭제">×</button>`;
  const weightInput=row.children[1];
  if(initialWeight!=='')weightInput.dataset.weightKg=String(initialKg);
  row.querySelector('.remove-row').onclick=()=>{row.remove();[...card.querySelectorAll('.set-row span')].forEach((x,i)=>x.textContent=i+1);updateExerciseSummary(card)};
  row.querySelector('.copy-row').onclick=()=>{
   const rows=[...card.querySelectorAll('.set-row')],idx=rows.indexOf(row),w=weightInput.value,r=row.children[2].value;
   if(!w&&!r){toast('먼저 중량 또는 횟수를 입력하세요.');return}
   rows.slice(idx+1).forEach(x=>{x.children[1].value=w;x.children[1].dataset.weightKg=weightInput.dataset.weightKg||'';x.children[2].value=r});
   updateExerciseSummary(card);toast('이후 세트에 동일한 값을 적용했습니다.')
  };
  row.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>{
   if(i===weightInput)weightInput.dataset.weightKg=i.value===''?'':String(weightConvert(i.value,weightUnit,'kg'));
   updateExerciseSummary(card)
  }));
  card.querySelector('.sets').append(row);
 };
 card.querySelector('.add-set').onclick=()=>add();
 (setsData&&setsData.length?setsData:[{},{},{}]).forEach(add);
 card.querySelector('.copy-all').onclick=()=>{const rows=[...card.querySelectorAll('.set-row')];if(!rows.length)return;const w=rows[0].children[1].value,r=rows[0].children[2].value,kg=rows[0].children[1].dataset.weightKg;if(!w&&!r){toast('첫 세트의 중량 또는 횟수를 입력하세요.');return}rows.slice(1).forEach(x=>{x.children[1].value=w;x.children[1].dataset.weightKg=kg||'';x.children[2].value=r});updateExerciseSummary(card);toast('첫 세트 값을 모든 세트에 적용했습니다.')};
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
const CATS=['전체','가슴','등','어깨','이두','삼두','전완','하체','복근','유산소','전신','스트레칭','기타'];
const LIB_DATA = String.raw`가슴|바벨 벤치프레스|대흉근 전체|삼두근, 전면 삼각근|바벨|벤치에 누워 바벨을 가슴 중앙까지 내린 뒤 수직으로 밀어 올립니다.
가슴|바벨 인클라인 벤치프레스|상부 가슴|전면 삼각근, 삼두근|바벨|벤치 각도를 20~30도로 설정하고 윗가슴 방향으로 밀어 올립니다.
가슴|바벨 디클라인 벤치프레스|하부 가슴|삼두근|바벨|상체가 아래로 기울어진 벤치에서 바벨을 밀어 올립니다.
가슴|스미스 머신 벤치프레스|대흉근 전체|삼두근, 전면 삼각근|스미스 머신|바의 궤도를 통제하며 가슴 중앙까지 내렸다 밀어 올립니다.
가슴|스미스 머신 인클라인 벤치프레스|상부 가슴|전면 삼각근, 삼두근|스미스 머신|인클라인 벤치에 누워 바를 윗가슴 방향으로 밀어 올립니다.
가슴|스미스 머신 디클라인 벤치프레스|하부 가슴|삼두근|스미스 머신|디클라인 벤치에서 바를 밀어 올립니다.
가슴|덤벨 벤치프레스|대흉근 전체|삼두근, 전면 삼각근|덤벨|덤벨을 가슴 옆까지 내리고 위로 밀어 올립니다.
가슴|인클라인 덤벨 벤치프레스|상부 가슴|전면 삼각근, 삼두근|덤벨|인클라인 벤치에서 덤벨을 위쪽으로 밀어 올립니다.
가슴|디클라인 덤벨 벤치프레스|하부 가슴|삼두근|덤벨|디클라인 벤치에서 덤벨을 가슴 옆으로 내렸다 밀어 올립니다.
가슴|덤벨 플라이|대흉근|전면 삼각근|덤벨|팔꿈치를 살짝 굽힌 채 양팔을 벌렸다 가슴 앞에서 모읍니다.
가슴|인클라인 덤벨 플라이|상부 가슴|전면 삼각근|덤벨|인클라인 벤치에서 팔을 벌렸다 가슴 위쪽에서 모읍니다.
가슴|펙덱 플라이|대흉근|전면 삼각근|머신|팔꿈치 패드를 가슴 앞에서 모으고 천천히 벌립니다.
가슴|머신 체스트 프레스|대흉근 전체|삼두근, 전면 삼각근|머신|손잡이를 가슴 높이에서 앞으로 밀고 통제하며 돌아옵니다.
가슴|인클라인 머신 체스트 프레스|상부 가슴|전면 삼각근, 삼두근|머신|기구의 손잡이를 윗가슴 방향으로 밀어 올립니다.
가슴|디클라인 머신 체스트 프레스|하부 가슴|삼두근|머신|기구의 손잡이를 아래쪽 가슴 방향으로 밀어냅니다.
가슴|해머 스트렝스 체스트 프레스|대흉근 전체|삼두근, 전면 삼각근|플레이트 로드 머신|등을 패드에 고정하고 독립 손잡이를 앞으로 밀어냅니다.
가슴|케이블 체스트 프레스|대흉근 전체|삼두근, 전면 삼각근|케이블|양쪽 손잡이를 가슴 앞에서 앞으로 밀어냅니다.
가슴|케이블 플라이|대흉근|전면 삼각근|케이블|케이블 손잡이를 가슴 앞쪽으로 모읍니다.
가슴|케이블 하이 투 로우 플라이|하부 가슴|대흉근 전체|케이블|높은 위치의 케이블을 아래쪽으로 모읍니다.
가슴|케이블 로우 투 하이 플라이|상부 가슴|대흉근 전체|케이블|낮은 위치의 케이블을 위쪽으로 모읍니다.
가슴|푸시업|대흉근|삼두근, 코어|맨몸|몸통을 일직선으로 유지하고 가슴이 바닥 가까이 오도록 내립니다.
가슴|딥스|대흉근 하부·삼두근|전면 삼각근|평행봉|상체 각도에 따라 가슴과 삼두에 부하를 조절하며 몸을 들어 올립니다.
가슴|어시스트 딥스|대흉근 하부·삼두근|전면 삼각근|어시스트 머신|보조 패드의 도움을 받아 팔꿈치를 굽혔다 펴며 몸을 들어 올립니다.
가슴|중량 딥스|대흉근 하부·삼두근|전면 삼각근|평행봉 + 중량|중량을 추가하고 몸통을 통제하며 딥스를 수행합니다.
등|데드리프트|둔근·햄스트링·척추기립근|광배근, 승모근, 전완근|바벨|바를 몸 가까이 두고 엉덩이와 무릎을 펴며 들어 올립니다.
등|스모 데드리프트|둔근·내전근·대퇴사두근|햄스트링, 척추기립근|바벨|넓은 스탠스로 서서 무릎과 엉덩이를 펴며 바를 들어 올립니다.
등|바벨 벤트오버 로우|광배근·능형근|후면 삼각근, 이두근|바벨|상체를 숙이고 바를 배꼽 방향으로 당깁니다.
등|펜들레이 로우|중부 등·광배근|후면 삼각근, 이두근|바벨|매 반복 바벨을 바닥에 내려놓고 상체를 고정해 당깁니다.
등|바벨 티바 로우|중부 등·광배근|후면 삼각근, 이두근|바벨 T바|상체를 고정하고 바를 몸통 쪽으로 당깁니다.
등|덤벨 원암 로우|광배근|능형근, 이두근|덤벨|몸통을 고정하고 덤벨을 골반 방향으로 당깁니다.
등|덤벨 체스트 서포티드 로우|능형근·중부 승모근|광배근, 이두근|덤벨|인클라인 벤치에 가슴을 대고 덤벨을 뒤로 당깁니다.
등|머신 체스트 서포티드 로우|능형근·중부 승모근|광배근, 이두근|머신|가슴 패드에 몸을 고정하고 손잡이를 당깁니다.
등|머신 로우|중부 등·광배근|이두근, 후면 삼각근|머신|몸통을 안정시키고 손잡이를 몸통 쪽으로 당깁니다.
  등|머신 로우 (Low Row)|광배근·중부 등|이두근, 능형근, 후면 삼각근|로우 머신|가슴을 세우고 팔꿈치를 몸통 가까이 유지하며 손잡이를 아래쪽에서 배꼽 방향으로 당깁니다.
등|해머 스트렝스 로우|광배근·중부 등|이두근, 후면 삼각근|플레이트 로드 머신|독립 손잡이를 몸통 쪽으로 당깁니다.
등|시티드 케이블 로우|중부 등·광배근|이두근, 후면 삼각근|케이블|허리를 세운 채 손잡이를 명치 아래로 당깁니다.
등|케이블 원암 로우|광배근|능형근, 이두근|케이블|한 손 손잡이를 골반 방향으로 당기며 몸통 회전을 억제합니다.
등|케이블 원암 하이로우|광배근·대원근|능형근, 후면 삼각근, 이두근|케이블|높은 위치에서 손잡이를 아래쪽과 뒤쪽으로 당겨 옆구리 방향으로 내립니다.
등|랫풀다운|광배근|이두근, 대원근|케이블 머신|가슴을 세우고 바를 쇄골 방향으로 당깁니다. 그립은 선택 옵션으로 둡니다.
등|머신 랫풀다운|광배근|이두근, 대원근|머신|기구의 손잡이를 위에서 가슴 쪽으로 당깁니다.
등|스트레이트 암 풀다운|광배근|대원근, 삼두근 장두|케이블|팔꿈치를 거의 편 상태로 손잡이를 허벅지까지 내립니다.
등|케이블 풀오버|광배근|대원근, 삼두근 장두|케이블|팔을 길게 유지하고 케이블을 허벅지 방향으로 당깁니다.
등|머신 풀오버|광배근|대원근, 삼두근 장두|머신|패드에 팔을 고정하고 어깨 관절을 펴 손잡이를 아래로 내립니다.
등|풀업|광배근|이두근, 능형근|풀업 바|어깨를 아래로 내린 뒤 턱이 바 위로 오도록 당깁니다. 그립은 선택 옵션으로 둡니다.
등|친업|광배근·이두근|상완근, 능형근|풀업 바|언더그립으로 매달려 턱이 바 위로 오도록 당깁니다.
등|어시스트 풀업|광배근|이두근, 능형근|어시스트 머신|보조 패드의 도움을 받아 풀업 동작을 수행합니다.
등|밴드 어시스트 풀업|광배근|이두근, 능형근|저항 밴드|밴드의 탄성을 이용해 풀업을 보조합니다.
등|중량 풀업|광배근|이두근, 능형근|풀업 바 + 중량|벨트나 중량을 추가해 풀업을 수행합니다.
등|어시스트 친업|광배근·이두근|상완근, 능형근|어시스트 머신|보조 패드의 도움을 받아 친업 동작을 수행합니다.
등|중량 친업|광배근·이두근|상완근, 능형근|풀업 바 + 중량|중량을 추가해 친업을 수행합니다.
등|덤벨 슈러그|상부 승모근|견갑거근, 전완근|덤벨|팔을 편 채 어깨를 위로 들어 올렸다 천천히 내립니다.
등|바벨 슈러그|상부 승모근|견갑거근, 전완근|바벨|바벨을 들고 어깨를 위로 으쓱 들어 올립니다.
등|머신 슈러그|상부 승모근|견갑거근|머신|기구 손잡이를 잡고 어깨를 위로 들어 올립니다.
등|백 익스텐션|척추기립근·둔근|햄스트링|백 익스텐션 머신|허리를 과하게 꺾지 않고 엉덩이 관절을 펴 상체를 들어 올립니다.
어깨|바벨 오버헤드 프레스|전면·측면 삼각근|삼두근, 상부 승모근|바벨|바를 턱 아래에서 머리 위로 수직으로 밀어 올립니다.
어깨|스미스 머신 숄더 프레스|전면·측면 삼각근|삼두근, 상부 승모근|스미스 머신|바의 궤도를 통제하며 어깨 높이에서 머리 위로 밀어 올립니다.
어깨|덤벨 숄더 프레스|전면·측면 삼각근|삼두근|덤벨|덤벨을 어깨 옆에서 머리 위로 밀어 올립니다.
어깨|머신 숄더 프레스|전면·측면 삼각근|삼두근|머신|등을 패드에 대고 손잡이를 머리 위로 밀어 올립니다.
어깨|아놀드 프레스|전면 삼각근|측면 삼각근, 삼두근|덤벨|손바닥을 몸 쪽으로 시작해 밀면서 손바닥을 정면으로 회전합니다.
어깨|덤벨 레터럴 레이즈|측면 삼각근|상부 승모근|덤벨|팔꿈치를 살짝 굽혀 양팔을 어깨 높이까지 들어 올립니다.
어깨|케이블 레터럴 레이즈|측면 삼각근|상부 승모근|케이블|케이블 장력을 유지하며 한 팔을 옆으로 들어 올립니다.
어깨|머신 레터럴 레이즈|측면 삼각근|상부 승모근|머신|팔 패드를 양옆으로 밀어 어깨 높이까지 올립니다.
어깨|인클라인 덤벨 레터럴 레이즈|측면 삼각근|후면 삼각근|덤벨|인클라인 벤치에 옆으로 기대 팔을 측면으로 들어 올립니다.
어깨|덤벨 프론트 레이즈|전면 삼각근|상부 가슴|덤벨|덤벨을 앞쪽으로 어깨 높이까지 들어 올립니다.
어깨|케이블 프론트 레이즈|전면 삼각근|상부 가슴|케이블|케이블 저항을 유지하며 팔을 앞쪽으로 들어 올립니다.
어깨|바벨 프론트 레이즈|전면 삼각근|상부 가슴|바벨|바벨을 앞쪽으로 어깨 높이까지 들어 올립니다.
어깨|리버스 펙덱 플라이|후면 삼각근|능형근, 중부 승모근|머신|가슴을 패드에 대고 팔을 양옆 뒤로 벌립니다.
어깨|덤벨 리어 델트 플라이|후면 삼각근|능형근, 중부 승모근|덤벨|상체를 숙이고 덤벨을 양옆으로 벌립니다.
어깨|케이블 리어 델트 플라이|후면 삼각근|능형근, 중부 승모근|케이블|케이블을 교차해 잡고 팔을 양옆으로 벌립니다.
어깨|페이스 풀|후면 삼각근|회전근개, 승모근|케이블|로프를 얼굴 방향으로 당기며 팔꿈치를 바깥으로 벌립니다.
어깨|바벨 업라이트 로우|측면 삼각근·승모근|이두근|바벨|바를 몸 가까이 두고 팔꿈치를 바깥 위쪽으로 들어 올립니다.
어깨|케이블 업라이트 로우|측면 삼각근·승모근|이두근|케이블|케이블 손잡이를 몸 가까이 당기며 팔꿈치를 들어 올립니다.
어깨|케이블 Y 레이즈|하부 승모근·측면 삼각근|전면 삼각근|케이블|양팔을 Y자 방향으로 들어 올립니다.
이두|바벨 컬|상완이두근|상완근, 전완근|바벨|팔꿈치를 몸통 옆에 고정하고 바를 어깨 방향으로 들어 올립니다.
이두|EZ바 컬|상완이두근|상완근, 전완근|EZ바|손목 부담을 줄이는 그립으로 팔꿈치를 굽혀 들어 올립니다.
이두|덤벨 컬|상완이두근|상완근, 전완근|덤벨|덤벨을 번갈아 또는 양손으로 들어 올립니다.
이두|해머 컬|상완근·상완요골근|상완이두근|덤벨|손바닥이 서로 마주 보도록 잡고 들어 올립니다.
이두|크로스 바디 해머 컬|상완근·상완요골근|상완이두근|덤벨|덤벨을 반대쪽 가슴 방향으로 들어 올립니다.
이두|인클라인 덤벨 컬|상완이두근 장두|상완근|덤벨|인클라인 벤치에 기대 팔을 뒤로 둔 상태에서 컬합니다.
이두|프리처 컬|상완이두근|상완근|EZ바|상완을 프리처 패드에 고정하고 팔꿈치를 굽힙니다.
이두|머신 프리처 컬|상완이두근|상완근|머신|상완을 패드에 고정하고 머신 손잡이를 들어 올립니다.
이두|케이블 컬|상완이두근|상완근|케이블|케이블 장력을 유지하며 손잡이를 위로 당깁니다.
이두|케이블 해머 컬|상완근·상완요골근|상완이두근|케이블 + 로프|로프를 중립 그립으로 잡고 팔꿈치를 굽힙니다.
이두|케이블 원암 컬|상완이두근|상완근|케이블|한 손 손잡이를 잡고 팔꿈치를 굽힙니다.
이두|컨센트레이션 컬|상완이두근|상완근|덤벨|팔꿈치를 허벅지 안쪽에 고정하고 덤벨을 들어 올립니다.
이두|스파이더 컬|상완이두근|상완근|덤벨 또는 EZ바|인클라인 벤치에 가슴을 대고 팔을 아래로 늘어뜨린 뒤 컬합니다.
삼두|케이블 푸시다운|삼두근 외측·내측두|삼두근 장두|케이블|팔꿈치를 옆구리에 고정하고 손잡이를 아래로 누릅니다.
삼두|케이블 로프 푸시다운|삼두근 외측·내측두|삼두근 장두|케이블 + 로프|아래로 누른 끝에서 로프를 양옆으로 벌립니다.
삼두|케이블 원암 푸시다운|삼두근 외측·내측두|삼두근 장두|케이블|한 팔씩 팔꿈치를 고정하고 손잡이를 아래로 누릅니다.
삼두|케이블 오버헤드 익스텐션|삼두근 장두|삼두근 외측두|케이블|팔꿈치를 머리 옆에 두고 팔을 위쪽으로 폅니다.
삼두|덤벨 오버헤드 익스텐션|삼두근 장두|삼두근 외측두|덤벨|덤벨을 머리 뒤로 내렸다 팔꿈치를 펴 올립니다.
삼두|바벨 오버헤드 익스텐션|삼두근 장두|삼두근 외측두|바벨|바벨을 머리 뒤로 내렸다 팔꿈치를 펴 올립니다.
삼두|바벨 라잉 트라이셉스 익스텐션|삼두근 장두|삼두근 외측두|바벨|누운 자세에서 팔꿈치를 고정하고 바를 이마 뒤쪽으로 내립니다.
삼두|EZ바 라잉 트라이셉스 익스텐션|삼두근 장두|삼두근 외측두|EZ바|누운 자세에서 EZ바를 머리 뒤쪽으로 내렸다 폅니다.
삼두|덤벨 라잉 트라이셉스 익스텐션|삼두근 장두|삼두근 외측두|덤벨|양손 덤벨을 머리 옆으로 내렸다 팔꿈치를 폅니다.
삼두|덤벨 트라이셉스 킥백|삼두근 외측두·내측두|삼두근 장두|덤벨|상체를 숙이고 상완을 고정한 채 팔꿈치를 펴 덤벨을 뒤로 보냅니다.
삼두|케이블 트라이셉스 킥백|삼두근 외측두·내측두|삼두근 장두|케이블|케이블을 잡고 상완을 고정한 채 팔꿈치를 뒤로 폅니다.
삼두|머신 트라이셉스 익스텐션|삼두근|- |머신|팔꿈치를 패드에 고정하고 저항을 밀어 팔을 폅니다.
삼두|클로즈그립 벤치프레스|삼두근|대흉근, 전면 삼각근|바벨|어깨너비 정도로 잡고 팔꿈치를 몸통 가까이 두어 밀어 올립니다.
삼두|스미스 머신 클로즈그립 벤치프레스|삼두근|대흉근, 전면 삼각근|스미스 머신|바의 궤도를 통제하며 좁은 그립으로 밀어 올립니다.
삼두|다이아몬드 푸시업|삼두근|대흉근, 전면 삼각근|맨몸|손을 가까이 모으고 팔꿈치를 굽혔다 펴 몸을 밀어 올립니다.
하체|바벨 백 스쿼트|대퇴사두근·둔근|햄스트링, 코어|바벨|발바닥 전체로 지면을 밀며 엉덩이를 낮췄다 일어납니다.
하체|바벨 프론트 스쿼트|대퇴사두근|둔근, 코어|바벨|바를 어깨 앞에 얹고 상체를 세워 앉았다 일어납니다.
하체|스미스 머신 스쿼트|대퇴사두근·둔근|햄스트링, 코어|스미스 머신|바의 궤도를 통제하며 무릎과 엉덩이를 굽혔다 폅니다.
하체|덤벨 고블릿 스쿼트|대퇴사두근·둔근|코어|덤벨|덤벨을 가슴 앞에 들고 무릎과 발끝 방향을 맞춰 앉습니다.
하체|핵 스쿼트 머신|대퇴사두근|둔근|머신|등을 패드에 고정하고 무릎을 굽혔다 발판을 밀어냅니다.
하체|브이 스쿼트 머신|대퇴사두근·둔근|햄스트링|머신|어깨 패드에 몸을 고정하고 스쿼트 동작을 수행합니다.
하체|레그 프레스|대퇴사두근·둔근|햄스트링|머신|허리가 패드에서 뜨지 않는 범위로 내린 뒤 발판을 밀어냅니다.
하체|수평 레그 프레스|대퇴사두근·둔근|햄스트링|수평 레그 프레스 머신|등을 고정하고 수평 방향으로 발판을 밀어냅니다.
하체|싱글 레그 프레스|대퇴사두근·둔근|햄스트링|머신|한쪽 다리씩 발판을 밀어 좌우 균형을 맞춥니다.
하체|레그 익스텐션|대퇴사두근|- |머신|무릎을 펴 허벅지 앞쪽을 수축하고 천천히 내립니다.
하체|시티드 레그 컬|햄스트링|비복근|머신|앉은 자세에서 발목 패드를 아래·뒤쪽으로 당깁니다.
하체|라잉 레그 컬|햄스트링|비복근|머신|엎드린 자세에서 발목 패드를 엉덩이 방향으로 당깁니다.
하체|스탠딩 레그 컬|햄스트링|비복근|머신|선 자세에서 한쪽 무릎을 굽혀 발목 패드를 들어 올립니다.
하체|바벨 루마니안 데드리프트|햄스트링·둔근|척추기립근, 광배근|바벨|무릎을 약간 굽힌 채 엉덩이를 뒤로 보내 바를 내립니다.
하체|덤벨 루마니안 데드리프트|햄스트링·둔근|척추기립근|덤벨|덤벨을 허벅지 가까이 유지하며 엉덩이를 뒤로 보냅니다.
하체|스미스 머신 루마니안 데드리프트|햄스트링·둔근|척추기립근|스미스 머신|바의 궤도를 유지하며 엉덩이를 뒤로 보내 바를 내립니다.
하체|굿모닝|햄스트링·둔근|척추기립근|바벨|등을 중립으로 유지하고 엉덩이를 뒤로 접었다 폅니다.
하체|바벨 힙 쓰러스트|대둔근|햄스트링|바벨|등 상부를 벤치에 대고 골반을 들어 엉덩이를 수축합니다.
하체|머신 힙 쓰러스트|대둔근|햄스트링|머신|패드에 골반을 고정하고 엉덩이를 펴 들어 올립니다.
하체|글루트 브리지|대둔근|햄스트링, 코어|맨몸|누운 상태에서 골반을 들어 엉덩이를 수축합니다.
하체|케이블 글루트 킥백|대둔근|햄스트링|케이블|발목 스트랩을 착용하고 다리를 뒤로 뻗습니다.
하체|머신 글루트 킥백|대둔근|햄스트링|머신|패드에 발을 대고 다리를 뒤쪽으로 밀어냅니다.
하체|힙 어브덕션|중둔근·소둔근|대둔근|머신|무릎 패드를 바깥으로 밀어 엉덩이 옆을 수축합니다.
하체|힙 어덕션|내전근|박근, 치골근|머신|양쪽 패드를 안쪽으로 모읍니다.
하체|불가리안 스플릿 스쿼트|둔근·대퇴사두근|햄스트링, 코어|맨몸 또는 덤벨|뒷발을 벤치에 올리고 앞다리 중심으로 내려갔다 일어납니다.
하체|덤벨 런지|대퇴사두근·둔근|햄스트링, 코어|덤벨|양손에 덤벨을 들고 한 발씩 내디뎌 무릎을 굽힙니다.
하체|바벨 런지|대퇴사두근·둔근|햄스트링, 코어|바벨|바벨을 승모근 위에 두고 한 발씩 내디뎌 런지를 수행합니다.
하체|워킹 런지|대퇴사두근·둔근|햄스트링, 코어|맨몸 또는 덤벨|앞으로 걸어가듯 번갈아 런지를 수행합니다.
하체|리버스 런지|둔근·대퇴사두근|햄스트링, 코어|맨몸 또는 덤벨|한 발을 뒤로 내딛고 앞다리 중심으로 내려갔다 일어납니다.
하체|스텝업|대퇴사두근·둔근|햄스트링, 코어|박스 또는 벤치|한 발로 박스를 딛고 올라선 뒤 천천히 내려옵니다.
하체|맨몸 스쿼트|대퇴사두근·둔근|햄스트링, 코어|맨몸|발바닥 전체로 지면을 밀며 엉덩이를 낮췄다 일어납니다.
하체|점프 스쿼트|대퇴사두근·둔근|종아리, 코어|맨몸|스쿼트 후 지면을 강하게 밀어 점프하고 부드럽게 착지합니다.
하체|머신 카프 레이즈|비복근·가자미근|- |머신|발뒤꿈치를 내렸다가 발끝으로 높이 밀어 올립니다.
하체|스탠딩 카프 레이즈|비복근|가자미근|맨몸 또는 머신|무릎을 편 상태에서 발뒤꿈치를 들어 올립니다.
하체|시티드 카프 레이즈|가자미근|비복근|머신|무릎을 굽힌 상태에서 발뒤꿈치를 들어 올립니다.
하체|덤벨 카프 레이즈|비복근·가자미근|- |덤벨|덤벨을 들고 발뒤꿈치를 들어 올렸다 천천히 내립니다.
하체|스미스 머신 카프 레이즈|비복근|가자미근|스미스 머신|바를 어깨에 두고 발뒤꿈치를 들어 올립니다.
하체|케이블 풀스루|둔근·햄스트링|척추기립근|케이블|케이블을 다리 사이로 통과시키고 엉덩이를 펴 일어섭니다.
하체|케틀벨 스윙|둔근·햄스트링|코어, 척추기립근|케틀벨|엉덩이 힌지로 케틀벨을 앞쪽으로 스윙합니다.
복근|크런치|복직근|- |맨몸|허리를 과하게 들지 않고 갈비뼈를 골반 쪽으로 말아 올립니다.
복근|머신 크런치|복직근|복사근|머신|패드를 잡고 복부를 말아 상체를 굽힙니다.
복근|케이블 크런치|복직근|복사근|케이블|골반을 고정하고 갈비뼈를 골반 쪽으로 말아 내립니다.
복근|리버스 크런치|복직근 하부|복사근|맨몸|복부를 말아 골반을 바닥에서 들어 올립니다.
복근|싯업|복직근|장요근|맨몸|복부에 힘을 유지하며 상체를 들어 올립니다.
복근|디클라인 싯업|복직근|장요근|디클라인 벤치|경사진 벤치에서 상체를 들어 올립니다.
복근|레그 레이즈|복직근 하부|장요근|맨몸|허리가 과하게 뜨지 않도록 다리를 들어 올립니다.
복근|행잉 레그 레이즈|복직근 하부|장요근, 전완근|풀업 바|매달린 상태에서 골반을 말아 다리를 들어 올립니다.
복근|행잉 니 레이즈|복직근 하부|장요근, 전완근|풀업 바|매달린 상태에서 무릎을 가슴 방향으로 들어 올립니다.
복근|캡틴스 체어 니 레이즈|복직근 하부|장요근|캡틴스 체어 머신|등을 패드에 고정하고 무릎을 들어 올립니다.
복근|플랭크|복횡근·복직근|둔근, 어깨 안정근|맨몸|머리부터 발뒤꿈치까지 일직선을 유지하며 버팁니다.
복근|사이드 플랭크|복사근|복횡근, 중둔근|맨몸|몸통을 일직선으로 유지하고 옆으로 버팁니다.
복근|바이시클 크런치|복직근·복사근|장요근|맨몸|반대쪽 팔꿈치와 무릎을 교차해 가까이 가져옵니다.
복근|러시안 트위스트|복사근|복직근|맨몸 또는 원판|상체를 살짝 뒤로 기울이고 몸통을 좌우로 회전합니다.
복근|케이블 우드초퍼|복사근|복직근, 어깨 안정근|케이블|케이블을 대각선 방향으로 당기며 몸통을 회전합니다.
복근|팔로프 프레스|복횡근·복사근|둔근, 어깨 안정근|케이블|몸통이 회전하지 않도록 버티며 손잡이를 앞으로 밀어냅니다.
복근|앱 롤아웃|복직근·복횡근|광배근, 어깨 안정근|앱 롤러|복부 긴장을 유지하며 롤러를 앞으로 굴렸다 돌아옵니다.
복근|데드버그|복횡근·복직근|고관절 굴곡근|맨몸|허리가 뜨지 않게 복압을 유지하며 반대 팔과 다리를 뻗습니다.
복근|버드독|척추기립근·복횡근|둔근, 어깨 안정근|맨몸|네발 자세에서 반대 팔과 다리를 뻗어 몸통을 안정시킵니다.
전완|바벨 리스트 컬|전완 굴곡근|손가락 굴곡근|바벨|손목을 굽혀 바벨을 들어 올립니다.
전완|바벨 리버스 리스트 컬|전완 신전근|상완요골근|바벨|손등이 위를 향하도록 잡고 손목을 들어 올립니다.
전완|덤벨 리스트 컬|전완 굴곡근|손가락 굴곡근|덤벨|전완을 고정하고 손목을 굽혀 덤벨을 들어 올립니다.
전완|덤벨 리버스 리스트 컬|전완 신전근|상완요골근|덤벨|전완을 고정하고 손목을 위로 들어 올립니다.
전완|리버스 컬|상완요골근·전완근|상완이두근|EZ바 또는 바벨|손등이 위를 향하도록 잡고 팔꿈치를 굽힙니다.
전완|파머스 워크|전완근·승모근|코어, 둔근|덤벨 또는 케틀벨|양손에 중량을 들고 몸통을 세운 채 일정 거리를 걷습니다.
유산소|트레드밀 걷기|심폐지구력|하체|트레드밀|대화 가능한 강도로 일정한 보폭과 속도를 유지합니다.
유산소|트레드밀 달리기|심폐지구력|대퇴사두근, 둔근, 종아리|트레드밀|무리하지 않는 속도로 호흡과 페이스를 일정하게 유지합니다.
유산소|실내 자전거|심폐지구력|대퇴사두근, 둔근|실내 사이클|안장 높이를 맞추고 일정한 케이던스로 페달을 밟습니다.
유산소|스텝밀|심폐지구력|대퇴사두근, 둔근, 종아리|스텝밀|상체를 세우고 일정한 속도로 계단을 오릅니다.
유산소|일립티컬|심폐지구력|하체, 둔근|일립티컬 머신|상체를 세우고 손잡이와 페달을 리듬 있게 움직입니다.
유산소|로잉 머신|심폐지구력|등, 하체, 코어|로잉 머신|다리로 밀고 몸통을 세운 뒤 팔을 당기는 순서로 움직입니다.
유산소|줄넘기|심폐지구력|종아리, 어깨|줄넘기|손목으로 줄을 돌리고 가볍게 연속 점프합니다.
유산소|버피 테스트|심폐지구력|전신 근육|맨몸|스쿼트, 플랭크, 점프 동작을 연속 수행합니다.
유산소|마운틴 클라이머|심폐지구력|복근, 어깨, 고관절 굴곡근|맨몸|플랭크 자세에서 무릎을 번갈아 가슴 쪽으로 당깁니다.`;
const LIB = LIB_DATA.split('\n').map(line=>{const [category,name,primary,secondary,equipment,desc]=line.split('|');return [category,name,primary,secondary,equipment,desc]});

const LEGACY_SOURCE_IDS={
'벤치프레스':'Barbell_Bench_Press_-_Medium_Grip',
'인클라인 벤치프레스':'Barbell_Incline_Bench_Press_-_Medium_Grip',
'디클라인 벤치프레스':'Decline_Barbell_Bench_Press',
'덤벨 벤치프레스':'Dumbbell_Bench_Press',
'인클라인 덤벨프레스':'Incline_Dumbbell_Press',
'덤벨 플라이':'Dumbbell_Flyes',
'케이블 플라이':'Cable_Crossover',
'체스트 프레스 머신':'Leverage_Chest_Press',
'푸시업':'Pushups',
'펙덱 플라이':'Butterfly',
'데드리프트':'Barbell_Deadlift',
'루마니안 데드리프트':'Romanian_Deadlift',
'랫풀다운':'Full_Range-Of-Motion_Lat_Pulldown',
'풀업':'Pullups',
'와이드 랫풀다운':'Wide-Grip_Lat_Pulldown',
'언더그립 랫풀다운':'Underhand_Cable_Pulldowns',
'친업':'Chin-Up',
'바벨 로우':'Bent_Over_Barbell_Row',
'덤벨 원암 로우':'One-Arm_Dumbbell_Row',
'시티드 케이블 로우':'Seated_Cable_Rows',
'티바 로우':'T-Bar_Row_with_Handle',
'체스트 서포티드 로우':'Incline_Bench_Pull',
'스트레이트 암 풀다운':'Straight-Arm_Pulldown',
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
'라잉 트라이셉스 익스텐션':'Lying_Triceps_Press',
'클로즈그립 벤치프레스':'Close-Grip_Barbell_Bench_Press',
'딥스':'Dips_-_Triceps_Version',
'바벨 백 스쿼트':'Barbell_Squat',
'프론트 스쿼트':'Front_Barbell_Squat',
'고블릿 스쿼트':'Goblet_Squat',
'레그 프레스':'Leg_Press',
'레그 익스텐션':'Leg_Extensions',
'레그 컬':'Lying_Leg_Curls',
'런지':'Bodyweight_Walking_Lunge',
'힙 쓰러스트':'Barbell_Hip_Thrust',
'카프 레이즈':'Standing_Calf_Raises',
'힙 어덕션':'Cable_Hip_Adduction',
'힙 어브덕션':'Thigh_Abductor',
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
const MUSCLE_NAMES_KO={
abdominals:'복근',abs:'복근',pectorals:'대흉근',chest:'가슴',lats:'광배근',latissimus_dorsi:'광배근',
deltoids:'삼각근',shoulders:'삼각근',biceps:'이두근',triceps:'삼두근',forearms:'전완근',brachialis:'상완근',
quadriceps:'대퇴사두근',hamstrings:'햄스트링',glutes:'둔근',calves:'종아리',traps:'승모근',
middle_back:'중부 등',lower_back:'척추기립근',adductors:'내전근',abductors:'중둔근',
obliques:'복사근',neck:'목 주변 근육',cardiovascular_system:'심폐지구력',chest:'가슴'
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
function allExercises(){
 const legacy=LIB.map((x,i)=>{
  return {id:'lib'+i,category:x[0],name:x[1],primary:x[2],secondary:x[3],equipment:x[4],desc:x[5],builtin:true};
 });
 return [...legacy,...(window.customExerciseCache||[])];
}

let selectedCategory='가슴', selectedExercise=null;
let exerciseVisibleCount=48;
async function refreshCustom(){window.customExerciseCache=await get('customExercises');}
function renderCategories(){const exercises=allExercises();const available=CATS.filter(c=>c==='전체'||exercises.some(x=>x.category===c));if(selectedCategory!=='전체'&&!available.includes(selectedCategory))selectedCategory='전체';$('#categoryChips').innerHTML=available.map(c=>`<button class="category-chip ${c===selectedCategory?'active':''}" data-cat="${c}">${c}</button>`).join('');document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;exerciseVisibleCount=48;renderCategories();renderLibrary()});}
function renderLibrary(){const q=$('#exerciseSearch').value.trim().toLowerCase();const terms=q.split(/\s+/).filter(Boolean);const all=allExercises();const categoryResults=selectedCategory==='전체'?all:all.filter(x=>x.category===selectedCategory);const arr=categoryResults.filter(x=>!terms.length||terms.every(term=>[x.name,x.nameEn,x.primary,x.secondary,x.equipment,x.category].join(' ').toLowerCase().includes(term)));const visible=q?arr:arr.slice(0,exerciseVisibleCount);$('#libraryList').innerHTML=`<div class="exercise-result-count">${arr.length.toLocaleString('ko-KR')}개 운동 · ${visible.length.toLocaleString('ko-KR')}개 표시</div>`+(visible.length?visible.map(x=>`<button class="library-item ${selectedExercise?.id===x.id?'chosen':''}" data-ex="${x.id}"><span class="library-item-text"><b>${escapeHTML(x.name)}</b></span></button>`).join(''):'<p class="empty">검색 결과가 없습니다.</p>')+(visible.length<arr.length?`<button class="secondary wide load-more-exercises" data-more-exercises>더 많은 운동 보기 (${(arr.length-visible.length).toLocaleString('ko-KR')}개 남음)</button>`:'');document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{selectedExercise=allExercises().find(x=>x.id===b.dataset.ex);renderLibrary();renderDetail()});const more=$('[data-more-exercises]');if(more)more.onclick=()=>{exerciseVisibleCount+=48;renderLibrary()};}
function renderDetail(){const x=selectedExercise;if(!x){$('#exerciseDetail').innerHTML='<div class="detail-empty">운동을 선택하면 타겟 부위와 설명이 표시됩니다.</div>';return}const cues=[],mistakes=[];$('#exerciseDetail').innerHTML=`<h3>${escapeHTML(x.name)}</h3>${x.nameEn?`<p class="detail-meta">${escapeHTML(x.nameEn)}</p>`:''}<span class="target-pill">주 타겟 · ${escapeHTML(x.primary)}</span><p class="detail-meta">보조 근육 · ${escapeHTML(x.secondary)}</p><p class="detail-meta">운동 도구 · ${escapeHTML(x.equipment)}</p><p class="detail-desc">${escapeHTML(x.desc)}</p>${cues.length?`<div class="source-cues"><b>운동 동작 요령</b><ol>${cues.map(v=>`<li>${escapeHTML(v)}</li>`).join('')}</ol></div>`:''}${mistakes.length?`<details class="source-mistakes"><summary>자주 하는 실수</summary><ul>${mistakes.map(v=>`<li>${escapeHTML(v)}</li>`).join('')}</ul></details>`:''}<button class="primary wide" id="selectThisExercise">＋ 오늘 운동에 추가</button>`;$('#selectThisExercise').onclick=()=>{exerciseCard(x.name);toast(`${x.name} 추가 완료`)}}
$('#exerciseSearch').oninput=()=>{exerciseVisibleCount=48;renderLibrary()};
$('#customExerciseBtn').onclick=async()=>{const name=prompt('추가할 운동 이름을 입력하세요.');if(!name||!name.trim())return;const category=prompt('운동 분류를 입력하세요: 가슴, 등, 어깨, 이두, 삼두, 전완, 하체, 복근, 유산소, 전신, 스트레칭, 기타','기타');if(!CATS.includes(category)||category==='전체'){toast('운동 분류를 정확히 입력해주세요.');return}const primary=prompt('주 타겟 부위 (예: 광배근)','직접 입력 운동 부위')||'직접 입력';const custom=await get('customExercises');custom.push({id:'custom'+crypto.randomUUID(),category,name:name.trim(),primary,secondary:'직접 지정',equipment:'직접 입력',desc:'사용자가 직접 등록한 운동입니다.',builtin:false});await put('customExercises',custom);await refreshCustom();selectedCategory=category;selectedExercise=allExercises().find(x=>x.name===name.trim()&&!x.builtin);renderCategories();renderLibrary();renderDetail();toast('나만의 운동을 추가했습니다.')};


// Load the most recently saved workout into the current form. It does not save a new log until Save is pressed.
$('#loadPrevious').onclick=async()=>{
 const logs=await get('logs');
 if(!logs.length){toast('불러올 이전 운동 기록이 없습니다.');return}
 const last=logs[0];
 $('#sessionName').value=last.name||'';
 $('#exerciseList').innerHTML='';
 last.exercises.forEach(ex=>{const from=ex.weightUnit||'kg';const converted=(ex.sets||[]).map(s=>({...s,weight:s.weight==null?'':Math.round(weightConvert(s.weight,from,weightUnit)*10)/10,weightKg:s.weight==null?'':weightConvert(s.weight,from,'kg'),weightUnit}));exerciseCard(ex.name,converted)});
 toast(`${dateText(last.date)} 기록을 불러왔습니다. 중량과 횟수를 수정해 저장하세요.`);
};
$('#saveWorkout').onclick=async()=>{const exercises=[...document.querySelectorAll('.exercise-card')].map(c=>{const m=exerciseMetrics(c);return {name:c.querySelector('.ex-name').value.trim(),sets:m.sets,weightUnit,totalReps:m.reps,totalVolume:m.volume,estimated1RM:m.oneRM,completed:c.classList.contains('completed')}}).filter(e=>e.name&&e.sets.length);if(!exercises.length){toast('운동 종목과 유효한 세트를 입력하세요.');return}const logs=await get('logs');logs.unshift({id:crypto.randomUUID(),date:today(),name:$('#sessionName').value.trim()||'운동',exercises});await put('logs',logs);toast('운동 기록을 저장했습니다.');go('home')};
async function renderHome(){const logs=await get('logs');const week=new Date();week.setDate(week.getDate()-6);const count=logs.filter(x=>new Date(x.date+'T00:00:00')>=new Date(week.toDateString())).length;$('#weekCount').innerHTML=`${count}<span> 회</span>`;$('#totalSets').innerHTML=`${logs.reduce((a,l)=>a+l.exercises.reduce((b,e)=>b+e.sets.length,0),0)}<span> 세트</span>`;const todayLog=logs.find(x=>x.date===today());$('#todayTitle').textContent=todayLog?todayLog.name:'운동을 시작해볼까요?';$('#todaySub').textContent=todayLog?`${todayLog.exercises.length}개 종목 기록 완료`:'오늘의 기록을 남겨보세요.';const recent=logs.slice(0,3);$('#recentList').className='stack'+(recent.length?'':' empty');$('#recentList').innerHTML=recent.length?recent.map(l=>`<article class="item-card"><h4>${escapeHTML(l.name)}</h4><p>${dateText(l.date)} · ${l.exercises.length}개 종목 · ${l.exercises.reduce((a,e)=>a+e.sets.length,0)}세트</p></article>`).join(''):'아직 기록이 없습니다.'}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function renderHistory(){
 const logs=await get('logs');
 $('#historyList').className='stack'+(logs.length?'':' empty');
 $('#historyList').innerHTML=logs.length?logs.map(l=>`<article class="item-card"><h4>${escapeHTML(l.name)} <button class="remove" data-delete="${l.id}">삭제</button></h4><p>${dateText(l.date)}</p>${l.exercises.map(e=>{
  const from=e.weightUnit||'kg';
  const sets=(e.sets||[]).map(s=>({...s,weight:Math.round(weightConvert(s.weight,from,weightUnit)*10)/10}));
  const volume=weightConvert(e.totalVolume??(e.sets||[]).reduce((n,s)=>n+s.weight*s.reps,0),from,weightUnit);
  const oneRM=weightConvert(e.estimated1RM??Math.max(0,...(e.sets||[]).map(s=>s.weight*(1+s.reps/30))),from,weightUnit);
  return `<p><b>${escapeHTML(e.name)}</b> · ${sets.map(s=>`${s.weight}${weightUnit} × ${s.reps}`).join(' / ')}<br><span class="muted">볼륨 ${Number(volume).toLocaleString('ko-KR',{maximumFractionDigits:1})}${weightUnit} · ${Number(e.totalReps??(e.sets||[]).reduce((n,s)=>n+s.reps,0))}회 · 추정 1RM ${Number(oneRM).toFixed(1)}${weightUnit}</span></p>`;
 }).join('')}</article>`).join(''):'저장된 운동이 없습니다.';
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('이 운동 기록을 삭제할까요?')){await put('logs',(await get('logs')).filter(x=>x.id!==b.dataset.delete));renderHistory()}});
}
function bodyNumber(id){
 const raw=$('#'+id).value.trim();
 if(!raw)return null;
 const value=Number(raw);
 return Number.isFinite(value)?value:null;
}
function bodyFatStatus(value){
 if(value===null||value===undefined||!Number.isFinite(Number(value)))return null;
 const v=Number(value);
 if(v<8)return '낮음';
 if(v<20)return '정상';
 if(v<25)return '높은 편';
 return '비만 범위';
}
function bmiStatus(value){
 if(value===null||value===undefined||!Number.isFinite(Number(value)))return null;
 const v=Number(value);
 if(v<18.5)return '저체중';
 if(v<23)return '정상';
 if(v<25)return '비만 전 단계';
 if(v<30)return '1단계 비만';
 if(v<35)return '2단계 비만';
 return '3단계 비만';
}
function bodyMetrics(height,weight,fat){
 const h=Number(height),w=Number(weight),f=Number(fat);
 const bodyFatPercent=fat!==null&&fat!==undefined&&fat!==''&&Number.isFinite(w)&&w>0&&Number.isFinite(f)&&f>=0?f/w*100:null;
 const bmi=Number.isFinite(h)&&h>0&&Number.isFinite(w)&&w>0?w/((h/100)*(h/100)):null;
 return {
  bodyFatPercent,
  bmi,
  bodyFatStatus:bodyFatStatus(bodyFatPercent),
  bmiStatus:bmiStatus(bmi)
 };
}
function updateBodyCalculations(){
 const metrics=bodyMetrics(bodyNumber('height'),bodyNumber('weight'),bodyNumber('fat'));
 $('#bodyFatPreview').textContent=metrics.bodyFatPercent===null?'—':metrics.bodyFatPercent.toFixed(1)+'% ('+metrics.bodyFatStatus+')';
 $('#bmiPreview').textContent=metrics.bmi===null?'—':metrics.bmi.toFixed(1)+' ('+metrics.bmiStatus+')';
}
['age','height','weight','muscle','fat'].forEach(id=>$('#'+id).addEventListener('input',updateBodyCalculations));

let editingBodyIndex=null;
function resetBodyEditor(){
 editingBodyIndex=null;
 $('#bodyDate').value=today();
 $('#age').value='';
 $('#weight').value=$('#muscle').value=$('#fat').value='';
 $('#saveBody').textContent='측정 기록 저장';
 $('#cancelBodyEdit').hidden=true;
 updateBodyCalculations();
}
async function beginBodyEdit(index){
 const arr=await get('body');
 const entry=arr[index];
 if(!entry){toast('선택한 신체 기록을 찾을 수 없습니다.');return}
 editingBodyIndex=index;
 $('#bodyDate').value=entry.date||today();
 $('#age').value=entry.age??'';
 $('#height').value=entry.height??'';
 $('#weight').value=entry.weight??'';
 $('#muscle').value=entry.muscle??'';
 $('#fat').value=entry.fat??'';
 $('#saveBody').textContent='수정 내용 저장';
 $('#cancelBodyEdit').hidden=false;
 updateBodyCalculations();
 toast('선택한 신체 기록을 수정할 수 있습니다.');
}
$('#cancelBodyEdit').onclick=()=>{
 resetBodyEditor();
 toast('기록 수정을 취소했습니다.');
};
$('#saveBody').onclick=async()=>{
 const arr=await get('body');
 const editingEntry=editingBodyIndex!==null?arr[editingBodyIndex]:null;
 if(editingBodyIndex!==null&&!editingEntry){
  resetBodyEditor();
  toast('수정할 기록을 찾을 수 없습니다. 다시 선택해주세요.');
  return;
 }
 const latestHeightEntry=arr.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).find(x=>Number(x.height)>0);
 const latestHeight=latestHeightEntry?Number(latestHeightEntry.height):null;
 const enteredHeight=bodyNumber('height');
 const height=enteredHeight??(editingEntry?(Number(editingEntry.height)>0?Number(editingEntry.height):null):latestHeight);
 const entry={
  ...(editingEntry||{}),
  age:bodyNumber('age'),
  id:editingEntry?.id||crypto.randomUUID(),
  date:$('#bodyDate').value||today(),
  height,
  weight:bodyNumber('weight'),
  muscle:bodyNumber('muscle'),
  fat:bodyNumber('fat')
 };
 if(entry.weight===null&&entry.muscle===null&&entry.fat===null){
  toast('체중, 골격근량, 체지방량 중 하나 이상 입력하세요.');
  return;
 }
 const wasEditing=editingBodyIndex!==null;
 if(wasEditing)arr[editingBodyIndex]=entry;
 else arr.push(entry);
 arr.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 await put('body',arr);
 resetBodyEditor();
 if(height!==null)$('#height').value=height;
 updateBodyCalculations();
 toast(wasEditing?'신체 기록을 수정했습니다.':'신체 기록을 저장했습니다.');
 renderBody();
};
async function renderBody(){
 const arr=await get('body');
 const latestHeightEntry=arr.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).find(x=>Number(x.height)>0);
 const latestHeight=latestHeightEntry?Number(latestHeightEntry.height):null;
 if(editingBodyIndex===null&&!$('#height').value&&latestHeight)$('#height').value=latestHeight;
 const latestAgeEntry=arr.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).find(x=>Number.isFinite(Number(x.age)));
 if(editingBodyIndex===null&&!$('#age').value&&latestAgeEntry)$('#age').value=latestAgeEntry.age;
 updateBodyCalculations();
 $('#bodyList').className='stack'+(arr.length?'':' empty');
 $('#bodyList').innerHTML=arr.length?arr.map((x,index)=>({x,index})).sort((a,b)=>(b.x.date||'').localeCompare(a.x.date||'')).map(({x,index})=>{
  const height=Number(x.height)>0?Number(x.height):latestHeight;
  const metrics=bodyMetrics(height,x.weight,x.fat);
  const fmt=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'-':Number(value).toLocaleString('ko-KR',{maximumFractionDigits:1});
  return `<article class="item-card body-record-card"><div class="body-record-head"><h4>${dateText(x.date)}</h4><div class="body-record-actions"><button type="button" class="body-edit-btn" data-body-edit="${index}">수정</button><button type="button" class="body-delete-btn" data-body-delete="${index}">삭제</button></div></div><p>만 ${fmt(x.age)}세 · 키 ${fmt(height)}cm · 체중 ${fmt(x.weight)}kg · 골격근량 ${fmt(x.muscle)}kg · 체지방량 ${fmt(x.fat)}kg</p><p class="body-record-calculated">체지방률 ${metrics.bodyFatPercent===null?'-':metrics.bodyFatPercent.toFixed(1)+'% ('+metrics.bodyFatStatus+')'} · BMI ${metrics.bmi===null?'-':metrics.bmi.toFixed(1)+' ('+metrics.bmiStatus+')'}</p></article>`;
 }).join(''):'아직 측정 기록이 없습니다.';
 document.querySelectorAll('[data-body-edit]').forEach(button=>button.onclick=()=>beginBodyEdit(Number(button.dataset.bodyEdit)));
 document.querySelectorAll('[data-body-delete]').forEach(button=>button.onclick=async()=>{
  const index=Number(button.dataset.bodyDelete);
  const current=await get('body');
  if(!current[index]){toast('삭제할 기록을 찾을 수 없습니다.');return}
  if(!confirm(`${dateText(current[index].date)} 신체 기록을 삭제할까요?`))return;
  await put('body',current.filter((entry,i)=>i!==index));
  if(editingBodyIndex===index)resetBodyEditor();
  else if(editingBodyIndex!==null&&editingBodyIndex>index)editingBodyIndex--;
  await renderBody();
  toast('선택한 신체 기록을 삭제했습니다.');
 });
}
function cidReference(entry){
 const h=Number(entry.height); if(!Number.isFinite(h)||h<=0)return null;
 const standardWeight=(h/100)**2*22;
 const standardMuscle=standardWeight*0.45;
 const standardFat=standardWeight*0.15;
 return {weight:{standard:standardWeight,min:standardWeight*.85,max:standardWeight*1.15},muscle:{standard:standardMuscle,min:standardMuscle*.90,max:standardMuscle*1.10},fat:{standard:standardFat,min:standardFat*.80,max:standardFat*1.60}};
}
function cidStatus(value,range){if(value==null||!range)return '정보 부족';return value<range.min?'표준 이하':value>range.max?'표준 이상':'표준'}
function cidShape(entry,ref){const v=[entry.weight/ref.weight.standard*100,entry.muscle/ref.muscle.standard*100,entry.fat/ref.fat.standard*100];if(v.some(x=>!Number.isFinite(x)))return '판정 불가';if(v[1]<v[0]&&v[1]<v[2])return 'C형 · 근육 부족형';if(v[1]>v[0]&&v[1]>v[2])return 'D형 · 근육 발달형';return 'I형 · 균형형'}
function cidShapeSvg(entry,ref){const vals=[entry.weight/ref.weight.standard*100,entry.muscle/ref.muscle.standard*100,entry.fat/ref.fat.standard*100],ys=[18,60,102],xs=vals.map(v=>24+Math.max(0,Math.min(200,v))/200*272);return '<svg class="cid-shape-svg" viewBox="0 0 320 122" role="img" aria-label="CID 체성분 막대 끝점 비교"><g stroke="currentColor" opacity=".18" stroke-dasharray="3 4"><line x1="24" y1="18" x2="296" y2="18"/><line x1="24" y1="60" x2="296" y2="60"/><line x1="24" y1="102" x2="296" y2="102"/></g><g fill="currentColor" font-size="10"><text x="2" y="21">체중</text><text x="2" y="63">근육</text><text x="2" y="105">지방</text></g><polyline points="'+xs.map((x,i)=>x+','+ys[i]).join(' ')+'" fill="none" stroke="#A3E635" stroke-width="2.5" stroke-linejoin="round"/><g fill="#A3E635">'+xs.map((x,i)=>'<circle cx="'+x+'" cy="'+ys[i]+'" r="4"><title>'+['체중','골격근량','체지방량'][i]+' '+vals[i].toFixed(1)+'%</title></circle>').join('')+'</g></svg>'}
function cidBarRow(label,value,range){const pct=value/range.standard*100,left=20,width=270,x=left+Math.max(0,Math.min(200,pct))/200*width,n1=range.min/range.standard*100,n2=range.max/range.standard*100,bx=left+n1/200*width,bw=(n2-n1)/200*width,status=cidStatus(value,range),color=status==='표준'?'#A3E635':status==='표준 이상'?'#38BDF8':'#F59E0B';return '<div class="cid-row"><div class="cid-row-head"><b>'+label+'</b><strong>'+Number(value).toFixed(1)+'kg</strong></div><div class="cid-track"><span class="cid-band" style="left:'+bx/310*100+'%;width:'+bw/310*100+'%"></span><span class="cid-marker" style="left:'+x/310*100+'%;background:'+color+'"></span></div><div class="cid-row-foot"><span>표준 이하</span><span>표준 '+range.min.toFixed(1)+'~'+range.max.toFixed(1)+'kg</span><b style="color:'+color+'">'+status+'</b></div></div>'}
function trendSvg(points){if(points.length<2)return '<div class="analysis-empty">비교할 측정 기록이 2개 이상 필요합니다.</div>';const vals=points.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1,coords=points.map((p,i)=>[24+i*272/(points.length-1),112-(p.value-min)/span*86]),poly=coords.map(p=>p.join(',')).join(' ');return '<svg class="trend-svg" viewBox="0 0 320 140" role="img" aria-label="날짜별 변화 그래프"><line x1="24" y1="112" x2="296" y2="112" stroke="currentColor" opacity=".18"/><polyline points="'+poly+'" fill="none" stroke="#A3E635" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+coords.map((p,i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#A3E635"><title>'+points[i].date+': '+points[i].value.toFixed(1)+'</title></circle>').join('')+'<g fill="currentColor" opacity=".65" font-size="9"><text x="24" y="132">'+points[0].date.slice(5)+'</text><text x="296" y="132" text-anchor="end">'+points[points.length-1].date.slice(5)+'</text></g></svg>'}
let analysisPeriod='all',analysisSelectedId='';
async function renderAnalysis(){
 const all=(await get('body')).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
 const now=new Date();let start=null;if(analysisPeriod!=='all'){start=new Date(now);start.setMonth(start.getMonth()-Number(analysisPeriod))}
 const rows=all.filter(x=>!start||new Date((x.date||'')+'T00:00:00')>=start),latest=rows[rows.length-1],selected=all.find(x=>x.id===analysisSelectedId)||latest;if(selected)analysisSelectedId=selected.id;
 const metrics=[['체중','weight','kg'],['골격근량','muscle','kg'],['체지방량','fat','kg'],['체지방률','bf','%'],['BMI','bmi','']];
 const chartHtml=metrics.map(([label,key,unit])=>{const pts=rows.map(x=>{const m=bodyMetrics(x.height,x.weight,x.fat);return {date:x.date,value:key==='bf'?m.bodyFatPercent:key==='bmi'?m.bmi:x[key]}}).filter(x=>Number.isFinite(Number(x.value)));const last=pts[pts.length-1];return '<article class="analysis-card"><div class="analysis-card-head"><b>'+label+'</b><strong>'+(last?Number(last.value).toFixed(1)+unit:'—')+'</strong></div>'+trendSvg(pts)+'</article>'}).join('');
 let cidHtml='<div class="analysis-empty">신체 기록이 없습니다. 신체 탭에서 측정값을 입력하세요.</div>';
 if(selected){const ref=cidReference(selected),age=selected.age==null?'나이 미입력':'만 '+selected.age+'세',valid=ref&&Number.isFinite(Number(selected.age))&&Number(selected.age)>=18&&['weight','muscle','fat'].every(k=>Number.isFinite(Number(selected[k])));if(valid){cidHtml='<div class="cid-meta"><b>'+dateText(selected.date)+'</b><span>'+age+' · '+Number(selected.height).toFixed(1)+'cm</span></div><div class="cid-shape"><strong>'+cidShape(selected,ref)+'</strong><small>체중 · 골격근량 · 체지방량 막대 끝점을 연결한 형태</small></div>'+cidBarRow('체중',Number(selected.weight),ref.weight)+cidBarRow('골격근량',Number(selected.muscle),ref.muscle)+cidBarRow('체지방량',Number(selected.fat),ref.fat)+'<p class="hint">표준 범위는 남성 기준 신장 기반 추정치입니다. 체중 85~115%, 골격근량 90~110%, 체지방량 80~160% 기준을 적용했습니다. 골격근량 표준값은 제조사의 기기별 원자료가 공개되지 않아 표준체중의 45%로 추정한 참고값이며, 공식 인바디 판정과 동일하지 않습니다. 만 나이는 측정 당시 정보로 보존합니다. 공개된 CID 표준 구간은 나이별이 아니라 성별·신장 기준입니다.</p>'}else{cidHtml='<div class="analysis-empty">CID를 계산하려면 만 18세 이상이며 선택한 기록에 나이, 키, 체중, 골격근량, 체지방량이 필요합니다.<br>기존 기록은 신체 탭에서 수정해 나이를 입력하세요.</div>'}}
 const selectHtml=all.length?'<label class="field-label" for="cidRecordSelect">CID 측정 기록 선택</label><select id="cidRecordSelect" class="input">'+all.slice().reverse().map(x=>'<option value="'+escapeHTML(x.id)+'" '+(selected&&selected.id===x.id?'selected':'')+'>'+dateText(x.date)+' · 만 '+(x.age??'미입력')+'세</option>').join('')+'</select>':'';
 $('#analysisContent').innerHTML='<div class="analysis-period">'+[['1','1개월'],['3','3개월'],['6','6개월'],['all','전체']].map(([v,t])=>'<button class="period-btn '+(analysisPeriod===v?'active':'')+'" data-period="'+v+'">'+t+'</button>').join('')+'</div><div class="section-head compact"><h3>신체 변화 추이</h3><span class="muted">'+rows.length+'회 측정</span></div><div class="analysis-grid">'+chartHtml+'</div><div class="section-head"><h3>CID 체성분 분석</h3></div><div class="form-card cid-card">'+selectHtml+cidHtml+'</div>';
 document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{analysisPeriod=b.dataset.period;renderAnalysis()});const sel=$('#cidRecordSelect');if(sel)sel.onchange=()=>{analysisSelectedId=sel.value;renderAnalysis()};
}
async function exportData(){const data={version:1,exportedAt:new Date().toISOString(),logs:await get('logs'),body:await get('body'),customExercises:await get('customExercises'),settings:{weightUnit}};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`workout-log-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('백업 파일을 내보냈습니다.')}
async function importData(file){try{const data=JSON.parse(await file.text());if(!Array.isArray(data.logs)||!Array.isArray(data.body))throw Error();if(!confirm('가져온 데이터로 현재 기록을 교체할까요?'))return;await put('logs',data.logs);await put('body',data.body);if(Array.isArray(data.customExercises))await put('customExercises',data.customExercises);if(data.settings?.weightUnit){weightUnit=data.settings.weightUnit==='lbs'?'lbs':'kg';await put('settings',{weightUnit});$('#recordWeightUnit').value=weightUnit;}await refreshCustom();renderCategories();renderLibrary();toast('백업 데이터를 복원했습니다.');renderHome()}catch{toast('올바른 백업 파일이 아닙니다.')}}
$('#recordWeightUnit').onchange=async e=>{applyWeightUnit(e.target.value);await put('settings',{weightUnit});toast(`운동 기록 단위를 ${weightUnit}로 변경했습니다.`)};
$('#backupBtn').onclick=exportData;$('#exportBtn').onclick=exportData;$('#importFile').onchange=e=>e.target.files[0]&&importData(e.target.files[0]);$('#clearBtn').onclick=async()=>{if(confirm('모든 운동 및 신체 기록을 영구 삭제할까요?')){await put('logs',[]);await put('body',[]);toast('모든 기록을 삭제했습니다.');renderHome()}};

(async()=>{db=await openDB();const savedSettings=await get('settings');weightUnit=savedSettings&&savedSettings.weightUnit==='lbs'?'lbs':'kg';$('#recordWeightUnit').value=weightUnit;await refreshCustom();renderCategories();renderLibrary();renderDetail();renderHome();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});})();
