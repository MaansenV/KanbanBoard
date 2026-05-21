@echo off
setlocal

cd /d "%~dp0"

echo Starting KanbanBoard...

if not exist "node_modules" (
  echo Installing dependencies first...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Checking local ports...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports=@(4173,4174,4175);" ^
  "$listeners=Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue;" ^
  "foreach ($listener in $listeners) {" ^
  "  $process=Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue;" ^
  "  if ($process -and $process.ProcessName -eq 'node') {" ^
  "    Write-Host ('Stopping stale Kanban node process on port {0} (PID {1})' -f $listener.LocalPort,$listener.OwningProcess);" ^
  "    Stop-Process -Id $listener.OwningProcess -Force" ^
  "  }" ^
  "}"

start "KanbanBoard Server" /D "%~dp0" cmd /k "npm run dev:offline"

echo Waiting for the offline API and board UI...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$api='http://127.0.0.1:4174/api/health';" ^
  "$url='http://127.0.0.1:4173/';" ^
  "for ($i=0; $i -lt 40; $i++) {" ^
  "  try {" ^
  "    Invoke-WebRequest -Uri $api -UseBasicParsing -TimeoutSec 1 | Out-Null;" ^
  "    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1 | Out-Null;" ^
  "    Start-Process $url; exit 0" ^
  "  } catch { Start-Sleep -Milliseconds 500 }" ^
  "};" ^
  "Start-Process $url"

echo.
echo KanbanBoard should now be open at http://127.0.0.1:4173/
echo Kanban MCP should be available at http://127.0.0.1:4175/mcp
echo Keep the server window open while using the board.
pause
