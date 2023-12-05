const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const {autoUpdater} = require("electron-updater");
const {log} = require('electron-log');
const fs = require('fs');
const axios = require('axios');
const { exec, spawnSync } = require('child_process');


// autoUpdater.setFeedURL({
//   provider: 'github',
//   host:'github.com', 
//   owner: 'debmohit',
//   repo: 'debmohit/auto-update-elec-test',
//   private: false,
//   token: "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", // provide your github access token, with repo:access
// });

const pkg = require("../package.json")
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

Object.defineProperty(app, 'isPackaged', {
  get() {
    return true;
  }
});
let mainWindow;
let newVersion = false;
let downloadUrl;
// autoUpdater.on('checking-for-update', () => {
//   log('Checking for update...');
// })
// autoUpdater.on('update-available', (info) => {
//   log('Update available.');
// })
// autoUpdater.on('update-not-available', (info) => {
//   log('Update not available.');
// })
// autoUpdater.on('error', (err) => {
//   log('Error in auto-updater. ' + err);
// })
// autoUpdater.on('download-progress', (progressObj) => {
//   let log_message = "Download speed: " + progressObj.bytesPerSecond;
//   log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
//   log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
//   log(log_message);
// })
// autoUpdater.on('update-downloaded', (info) => {
//   log('Update downloaded');
// });

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});



const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

ipcMain.on('download', async (event, message) => {
  const tempDir = app.getPath('temp'); // Get the system's temporary directory
  const tempFilePath = path.join(tempDir, 'elec_latest.deb'); // Create a unique file path
  try {
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      onDownloadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        event.sender.send('download-progress', progress);
      }
    });

    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      event.sender.send('download-complete', tempFilePath);

      event.sender.send('update_downloaded')
    });

  } catch (error) {
    event.sender.send('download-error', error.message);
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function getIsNewVersion() {
  return newVersion;
}

function spawnSyncLog(cmd, args = [], env = {}) {
  log(`Executing: ${cmd} with args: ${args}`)
  const response = spawnSync(cmd, args, {
    env: { ...process.env, ...env },
    encoding: "utf-8",
    shell: true,
  })
  return response.stdout.trim()
}

function wrapSudo() {
  const name = pkg.name;
  const installComment = `"${name} would like to update"`
  const sudo = spawnSyncLog("which gksudo || which kdesudo || which pkexec || which beesu")
  const command = [sudo]
  if (/kdesudo/i.test(sudo)) {
    command.push("--comment", installComment)
    command.push("-c")
  } else if (/gksudo/i.test(sudo)) {
    command.push("--message", installComment)
  } else if (/pkexec/i.test(sudo)) {
    command.push("--disable-internal-agent")
  }
  return command.join(" ")
}


function updateChecker() {
  if(newVersion) {
    log(`New version already found ignoring check..........`)
    return;
  }

  fetch('https://api.github.com/repos/debmohit/auto-update-elec-test/releases/latest', {
    headers: {
      Authorization: `Bearer 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`
    }
  })
  .then(res => {
    return res.json();
  }).then((res) => {
    const tagName = res.name;
    const tagVersion = tagName.replace('v', "");

    if(pkg.version !== tagVersion) {

      const pkgVersions = pkg.version.split(".");
      const tagVersions = tagVersion.split(".");      

      for(let i = 0; i < pkgVersions.length; i++) {
        if(tagVersions[i] > pkgVersions[i]) {
          newVersion = true
          break;
        }
      }

      log(`Current Verions: ${pkg.version} New Version available: ${tagVersion}`)
    }

    if(newVersion) {
       res.assets.find(r => {
        const urlArr = r.browser_download_url.split(".");
        const ext = urlArr.pop();

        if(ext === 'deb') {
          downloadUrl = r.browser_download_url
        }
      })
      log('Sending response to UI');
      mainWindow.webContents.send('update_available');
    }
  })
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
app.on('ready', function()  {
  setInterval(() => {
    updateChecker();
  }, 10000)
  // autoUpdater.checkForUpdatesAndNotify().then(res => {
  //   log('Updates', res)
  // })
});

ipcMain.on('restart_app', () => {
  app.quit();
  const filePath = app.getPath('temp');
  const debFilePath =  path.join(filePath, 'elec_latest.deb'); 
  doInstall(debFilePath);
  app.relaunch();
});

function doInstall(installerPath) {
  const sudo = wrapSudo()
    // pkexec doesn't want the command to be wrapped in " quotes
  const wrapper = /pkexec/i.test(sudo) ? "" : `"`
  const cmd = ["dpkg", "-i", installerPath, "||", "apt-get", "install", "-f", "-y"]
  spawnSyncLog(sudo, [`${wrapper}/bin/bash`, "-c", `'${cmd.join(" ")}'${wrapper}`])
  return true
}

ipcMain.on('reset-version-flag', function() {
  newVersion = false;
})