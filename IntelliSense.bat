@echo off
setlocal

SET docker=docker
SET dockerimagename=zhijzhao/raspbian
set workingdir=%1
SET include=%2

echo -----------------------------
echo Step 1 Copying header files from container to host
echo -----------------------------

SET /p containerid=<%workingdir%/temp.txt
echo containerid %containerid%

SET cmds="cd /source && rm -rf device && mkdir device && sudo cp -rf ..%include:"=% ./device 2>/dev/null"
echo cmds is %cmds%
CALL %docker% exec -i %containerid% /bin/sh -c %cmds%

echo -----------------------------
echo Step 2 Config VSC IntelliSense setting
echo -----------------------------