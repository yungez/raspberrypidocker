// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var execSync = require('child_process').execSync;
var fs = require('fs');

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

function cloneDockerRepo(context) {
    var repoName = 'iotdev-docker';
    var repoPath = context.extensionPath + '/' + repoName;
    if (fs.existsSync(repoPath)) {
        console.log('repo already exists');
    } else {
        console.log('repo not exists and clone the repo');
        console.log('extentsion path: ' + context.extensionPath);
        try {
            var log = execSync('git clone https://github.com/yungez/iotdev-docker.git ' + repoPath);
            console.log(log);
        } catch (e) {
            console.log(e);
        }
    }
}

function activate(context) {
    console.log('Congratulations, your extension "azure-iot-development" is now active!');

    var outputChannel = vscode.window.createOutputChannel("Azure IoT build");
    let build = vscode.commands.registerCommand('extension.build', function () {
        cloneDockerRepo(context);

        var configPath = vscode.workspace.rootPath + '/config.json'
        if (fs.existsSync(configPath)) {
            var config = require(configPath);

            var repoName = 'iotdev-docker';
            var repoPath = context.extensionPath + '/' + repoName;
            var mainPath = repoPath + '/main.bat';
            var workingdir = config.workingdir ? config.workingdir : vscode.workspace.rootPath;
            localExecCmd(mainPath, ['build', '--device', config.device, '--workingdir', workingdir], outputChannel);
        } else {
            console.log('config file does not exist');
        }
    });

    let deploy = vscode.commands.registerCommand('extension.deploy', function () {
        cloneDockerRepo(context);

        var configPath = vscode.workspace.rootPath + '/config.json'
        if (fs.existsSync(configPath)) {
            var config = require(configPath);

            var repoName = 'iotdev-docker';
            var repoPath = context.extensionPath + '/' + repoName;
            var mainPath = repoPath + '/main.bat';
            var workingdir = config.workingdir ? config.workingdir : vscode.workspace.rootPath;
            var srcpath = config.srcpath ? config.srcpath : vscode.workspace.rootPath;
            var destdir = config.destdir ? config.destdir : '/home/' + config.username;
            localExecCmd(mainPath, ['deploy', '--device', config.device, '--workingdir', workingdir,
                '--deviceip', config.deviceip, '--username', config.username, '--password', config.password,
                '--srcpath', srcpath, '--destdir', destdir], outputChannel);
        } else {
            console.log('config file does not exist');
        }
    });

    context.subscriptions.push(build);
    context.subscriptions.push(deploy);
}
exports.activate = activate;

function deactivate() {
}
exports.deactivate = deactivate;