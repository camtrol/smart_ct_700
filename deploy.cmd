@echo off
:: =====================================================
:: 1. 로컬 폴더 이동
cd "E:\CamTrol_III\CamTrol\1. CT-700\CT-700_HTML"

:: =====================================================
:: 2. 날짜+시간 버전 생성 (공백 제거)
set hh=%time:~0,2%
if "%hh:~0,1%"==" " set hh=0%hh:~1,1%
set version=%date:~0,4%%date:~5,2%%date:~8,2%_%hh%%time:~3,2%%time:~6,2%

:: =====================================================
:: 3. index.html 내 script.js / style.css 링크 수정 (UTF-8 안전)
powershell -Command "(Get-Content index.html -Raw -Encoding UTF8) -replace 'script\.js(\?v=[0-9_]+)?', 'script.js?v=%version%' | Set-Content index.html -Encoding UTF8"
powershell -Command "(Get-Content index.html -Raw -Encoding UTF8) -replace 'style\.css(\?v=[0-9_]+)?', 'style.css?v=%version%' | Set-Content index.html -Encoding UTF8"

:: =====================================================
:: 4. Git 초기화/원격 설정 (이미 되어있으면 안전하게 재설정)
git init
git remote remove origin
git remote add origin https://github.com/camtrol/smart_ct_700.git
git branch -M main

:: =====================================================
:: 5. Git 스테이징 & 커밋
git add .
git commit -m "Deploy updates with version %version%"

:: =====================================================
:: 6. GitHub 강제 push (원격 브랜치 덮어쓰기)
git push -u -f origin main

:: =====================================================
echo Deployment complete!
pause
