@echo off
setlocal

title Lab Ordering - Word to PDF Worker
cd /d "%~dp0server"

if not exist "package.json" (
  echo [pdf-worker] Cannot find server\package.json.
  echo [pdf-worker] Expected project directory: %~dp0
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [pdf-worker] npm was not found. Make sure Node.js is installed and available in PATH.
  pause
  exit /b 1
)

echo [pdf-worker] Starting from %CD%
call npm run start:pdf-worker

set "PDF_WORKER_EXIT_CODE=%ERRORLEVEL%"
echo.
echo [pdf-worker] Worker stopped with exit code %PDF_WORKER_EXIT_CODE%.
pause
exit /b %PDF_WORKER_EXIT_CODE%
