const socket = io();

const createUserBtn = document.getElementById("create-user");
const userName = document.getElementById("username")
const allUsersHTML = document.getElementById("allusers")
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const endCallBtn = document.getElementById("end-call-btn")

let caller = [];
let localStream; 
//SINGLETON OR FACTORY METHOD FOR PEER CONNECTION 

const PeerConnection = (function(){
    
    let peerConnection ;
    
    const createPeerConnection = ()=>{
        
        const config = {iceServers:[{urls : 'stun:stun.l.google.com:19302'}]}
        peerConnection = new RTCPeerConnection(config);
        
        //add local stream to peer connection
        localStream.getTracks().forEach((track)=>{
            peerConnection.addTrack(track,localStream);
        })
        //listen to remote stream and add to peer connection
        peerConnection.ontrack = function(event){
            remoteVideo.srcObject = event.streams[0];
        }
        //listen for ICE candidate
        peerConnection.onicecandidate=function(event){
            if(event.candidate){
                socket.emit("icecandidate",event.candidate);
            }
        }
        
        return peerConnection;
        
    }
    
    return{
        getInstance : ()=>{
            if(!peerConnection){    
                peerConnection = createPeerConnection();
            }
            return peerConnection;
        }
    }})();
    
    
const startMyVideo = async()=>{
        try{
            const stream = await navigator.mediaDevices.getUserMedia({audio:true,video:true})
            localStream = stream;
            localVideo.srcObject = stream; 
        }catch(error){}
}
// START THE VEDIO ON LOG IN 

startMyVideo();

// FUNCTIONALITY FOR STARTING THE CALL

const startCall = async(user)=>{
        const pc = PeerConnection.getInstance();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer",{from : userName.value,to:user,offer:pc.localDescription});
}
    
const endCall = async(user)=>{
        const pc = PeerConnection.getInstance();
        if(pc){
            pc.close();
        }
}

//initialize app

socket.on("joined",(allUsers)=>{

    const createUsersHtml=()=>{
        allUsersHTML.innerHTML = "";    
        for(const user in allUsers){
            const li = document.createElement("li");
            li.textContent = `${user} ${user===userName.value?"(You)":""}`;
            if(user!==userName.value){
                const button = document.createElement("button");
                button.addEventListener("click",(e)=>{
                    startCall(user);
                })
                button.classList.add("call-btn");
                const img = document.createElement("img");
                img.setAttribute("src","/images/call.png");
                img.setAttribute("width",20);
                button.appendChild(img);
                li.appendChild(button);
            }
            allUsersHTML.appendChild(li);
        }
        
    }

    createUsersHtml()

})

socket.on("offer",async({from,to,offer})=>{
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer",{from,to,answer:pc.localDescription});
    caller = [from,to];
})

socket.on("answer",async({from,to,answer})=>{
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(answer);
    endCallBtn.style.display = 'block';
    socket.emit("end-call",({from,to}));
    caller = [from,to];

})

socket.on("icecandidate",async(candidate)=>{
    const pc = PeerConnection.getInstance();
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
})

socket.on("end-call",()=>{
    endCallBtn.style.display = "block";
})

socket.on("call-ended",(caller)=>{
    endCall();
    endCallBtn.style.display = "none";
    userNameContainer.style.display = "block";
})
       
createUserBtn.addEventListener("click",(e)=>{
        const userNameContainer = document.querySelector(".username-input");
    if(userName.value!=="")
        {
            socket.emit("join-user",userName.value)
        }
    userNameContainer.style.display = "none";
})

endCallBtn.addEventListener("click",(e)=>{
    socket.emit("call-ended",caller);
})