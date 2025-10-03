// All the logic related to rooms, i.e room creation , keeping track of the sockets enrolled in a room, etc lives here 

// Tracking Rooms and their players
const rooms = new Map();
// Structure : roomId => { players : Set(socketIds) } // using a set ensures no player can be added twice to the same room

const roomHandler = (io,socket) => {

    // Listen for room create events from the client
    socket.on("createRoom", ({roomId, username}) => {

        try
        {
            console.log(`User ${username} wants to create room: ${roomId}`);

            // Check if room already exists
            if(rooms.has(roomId))
            {
                return socket.emit("error",{"message" : "The room already exists"})
            }

            // Create a new room in the map
            rooms.set(roomId, {players : new Set([socket.id])} )

            // Join this client into the room
            socket.join(roomId);

            // Acknowledge back to the client
            socket.emit("roomCreated", {roomId, username});

            socket.to(roomId).emit("message", `${username} created room ${roomId}`);

            console.log(`Room ${roomId} created with player ${username}`);
        }
        catch (error)
        {
            console.log("Error in the create room handler: ", error.message);
            socket.emit("error",{"message" : "failed to create room"})
        }

    } )

    //  Listener for Room Join events from the client
    socket.on("joinRoom", ({roomId, username}) => {

        try 
        {
             // First Check if the room exists or not
             if(!rooms.has(roomId))
             {
                return socket.emit("error", {"message" : "This room does not exist"})
             }

             console.log(`User ${username} wants to join the room ${roomId}`);

             const room = rooms.get(roomId);
             room.players.add(socket.id);

             // Join this client into the room
             socket.join(roomId);

             // Acknowledge Back to the client
             socket.emit("roomJoined", {roomId, username});

            // Notify others in the room
            socket.to(roomId).emit("message", `${username} joined room ${roomId}`);
        } 
        catch (error)
        {
            console.log("Error in the joinRoom handler", error.message)
            socket.emit("error",{"message" : "failed to join the room"})
        }

       
    } )

    // Listener for leaving room events from the client
    socket.on("leaveRoom", ({roomId, username}) => {
        try
        {
           if(rooms.has(roomId))
           {
              const room = rooms.get(roomId);
              room.players.delete(socket.id);
              console.log(`User ${username} wants to leave the room ${roomId}`)

              // Remove this client from the room
              socket.leave(roomId);

              // Notify others in the room
              io.to(roomId).emit("message", `${username} left the room ${roomId}`);

              // Delete room if empty
              if(room.players.size == 0)
              {
                rooms.delete(roomId);
                console.log(`Room ${roomId} was deleted because it was empty`)
              }
           }
        } 
        catch (error)
        {
            console.log("Error in the leaveRoom handler", error.message);
            socket.emit("error", {"message" : "failed to leave the room"});
        }
    } )

    // Listener for disconnect clean-up
    socket.on("disconnecting", () => {
        // socket.rooms also contains the current socket's id, so filter it out
        const joinedRooms = [...socket.rooms].filter(roomId => roomId !== socket.id);

        // Run a loop on these joinedRooms and remove the current socket from each one of these rooms
        joinedRooms.forEach(roomId => {
            if(rooms.has(roomId))
            {
                const room = rooms.get(roomId);
                // Remove this socket from the player's room's set
                room.players.delete(socket.id);

                // Notify remaining players in the room
                socket.to(roomId).emit("playerLeft",{"socket" : socket.id})

                // If the room is empty now, delete it
                if(room.players.size == 0)
                {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} was deleted because it was empty`);
                }
            }
        })
        console.log(`Socket ${socket.id} was disconnected and the cleanup logic was performed.`)
    })
}

export default roomHandler;