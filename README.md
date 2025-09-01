````markdown
<p align="center">
  <img src="img.png" alt="LAN Share Logo" width="150"/>
</p>

# P2P LAN File Transfer

A modern, peer-to-peer file sharing tool that lets you send files directly between two computers on the same local network.

This application uses WebRTC for a direct connection, which means files are never stored on a central server.

## 🔧 Features

-   **Direct P2P Transfer:** Files are sent directly from one browser to another, over your local network.
-   **No Internet Required:** Works flawlessly over Wi-Fi or Ethernet—perfect for offline file sharing.
-   **No Server Storage:** Files are not saved on the server, ensuring privacy and security.
-   **Lightweight and Fast:** Built using Node.js, Express, and WebRTC.
-   **Easy Deployment with Docker:** The entire application is packaged into a single container for a flawless, one-command setup.

## 🚀 Getting Started

The easiest way to run this application is with Docker.

### 1. Prerequisites

-   Install  **Docker Desktop** on your computer.

### 2. Build the Docker Image

In your terminal, navigate to the project's root directory and run the following command to build the Docker image. This process only needs to be done once.

```bash
docker build -t p2p-file-transfer .
````

### 3\. Run the App

To start the application, run the Docker container with the following command. The `-p 3020:3020` flag maps the container's port to your host machine's port.

```bash
docker run -p 3020:3020 --name p2p-transfer-app p2p-file-transfer
```

### 4\. Access from another PC

On any computer connected to the same LAN, open a browser and go to:

```
http://<your-local-ip>:3020
```

You can find your local IP address by running `hostname -I` (on Linux) or `ipconfig` (on Windows) in your terminal.

## 📁 Folder Structure

```
├── public/         # Contains the front-end code
│   ├── index.html
│   └── client.js
├── Dockerfile       # Docker build instructions
├── server.js        # The signaling server for WebRTC
├── package.json     # Lists Node.js dependencies
└── .gitignore       # Tells Git to ignore node_modules
```

## 🧰 Tech Stack

  * Node.js
  * Express.js
  * Socket.io (for signaling)
  * WebRTC (for peer-to-peer data transfer)
  * Docker (for packaging and deployment)

<!-- end list -->

```
```
