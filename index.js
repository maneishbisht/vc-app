import express from "express";
import {Server} from "socket.io";
import {createServer} from "http";
import path, { dirname } from "path";
import { fileURLToPath } from "url";    

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const server = createServer(app);
const io = new Server(server);

const allUsers = {};


io.on("connection",(socket)=>{

    io.emit("joined",allUsers);

    socket.on("join-user",(userName)=>{
        allUsers[userName] = {userName,id:socket.id};
        io.emit("joined",allUsers)
        console.log(userName);
    });

    socket.on("offer",({from,to,offer})=>{
      io.to(allUsers[to].id).emit("offer",{from,to,offer});
    })

    socket.on("answer",({from,to,answer})=>{
        io.to(allUsers[from].id).emit("answer",{from,to,answer});
    })

    socket.on("icecandidate",(candidate)=>{
        socket.broadcast.emit("icecandidate",candidate);
    })

    socket.on("end-call",({from,to})=>{
        socket.to(allUsers[to].id).emit("end-call");
    })

    socket.on("call-ended",(caller)=>{
        io.to(allUsers[caller[0]].id).emit("call-ended");
        io.to(allUsers[caller[1]].id).emit("call-ended");
    })
    
    socket.on("disconnect",()=>{
        for(const key in allUsers){
        if(allUsers[key].id===socket.id)
            {
                delete allUsers[key];
            }
        }
        socket.broadcast.emit("joined",allUsers);
        })

    })


app.set("view engine","ejs");
app.set("views",path.resolve(__dirname,"views"));

app.use(express.static(path.resolve(__dirname, 'public')));

app.get("/",(req,res)=>{
    console.log("GET REQUEST RECEIVED");
    res.render("index");
})

server.listen(9000,()=>{
    console.log("Server listening on port 9000");
})