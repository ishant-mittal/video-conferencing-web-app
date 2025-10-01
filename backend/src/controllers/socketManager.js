// creating a real time server
import { Server } from "socket.io"

// in memory database to track concurrent data (resets on refresh)
let connections = {} // stores who is in which room
let messages = {} // stores chat history
let timeOnline = {} // tracks when each user connected to the room

// attaching the socket.io to the existing server ip address to listen for requests
export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*", // allows the user to connect from any ip address
            methods: ["GET", "POST"], // only get and post methods allowed for a user
            allowedHeaders: ["*"], // any custom headers that are allowed with the requests
            credentials: true // can a user send cookies and auth tokens
        }
    });

    // entry point for every connected user
    io.on("connection", (socket) => { // event listener: io is listening for any connection requests that are made

        // a new user connected to the server
        console.log("something connected")

        socket.on("join-call", (path) => {

            // check if a room for this path exists, if not then create one
            if (connections[path] === undefined) {
                connections[path] = []
            }
            // add the unique user id to the room path
            connections[path].push(socket.id)
            // start the new user connection timer
            timeOnline[socket.id] = new Date();

            // tell everyone in the room that a new user has joined
            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            // if there is a room chat history, only send it to the new user
            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender']) // io.to.emit: to send a message from server to a particular user
                }
            }
        })

        // a user sends the signal, reciever id and the message to the server
        socket.on("signal", (toId, message) => {

            // the server sends the signal and the message to the requested reciever
            io.to(toId).emit("signal", socket.id, message);
        })

        // handling chat messages
        socket.on("chat-message", (data, sender) => {

            // find the room that the sender is in
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {

                    // if the room is not found and the socket.id is the one we are looking for then return the roomkey (***)
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {

                // check if a message memory exits for that room, if not then create one
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                // store the message in the chat history
                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                //show the message to everyone in the chatroom
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }
        })

        // activated for a user when s/he disconnects (optimized)
        socket.on("disconnect", () => {

            // to store the room name once found
            let roomFound = null;

            // loop through each room [roomName, participants] in the connections object
            for (const [roomName, participants] of Object.entries(connections)) {
                
                // find the index of the disconnected user in the current room participant list
                const index = participants.indexOf(socket.id);

                // if the user is found in this room (index is not -1)
                if (index !== -1) {
                    roomFound = roomName; // store the name of the room
                    
                    // i. remove the user from the room participant array
                    participants.splice(index, 1);

                    // ii. notify remaining participants in room
                    participants.forEach(participantId => {
                        io.to(participantId).emit('user-left', socket.id);
                    });

                    // iii. if the room is empty, delete it
                    if (participants.length === 0) {
                        delete connections[roomName];
                    }
                    break; 
                }
            }

            if (roomFound) {
                console.log(`user ${socket.id} removed from room ${roomFound}`);
            }
        })
    })

    return io;
}

// io: represents the whole server (all the users connected)
// socket: represents the single client that connected (used to recieve (socket.on) and send (socket.emit) message to a a single user)
// each socket has a unique id: socket.id