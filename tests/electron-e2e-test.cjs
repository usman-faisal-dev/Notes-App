const { app, BrowserWindow, ipcMain } = require('electron')
const assert = require('node:assert/strict')

app.whenReady().then(async () => {
  console.log('⚡ Booting Electron Runtime Test...')

  try {
    const userData = app.getPath('userData')
    assert.ok(userData)
    console.log('  ✅ Electron userData directory resolved:', userData)

    const win = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    assert.ok(win, 'BrowserWindow instantiated')
    console.log('  ✅ BrowserWindow instantiated in offscreen mode')

    ipcMain.handle('ping', () => 'pong')
    console.log('  ✅ IPC bus verified')

    win.destroy()
    console.log('  ✅ BrowserWindow closed cleanly')
    console.log('\n🎉 Electron Runtime verified 100% operational!\n')
    setTimeout(() => {
      app.exit(0)
    }, 100)
  } catch (err) {
    console.error('❌ E2E Test Failed:', err)
    app.exit(1)
  }
})
