WORKOUT LOG - 아이폰 설치 안내
================================

이 프로젝트는 광고/계정/서버 저장 없이 아이폰 브라우저의 IndexedDB에 기록을 저장하는 PWA 시작 버전입니다.

중요:
- 아이폰에 설치하려면 HTTPS 주소로 웹에 올려야 합니다.
- 윈도우 PC만으로 배포할 수 있습니다. Mac과 앱스토어 등록은 필요하지 않습니다.
- 아이폰 Safari에서 접속한 뒤 공유 버튼 > 홈 화면에 추가를 선택하세요.
- 데이터는 해당 아이폰의 Safari 웹사이트 데이터에 저장됩니다. Safari 데이터 삭제 시 기록이 사라질 수 있으므로 앱의 설정에서 정기적으로 JSON 백업을 내보내세요.
- 현재 버전은 개인용 프로토타입입니다. 기기 간 동기화, 운동 루틴 저장/불러오기, 세부 통계, PR 자동 계산은 후속 구현 항목입니다.

가장 간단한 배포 방법: GitHub Pages
1. github.com 에서 로그인 후 새 Public repository를 만듭니다. 예: workout-log
2. ZIP 압축을 풀고 파일 전체(index.html, app.js 등)를 저장소 최상위에 업로드합니다.
3. 저장소 Settings > Pages > Build and deployment에서 Deploy from a branch를 선택합니다.
4. Branch: main / Folder: /(root)를 선택하고 Save 합니다.
5. 배포가 끝나면 https://계정명.github.io/workout-log/ 주소가 생성됩니다.
6. 아이폰 Safari에서 그 주소를 열고 공유 > 홈 화면에 추가를 누릅니다.

주의: 폰에서 주소를 처음 한 번 열어 설치한 뒤, 오프라인에서도 실행되는지 확인하세요.
