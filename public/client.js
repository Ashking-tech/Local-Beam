const socket = io();
const pcConfig = {iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]};
const fileInput = document.getElementById('fileInput');
const sendButton = document.getElementById('sendButton');
const joinButton = document.getElementById('joinButton'); 
const roomCodeInput = document.getElementById('roomCodeInput'); 
const statusDiv = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const roomCodeValue = document.getElementById('roomCodeValue');
const fileNameSpan = document.getElementById('fileName');
const fileSizeSpan = document.getElementById('fileSize');
const fileInfoDiv = document.getElementById('fileInfo');

let file;
let peerConnection;
let dataChannel;
let roomCode;
let isSender = false;
let receivedFileChunks = [];
let receivedFileSize = 0;
let fileMetadata = {};

function updateStatus(message, isError = false) {
    statusDiv.innerHTML = isError ? `❌ ${message}` : `📊 ${message}`;
    statusDiv.style.color = isError ? '#dc3545' : '#666';
}
function updateProgress(percentage) {
    progressBar.style.width = `${percentage}%`;
    progressBar.style.background = percentage === 100 ? 
        'linear-gradient(135deg, #4caf50 0%, #45a049 100%)' : 
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
}
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
}
function assembleAndDownloadFile() {
    try {
        const receivedBlob = new Blob(receivedFileChunks, { type: fileMetadata.type });
        const url = URL.createObjectURL(receivedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileMetadata.name || "downloaded-file";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        updateStatus("Download complete");
        updateProgress(100);
    } catch (error) {
        console.error('Error downloading file', error);
        updateStatus('Error downloading file', true);
    }
}
function sendFileMetadata() {
    fileMetadata = { name: file.name, size: file.size, type: file.type };
    dataChannel.send(JSON.stringify(fileMetadata));
    updateStatus('Sending file metadata...');
    setTimeout(sendFileChunks, 100); 
}
function sendFileChunks() {
    const CHUNK_SIZE = 16 * 1024;
    let offset = 0;
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
        dataChannel.send(event.target.result);
        offset += event.target.result.byteLength;
        const progress = (offset / file.size) * 100;
        updateProgress(progress);
        if (offset < file.size) {
            readNextChunk();
        } else {
            updateStatus('File transfer complete!');
            dataChannel.close();
            peerConnection.close();
        }
    };
    function readNextChunk() {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        fileReader.readAsArrayBuffer(chunk);
    }
    readNextChunk();
}
function handleReceiveMessage(event) {
    // Check for handshake messages first
    if (event.data === "SENDER_READY") {
        dataChannel.send("RECEIVER_CONFIRMED");
        updateStatus("Receiver ready. Awaiting file...");
        return;
    }
    
    if (typeof event.data === 'string') {
        try {
            fileMetadata = JSON.parse(event.data);
            updateStatus(`Receiving: ${fileMetadata.name} (${formatFileSize(fileMetadata.size)})`);
            receivedFileChunks = [];
            receivedFileSize = 0;
            updateProgress(0);
        } catch (error) {
            console.error('Receiver: Error parsing metadata', error);
            updateStatus('Error: Invalid file metadata', true);
        }
    } else {
        receivedFileChunks.push(event.data);
        receivedFileSize += event.data.byteLength;
        const progress = (receivedFileSize / fileMetadata.size) * 100;
        updateProgress(progress);
        updateStatus(`Receiving: ${progress.toFixed(1)}%`);
        if (receivedFileSize >= fileMetadata.size) {
            updateStatus('File received! Downloading...');
            assembleAndDownloadFile();
            dataChannel.close();
            peerConnection.close();
        }
    }
}
async function createPeerConnection(isInitiator) {
    peerConnection = new RTCPeerConnection(pcConfig);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, roomCode);
        }
    };
    if (isInitiator) { // Sender logic
        dataChannel = peerConnection.createDataChannel('file-transfer');
        dataChannel.binaryType = "ArrayBuffer";
        
        dataChannel.onopen = () => {
            updateStatus('Connection established. Waiting for receiver confirmation...');
            dataChannel.send("SENDER_READY"); 
        };
        
        // **This is the critical addition for the sender's handshake**
        dataChannel.onmessage = (event) => {
            if (event.data === "RECEIVER_CONFIRMED") {
                updateStatus('Receiver confirmed. Starting file transfer...');
                sendFileMetadata();
            }
        };

        dataChannel.onclose = () => console.log("Sender: Data Channel is Closed");
    } else { // Receiver logic
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.binaryType = "arraybuffer";
            dataChannel.onopen = () => console.log('Receiver: Data channel opened by sender');
            dataChannel.onclose = () => console.log('Receiver: Data channel closed by sender');
            dataChannel.onmessage = handleReceiveMessage;
        };
    }
}

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        file = e.target.files[0];
        fileNameSpan.textContent = file.name;
        fileSizeSpan.textContent = formatFileSize(file.size);
        fileInfoDiv.classList.add('visible');
    }
});
sendButton.addEventListener('click', async () => {
    if (!file) {
        updateStatus('Please select a file first', true);
        return;
    }
    roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    roomCodeValue.textContent = roomCode;
    roomCodeDisplay.style.display = 'block';
    roomCodeInput.value = roomCode;
    updateStatus('Creating room and preparing to send...');
    isSender = true;
    try {
        await createPeerConnection(true);
        socket.emit("sender-join", { uid: roomCode });
    } catch (error) {
        console.error("Error creating peer connection:", error);
        updateStatus('Error creating connection', true);
    }
});
joinButton.addEventListener('click', async () => {
    roomCode = roomCodeInput.value.trim();
    if (!roomCode) {
        updateStatus('Please enter a room code', true);
        return;
    }
    updateStatus('Joining room...');
    isSender = false;
    try {
        await createPeerConnection(false);
        socket.emit("receiver-join", { uid: roomCode, sender_uid: roomCode });
    } catch (error) {
        console.error("Error creating peer connection:", error);
        updateStatus('Error joining connection', true);
    }
});
socket.on('receiver-joined', async () => {
    updateStatus('Receiver joined. Creating WebRTC offer...');
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer, roomCode);
    } catch(error) {
        console.error('Error creating offer', error);
        updateStatus('Error creating offer', true);
    }
});
socket.on('offer', async (offer, senderId) => {
    if (isSender) return; 
    updateStatus('Offer received. Creating an answer...');
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer, roomCode);
    } catch(error) {
        console.error('Receiver: Error handling offer', error);
        updateStatus('Error handling connection offer', true);
    }
});
socket.on('answer', async (answer) => {
    if (!isSender || !peerConnection) return;
    updateStatus('Answer received. Connection is being finalized...');
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        updateStatus('Connection established! Ready to send file.');
    } catch(error) {
        console.error('Sender: Error setting answer', error);
        updateStatus('Error establishing connection', true);
    }
});
socket.on('ice-candidate', async (candidate) => {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch(error) {
            console.error('Error adding ICE candidate:', error);
        }
    }
});
socket.on('error', (message) => {
    console.error('Server error:', message);
    updateStatus('Error: ' + message, true);
});
socket.on('connect', () => {
    console.log('Connected to signaling server');
    updateStatus('Connected to server');
});
socket.on('disconnect', () => {
    console.log('Disconnected from signaling server');
    updateStatus('Disconnected from server', true);
});
window.addEventListener('beforeunload', () => {
    if (peerConnection) peerConnection.close();
    if (dataChannel) dataChannel.close();
    socket.disconnect();
});
