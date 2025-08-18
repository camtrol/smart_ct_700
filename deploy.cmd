@echo off
:: ==========================================
:: 1. 로컬 폴더 이동
cd "E:\CamTrol_III\CamTrol\1. CT-700\CT-700_HTML"

:: ==========================================
:: 2. 자동 버전 처리 (쿼리스트링)
:: 날짜+시간 버전 생성 (공백 제거)
set hh=%time:~0,2%
if "%hh:~0,1%"==" " set hh=0%hh:~1,1%
set version=%date:~0,4%%date:~5,2%%date:~8,2%_%hh%%time:~3,2%%time:~6,2%

:: index.html 내 script.js / style.css 링크 수정
:: (PowerShell 이용, 실제 파일 경로와 이름 맞춰서 사용)
powershell -Command "(Get-Content index.html) -replace 'script\.js(\?v=[0-9_]+)?', 'script.js?v=%version%' | Set-Content index.html"
powershell -Command "(Get-Content index.html) -replace 'style\.css(\?v=[0-9_]+)?', 'style.css?v=%version%' | Set-Content index.html"

:: ==========================================
:: 3. Git 초기화 (이미 init 되어 있으면 생략 가능)
git init

:: 4. 원격 주소 설정 (HTTPS)
git remote remove origin
git remote add origin https://github.com/camtrol/smart_ct_700.git
git branch -M main

:: ==========================================
:: 5. Git 스테이징 & 커밋
git add .
git commit -m "Deploy updates with version %version%"

:: ==========================================
:: 6. GitHub에 Push
git push -u -f origin main

:: ==========================================
echo Deployment complete!
pause
