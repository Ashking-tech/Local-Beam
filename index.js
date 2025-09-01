const express = require('express');
const path = require("path");
const app = express();
const server = require('http').createServer(app);
const io = require("socket.io")(server);


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: false}));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3020;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`The server is running on port ${PORT}`);
});

// Store active rooms for better management
const activeRooms = new Map();

io.on('connection', function (socket) {
    console.log('User connected:', socket.id);

    // Event for when the sender creates a room
    socket.on("sender-join", function(data) {
        socket.join(data.uid);
        activeRooms.set(data.uid, {
            sender: socket.id,
            receiver: null
        });
        console.log(`Sender joined room: ${data.uid}`);
    });

    // Receiver joining a room
    socket.on("receiver-join", function(data) {
        const roomData = activeRooms.get(data.sender_uid);
        if (!roomData) {
            socket.emit("error", "Room not found. Please check the room code.");
            return;
        }

        socket.join(data.sender_uid); // Join the correct room using the sender's UID
        roomData.receiver = socket.id;

        // Notify the sender that the receiver has joined
        io.to(roomData.sender).emit("receiver-joined", socket.id);
        console.log(`Receiver ${socket.id} joined room: ${data.sender_uid}`);
    });

    // Handle WebRTC offer (from sender to receiver)
    socket.on("offer", (offer, roomCode) => {
        const roomData = activeRooms.get(roomCode);
        if (roomData && roomData.receiver) {
            console.log(`Offer received from sender (${socket.id}) for receiver: ${roomData.receiver}`);
            io.to(roomData.receiver).emit("offer", offer, socket.id);
        }
    });

    // Handle WebRTC answer (from receiver to sender)
    socket.on("answer", (answer, roomCode) => {
        const roomData = activeRooms.get(roomCode);
        if (roomData && roomData.sender) {
            console.log(`Answer received from receiver (${socket.id}) for sender: ${roomData.sender}`);
            io.to(roomData.sender).emit("answer", answer, socket.id);
        }
    });

    // Handle ICE candidates (bi-directional)
    socket.on("ice-candidate", (candidate, roomCode) => {
        const roomData = activeRooms.get(roomCode);
        if (roomData) {
            const targetSocketId = (socket.id === roomData.sender) ? roomData.receiver : roomData.sender;
            if (targetSocketId) {
                console.log(`ICE candidate received from ${socket.id} for target: ${targetSocketId}`);
                io.to(targetSocketId).emit("ice-candidate", candidate, socket.id);
            }
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log('User disconnected:', socket.id);
        // Clean up rooms when a user disconnects
        for (let [roomCode, roomData] of activeRooms.entries()) {
            if (roomData.sender === socket.id || roomData.receiver === socket.id) {
                activeRooms.delete(roomCode);
                console.log(`Room ${roomCode} cleaned up due to disconnect`);
            }
        }
    });
});
