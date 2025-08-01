// discovery.js
const dgram = require("dgram"); // built-in module for UDP sockets
const os = require("os");       // to get your local IP address
const peers = new Set();        // to store discovered IPs (no duplicates)

const PORT = 41234;             // Port to send/receive discovery messages
const BROADCAST_ADDR = "255.255.255.255"; // Broadcast to all LAN devices
const INTERVAL = 3000;          // How often to send "I'm here" (in ms)

const socket = dgram.createSocket("udp4"); // Create a UDP socket

// 🔍 Helper: Get your LAN IP (e.g., 192.168.x.x)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const ifaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[ifaceName]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "0.0.0.0"; // fallback
}

// 🔊 Step 1: Broadcast "I'm here!" to everyone
function broadcastPresence() {
  const localIP = getLocalIP();
  const message = Buffer.from(`PEER:${localIP}`);
  socket.send(message, 0, message.length, PORT, BROADCAST_ADDR);
}

// 👂 Step 2: Listen for broadcasts from other peers
socket.on("message", (msg, rinfo) => {
  const message = msg.toString();
  const theirIP = rinfo.address;

  if (message.startsWith("PEER:")) {
    const ip = message.split(":")[1];

    // Don't add yourself
    if (ip !== getLocalIP()) {
      peers.add(ip);
      console.log("Discovered peer:", ip);
    }
  }
});

// 🔌 Step 3: Set up the socket for receiving + broadcasting
socket.bind(PORT, () => {
  socket.setBroadcast(true); // allow sending to 255.255.255.255
  console.log("UDP discovery started on port", PORT);

  // Broadcast every few seconds
  setInterval(broadcastPresence, INTERVAL);
});

// 🛠️ Optional: Export the peer list to use in Express app
module.exports = {
  getPeers: () => Array.from(peers)
};
