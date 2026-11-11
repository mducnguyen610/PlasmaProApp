@echo off
rem Mo Metro cho Expo Go. Nhap dup tep nay; khong can go duong dan.
rem Neu mang chan ket noi giua cac may: chay "chay-tren-iphone.bat tunnel"
cd /d "%~dp0"
rem Luon chay npm install de cap nhat thu vien khi package.json thay doi (vd. nang SDK).
call npm install
if /i "%1"=="tunnel" (
  call npx expo start --tunnel
) else (
  call npx expo start
)
pause
