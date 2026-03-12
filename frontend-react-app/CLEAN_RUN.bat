@echo off
start cmd /k "rmdir /s /q dist 2>nul && npm run build && npx serve -s dist"
pause