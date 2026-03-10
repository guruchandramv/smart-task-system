@echo off

REM Check if something is listening on port 8081
netstat -ano | find ":8081" | find "LISTENING" >nul
if %errorlevel%==0 (
    echo Port 8081 is already in use. Not opening browser.
) else (
    echo Port 8081 is not running. Starting application and opening browser...
    start cmd /k "mvn clean install & mvn spring-boot:run -e"
    
    REM Wait a few seconds for app to start
    timeout /t 10 >nul
    
    start http://localhost:8081/
)