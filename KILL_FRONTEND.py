import subprocess
# Kill any process running on port 3000
subprocess.run('for /f "tokens=5" %a in (\'netstat -ano ^| find ":3000" ^| find "LISTENING"\') do taskkill /F /PID %a', shell=True)