@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%apps\api-backend"
set "FRONTEND_DIR=%ROOT%apps\web-admin"

if not exist "%BACKEND_DIR%\mvnw.cmd" (
  echo [ERROR] Backend not found: %BACKEND_DIR%
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend not found: %FRONTEND_DIR%
  exit /b 1
)

echo Launching backend and frontend...
set "BACKEND_RUNNING="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8080 .*LISTENING"') do set "BACKEND_RUNNING=1"

set "FRONTEND_RUNNING="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":5173 .*LISTENING"') do set "FRONTEND_RUNNING=1"

if not defined BACKEND_RUNNING (
  start "api-backend" powershell -NoExit -Command "Set-Location -LiteralPath '%BACKEND_DIR%'; .\mvnw.cmd --%% -Djava.version=21 spring-boot:run"
) else (
  echo [INFO] Backend is already running on port 8080. Skipped.
)

if not defined FRONTEND_RUNNING (
  start "web-admin" powershell -NoExit -Command "Set-Location -LiteralPath '%FRONTEND_DIR%'; npm run dev"
) else (
  echo [INFO] Frontend is already running on port 5173. Skipped.
)

echo Done. Two terminal windows were opened.
endlocal
