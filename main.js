// main.js

const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

// --- Discovery Module (integrated) ---
const dgram = require("dgram");
const os = require("os");
const express = require('express');
const multer  = require('multer');
const fs = require('fs');

let peers = {};
const PORT_UDP = 41234;
const BROADCAST_ADDR = "255.255.255.255";
const INTERVAL = 3000;
let nickname = "Unknown";
let socket;
let broadcastInterval;

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const ifaceName of Object.keys(interfaces)) {
        for (const iface of interfaces[ifaceName]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "0.0.0.0";
}

function broadcastPresence() {
    const localIP = getLocalIP();
    const message = Buffer.from(`PEER:${nickname}:${localIP}`);
    socket.send(message, 0, message.length, PORT_UDP, BROADCAST_ADDR);
}

// --- Express Server Module (integrated) ---
const expressApp = express();
const PORT_HTTP = 3000;
// Use app.getPath to get a writeable location for uploads
const UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        return cb(null, UPLOADS_DIR);
    },
    filename: function(req, file, cb) {
        return cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// These paths now correctly resolve relative to this file's location
expressApp.use(express.static(path.join(__dirname, 'public')));
expressApp.use(express.urlencoded({ extended: false }));
expressApp.set("view engine", "ejs");
expressApp.set("views", path.join(__dirname, 'views'));

expressApp.post("/nickname", (req, res) => {
    nickname = req.body.nickname;
    console.log("✅ Nickname set to:", nickname);
    res.redirect("/");
});

expressApp.get('/peers', (req, res) => {
    return res.json(peers);
});

expressApp.get("/", (req, res) => {
    res.render("homepage", { peers, nickname });
});

expressApp.post("/upload", upload.single("profileImage"), (req, res) => {
    console.log("File received:", req.file.filename);
    return res.redirect("/");
});

// --- Electron Main Process ---
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            contextIsolation: true,
        },
    });

    win.loadURL(`http://localhost:${PORT_HTTP}`);
    win.webContents.openDevTools();
}

app.whenReady().then(() => {
    // Start the Express server
    expressApp.listen(PORT_HTTP, '0.0.0.0', () => {
        console.log(`🌐 Server running on port ${PORT_HTTP}`);
        
        // Start the discovery process after the server is ready
        socket = dgram.createSocket("udp4");
        socket.bind(PORT_UDP, () => {
            socket.setBroadcast(true);
            console.log(`🔍 UDP discovery started on port ${PORT_UDP}`);
            broadcastInterval = setInterval(broadcastPresence, INTERVAL);
        });
    });

    // Create the uploads directory on app start
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    createWindow();
});

app.on('window-all-closed', () => {
    // Clean up all processes gracefully when the app closes.
    if (broadcastInterval) clearInterval(broadcastInterval);
    if (socket) socket.close();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
