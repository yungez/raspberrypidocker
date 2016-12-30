@echo off
setlocal

SET docker="%ProgramFiles%\Docker\Docker\resources\bin\docker.exe"
SET dockerimagename=zhijzhao/raspbian

:arg-loop
if "%1" equ "" goto arg-done
if "%1" equ "-deps" goto arg-deps
if "%1" equ "-workingdir" goto arg-workingdir
if "%1" equ "-buildcmd" goto arg-buildcmd


:arg-deps
SHIFT
SET deps=%1
GOTO :arg-continue

:arg-workingdir
SHIFT
SET workingdir=%1
GOTO :arg-continue

:arg-buildcmd
SHIFT
SET buildcmd=%1
GOTO :arg-continue

:arg-continue
SHIFT
goto :arg-loop

:arg-done

echo -----------------------------
echo Step 1 pull docker image $dockerimagename and run it
echo -----------------------------
SET workingdir=%workingdir:\=/%
SET dockeroption=-v %workingdir%:/source/
CALL %docker% pull %dockerimagename%
echo %docker% run -it -d %dockeroption% %dockerimagename%
CALL %docker% run -it -d %dockeroption% %dockerimagename% > temp.txt
SET /p containerid=<temp.txt
echo containerid %containerid%

IF NOT "%deps%"=="" (
echo -----------------------------
echo Step 2 install dependencies: $deps
echo -----------------------------
    rem CALL %docker% exec -it %containerid% apt-get install %deps%
)


echo -----------------------------
echo Step 3 run command: %buildcmd%
echo -----------------------------
SET buildcmd=%buildcmd:"=%
SET cmds="cd /source &&  %buildcmd%"
CALL %docker% exec -it %containerid% /bin/sh -c %cmds%

IF %ERRORLEVEL% EQU 0 (
    ECHO application build succeeded!
) ELSE (
    ECHO application build failed %ERRORLEVEL%
)