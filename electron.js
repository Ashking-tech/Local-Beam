const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let serverProcess;
let discoveryProcess;

function waitForServer(url, callback) {
  const tryRequest = () => {
    http.get(url, (res) => {
      if (res.statusCode === 200) {
        callback();
      } else {
        setTimeout(tryRequest, 500);
      }
    }).on('error', () => {
      setTimeout(tryRequest, 500);
    });
  };
  tryRequest();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  waitForServer('http://localhost:3000', () => {
    win.loadURL('http://localhost:3000');
  });
}

app.whenReady().then(() => {
  serverProcess = spawn('node', [path.join(__dirname, 'index.js')], {
    stdio: 'inherit',
    shell: true,
  });

  discoveryProcess = spawn('node', [path.join(__dirname, 'discovery.js')], {
    stdio: 'inherit',
    shell: true,
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (discoveryProcess) discoveryProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
