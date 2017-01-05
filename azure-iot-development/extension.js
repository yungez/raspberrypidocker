// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var spawnSync = require('child_process').spawnSync;
var scp2 = require('scp2');
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
    } finally {
        if (outputChannel) outputChannel.dispose();
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

    context.subscriptions.push(build);
    context.subscriptions.push(deploy);
}
exports.activate = activate;

function deactivate() {
}
exports.deactivate = deactivate;