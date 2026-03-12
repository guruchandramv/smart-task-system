@echo off
rmdir /s /q dist 2>nul
start cmd /k "npm run build && npx serve -s dist"
pause