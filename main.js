const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;

// Get the app's data directory for storing images
function getImagesDir() {
  const userDataPath = app.getPath('userData');
  const imagesDir = path.join(userDataPath, 'images');

  // Create images directory if it doesn't exist
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  return imagesDir;
}

// Get portable images directory (next to exe)
function getPortableImagesDir() {
  const exeDir = path.dirname(app.getPath('exe'));
  const imagesDir = path.join(exeDir, 'images');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  return imagesDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'Oakhart DM Tools',
    backgroundColor: '#0f1510',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    show: false // Don't show until ready
  });

  // Show window when ready to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the main HTML file
  mainWindow.loadFile('oakhart-dm-tools-electron.html');

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ============================================
// IPC Handlers for file system operations
// ============================================

// Save an image file
ipcMain.handle('save-image', async (event, { fileName, dataUrl }) => {
  try {
    const imagesDir = getPortableImagesDir();
    const filePath = path.join(imagesDir, fileName);

    // Convert data URL to buffer
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    fs.writeFileSync(filePath, buffer);

    // Return relative path for storage
    return { success: true, path: `images/${fileName}` };
  } catch (error) {
    console.error('Failed to save image:', error);
    return { success: false, error: error.message };
  }
});

// Read an image file and return as data URL
ipcMain.handle('read-image', async (event, relativePath) => {
  try {
    const imagesDir = getPortableImagesDir();
    const fileName = path.basename(relativePath);
    const filePath = path.join(imagesDir, fileName);

    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(fileName).slice(1) || 'png';
      const mimeType = ext === 'jpg' ? 'jpeg' : ext;
      const dataUrl = `data:image/${mimeType};base64,${buffer.toString('base64')}`;
      return { success: true, dataUrl };
    }

    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get list of saved images
ipcMain.handle('list-images', async () => {
  try {
    const imagesDir = getPortableImagesDir();
    const files = fs.readdirSync(imagesDir).filter(f =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
    );
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete an image file
ipcMain.handle('delete-image', async (event, relativePath) => {
  try {
    const imagesDir = getPortableImagesDir();
    const fileName = path.basename(relativePath);
    const filePath = path.join(imagesDir, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }

    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get app info
ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    imagesPath: getPortableImagesDir()
  };
});

// Save data to file (for backup/export)
ipcMain.handle('save-data-file', async (event, { defaultName, data }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, data);
      return { success: true, path: result.filePath };
    }

    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load data from file (for import)
ipcMain.handle('load-data-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const data = fs.readFileSync(result.filePaths[0], 'utf8');
      return { success: true, data };
    }

    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
