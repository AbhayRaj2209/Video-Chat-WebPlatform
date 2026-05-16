const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const closeChat = document.querySelector("#closeChat");
const chatPanel = document.querySelector(".main__right");
const emptyState = document.getElementById("emptyState");
const userNameModal = document.getElementById("userNameModal");
const userNameInput = document.getElementById("userNameInput");
const joinMeetingBtn = document.getElementById("joinMeeting");
const copyRoomIdBtn = document.getElementById("copyRoomId");
const leaveButton = document.getElementById("leaveButton");
const messages = document.getElementById("messages");

let user = "";
let myVideoStream;
let peer;

myVideo.muted = true;

// User Name Modal
userNameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && userNameInput.value.trim()) {
    joinMeeting();
  }
});

joinMeetingBtn.addEventListener("click", joinMeeting);

function joinMeeting() {
  const name = userNameInput.value.trim();
  if (name) {
    user = name;
    userNameModal.classList.add("hidden");
    initializePeer();
    requestMedia();
  } else {
    userNameInput.focus();
    userNameInput.style.borderColor = "#f6484a";
    setTimeout(() => {
      userNameInput.style.borderColor = "transparent";
    }, 2000);
  }
}

// Copy Room ID
copyRoomIdBtn.addEventListener("click", () => {
  const roomId = document.getElementById("roomIdDisplay").textContent;
  navigator.clipboard.writeText(window.location.href).then(() => {
    copyRoomIdBtn.innerHTML = '<i class="fas fa-check"></i>';
    copyRoomIdBtn.style.color = "#10b981";
    setTimeout(() => {
      copyRoomIdBtn.innerHTML = '<i class="fas fa-copy"></i>';
      copyRoomIdBtn.style.color = "#2f80ec";
    }, 2000);
  });
});

// Initialize Peer
function initializePeer() {
  peer = new Peer({
    host: '127.0.0.1',
    port: 3030,
    path: '/peerjs',
    config: {
      'iceServers': [
        { url: 'stun:stun01.sipphone.com' },
        { url: 'stun:stun.ekiga.net' },
        { url: 'stun:stunserver.org' },
        { url: 'stun:stun.softjoys.com' },
        { url: 'stun:stun.voiparound.com' },
        { url: 'stun:stun.voipbuster.com' },
        { url: 'stun:stun.voipstunt.com' },
        { url: 'stun:stun.voxgratia.org' },
        { url: 'stun:stun.xten.com' },
        {
          url: 'turn:192.158.29.39:3478?transport=udp',
          credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
          username: '28224511:1379330808'
        },
        {
          url: 'turn:192.158.29.39:3478?transport=tcp',
          credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
          username: '28224511:1379330808'
        }
      ]
    },
    debug: 3
  });

  peer.on("open", (id) => {
    console.log('My peer ID is: ' + id);
    socket.emit("join-room", ROOM_ID, id, user);
  });
}

// Request Media
function requestMedia() {
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then((stream) => {
      myVideoStream = stream;
      addVideoStream(myVideo, stream);
      updateEmptyState();

      peer.on("call", (call) => {
        console.log('Someone is calling me');
        call.answer(stream);
        const video = document.createElement("video");
        call.on("stream", (userVideoStream) => {
          addVideoStream(video, userVideoStream);
          updateEmptyState();
        });
      });

      socket.on("user-connected", (userId) => {
        console.log('User connected: ' + userId);
        connectToNewUser(userId, stream);
        updateEmptyState();
      });
    })
    .catch((error) => {
      console.error("Error accessing media devices:", error);
      alert("Please allow camera and microphone access to use this app.");
    });
}

// Connect to New User
const connectToNewUser = (userId, stream) => {
  console.log('Calling user: ' + userId);
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
    updateEmptyState();
  });
  
  call.on("close", () => {
    video.remove();
    updateEmptyState();
  });
};

// Add Video Stream
const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.appendChild(video);
    updateEmptyState();
  });
  
  video.addEventListener("ended", () => {
    video.remove();
    updateEmptyState();
  });
};

// Update Empty State
function updateEmptyState() {
  const videos = videoGrid.querySelectorAll("video");
  if (videos.length > 0) {
    emptyState.classList.add("hidden");
  } else {
    emptyState.classList.remove("hidden");
  }
}

// Chat Toggle
showChat.addEventListener("click", () => {
  chatPanel.classList.add("active");
});

closeChat.addEventListener("click", () => {
  chatPanel.classList.remove("active");
});

// Send Message
let text = document.querySelector("#chat_message");
let send = document.getElementById("send");

send.addEventListener("click", (e) => {
  sendMessage();
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.trim().length !== 0) {
    sendMessage();
  }
});

function sendMessage() {
  if (text.value.trim().length !== 0) {
    socket.emit("message", ROOM_ID, text.value.trim(), user);
    text.value = "";
  }
}

// Receive Message
socket.on("createMessage", (message, userName) => {
  const isOwnMessage = userName === user;
  const isSystemMessage = userName === "System";
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isOwnMessage ? "own-message" : ""} ${isSystemMessage ? "system-message" : ""}`;
  
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (isSystemMessage) {
    messageDiv.innerHTML = `
      <div class="message-content system" style="text-align: center; color: var(--gray-text); font-style: italic; background: transparent; border: none; padding: 0.5rem;">
        ${message}
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-header">
        <b><i class="far fa-user-circle"></i> <span>${isOwnMessage ? "You" : userName}</span></b>
      </div>
      <div class="message-content">${message}</div>
      <div class="message-time">${time}</div>
    `;
  }
  
  messages.appendChild(messageDiv);
  
  // Auto-scroll chat window
  const chatWindow = document.querySelector(".main__chat_window");
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

// Mute Button
const muteButton = document.querySelector("#muteButton");
muteButton.addEventListener("click", () => {
  if (myVideoStream) {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
      myVideoStream.getAudioTracks()[0].enabled = false;
      muteButton.innerHTML = '<i class="fas fa-microphone-slash"></i><span class="control-label">Mic</span>';
      muteButton.classList.add("background__red");
    } else {
      myVideoStream.getAudioTracks()[0].enabled = true;
      muteButton.innerHTML = '<i class="fas fa-microphone"></i><span class="control-label">Mic</span>';
      muteButton.classList.remove("background__red");
    }
  }
});

// Stop Video Button
const stopVideo = document.querySelector("#stopVideo");
stopVideo.addEventListener("click", () => {
  if (myVideoStream) {
    const enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
      myVideoStream.getVideoTracks()[0].enabled = false;
      stopVideo.innerHTML = '<i class="fas fa-video-slash"></i><span class="control-label">Video</span>';
      stopVideo.classList.add("background__red");
    } else {
      myVideoStream.getVideoTracks()[0].enabled = true;
      stopVideo.innerHTML = '<i class="fas fa-video"></i><span class="control-label">Video</span>';
      stopVideo.classList.remove("background__red");
    }
  }
});

// Invite Button
const inviteButton = document.querySelector("#inviteButton");
inviteButton.addEventListener("click", () => {
  const roomUrl = window.location.href;
  if (navigator.share) {
    navigator.share({
      title: 'Join my video chat',
      text: 'Join my video chat room',
      url: roomUrl,
    }).catch((error) => {
      console.log('Error sharing:', error);
      copyToClipboard(roomUrl);
    });
  } else {
    copyToClipboard(roomUrl);
  }
});

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    inviteButton.innerHTML = '<i class="fas fa-check"></i><span class="control-label">Copied!</span>';
    setTimeout(() => {
      inviteButton.innerHTML = '<i class="fas fa-user-plus"></i><span class="control-label">Invite</span>';
    }, 2000);
  });
}

// Leave Button
leaveButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to leave the meeting?")) {
    // Stop all tracks
    if (myVideoStream) {
      myVideoStream.getTracks().forEach(track => track.stop());
    }
    
    // Disconnect peer
    if (peer) {
      peer.destroy();
    }
    
    // Redirect to home
    window.location.href = "/";
  }
});

// Handle page unload
window.addEventListener("beforeunload", () => {
  if (myVideoStream) {
    myVideoStream.getTracks().forEach(track => track.stop());
  }
  if (peer) {
    peer.destroy();
  }
});

// Focus on input when modal opens
window.addEventListener("load", () => {
  userNameInput.focus();
});

// Handle user disconnection
socket.on("user-disconnected", (userId) => {
  console.log("User disconnected: " + userId);
  updateEmptyState();
});
