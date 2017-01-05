// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var spawnSync = require('child_process').spawnSync;
var scp2 = require('scp2');
var simssh = require('simple-ssh');
var fs = require('fs');
var path = require('path');

function localExecCmd(cmd, args, outputChannel, cb) {
    try {
        var cp = require('child_process').spawn(cmd, args);

        cp.stdout.on('data', function (data) {
            if (outputChannel) {
                outputChannel.append(String(data));
                outputChannel.show();
            }
        });

        cp.stderr.on('data', function (data) {
            if (outputChannel) outputChannel.append(String(data));
        });

        cp.on('close', function (code) {
            if (cb) {
                if (0 == code) {
                    cb();
                } else {
                    var e = new Error("External command failed");
                    e.stack = "exit code: " + code;
                    cb(e);
                }
            }
        });
    } catch (e) {
        e.stack = "ERROR: " + e;
        if (cb) cb(e);
    }
}

function uploadFilesViaScp(sourceFileList, targetFileList, config, outputChannel, cb) {
    if (sourceFileList.length == 0) {
        if (cb) cb();
        outputChannel.appendLine('-----------------------------');
        outputChannel.appendLine('Deployment finished');
        outputChannel.appendLine('-----------------------------');
        outputChannel.show();
        return;
    }

    var scpOptions = {
        host: config.deploy_device_ip,
        username: config.deploy_user_name,
        password: config.deploy_device_password,
        path: targetFileList[0]
    };

    scp2.scp(sourceFileList[0], scpOptions, function (err) {
        if (err) {
            if (cb) {
                err.stack = "SCP file transfer failed (" + err + ")";
                cb(err);

                // clear callback, SCP2 seems to be calling error callback twice, and that looks ugly
                cb = null;
            }
        } else {
            outputChannel.appendLine(' SCP: ' + sourceFileList[0]);

            sourceFileList.splice(0, 1);
            targetFileList.splice(0, 1);
            uploadFilesViaScp(sourceFileList, targetFileList, cb, outputChannel);
        }
    });
}

function sshExecCmd(cmd, config, outputChannel, cb) {
    outputChannel.show();
    outputChannel.appendLine('-----------------------------');
    outputChannel.appendLine('Run app on device');
    outputChannel.appendLine('-----------------------------');

    var sshOptions = {
        host: config.deploy_device_ip,
        user: config.deploy_user_name,
        timeout: 30000
    };

    if (config.deploy_target_folder) {
        sshOptions.baseDir = config.deploy_target_folder;
    }

    if (config.deploy_device_password) {
        sshOptions.pass = config.deploy_device_password;
    } else {
        var err = new Error('No password defined\nFailed command: ' + cmd);
        err.stack = err.message;
        cb(err);
        return;
    }

    var ssh = new simssh(sshOptions);

    ssh.on('error', function (e) {
        // when we pass error via deferred.reject, stack will be displayed
        // as it is just string, we can just replace it with message
        e.stack = 'ERROR: ' + e.message + '\nFailed command: ' + cmd;
        outputChannel.appendLine('ERROR OCCURED');
        cb(e);
    });

    outputChannel.appendLine('SSH: ' + cmd)

    ssh.exec(cmd, {
        pty: true,
        out: function (o) {
            outputChannel.append(o);
        }
    }).start();
}

function activate(context) {
    console.log('Congratulations, your extension "azure-iot-development" is now active!');

    var outputChannel = vscode.window.createOutputChannel("Azure IoT build");
    let build = vscode.commands.registerCommand('extension.build', function () {
        // Check docker existence.
        var dockerVersion = spawnSync('docker', ['-v']);
        if (String(dockerVersion.stdout).indexOf('Docker version') == -1) {
            console.log("Docker hasn't been installed yet");
            vscode.window.showErrorMessage("To run this command, please install Docker first!");
            return;
        } else {
            console.log('Docker exists');
        }

        var config = require(vscode.workspace.rootPath + '/config.json');
        localExecCmd("D:\\raspberrypidocker\\build.bat", ['-deps', config.build_dependencies, '-buildcmd', config.build_commands, '-workingdir', vscode.workspace.rootPath], outputChannel);
    });

    let intellisense = vscode.commands.registerCommand('extension.intellisense', function () {
        // Check docker existence.
        var dockerVersion = spawnSync('docker', ['-v']);
        if (String(dockerVersion.stdout).indexOf('Docker version') == -1) {
            console.log("Docker hasn't been installed yet");
            vscode.window.showErrorMessage("To run this command, please install Docker first!");
            return;
        } else {
            console.log('Docker exists');
        }

        var setupVSCConfig = function () {
            outputChannel.appendLine('-----------------------------');
            outputChannel.appendLine('Step 2 Config VSC IntelliSense setting');
            outputChannel.appendLine('-----------------------------');

            var configJson = {};
            var platform = {};
            platform.name = "Win32";
            platform.includePath = [vscode.workspace.rootPath + "/device/include"];
            configJson.configurations = [platform];
            fs.writeFileSync(vscode.workspace.rootPath + '/.vscode/c_cpp_properties.json', JSON.stringify(configJson, null, 2));

            outputChannel.appendLine('-----------------------------');
            outputChannel.appendLine('IntelliSense setting is done');
            outputChannel.appendLine('-----------------------------');
        };
        var config = require(vscode.workspace.rootPath + '/config.json');
        localExecCmd("D:\\raspberrypidocker\\IntelliSense.bat", [vscode.workspace.rootPath, config.intellisense_include_folder], outputChannel, setupVSCConfig);
    });

    let deploy = vscode.commands.registerCommand('extension.deploy', function () {
        // Check docker existence.
        var dockerVersion = spawnSync('docker', ['-v']);
        if (String(dockerVersion.stdout).indexOf('Docker version') == -1) {
            console.log("Docker hasn't been installed yet");
            vscode.window.showErrorMessage("To run this command, please install Docker first!");
            return;
        } else {
            console.log('Docker exists');
        }

        var filesLocal = [];
        var filesRemote = [];
        var config = require(vscode.workspace.rootPath + '/config.json');
        var targetFolder = !config.deploy_target_folder ? '.' : config.deploy_target_folder;
        if (config.deploy_src_file) {
            filesLocal.push(config.deploy_src_file);
            filesRemote.push(path.join(targetFolder, path.basename(config.deploy_src_file)));
        }

        if (config.deploy_src_folder) {
            var files = fs.readdirSync(config.deploy_src_folder);
            for (var i = 0; i < files.length; i++) {
                filesLocal.push(path.join(config.deploy_src_folder, files[i]));
                filesRemote.push(path.join(targetFolder, files[i]));
            }
        }

        outputChannel.appendLine('-----------------------------');
        outputChannel.appendLine('Starting deploy binaries to device via SCP');
        outputChannel.appendLine('-----------------------------');
        uploadFilesViaScp(filesLocal, filesRemote, config, outputChannel);
    });

    let run = vscode.commands.registerCommand('extension.run', function () {
        // Check docker existence.
        var dockerVersion = spawnSync('docker', ['-v']);
        if (String(dockerVersion.stdout).indexOf('Docker version') == -1) {
            console.log("Docker hasn't been installed yet");
            vscode.window.showErrorMessage("To run this command, please install Docker first!");
            return;
        } else {
            console.log('Docker exists');
        }

        var config = require(vscode.workspace.rootPath + '/config.json');
        var targetFolder = !config.deploy_target_folder ? '.' : config.deploy_target_folder;
        var startFile = path.join(targetFolder, path.basename(config.deploy_src_file))
        sshExecCmd('sudo chmod +x ' + startFile + ' ; sudo ./' + startFile, config, outputChannel);
    });

    context.subscriptions.push(build);
    context.subscriptions.push(intellisense);
    context.subscriptions.push(deploy);
    context.subscriptions.push(run);
}
exports.activate = activate;

function deactivate() {
}
exports.deactivate = deactivate;