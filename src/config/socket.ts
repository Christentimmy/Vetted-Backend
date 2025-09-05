import { Server } from "socket.io";
import { socketController } from "../controllers/socket_controller";
import authenticateSocket from "../middlewares/socket_middleware";
// import { getListOfActiveFriends } from "../controller/message_controller";

let io: Server;
export const onlineUsers = new Map<string, string>(); // userId -> socketId

export function setupSocket(server: any) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    // Apply middleware
    io.use(authenticateSocket);

    // Handle connection
    io.on("connection", async (socket) => {
        const userId = socket.data.user.id;

        // Check if user     has an active connection
        if (onlineUsers.has(userId)) {
            const existingSocketId = onlineUsers.get(userId);
            if (existingSocketId && existingSocketId !== socket.id) {
                const existingSocket = io.sockets.sockets.get(existingSocketId);
                if (existingSocket) {
                    existingSocket.disconnect(true); // Force disconnect old socket
                }
            }
        }

        // Join user's own room for direct messages
        socket.join(userId);
        
        // Register new connection
        onlineUsers.set(userId, socket.id);


        // Handle typing indicators
        socket.on('typing', async (data) => {
            if (typeof data === "string") {
                data = JSON.parse(data);
            }
            const receiverId = data["receiverId"];
            if (!receiverId) return;
            io.to(receiverId).emit('typing', { senderId: userId });
        });

        socket.on('stop-typing', (data) => {
            if (typeof data === "string") {
                data = JSON.parse(data);
            }
            const receiverId = data["receiverId"];
            if (!receiverId) return;
            io.to(receiverId).emit('stop-typing', { senderId: userId });
        });

        // Set up message handlers
        socketController.sendMessage(io, socket, onlineUsers, userId);
        socketController.markMessageAsRead(io, socket, onlineUsers, userId);


        // Handle disconnection
        socket.on("disconnect", async () => {
            
            // Only remove if this is the current socket for this user
            if (onlineUsers.get(userId) === socket.id) {
                onlineUsers.delete(userId);
            }
        });
    });

    return io;
}

export { io };