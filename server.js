const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
const { ExpressPeerServer } = require("peer");
const opinions = {
  debug: true,
}

app.use("/peerjs", ExpressPeerServer(server, opinions));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/create-room", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on("join-room", (roomId, userId, userName) => {
    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);
    console.log(`User ${userName} (${userId}) joined room ${roomId}`);
    
   
    setTimeout(() => {
      socket.to(roomId).broadcast.emit("user-connected", userId);
    }, 1000);
    
    // Send a welcome message to others in the room
    socket.to(roomId).emit("createMessage", `${userName} joined the meeting`, "System");
  });

  socket.on("message", (roomId, message, userName) => {
    if (roomId && message && userName) {
      io.to(roomId).emit("createMessage", message, userName);
    }
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      socket.to(currentRoom).emit("createMessage", `${currentUser} left the meeting`, "System");
    }
    console.log("User disconnected");
  });
});
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server is running! Open it here: http://localhost:${PORT}`);
});

