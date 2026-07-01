@echo off
setlocal EnableDelayedExpansion

rem ============================================================================
rem  scripts\install-from-release.bat
rem
rem  One-line installer for Windows.  Downloads the latest Open SEO Checker
rem  release .zip, extracts to a tempdir, runs install.bat, cleans up.
rem
rem  Override BEFORE piping into cmd:
rem    OSE_OWNER    GitHub owner / org (default: cuongquachc88)
rem    OSE_REPO     GitHub repo  name       (default: open-seo-checker)
rem    OSE_VERSION  release tag             (default: latest)
rem    OSE_ASSET    asset filename override (default: open-seo-checker.zip)
rem
rem  Examples:
rem    # The default one-liner:
rem    curl -fsSL https://raw.githubusercontent.com/cuongquachc88/open-seo-checker/main/scripts/install-from-release.bat | cmd
rem
rem    # Pin to a tag:
rem    set OSE_VERSION=v0.1.0 ^&^& curl -fsSL ... | cmd
rem
rem    # Install from a fork:
rem    set OSE_OWNER=my-fork ^&^& set OSE_REPO=my-fork ^&^& curl -fsSL ... | cmd
rem ============================================================================

rem ----- Defaults ------------------------------------------------------------
if "%OSE_OWNER%"==""   set "OSE_OWNER=cuongquachc88"
if "%OSE_REPO%"==""    set "OSE_REPO=open-seo-checker"
if "%OSE_VERSION%"=="" set "OSE_VERSION=latest"
if "%OSE_ASSET%"==""   set "OSE_ASSET=open-seo-checker.zip"

rem ----- Compose the GitHub URL ---------------------------------------------
if /I "%OSE_VERSION%"=="latest" (
  set "DOWNLOAD_URL=https://github.com/%OSE_OWNER%/%OSE_REPO%/releases/latest/download/%OSE_ASSET%"
) else (
  set "DOWNLOAD_URL=https://github.com/%OSE_OWNER%/%OSE_REPO%/releases/download/%OSE_VERSION%/%OSE_ASSET%"
)

rem ----- Banner -------------------------------------------------------------
echo.
echo   Open SEO Checker  -  one-line installer
echo     owner   = %OSE_OWNER%
echo     repo    = %OSE_REPO%
echo     version = %OSE_VERSION%
echo     asset   = %OSE_ASSET%
echo.
if "%OSE_OWNER%"=="cuongquachc88" echo     (defaults used; set OSE_OWNER to install from a fork)
echo.

rem ----- Temp workdir + cleanup via a deferred rmdir ------------------------
set "TMPDIR=%TEMP%\oseo-install-%RANDOM%"
if exist "%TMPDIR%" rd /s /q "%TMPDIR%"
mkdir "%TMPDIR%"
set "BUNDLE=%TMPDIR%\oseo-bundle"
set "ROOT=%TMPDIR%\open-seo-checker"

echo   --- Downloading %DOWNLOAD_URL%
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try {" ^
  "  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "  Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%BUNDLE%' -UseBasicParsing -ErrorAction Stop" ^
  "} catch {" ^
  "  Write-Host ('  download failed: ' + $_.Exception.Message);" ^
  "  exit 1" ^
  "}"
if errorlevel 1 goto :end_fail

rem ----- Extract ------------------------------------------------------------
echo   --- Extracting to %TMPDIR%
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Expand-Archive -LiteralPath '%BUNDLE%' -DestinationPath '%TMPDIR%' -Force"
if errorlevel 1 goto :end_fail

rem ----- Sanity check + run installer --------------------------------------
if not exist "%ROOT%\install.bat" (
  echo   x unexpected archive layout
  echo     expected %ROOT%\install.bat
  dir /b "%TMPDIR%"
  goto :end_fail
)

echo   --- Running %ROOT%\install.bat
call "%ROOT%\install.bat"
if errorlevel 1 goto :end_fail

rem ----- Cleanup ------------------------------------------------------------
echo   --- Cleaning up
rd /s /q "%TMPDIR%" >nul 2>&1
endlocal
exit /b 0

:end_fail
echo.
echo   Installation failed. See the error message above.
if exist "%TMPDIR%" rd /s /q "%TMPDIR%" >nul 2>&1
endlocal
exit /b 1
