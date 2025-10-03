import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000"); // your backend URL

const App = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState([]);

  // Listen for events from backend
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected with socket ID:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("roomCreated", ({ roomId, username }) => {
      setMessages((prev) => [...prev, `Room ${roomId} created by ${username}`]);
    });

    socket.on("roomJoined", ({ roomId, username }) => {
      setMessages((prev) => [...prev, `${username} joined room ${roomId}`]);
    });

    socket.on("playerLeft", ({ socket: socketId }) => {
      setMessages((prev) => [...prev, `Player ${socketId} left the room`]);
    });

    socket.on("error", (err) => {
      setMessages((prev) => [...prev, `Error: ${err.message}`]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message");
      socket.off("roomCreated");
      socket.off("roomJoined");
      socket.off("playerLeft");
      socket.off("error");
    };
  }, []);

  const handleCreateRoom = () => {
    if (!roomId || !username) return alert("Enter username and room ID");
    socket.emit("createRoom", { roomId, username });
  };

  const handleJoinRoom = () => {
    if (!roomId || !username) return alert("Enter username and room ID");
    socket.emit("joinRoom", { roomId, username });
  };

  const handleLeaveRoom = () => {
    if (!roomId || !username) return alert("Enter username and room ID");
    socket.emit("leaveRoom", { roomId, username });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Socket.IO Room Test</h2>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <div style={{ marginTop: "10px" }}>
        <button onClick={handleCreateRoom}>Create Room</button>
        <button onClick={handleJoinRoom}>Join Room</button>
        <button onClick={handleLeaveRoom}>Leave Room</button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Messages:</h3>
        <div style={{ border: "1px solid #ccc", padding: "10px", minHeight: "100px" }}>
          {messages.map((msg, idx) => (
            <div key={idx}>{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
