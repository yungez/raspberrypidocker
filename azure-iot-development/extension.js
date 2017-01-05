// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var spawnSync = require('child_process').spawnSync;

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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "azure-iot-development" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var outputChannel = vscode.window.createOutputChannel("Azure IoT build");
    var disposable = vscode.commands.registerCommand('extension.build', function () {
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

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;