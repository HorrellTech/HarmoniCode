@echo off
echo Starting HarmoniCode...
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if express-server.js exists
if not exist "express-server.js" (
    echo Error: express-server.js not found!
    pause
    exit /b 1
)

:: Check if index.html exists
if not exist "index.html" (
    echo Error: index.html not found!
    pause
    exit /b 1
)

:: Check if node_modules exists, if not run npm install
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install express
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing dependencies!
        pause
        exit /b 1
    )
)

:: Create samples directory if it doesn't exist
if not exist "samples" (
    echo Creating samples directory...
    mkdir samples
    mkdir samples\Kicks
    mkdir samples\Snares
    mkdir samples\FX
    echo Created sample folders structure
)

:: Kill any existing node processes on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Start the server
echo Starting server...
start /B cmd /c "node express-server.js"

:: Wait a moment for the server to start
timeout /t 2 /nobreak >nul

:: Open the browser
echo Opening application...
start http://localhost:3000

echo.
echo HarmoniCode is running!
echo Press Ctrl+C in the server window to stop
echo.

:: Keep the window open
cmd /k