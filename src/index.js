const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const {autoUpdater} = require("electron-updater");
const {log} = require('electron-log');
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'debmohit',
  repo: 'auto-update-elec-test',
  private: true,
  token: "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", // provide your github access token, with repo:access
});

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

autoUpdater.on('checking-for-update', () => {
  log('Checking for update...');
})
autoUpdater.on('update-available', (info) => {
  log('Update available.');
})
autoUpdater.on('update-not-available', (info) => {
  log('Update not available.');
})
autoUpdater.on('error', (err) => {
  log('Error in auto-updater. ' + err);
})
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  log(log_message);
})
autoUpdater.on('update-downloaded', (info) => {
  log('Update downloaded');
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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

function updateChecker() {
  fetch('https://api.github.com/repos/debmohit/auto-update-elec-test/releases/latest')
  .then(res => {
    return res.json();
  }).then((res) => {
    const tagName = res.name;
    const tagVersion = tagName.replace('v', "");
    let newVersion = false;

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
      log('Going to relaunch the app!')
      app.relaunch();
      app.exit();
    }
  })
}
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
app.on('ready', function()  {
  console.log("+++++++Ready+++++++")
  // autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => {
    updateChecker();
  }, 1000)

});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});