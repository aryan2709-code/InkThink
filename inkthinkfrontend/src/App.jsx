import { useEffect } from "react";
import {io} from "socket.io-client";

const socket = io("http://localhost:4000"); // backend URL

const App = () => {

useEffect(() => {
socket.on("connect", () => {
  console.log("Connected with the server with id: ",socket.id)
})

socket.on("disconnect", () => {
  console.log("Disconnected from the server!")
})

// Clean - up function
return () => {
      socket.off("connect");
      socket.off("disconnect");
    };


},[])

  return (
    <div>
      Socket.Io Connection Testing
    </div>
  )
}

export default App;