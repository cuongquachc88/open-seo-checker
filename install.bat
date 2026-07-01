@echo off
setlocal EnableDelayedExpansion

rem ============================================================================
rem  Open SEO Checker · one-command installer (Windows)
rem ----------------------------------------------------------------------------
rem    1. Ensure Node.js (>= 18) and pnpm are available (installs what is
rem       missing).
rem    2. Install workspace dependencies (this also installs Playwright
rem       Chromium for JS rendering).
rem    3. Build the API and the dashboard SPA so they run without a dev step.
rem    4. Drop a real desktop shortcut ("Open SEO Checker.lnk") on the user's
rem       Desktop that, when double-clicked, starts the server and opens the
rem       dashboard in the default browser.
rem
rem  Re-run this batch file any time you want to refresh the shortcut or
rem  rebuild the project. It is safe to run repeatedly.
rem ============================================================================

cd /d "%~dp0"

echo.
echo ======================================================================
echo                  Open SEO Checker  -  Windows installer
echo ======================================================================
echo.
echo Detected platform: %OS%  (architecture: %PROCESSOR_ARCHITECTURE%)
echo.

rem ---- Step 1: prerequisites -------------------------------------------------
echo Step 1/4  Checking prerequisites

where node >nul 2>&1
if errorlevel 1 (
  echo   [missing] Node.js was not found on PATH.
  echo             Install one of these and re-run install.bat:
  echo               winget install OpenJS.NodeJS.LTS
  echo               choco install nodejs-lts
  echo               https://nodejs.org/  ^(then choose "Add to PATH"^)
  goto :end_fail
)

rem Major version guard (Node >= 18)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
set "NODE_MAJOR="
for /f "tokens=2 delims=v." %%m in ("%NODE_VER%") do set NODE_MAJOR=%%m
if "%NODE_MAJOR%"=="" (
  echo   [missing] Could not parse Node.js version: %NODE_VER%
  goto :end_fail
)
if %NODE_MAJOR% LSS 18 (
  echo   [too old] Node.js %NODE_VER% detected; Open SEO Checker needs v18+.
  echo             Install Node.js 20 LTS via the hints above.
  goto :end_fail
)
echo   [ok] node %NODE_VER%

where pnpm >nul 2>&1
if errorlevel 1 (
  echo   [install] pnpm missing - installing via npm...
  where npm >nul 2>&1
  if errorlevel 1 (
    echo   [missing] npm not found either. Install Node.js 20 LTS.
    goto :end_fail
  )
  call npm i -g pnpm
  if errorlevel 1 goto :end_fail
)
for /f "tokens=*" %%v in ('pnpm --version') do set PNPM_VER=%%v
echo   [ok] pnpm %PNPM_VER%
echo.

rem Detect release bundle: prebuilt artefacts + workspace files, no source code.
set "IS_BUNDLE=0"
if exist package.json if exist pnpm-workspace.yaml if exist public\index.html if exist packages\api\dist\index.js if not exist packages\api\src set "IS_BUNDLE=1"

rem ---- Step 2: install ------------------------------------------------------
if "%IS_BUNDLE%"=="1" (
  echo Step 2/4  Installing production dependencies
  echo            Release bundle detected — installing production dependencies.
  echo.
  call pnpm install --prod
) else (
  echo Step 2/4  Installing workspace dependencies
  echo            (this also installs Playwright Chromium for JS rendering)
  echo.
  call pnpm install
)
if errorlevel 1 goto :end_fail
echo.

rem ---- Step 3: build --------------------------------------------------------
echo Step 3/4  Building API + dashboard
if "%IS_BUNDLE%"=="1" (
  echo            Release bundle detected — skipping build.
) else (
  call pnpm build
)
if errorlevel 1 goto :end_fail
echo.

rem ---- Step 4: shortcut -----------------------------------------------------
echo Step 4/4  Creating desktop shortcut
call :create_shortcut
if errorlevel 1 (
  echo   [warn] Could not create a real .lnk shortcut; dropping a portable
  echo         Open SEO Checker.bat on your Desktop that you can rename or pin.
  call :create_bat_fallback
)
echo.

rem ---- Done -----------------------------------------------------------------
echo ======================================================================
echo  Ready.
echo ======================================================================
echo  Run "Open SEO Checker" from your Desktop to start the server and
echo  open the dashboard in your browser.
echo.
echo  Quick commands (from this folder):
echo    pnpm server          run API + SPA on http://localhost:7437
echo    pnpm start:sh        dev mode with live reload
echo    pnpm crawl ^<url^>     one-off crawl without the dashboard
echo.
echo  Re-run install.bat any time to refresh the shortcut or rebuild.
echo.
endlocal
exit /b 0

rem ----------------------------------------------------------------------------
rem  Helpers
rem ----------------------------------------------------------------------------

:create_shortcut
rem Drop a real .lnk shortcut on the user's Desktop via PowerShell COM.
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_DIR%\Open SEO Checker.lnk"
set "TARGET_PATH=%~dp0open-seo-checker.bat"
rem PowerShell dislikes backslashes in unquoted arguments; escape them.
set "ESCAPED_DIR=%~dp0"
set "ESCAPED_DIR=%ESCAPED_DIR:\=\\%"
set "ESCAPED_TARGET=%TARGET_PATH:\=\\%"
set "ESCAPED_SHORTCUT=%SHORTCUT_PATH:\=\\%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $ws.CreateShortcut('%ESCAPED_SHORTCUT%');" ^
  "$lnk.TargetPath = '%ESCAPED_TARGET%';" ^
  "$lnk.WorkingDirectory = '%ESCAPED_DIR%';" ^
  "$lnk.WindowStyle = 7;" ^
  "$lnk.IconLocation = 'shell32.dll,13';" ^
  "$lnk.Description = 'Start the Open SEO Checker server and open the dashboard.';" ^
  "$lnk.Save()"
if errorlevel 1 exit /b 1
echo   [ok] Shortcut: %SHORTCUT_PATH%
echo            (double-click it from your Desktop to start the server)
exit /b 0

:create_bat_fallback
rem Drop a portable .bat on the user's Desktop as a safety net if COM fails
rem (machine without WScript.Shell available, etc.).
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "FALLBACK_PATH=%DESKTOP_DIR%\Open SEO Checker.bat"
> "%FALLBACK_PATH%" echo @echo off
>>"%FALLBACK_PATH%" echo cd /d "%~dp0"
>>"%FALLBACK_PATH%" echo call "%~dp0open-seo-checker.bat"
echo   [ok] Portable launcher: %FALLBACK_PATH%
exit /b 0

:end_fail
echo.
echo ======================================================================
echo  Installation failed.
echo  See the messages above. Fix the prerequisites and re-run install.bat.
echo ======================================================================
echo.
endlocal
exit /b 1
