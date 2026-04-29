// server.js or app.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware to make io accessible in routes/services
app.use((req, res, next) => {
  req.io = io;
  next();
});

// store connected users
const onlineUsers = new Map();
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) onlineUsers.set(userId, socket.id);

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
  });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(5002, () => console.log("Server running on 5002"));
}
module.exports = { io, onlineUsers };
