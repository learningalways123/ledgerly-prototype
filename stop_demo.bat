@echo off
echo ===================================================
echo Terminating Ledgerly Demo Environment
echo ===================================================
echo.

echo Terminating Backend Python Processes...
taskkill /FI "WINDOWTITLE eq Ledgerly Backend Server*" /T /F >nul 2>&1
taskkill /IM python.exe /F >nul 2>&1

echo Terminating Frontend Node Processes...
taskkill /FI "WINDOWTITLE eq Ledgerly Frontend DevServer*" /T /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1

echo.
echo ===================================================
echo Ledgerly demo servers successfully shut down.
echo ===================================================
echo.
pause
