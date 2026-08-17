@echo off
cd /d "%~dp0"

:: Check if port 3000 is already in use by a previous instance and close it
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr LISTENING') do (
  echo Port 3000 is already in use by PID %%a. Closing previous instance...
  taskkill /F /PID %%a >nul 2>&1
  timeout /t 1 /nobreak >nul
)

if not exist "dist\index.html" (
  echo Building FoodieHub for the first run...
  call npm run build
  if errorlevel 1 pause & exit /b 1
)
echo Starting FoodieHub on the local network...
call npm run start
pause

