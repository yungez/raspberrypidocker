#!/bin/bash
# set -o pipefail
#

set -e

deps=""
buildcmd=""
workingdir=""
dockerimagename=zhijzhao/raspbian

usage ()
{
    echo "build.sh [options]"
    echo "options"
    echo " --deplibs dependent libraries"
    echo " --cmd <string> build command"
    echo " --workingdir <folder> working directory on host which user code exists"    
    exit 1
}

process_args ()
{
    save_next_arg=0

    for arg in "$@"
    do
      if [ $save_next_arg == 1 ]
      then
        # save dependencies
        deps=$arg
        save_next_arg=0
      elif [ $save_next_arg == 2 ]
      then
        # save build command
        buildcmd=$arg
        save_next_arg=0
      elif [ $save_next_arg == 3 ]
      then
        #save working dir
        workingdir=$arg
        save_next_arg=0
      else
          case "$arg" in              
              "--deplibs" ) save_next_arg=1;;
              "--cmd" ) save_next_arg=2;;
              "--workingdir" ) save_next_arg=3;;
              * ) usage;;
          esac
      fi
    done    
}

process_args "$@"

# configure workingdir as docker sharing folder
dockervoption=""
if [  "$workingdir" != "" ]; then
    workingdir=$(echo $workingdir | sed 's/\\/\//g')
    dockervoption="-v $workingdir:/source/"
fi

#install dependencies libs to docker images
echo -----------------------------
echo Step 1 pull docker image $dockerimagename and run it
echo -----------------------------
winpty docker pull $dockerimagename
containerid="$(docker run -it -d $dockervoption $dockerimagename)"
echo containderid $containerid

if [ "$deps" != "" ]; then
    echo -----------------------------
    echo Step 2 install dependencies: $deps
    echo -----------------------------
    #winpty docker exec -it $containerid apt-get update
    installibs="winpty docker exec -it $containerid apt-get install $deps"    
    $installibs
fi

# run build command inside docker
if [ "$buildcmd" != "" ]; then
    echo -----------------------------
    echo Step 3 run command: $buildcmd
    echo -----------------------------
    shcmd="cd /source && $buildcmd"
    winpty docker exec -it $containerid /bin/sh -c "$shcmd"
    
fi

if [ $? -eq 0 ]; then
    echo application build succeeded!
else
    echo application build failed!
    exit $?
fi