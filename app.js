const DB='workout-log-local', STORE='data';
let db;
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function get(key){return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
function put(key,value){return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(value,key);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2100)}
function dateText(d){return new Date(d+'T00:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'})}
function go(tab){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===tab));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));if(tab==='home')renderHome();if(tab==='history')renderHistory();if(tab==='bodydata')renderBody()}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('#todayLabel').textContent=dateText(today());$('#bodyDate').value=today();

function exerciseCard(name='',setsData=null){
 const card=document.createElement('div');card.className='exercise-card';
 card.innerHTML=`<div class="exercise-top"><input class="input ex-name" placeholder="운동 종목 (예: 랫풀다운)" value="${String(name).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}"><button class="remove">삭제</button></div><div class="set-head"><span>세트</span><span>중량 (kg)</span><span>횟수</span><span></span></div><div class="sets"></div><button class="add-set">+ 세트 추가</button>`;
 card.querySelector('.remove').onclick=()=>card.remove();
 const add=(data={})=>{const n=card.querySelectorAll('.set-row').length+1;const row=document.createElement('div');row.className='set-row';row.innerHTML=`<span>${n}</span><input type="number" min="0" step="0.5" placeholder="0" value="${data.weight??''}"><input type="number" min="0" step="1" placeholder="0" value="${data.reps??''}"><button aria-label="세트 삭제">×</button>`;row.querySelector('button').onclick=()=>{row.remove();[...card.querySelectorAll('.set-row span')].forEach((x,i)=>x.textContent=i+1)};card.querySelector('.sets').append(row)};
 card.querySelector('.add-set').onclick=()=>add();
 (setsData&&setsData.length?setsData:[{},{},{}]).forEach(add);$('#exerciseList').append(card);
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
function exerciseArt(x){
 const cat=x.category, name=x.name;
 const family=/벤치|프레스|푸시업|딥스|플라이|체스트/.test(name)?'press':
 /랫풀|풀업|친업/.test(name)?'pull':
 /로우|데드리프트|파머스|백 익스텐션/.test(name)?'row':
 /스쿼트|런지|레그 프레스|불가리안|힙 쓰러스트/.test(name)?'squat':
 /컬|curl|푸시다운|익스텐션|페이스 풀/.test(name)?'curl':
 /레이즈|업라이트/.test(name)?'raise':
 /크런치|플랭크|레그 레이즈|트위스트|데드 버그/.test(name)?'core':
 /트레드밀|자전거|일립티컬|로잉/.test(name)?'cardio':'general';
 const accent='#b6f36b', secondary='#77b9a0';
 const muscle = cat==='가슴'?'M88 67 Q108 54 124 69 L119 86 Q105 94 90 83Z':
 cat==='등'?'M87 62 Q104 55 119 66 L123 91 L108 105 L87 91Z':
 cat==='어깨'?'M77 59 Q84 48 94 59 L91 76 L78 75Z M119 59 Q129 48 137 60 L135 76 L121 76Z':
 cat==='이두'?'M65 74 Q74 67 80 82 L74 101 L62 93Z M137 74 Q146 67 151 82 L144 101 L133 93Z':
 cat==='삼두'?'M61 76 L74 77 L78 99 L65 103Z M137 77 L150 76 L147 103 L134 99Z':
 cat==='하체'?'M86 103 L105 105 L101 137 L88 137Z M112 103 L130 105 L127 137 L114 137Z':
 cat==='복근'?'M96 77 L120 77 L119 111 L96 111Z':'M88 64 L124 64 L124 110 L88 110Z';
 const poses={
 press:`<path d="M24 133 H196" stroke="#59645d" stroke-width="5" stroke-linecap="round"/><path d="M53 126 L69 101 L145 101 L163 126" fill="none" stroke="#849087" stroke-width="7" stroke-linecap="round"/><path d="M50 95 L165 95" stroke="#d5ddd6" stroke-width="5" stroke-linecap="round"/><path d="M58 88 V103 M157 88 V103" stroke="#b6f36b" stroke-width="4"/><circle cx="83" cy="76" r="10" fill="url(#skin)"/><path d="M94 75 Q116 67 139 79 L148 96 L103 99 L85 88Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M105 77 L98 59 L102 51 M135 78 L143 59 L140 51" fill="none" stroke="url(#limb)" stroke-width="9" stroke-linecap="round"/><path d="M104 95 L89 119 M137 95 L154 119" stroke="url(#limb)" stroke-width="10" stroke-linecap="round"/>`,
 pull:`<path d="M35 34 H185" stroke="#aeb8b0" stroke-width="5" stroke-linecap="round"/><path d="M110 34 V48" stroke="#b6f36b" stroke-width="2"/><path d="M70 47 Q110 37 150 47" fill="none" stroke="#78847b" stroke-width="3"/><circle cx="110" cy="54" r="10" fill="url(#skin)"/><path d="M91 66 Q110 57 129 66 L137 111 L121 126 L99 126 L83 111Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M91 70 L76 49 L61 41 M129 70 L144 49 L159 41" fill="none" stroke="url(#limb)" stroke-width="9" stroke-linecap="round"/><path d="M61 41 L159 41" stroke="#cdd6ce" stroke-width="5" stroke-linecap="round"/><path d="M99 124 L94 157 M121 124 L126 157" stroke="url(#limb)" stroke-width="10" stroke-linecap="round"/>`,
 row:`<circle cx="145" cy="48" r="10" fill="url(#skin)"/><path d="M135 59 Q113 64 88 86 L77 110 L103 117 L129 90 L150 72Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M91 85 L66 108 L54 126 M105 88 L130 109 L146 126" fill="none" stroke="url(#limb)" stroke-width="9" stroke-linecap="round"/><path d="M47 128 H154" stroke="#cdd6ce" stroke-width="5" stroke-linecap="round"/><path d="M92 112 L83 153 M119 104 L135 148" stroke="url(#limb)" stroke-width="10" stroke-linecap="round"/><path d="M38 155 H172" stroke="#59645d" stroke-width="4"/>`,
 squat:`<path d="M49 62 H171" stroke="#d2dbd3" stroke-width="5" stroke-linecap="round"/><path d="M58 54 V70 M162 54 V70" stroke="#b6f36b" stroke-width="5"/><circle cx="111" cy="39" r="10" fill="url(#skin)"/><path d="M91 52 Q111 46 130 54 L136 89 L119 105 L94 99 L84 75Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M91 58 L73 62 L61 67 M130 58 L148 62 L160 67" fill="none" stroke="url(#limb)" stroke-width="9" stroke-linecap="round"/><path d="M96 99 L76 119 L67 150 M120 102 L143 120 L151 150" fill="none" stroke="url(#limb)" stroke-width="12" stroke-linecap="round"/><path d="M50 154 H172" stroke="#59645d" stroke-width="4"/>`,
 curl:`<circle cx="110" cy="37" r="11" fill="url(#skin)"/><path d="M91 52 Q110 45 129 52 L136 104 L123 121 L97 121 L84 104Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M91 60 L73 83 L82 103 L97 86 M129 60 L147 83 L139 101 L126 86" fill="none" stroke="url(#limb)" stroke-width="10" stroke-linecap="round"/><path d="M82 103 L76 116 M139 101 L151 83" stroke="url(#limb)" stroke-width="9" stroke-linecap="round"/><path d="M145 76 L159 76 M152 69 V83" stroke="#cfd8d0" stroke-width="5" stroke-linecap="round"/><path d="M99 120 L94 157 M121 120 L126 157" stroke="url(#limb)" stroke-width="10" stroke-linecap="round"/>`,
 raise:`<circle cx="110" cy="38" r="11" fill="url(#skin)"/><path d="M91 53 Q110 46 129 53 L136 107 L122 122 L98 122 L84 107Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M91 62 L66 68 L43 72 M129 62 L154 68 L177 72" fill="none" stroke="url(#limb)" stroke-width="11" stroke-linecap="round"/><path d="M40 65 L40 78 M180 65 L180 78" stroke="#d1dad2" stroke-width="5" stroke-linecap="round"/><path d="M99 121 L94 157 M121 121 L126 157" stroke="url(#limb)" stroke-width="10" stroke-linecap="round"/>`,
 core:`<path d="M24 145 H196" stroke="#59645d" stroke-width="4"/><circle cx="53" cy="91" r="10" fill="url(#skin)"/><path d="M64 91 Q91 76 126 91 L156 113 L143 126 L112 109 L81 116Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M82 111 L55 131 L42 145 M145 119 L172 137 L185 145" fill="none" stroke="url(#limb)" stroke-width="9" stroke-linecap="round"/><path d="M103 108 L90 143 M126 108 L139 143" stroke="url(#limb)" stroke-width="9" stroke-linecap="round"/>`,
 cardio:`<path d="M20 145 H200" stroke="#59645d" stroke-width="4"/><path d="M35 145 L53 84 H174 L192 145" fill="none" stroke="#7f8c82" stroke-width="4"/><circle cx="106" cy="42" r="10" fill="url(#skin)"/><path d="M97 54 L121 61 L131 91 L111 105 L88 83Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M99 63 L76 80 L62 69 M121 66 L145 79 L158 66" fill="none" stroke="url(#limb)" stroke-width="9" stroke-linecap="round"/><path d="M105 101 L82 119 L68 141 M116 101 L139 117 L155 140" fill="none" stroke="url(#limb)" stroke-width="11" stroke-linecap="round"/>`,
 general:`<circle cx="110" cy="37" r="11" fill="url(#skin)"/><path d="M91 52 Q110 45 129 52 L136 107 L122 122 L98 122 L84 107Z" fill="url(#body)" stroke="#dce4dd" stroke-width="1.5"/><path d="M91 61 L69 83 L79 105 M129 61 L151 83 L141 105" fill="none" stroke="url(#limb)" stroke-width="10" stroke-linecap="round"/><path d="M99 121 L94 157 M121 121 L126 157" stroke="url(#limb)" stroke-width="10" stroke-linecap="round"/>`
 };
 return `<svg viewBox="0 0 220 180" class="exercise-art" role="img" aria-label="${escapeHTML(name)} 동작 및 타겟 근육 일러스트">
 <defs><radialGradient id="bgArt"><stop stop-color="#344238"/><stop offset="1" stop-color="#111713"/></radialGradient><linearGradient id="body" x2="1" y2="1"><stop stop-color="#dce5dd"/><stop offset=".45" stop-color="#89968c"/><stop offset="1" stop-color="#566259"/></linearGradient><linearGradient id="limb" x2="1" y2="1"><stop stop-color="#e3ebe4"/><stop offset="1" stop-color="#78857b"/></linearGradient><linearGradient id="skin"><stop stop-color="#e6c9a8"/><stop offset="1" stop-color="#9e8066"/></linearGradient></defs>
 <rect width="220" height="180" rx="13" fill="url(#bgArt)"/>
 <g opacity=".13" stroke="#b6f36b"><path d="M10 150 H210 M10 30 H210"/></g>
 <g>${poses[family]}</g>
 <path d="${muscle}" fill="${accent}" opacity=".94" stroke="#e0ffb9" stroke-width="1.2" transform="${family==='press'?'translate(0 0)':family==='pull'||family==='row'?'translate(0 0)':''}"/>
 <path d="M8 166 H212" stroke="#6a796d" stroke-opacity=".45"/>
 <circle cx="197" cy="17" r="5" fill="${accent}"/><text x="185" y="170" text-anchor="end" font-size="8" fill="#aeb9af" letter-spacing="1">${cat.toUpperCase()}</text>
 </svg>`;
}
function allExercises(){return [...LIB.map((x,i)=>({id:'lib'+i,category:x[0],name:x[1],primary:x[2],secondary:x[3],equipment:x[4],desc:x[5],builtin:true})),...(window.customExerciseCache||[])];}
async function refreshCustom(){window.customExerciseCache=await get('customExercises');}
function renderCategories(){ $('#categoryChips').innerHTML=CATS.map(c=>`<button class="category-chip ${c===selectedCategory?'active':''}" data-cat="${c}">${c}</button>`).join('');document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{selectedCategory=b.dataset.cat;renderCategories();renderLibrary()});}
function renderLibrary(){const q=$('#exerciseSearch').value.trim().toLowerCase();const arr=allExercises().filter(x=>(x.category===selectedCategory||q)&&(!q||x.name.toLowerCase().includes(q)||x.primary.toLowerCase().includes(q)||x.category.includes(q)));$('#libraryList').innerHTML=arr.length?arr.map(x=>`<button class="library-item ${selectedExercise?.id===x.id?'chosen':''}" data-ex="${x.id}"><span class="mini-anatomy">${exerciseArt(x)}</span><span><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.primary)}</small></span></button>`).join(''):'<p class="empty">검색 결과가 없습니다.</p>';document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{selectedExercise=allExercises().find(x=>x.id===b.dataset.ex);renderLibrary();renderDetail()})}
function renderDetail(){const x=selectedExercise;if(!x){$('#exerciseDetail').innerHTML='<div class="detail-empty">운동을 선택하면 타겟 부위와 설명이 표시됩니다.</div>';return}$('#exerciseDetail').innerHTML=`<div class="detail-art">${exerciseArt(x)}</div><h3>${escapeHTML(x.name)}</h3><span class="target-pill">주 타겟 · ${escapeHTML(x.primary)}</span><p class="detail-meta">보조 근육 · ${escapeHTML(x.secondary)}</p><p class="detail-meta">운동 도구 · ${escapeHTML(x.equipment)}</p><p class="detail-desc">${escapeHTML(x.desc)}</p><button class="primary wide" id="selectThisExercise">＋ 오늘 운동에 추가</button>`;$('#selectThisExercise').onclick=()=>{exerciseCard(x.name);toast(`${x.name} 추가 완료`)}}
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
$('#saveWorkout').onclick=async()=>{const exercises=[...document.querySelectorAll('.exercise-card')].map(c=>({name:c.querySelector('.ex-name').value.trim(),sets:[...c.querySelectorAll('.set-row')].map(r=>({weight:Number(r.children[1].value)||0,reps:Number(r.children[2].value)||0})).filter(s=>s.reps>0)})).filter(e=>e.name&&e.sets.length);if(!exercises.length){toast('운동 종목과 유효한 세트를 입력하세요.');return}const logs=await get('logs');logs.unshift({id:crypto.randomUUID(),date:today(),name:$('#sessionName').value.trim()||'운동',exercises});await put('logs',logs);toast('운동 기록을 저장했습니다.');go('home')};
async function renderHome(){const logs=await get('logs');const week=new Date();week.setDate(week.getDate()-6);const count=logs.filter(x=>new Date(x.date+'T00:00:00')>=new Date(week.toDateString())).length;$('#weekCount').innerHTML=`${count}<span> 회</span>`;$('#totalSets').innerHTML=`${logs.reduce((a,l)=>a+l.exercises.reduce((b,e)=>b+e.sets.length,0),0)}<span> 세트</span>`;const todayLog=logs.find(x=>x.date===today());$('#todayTitle').textContent=todayLog?todayLog.name:'운동을 시작해볼까요?';$('#todaySub').textContent=todayLog?`${todayLog.exercises.length}개 종목 기록 완료`:'오늘의 기록을 남겨보세요.';const recent=logs.slice(0,3);$('#recentList').className='stack'+(recent.length?'':' empty');$('#recentList').innerHTML=recent.length?recent.map(l=>`<article class="item-card"><h4>${escapeHTML(l.name)}</h4><p>${dateText(l.date)} · ${l.exercises.length}개 종목 · ${l.exercises.reduce((a,e)=>a+e.sets.length,0)}세트</p></article>`).join(''):'아직 기록이 없습니다.'}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function renderHistory(){const logs=await get('logs');$('#historyList').className='stack'+(logs.length?'':' empty');$('#historyList').innerHTML=logs.length?logs.map(l=>`<article class="item-card"><h4>${escapeHTML(l.name)} <button class="remove" data-delete="${l.id}">삭제</button></h4><p>${dateText(l.date)}</p>${l.exercises.map(e=>`<p><b>${escapeHTML(e.name)}</b> · ${e.sets.map(s=>`${s.weight}kg × ${s.reps}`).join(' / ')}</p>`).join('')}</article>`).join(''):'저장된 운동이 없습니다.';document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('이 운동 기록을 삭제할까요?')){await put('logs',(await get('logs')).filter(x=>x.id!==b.dataset.delete));renderHistory()}})}
$('#saveBody').onclick=async()=>{const entry={id:crypto.randomUUID(),date:$('#bodyDate').value||today(),weight:Number($('#weight').value)||null,muscle:Number($('#muscle').value)||null,fat:Number($('#fat').value)||null};if(!entry.weight&&!entry.muscle&&!entry.fat){toast('측정값을 하나 이상 입력하세요.');return}const arr=await get('body');arr.push(entry);arr.sort((a,b)=>b.date.localeCompare(a.date));await put('body',arr);$('#weight').value=$('#muscle').value=$('#fat').value='';toast('신체 기록을 저장했습니다.');renderBody()};
async function renderBody(){const arr=await get('body');$('#bodyList').className='stack'+(arr.length?'':' empty');$('#bodyList').innerHTML=arr.length?arr.map(x=>`<article class="item-card"><h4>${dateText(x.date)}</h4><p>체중 ${x.weight??'-'}kg · 골격근량 ${x.muscle??'-'}kg · 체지방량 ${x.fat??'-'}kg</p></article>`).join(''):'아직 측정 기록이 없습니다.'}
async function exportData(){const data={version:1,exportedAt:new Date().toISOString(),logs:await get('logs'),body:await get('body'),customExercises:await get('customExercises')};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`workout-log-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('백업 파일을 내보냈습니다.')}
async function importData(file){try{const data=JSON.parse(await file.text());if(!Array.isArray(data.logs)||!Array.isArray(data.body))throw Error();if(!confirm('가져온 데이터로 현재 기록을 교체할까요?'))return;await put('logs',data.logs);await put('body',data.body);if(Array.isArray(data.customExercises))await put('customExercises',data.customExercises);await refreshCustom();renderCategories();renderLibrary();toast('백업 데이터를 복원했습니다.');renderHome()}catch{toast('올바른 백업 파일이 아닙니다.')}}
$('#backupBtn').onclick=exportData;$('#exportBtn').onclick=exportData;$('#importFile').onchange=e=>e.target.files[0]&&importData(e.target.files[0]);$('#clearBtn').onclick=async()=>{if(confirm('모든 운동 및 신체 기록을 영구 삭제할까요?')){await put('logs',[]);await put('body',[]);toast('모든 기록을 삭제했습니다.');renderHome()}};
(async()=>{db=await openDB();await refreshCustom();renderCategories();renderLibrary();renderHome();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});})();
