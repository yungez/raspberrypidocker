#!/bin/bash
echo start to build inside docker container
if [ ! -d "/source" ]; then
    echo no source dir /source
    exit 1
fi

if [ $# -gt 0 ]; then
    set cmakefile=$1
elif [ ! -f "/source/CMakeLists.txt" ]; then
    echo no /source/CMakeLists.txt
    exit 1
else
    set cmakefile=.
fi

cd /source && cmake -DCMAKE_TOOLCHAIN_FILE=/toolchain-file-rpi.cmake -DcompileOption_C:STRING="--sysroot=$RPI_ROOT"  -Dazure_IoT_Sdk_c=/azure-iot-sdk-c . && make  > ./build.log 2>&1