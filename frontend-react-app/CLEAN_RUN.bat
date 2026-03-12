start cmd /k "rmdir /s /q dist && exit"
start cmd /k "npm run build && npx serve -s dist"