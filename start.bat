@echo off
setlocal

set PROJECT_ROOT=D:\DEV\TIENDA
set PORT_BE=3001
set PORT_FE=3000

echo ========================================
echo Mocoa Market - Iniciando sistema
echo ========================================

REM Kill old node processes on our ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT_BE% ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT_FE% ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

REM Start Docker services if not running
docker inspect mocoa-postgres >nul 2>&1
if errorlevel 1 (
    echo [Docker] Iniciando servicios...
    cd /d "%PROJECT_ROOT%"
    docker compose up -d postgres redis minio
    timeout /t 5 /nobreak >nul
)

REM Wait for Postgres
echo [Postgres] Esperando...
:wait_pg
docker exec mocoa-postgres pg_isready -U mocoa >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_pg
)
echo [Postgres] OK

REM Start backend
echo.
echo [Backend] Iniciando en puerto %PORT_BE%...
cd /d "%PROJECT_ROOT%\backend"
set DATABASE_URL=postgresql://mocoa:change_me@localhost:5433/mocoastore?schema=public
set REDIS_HOST=localhost
set REDIS_PORT=6380
set MINIO_ENDPOINT=localhost
set MINIO_PORT=9000
set JWT_ACCESS_SECRET=dev-access-secret-at-least-256-bits-long-for-testing
set JWT_REFRESH_SECRET=dev-refresh-secret-at-least-256-bits-long-for-testing
set JWT_ACCESS_TTL=900
set JWT_REFRESH_TTL=604800
set BCRYPT_COST=4
set ALLOWED_ORIGINS=http://localhost:%PORT_FE%

start "Mocoa Backend" /min cmd /c "node dist\src\main.js"

:wait_be
timeout /t 2 /nobreak >nul
curl -sf http://localhost:%PORT_BE%/health >nul 2>&1
if errorlevel 1 goto wait_be
echo [Backend] OK

REM Start frontend
echo.
echo [Frontend] Iniciando en puerto %PORT_FE%...
cd /d "%PROJECT_ROOT%\frontend"
set NEXT_PUBLIC_API_URL=http://localhost:%PORT_BE%/api/v1

start "Mocoa Frontend" /min cmd /c "node ..\node_modules\next\dist\bin\next start -p %PORT_FE%"

:wait_fe
timeout /t 3 /nobreak >nul
curl -sf http://localhost:%PORT_FE% >nul 2>&1
if errorlevel 1 goto wait_fe
echo [Frontend] OK

echo.
echo ========================================
echo Sistema activo
echo ========================================
echo.
echo   Frontend: http://localhost:%PORT_FE%
echo   Backend:  http://localhost:%PORT_BE%
echo.
echo   Login:
echo     admin@demo.com     / Admin1234!  (tienda-demo-mocoa)
echo     admin@gastrobar.com / Admin1234!  (lopbuk-gastrobar-mocoa)
echo     super@mocoa.market  / Admin1234!  (super admin)
echo.
echo Las ventanas de consola se cerraron.
echo Para detener: cierra las ventanas "Mocoa Backend" y "Mocoa Frontend"
echo.
timeout /t 3 /nobreak >nul
exit /b 0
