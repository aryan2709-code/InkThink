import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// --- Constants ---
const SOCKET_URL = "http://localhost:4000";

// --- Socket Hook (Ensures single instance) ---
function useSocket() {
  const socketRef = useRef(null);
  if (!socketRef.current) {
    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
  }
  return socketRef.current;
}

// --- Main App Component ---
export default function App() {
  const socket = useSocket();

  // --- State Management ---
  // Player & Room State
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [gameState, setGameState] = useState("lobby"); // 'lobby', 'game', 'game_over'
  
  // Game Logic State
  const [players, setPlayers] = useState([]); // Array of player names
  const [scores, setScores] = useState(new Map()); // Map<username, score>
  const [isDrawer, setIsDrawer] = useState(false);
  const [currentDrawer, setCurrentDrawer] = useState("");
  const [currentWord, setCurrentWord] = useState("");
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [remainingTime, setRemainingTime] = useState(null);
  const [gameWinner, setGameWinner] = useState(null);

  // UI State
  const [messages, setMessages] = useState([]);
  const [guess, setGuess] = useState("");

  // Drawing Tool State (REMOVED)
  
  // Refs
  const canvasRef = useRef(null);
  const chatEndRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastDrawPointRef = useRef(null); // {x, y}

  // --- Utility Functions ---
  const addMessage = (m) => {
    setMessages((prev) => [...prev, m].slice(-200)); // Keep list bounded
  };

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // --- Canvas Setup & Event Handlers ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'game') return;

    const ctx = canvas.getContext("2d");
    
    // Helper to draw a single stroke segment
    // This is used by both local drawing and socket event drawing
    const drawSegment = (stroke) => {
      if (!ctx || !stroke) return;
      
      // Handle the "clear" event
      if (stroke.clear) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Set styles (hardcoded to 3px black)
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#000000";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      if (stroke.prevX != null && stroke.prevY != null) {
        // Line segment
        ctx.moveTo(stroke.prevX, stroke.prevY);
        ctx.lineTo(stroke.x, stroke.y);
        ctx.stroke();
      } else {
        // Single point (or start of a line)
        // Draw a tiny filled circle for a more visible dot
        ctx.fillStyle = "#000000";
        ctx.arc(stroke.x, stroke.y, 1.5, 0, 2 * Math.PI); // 1.5 = 3 (width) / 2
        ctx.fill();
      }
    };

    // --- Pointer Event Handlers (for the local drawer) ---
    const onPointerDown = (e) => {
      if (!isDrawer || e.button !== 0) return; // Only drawer, only left click
      isDrawingRef.current = true;

      const rect = canvas.getBoundingClientRect();
      // SCALING FIX: Convert screen coords to canvas coords
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const stroke = {
        x,
        y,
        prevX: null,
        prevY: null,
      };

      drawSegment(stroke); // Draw dot locally
      lastDrawPointRef.current = { x, y };
      socket.emit("drawing", { roomId, stroke }); // Emit dot
      
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDrawingRef.current || !isDrawer) return;

      const rect = canvas.getBoundingClientRect();
      // SCALING FIX: Convert screen coords to canvas coords
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const prev = lastDrawPointRef.current;

      const stroke = {
        x,
        y,
        prevX: prev?.x ?? null,
        prevY: prev?.y ?? null,
      };

      drawSegment(stroke); // Draw segment locally
      lastDrawPointRef.current = { x, y };
      socket.emit("drawing", { roomId, stroke }); // Emit segment
    };

    const onPointerUp = (e) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      lastDrawPointRef.current = null;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore errors if capture was already released
      }
    };

    // --- Socket listener for remote drawings ---
    const handleRemoteDrawing = ({ stroke }) => {
      drawSegment(stroke);
    };
    
    socket.on("drawing", handleRemoteDrawing);

    // Attach local listeners
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp); // Listen on window for 'lift-off' anywhere
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      // Cleanup
      socket.off("drawing", handleRemoteDrawing);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDrawer, roomId, socket, gameState]); // Removed drawColor and lineWidth dependencies

  // --- Core Socket Event Listeners (Game Logic) ---
  useEffect(() => {
    const handlers = {
      message: (payload) => {
        const msg = typeof payload === "string" ? payload : payload.message;
        addMessage(`SYSTEM: ${msg || "Unknown message"}`);
      },
      error: ({ message }) => {
        addMessage(`ERROR: ${message || "Unknown error"}`);
      },
      roomCreated: ({ roomId, message }) => {
        addMessage(message || `Room ${roomId} created.`);
        setGameState("game");
      },
      roomJoined: ({ roomId, message }) => {
        addMessage(message || `Joined room ${roomId}.`);
        setGameState("game");
      },
      gameStarted: ({ players: pList, totalRounds: tr, message }) => {
        addMessage(message || "The game has started!");
        setPlayers(Array.isArray(pList) ? pList : []);
        // Initialize scores
        const newScores = new Map(
          (Array.isArray(pList) ? pList : []).map(name => [name, 0])
        );
        setScores(newScores);
        setTotalRounds(tr || pList.length);
        setGameState("game");
      },
      roundStarted: ({ drawer, roundNumber: rn, remainingTime: rt, message }) => {
        addMessage(message || `Round ${rn + 1} started. ${drawer} is drawing.`);
        clearCanvasLocal(); // CRITICAL: Clear canvas for everyone
        setIsDrawer(drawer === username);
        setCurrentDrawer(drawer);
        setCurrentRound(rn || 0);
        // FIX: Only clear the word if you are NOT the new drawer.
        // The drawer will get the word from 'yourTurn'.
        if (drawer !== username) {
          setCurrentWord(""); // Clear word for guessers
        }
        setRemainingTime(Math.ceil((rt || 60000) / 1000));
        setGameWinner(null); // Clear winner from previous game
      },
      yourTurn: ({ word, remainingTime: rt, message }) => {
        // We don't add the word to the public chat log
        addMessage(message || `It's your turn! Good luck.`);
        setCurrentWord(word || "");
        setIsDrawer(true);
        setRemainingTime(Math.ceil((rt || 60000) / 1000));
      },
      timer: ({ remainingTime: msOrSec }) => {
        // Backend sends time in different formats, normalize to seconds
        const timeInMs = typeof msOrSec === 'number' ? msOrSec : 0;
        const timeInSec = timeInMs > 1000 ? Math.ceil(timeInMs / 1000) : Math.ceil(timeInMs);
        setRemainingTime(timeInSec);
      },
      timerUpdate: ({ remainingTime: msOrSec }) => {
        const timeInMs = typeof msOrSec === 'number' ? msOrSec : 0;
        const timeInSec = timeInMs > 1000 ? Math.ceil(timeInMs / 1000) : Math.ceil(timeInMs);
        setRemainingTime(timeInSec);
      },
      correctGuess: ({ player, guess, message }) => {
        addMessage(message || `${player} guessed correctly!`);
      },
      roundEnded: ({ winner, word, scores: scoresPayload, message }) => {
        addMessage(message || `Round over! The word was: ${word}.`);
        if (winner) addMessage(`${winner} won the round!`);
        
        // Update scores from the payload
        if (Array.isArray(scoresPayload)) {
          const newScores = new Map(scoresPayload.map(s => [s.player, s.score]));
          setScores(newScores);
        }
        
        setIsDrawer(false);
        setCurrentWord("");
        setRemainingTime(null);
      },
      gameEnded: ({ winner, scores: scoresPayload, message }) => {
        addMessage(message || `GAME OVER!`);
        if (winner) addMessage(`The winner is ${winner}!`);
        
        // Update final scores
        if (Array.isArray(scoresPayload)) {
          const newScores = new Map(scoresPayload.map(s => [s.player, s.score]));
          setScores(newScores);
        }

        setGameState("game_over");
        setGameWinner(winner);
        setIsDrawer(false);
        setCurrentWord("");
        setRemainingTime(null);
      },
      playerLeft: (payload) => {
        const msg = payload.message || (payload.player ? `${payload.player} left.` : "A player left.");
        addMessage(msg);
        // Note: Backend doesn't seem to send updated player/score list here.
        // We'll rely on the next 'gameStarted' or 'roundEnded' to sync.
      },
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => {
      Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
    };
  }, [socket, username]); // Re-run if username changes (for 'isDrawer' checks)

  // --- Auto-scroll chat ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Timer Countdown ---
  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0) return;
    if (gameState !== 'game') return; // Only count down during the game

    const timerId = setTimeout(() => {
      setRemainingTime((prevTime) => (prevTime ? prevTime - 1 : 0));
    }, 1000); // 1 second interval

    return () => {
      clearTimeout(timerId); // Cleanup
    };
  }, [remainingTime, gameState]); // Re-run when time changes or game state changes


  // --- Client-Side Actions ---
  const handleCreateRoom = () => {
    if (!username || !roomId) return addMessage("Name and Room ID are required.");
    socket.emit("createRoom", { roomId, username });
  };

  const handleJoinRoom = () => {
    if (!username || !roomId) return addMessage("Name and Room ID are required.");
    socket.emit("joinRoom", { roomId, username });
  };

  const handleStartGame = () => {
    socket.emit("startGame", { roomId });
  };

  const handleSubmitGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || isDrawer) return;
    socket.emit("submitGuess", { roomId, guess: guess.trim() });
    setGuess(""); // Clear input
  };

  const handleClearCanvas = () => {
    if (!isDrawer) return;
    // 1. Clear locally
    clearCanvasLocal();
    // 2. Emit a special "clear" stroke to others
    socket.emit("drawing", { 
      roomId, 
      stroke: { clear: true } 
    });
  };

  const handlePlayAgain = () => {
    // Reset all game state
    setGameState("lobby");
    setPlayers([]);
    setScores(new Map());
    setIsDrawer(false);
    setCurrentDrawer("");
    setCurrentWord("");
    setCurrentRound(0);
    setTotalRounds(0);
    setRemainingTime(null);
    setGameWinner(null);
    setMessages([]);
    // We keep username and roomId for convenience
  };

  // --- Render Functions ---

  const renderLobby = () => (
    <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-2xl">
      <h1 className="text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
        InkThink
      </h1>
      <div className="space-y-4">
        <input
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
        />
        <input
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          maxLength={20}
        />
      </div>
      <div className="flex gap-4">
        <button
          className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition duration-150 ease-in-out"
          onClick={handleCreateRoom}
          disabled={!username || !roomId}
        >
          Create Room
        </button>
        <button
          className="w-full px-4 py-3 font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition duration-150 ease-in-out"
          onClick={handleJoinRoom}
          disabled={!username || !roomId}
        >
          Join Room
        </button>
      </div>
      <div className="h-48 w-full bg-slate-900 p-3 rounded-lg overflow-y-auto text-sm border border-slate-700">
        {messages.map((m, i) => (
          <p key={i} className={`my-1 ${m.startsWith("ERROR:") ? "text-red-400" : "text-slate-300"}`}>{m}</p>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-2xl text-center">
      <h1 className="text-5xl font-bold text-white">
        Game Over!
      </h1>
      <h2 className="text-2xl font-bold text-white">
        Winner: <span className="text-blue-400">{gameWinner || "Nobody"}</span>
      </h2>
      
      <div className="text-left bg-slate-700 p-4 rounded-lg border border-slate-600 max-h-60 overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-2">Final Scores:</h3>
        <ul className="space-y-1">
          {[...scores.entries()]
            .sort((a, b) => b[1] - a[1]) // Sort by score descending
            .map(([name, score]) => (
              <li key={name} className="flex justify-between text-slate-200">
                <span>{name}</span>
                <span className="font-bold">{score}</span>
              </li>
            ))}
        </ul>
      </div>

      <button
        className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition duration-150 ease-in-out"
        onClick={handlePlayAgain}
      >
        Play Again
      </button>
    </div>
  );

  const renderGame = () => (
    <div className="w-full max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* --- Left Column: Players & Chat --- */}
      <div className="lg:col-span-1 space-y-6 flex flex-col">
        
        {/* --- Scoreboard --- */}
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-3">Players</h2>
          <ul className="space-y-2">
            {[...scores.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, score]) => (
                <li key={name} className={`flex justify-between items-center p-2 rounded-lg ${currentDrawer === name ? 'bg-blue-700' : 'bg-slate-700'}`}>
                  <span className="font-medium text-white">
                    {name}
                    {currentDrawer === name && " ✏️"}
                    {username === name && " (You)"}
                  </span>
                  <span className="font-bold text-lg text-blue-300">{score}</span>
                </li>
            ))}
          </ul>
        </div>
        
        {/* --- Chat Box --- */}
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 flex-grow flex flex-col min-h-[200px] lg:min-h-0">
          <h2 className="text-2xl font-bold text-white mb-3">Chat</h2>
          <div className="flex-grow bg-slate-900 p-3 rounded-lg overflow-y-auto text-sm border border-slate-700 h-48 lg:h-full">
            {messages.map((m, i) => (
              <p key={i} className={`my-1 break-words ${m.startsWith("ERROR:") ? "text-red-400" : m.startsWith("SYSTEM:") ? "text-slate-400 italic" : "text-slate-200"}`}>
                {m}
              </p>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* --- Right Column: Game Area --- */}
      <div className="lg:col-span-3 space-y-4">
        
        {/* --- Game Info Bar --- */}
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 flex flex-wrap justify-between items-center gap-4">
          <button
            className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-150"
            onClick={handleStartGame}
            disabled={totalRounds > 0} // Disable if game already started
          >
            Start Game
          </button>
          
          <div className="text-xl font-bold text-white">
            Round: <span className="text-blue-300">{totalRounds > 0 ? currentRound + 1 : '-'} / {totalRounds || '-'}</span>
          </div>
          
          {/* --- THIS IS THE NEW LOCATION FOR THE WORD --- */}
          {isDrawer && currentWord && (
            <div className="text-xl font-bold text-white">
              Draw: <span className="text-green-400">{currentWord}</span>
            </div>
          )}
          
          {/* This is the info bar version, good for all players to see who is drawing */}
          {!isDrawer && currentDrawer && (
             <div className="text-xl font-bold text-white">
              Drawer: <span className="text-blue-300">{currentDrawer}</span>
            </div>
          )}

          {remainingTime != null && (
            <div className={`text-3xl font-extrabold ${remainingTime <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
              ⏳ {remainingTime}s
            </div>
          )}
        </div>

        {/* --- Canvas & Word Overlay --- */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800} // Set fixed resolution for consistency
            height={500} // Set fixed resolution
            className={`bg-white rounded-lg shadow-2xl w-full h-auto aspect-[8/5] ${isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
          />

          {/* --- REMOVED: Drawer's Word (Overlay) --- */}
        </div>

        {/* --- Drawing Tools / Guess Box --- */}
        {isDrawer ? (
          <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 flex justify-end items-center gap-4">
            {/* Clear Button */}
            <button
              className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-150"
              onClick={handleClearCanvas}
            >
              Clear
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitGuess} className="flex gap-4">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              className="flex-grow px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={currentDrawer ? `Guess what ${currentDrawer} is drawing...` : "Waiting for round to start..."}
              disabled={!currentDrawer || remainingTime === 0}
            />
            <button
              type="submit"
              className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition duration-150 ease-in-out disabled:opacity-50"
              disabled={!guess.trim() || !currentDrawer || remainingTime === 0}
            >
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
      {gameState === "lobby" && renderLobby()}
      {gameState === "game" && renderGame()}
      {gameState === "game_over" && renderGameOver()}
    </div>
  );
}

