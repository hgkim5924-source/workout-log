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
function muscleMap(x){
 const p=(x.primary||'').toLowerCase(), q=(x.secondary||'').toLowerCase();
 const targets={chest:['대흉근','가슴'],back:['광배근','승모근','능형근','중부 등'],shoulder:['삼각근'],arms:['이두근','삼두근','전완근'],abs:['복직근','복횡근','복사근','코어'],glutes:['둔근'],quads:['대퇴사두근'],hams:['햄스트링'],calves:['비복근','가자미근','종아리']};
 const cls=k=>targets[k].some(t=>p.includes(t))?'primary':targets[k].some(t=>q.includes(t))?'secondary':'';
 const m=(k,d)=>'<path class="muscle '+cls(k)+'" d="'+d+'"/>';
 const base='<path class="base" d="M40 12 Q30 14 25 25 L12 43 L20 69 L29 48 L28 112 L25 147 L29 188 L39 188 L45 145 L51 145 L58 188 L68 188 L65 147 L62 112 L61 48 L70 69 L80 43 L65 25 Q59 14 50 12Z"/>';
 const front='<g transform="translate(5 0)">'+base+m('shoulder','M25 27 Q33 19 43 27 L40 42 L28 43Z')+m('shoulder','M50 27 Q60 19 67 27 L64 43 L53 42Z')+m('chest','M29 43 Q39 36 49 43 L48 58 L30 58Z')+m('chest','M51 43 Q61 36 64 43 L63 58 L51 58Z')+m('arms','M17 48 L27 45 L25 68 L18 67Z')+m('abs','M39 60 L54 60 L56 103 L49 109 L38 103Z')+m('quads','M29 112 L48 112 L44 151 L34 177 L27 170Z')+m('quads','M51 112 L62 112 L64 170 L57 177 L49 151Z')+m('calves','M29 176 L39 176 L36 211 L28 211Z')+'</g>';
 const back='<g transform="translate(112 0)">'+base+m('shoulder','M25 27 Q33 19 43 27 L40 42 L28 43Z')+m('shoulder','M50 27 Q60 19 67 27 L64 43 L53 42Z')+m('back','M31 47 L43 55 L46 91 L34 101 L28 76Z')+m('back','M55 55 L67 47 L70 76 L64 101 L52 91Z')+m('arms','M17 48 L27 45 L25 68 L18 67Z')+m('glutes','M29 108 L48 108 L49 133 L36 139 L28 126Z')+m('glutes','M51 108 L62 108 L64 126 L56 139 L49 133Z')+m('hams','M29 137 L46 137 L43 174 L34 181 L27 170Z')+m('hams','M51 137 L64 137 L66 170 L58 181 L49 174Z')+m('calves','M29 176 L39 176 L36 211 L28 211Z')+'</g>';
 return '<svg class="muscle-map" viewBox="0 0 205 220" role="img" aria-label="'+escapeHTML(x.name)+' 타겟 근육 도식">'+front+back+'<text x="53" y="219">전면</text><text x="158" y="219">후면</text></svg>';
}
function exerciseArt(x){return muscleMap(x)}
function exerciseGallery(x){return muscleMap(x)}
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
