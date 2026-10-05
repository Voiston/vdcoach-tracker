@echo off
title VDCoach Tracker - Git Backup

echo.
echo ========================================
echo       VDCOACH TRACKER - BACKUP
echo ========================================
echo.

REM Verifier qu'il y a bien un depot Git
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERREUR : ce dossier n'est pas un depot Git.
    echo.
    pause
    exit /b 1
)

REM Verifier s'il y a des modifications
git diff --quiet
set DIFF=%errorlevel%

git diff --cached --quiet
set CACHED=%errorlevel%

if "%DIFF%"=="0" if "%CACHED%"=="0" (
    echo Aucune modification a sauvegarder.
    echo.
    git status --short
    echo.
    pause
    exit /b 0
)

echo Modifications detectees :
echo.
git status --short
echo.

REM Demander le message du commit
set /p message="Message du commit : "

if "%message%"=="" (
    echo.
    echo ERREUR : le message ne peut pas etre vide.
    pause
    exit /b 1
)

echo.
echo [1/3] Ajout des fichiers...
git add .

if errorlevel 1 (
    echo ERREUR pendant git add.
    pause
    exit /b 1
)

echo.
echo [2/3] Creation du commit...
git commit -m "%message%"

if errorlevel 1 (
    echo.
    echo ERREUR pendant le commit.
    pause
    exit /b 1
)

echo.
echo [3/3] Envoi vers GitHub...
git push

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERREUR : le push vers GitHub a echoue.
    echo ========================================
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo       BACKUP TERMINE AVEC SUCCES
echo ========================================
echo.
git status --short
echo.
pause