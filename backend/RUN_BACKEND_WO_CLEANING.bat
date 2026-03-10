@echo off
REM Open the application in the default browser
start http://localhost:8081/
REM Start Spring Boot in a new command window
start cmd /k "mvn spring-boot:run -e"