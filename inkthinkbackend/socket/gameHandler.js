// Game Handling Logic : All the game related logic will be handled here

import {rooms} from "./gameState.js";
import { words } from "./gameState.js";

const gameHandler = (io,socket) => {

    // Start game request
    socket.on("startGame", ({roomId}) => {
        try
        {
           const room = rooms.get(roomId);
           if(!room)
           {
            return socket.emit("error", {message : "The Room does not exist"})
           }
           if(room.ongoingGame)
           {
            return socket.emit("error",{message: "A game is ongoing currently"})
           }

           // Initialise Game State
           room.ongoingGame = true;
           room.roundNumber = 0;
           room.totalRounds = room.players.size;
           room.drawer = null;
           room.currentWord = null;
           room.roundActive = false;

           io.to(roomId).emit("gameStarted",{
            totalRounds : room.totalRounds,
            players : [...room.players]
           });

           console.log(`Game started in room ${roomId}`)
        }
        catch(error)
        {
            
        }
    } )


}