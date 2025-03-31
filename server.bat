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

:: Check if all required files exist
if not exist "express-server.js" (
    echo Error: express-server.js not found!
    pause
    exit /b 1
)

:: Check if node_modules exists, if not run npm install
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
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
    
    :: Create example subdirectories
    mkdir samples\Kicks
    mkdir samples\Snares
    mkdir samples\FX
    echo Created sample folders structure
)

:: Start the server
echo Starting server...
start /B node express-server.js

:: Wait a moment for the server to start
timeout /t 2 /nobreak >nul

:: Open the browser
echo Opening application...
start http://localhost:3000

echo.
echo HarmoniCode is running!
echo Press Ctrl+C to stop the server
echo.

:: Keep the window open
cmd /k