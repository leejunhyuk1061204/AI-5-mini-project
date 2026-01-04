@echo off
chcp 65001 > nul
echo [시스템 종료] AI 서버와 백엔드 서버를 강제로 종료합니다...

echo.
echo 1. Python 프로세스 종료 (AI Server)
taskkill /F /IM python.exe /T 2>nul
if %ERRORLEVEL% EQU 0 (
    echo -> 성공적으로 종료되었습니다.
) else (
    echo -> 실행 중인 Python 프로세스가 없습니다.
)

echo.
echo 2. Java 프로세스 종료 (Backend Server)
taskkill /F /IM java.exe /T 2>nul
if %ERRORLEVEL% EQU 0 (
    echo -> 성공적으로 종료되었습니다.
) else (
    echo -> 실행 중인 Java 프로세스가 없습니다.
)

echo.
echo [완료] 모든 서버 프로세스가 정리되었습니다.
echo 이제 안전하게 다시 시작할 수 있습니다.
timeout /t 3 > nul
