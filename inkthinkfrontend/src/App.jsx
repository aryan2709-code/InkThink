import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function App() {
  const socketRef = useRef(null);
  if (!socketRef.current) socketRef.current = io("http://localhost:4000");
  const socket = socketRef.current;

  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [isDrawer, setIsDrawer] = useState(false);
  const [currentWord, setCurrentWord] = useState("");
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  // --- Safe addMessage ---
  const addMessage = (msg) => {
    if (!msg) return;

    if (typeof msg === "string") {
      setMessages((prev) => [...prev, msg]);
    } else if (typeof msg === "object" && msg.message) {
      setMessages((prev) => [...prev, msg.message]);
    } else {
      setMessages((prev) => [...prev, JSON.stringify(msg)]);
    }
  };

  // --- Canvas Drawing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const handleMouseDown = () => (drawingRef.current = true);
    const handleMouseUp = () => (drawingRef.current = false);
    const handleMouseMove = (e) => {
      if (!drawingRef.current || !isDrawer) return;
      const rect = canvas.getBoundingClientRect();
      const stroke = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      ctx.fillRect(stroke.x, stroke.y, 2, 2);
      socket.emit("drawing", { roomId, stroke });
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDrawer, roomId, socket]);

  // --- Socket Listeners ---
  useEffect(() => {
    const handlers = {
      roomCreated: ({ roomId }) => addMessage(`Room ${roomId} created!`),
      roomJoined: ({ roomId }) => addMessage(`Joined room ${roomId}`),
      message: addMessage,
      playerLeft: ({ message }) => addMessage(message),
      gameStarted: ({ players: roomPlayers }) => setPlayers(roomPlayers || []),
      roundStarted: ({ drawer }) => {
        addMessage(`New round! Drawer: ${drawer}`);
        setIsDrawer(drawer === username);
      },
      yourTurn: ({ word }) => {
        addMessage(`Your turn! Draw: ${word}`);
        setCurrentWord(word);
      },
      drawing: ({ stroke }) => {
        if (!stroke) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.fillRect(stroke.x, stroke.y, 2, 2);
      },
      correctGuess: ({ player, guess }) =>
        addMessage(`${player} guessed correctly: ${guess}`),
      roundEnded: ({ winner, word }) =>
        addMessage(`Round ended. Word: ${word}. Winner: ${winner || "Nobody"}`),
      gameEnded: ({ winner }) =>
        addMessage(`Game ended. Winner: ${winner || "Nobody"}`),
      guessFeedback: ({ correct, guess }) => {
        if (!correct) addMessage(`Incorrect guess: ${guess}`);
      },
      cheatingDetected: ({ message }) => addMessage(message),
      error: ({ message }) => addMessage(`Error: ${message}`),
    };

    Object.entries(handlers).forEach(([event, handler]) =>
      socket.on(event, handler)
    );
    return () =>
      Object.entries(handlers).forEach(([event, handler]) =>
        socket.off(event, handler)
      );
  }, [socket, username]);

  // --- Actions ---
  const createRoom = () => socket.emit("createRoom", { roomId, username });
  const joinRoom = () => socket.emit("joinRoom", { roomId, username });
  const startGame = () => socket.emit("startGame", { roomId });
  const submitGuess = (guess) => socket.emit("submitGuess", { roomId, guess });
  const leaveRoom = () => socket.emit("leaveRoom", { roomId });

  // --- UI ---
  return (
    <div style={{ padding: 20 }}>
      <h1>Pictionary Test</h1>

      <div>
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
        <button onClick={createRoom}>Create Room</button>
        <button onClick={joinRoom}>Join Room</button>
        <button onClick={startGame}>Start Game</button>
        <button onClick={leaveRoom}>Leave Room</button>
      </div>

      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        style={{ border: "1px solid black", marginTop: 10 }}
      />

      <div style={{ marginTop: 10 }}>
        <input id="guessInput" placeholder="Type your guess" />
        <button
          onClick={() => {
            const guess = document.getElementById("guessInput").value;
            submitGuess(guess);
          }}
        >
          Submit Guess
        </button>
      </div>

      <div>
        <h3>Players: {(players || []).join(", ")}</h3>
        <h3>Messages:</h3>
        {(messages || []).map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>
    </div>
  );
}
