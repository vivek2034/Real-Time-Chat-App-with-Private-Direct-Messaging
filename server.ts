import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface ChatUser {
  id: string;
  username: string;
  room: string;
  color: string;
}

interface ChatMessage {
  id: string;
  room: string;
  sender: string;
  senderId: string;
  senderColor: string;
  text: string;
  timestamp: number;
  type: "user" | "system";
  reactions: Record<string, string[]>; // emoji -> array of usernames
  image?: string; // Base64 data URI
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Create HTTP server
  const server = http.createServer(app);

  // Create WebSocket server attached to the HTTP server
  const wss = new WebSocketServer({ noServer: true });

  // Map to store WebSocket -> User mapping
  const activeSockets = new Map<WebSocket, ChatUser>();

  // Store in-memory chat histories (up to 100 messages per room)
  const roomHistories: Record<string, ChatMessage[]> = {};

  // Track rooms that exist
  const knownRooms = new Set<string>(["General", "Tech Talk", "Chill Zone", "Random"]);

  // Helper: Broadcast to users in a specific room
  function broadcastToRoom(room: string, data: any, excludeWs?: WebSocket) {
    const messageStr = JSON.stringify(data);
    for (const [ws, user] of activeSockets.entries()) {
      if (user.room === room && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }

  // Helper: Get users currently in a room
  function getUsersInRoom(room: string) {
    const list: ChatUser[] = [];
    for (const user of activeSockets.values()) {
      if (user.room === room) {
        list.push(user);
      }
    }
    return list;
  }

  // Helper: Get all online users in the app
  function getAllOnlineUsers() {
    const list: ChatUser[] = [];
    for (const user of activeSockets.values()) {
      list.push(user);
    }
    return list;
  }

  // Helper: Get all active rooms and user counts
  function getRoomsWithCounts() {
    const rooms: Record<string, number> = {};
    // Initialize default rooms
    for (const room of knownRooms) {
      if (!room.startsWith("dm:")) {
        rooms[room] = 0;
      }
    }
    // Count active users in each room
    for (const user of activeSockets.values()) {
      if (!user.room.startsWith("dm:")) {
        rooms[user.room] = (rooms[user.room] || 0) + 1;
      }
    }
    return Object.entries(rooms).map(([name, count]) => ({ name, count }));
  }

  // Handle WebSocket upgrade
  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // Handle WebSocket connections
  wss.on("connection", (ws: WebSocket) => {
    const connectionId = Math.random().toString(36).substring(2, 9);

    ws.on("message", (messageData: string) => {
      try {
        const event = JSON.parse(messageData);
        const { type, payload } = event;

        switch (type) {
          case "join": {
            const { username, room, color } = payload;
            const targetRoom = room || "General";
            
            const isDM = targetRoom.startsWith("dm:");
            if (!isDM) {
              // Register room as known
              knownRooms.add(targetRoom);
            }

            const user: ChatUser = {
              id: connectionId,
              username: username || "Anonymous",
              room: targetRoom,
              color: color || "#3b82f6",
            };

            activeSockets.set(ws, user);

            let systemMsg: ChatMessage | null = null;
            if (!isDM) {
              // Create system message
              systemMsg = {
                id: Math.random().toString(36).substring(2, 9),
                room: targetRoom,
                sender: "System",
                senderId: "system",
                senderColor: "#6b7280",
                text: `${user.username} joined the chat`,
                timestamp: Date.now(),
                type: "system",
                reactions: {},
              };

              // Save system message in history
              if (!roomHistories[targetRoom]) {
                roomHistories[targetRoom] = [];
              }
              roomHistories[targetRoom].push(systemMsg);
              if (roomHistories[targetRoom].length > 100) {
                roomHistories[targetRoom].shift();
              }
            }

            // Send initial state to the user who joined
            ws.send(
              JSON.stringify({
                type: "welcome",
                payload: {
                  userId: connectionId,
                  room: targetRoom,
                  history: roomHistories[targetRoom] || [],
                  activeUsers: isDM ? [] : getUsersInRoom(targetRoom),
                  rooms: getRoomsWithCounts(),
                  allOnlineUsers: getAllOnlineUsers(),
                },
              })
            );

            // Broadcast join and presence update to room (only if not DM)
            if (!isDM && systemMsg) {
              broadcastToRoom(targetRoom, {
                type: "user_joined",
                payload: {
                  user,
                  systemMessage: systemMsg,
                  activeUsers: getUsersInRoom(targetRoom),
                },
              }, ws);
            }

            // Broadcast presence update (all online users) to EVERYONE
            const presencePayload = {
              type: "presence_update",
              payload: {
                allOnlineUsers: getAllOnlineUsers(),
              },
            };
            const presenceStr = JSON.stringify(presencePayload);
            for (const client of activeSockets.keys()) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(presenceStr);
              }
            }

            // Broadcast room list update to EVERYONE
            const updatedRooms = getRoomsWithCounts();
            for (const client of activeSockets.keys()) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "rooms_list",
                    payload: { rooms: updatedRooms },
                  })
                );
              }
            }
            break;
          }

          case "message": {
            const user = activeSockets.get(ws);
            if (!user) return;

            const { text, image } = payload;
            if ((!text || text.trim() === "") && !image) return;

            const newMsg: ChatMessage = {
              id: Math.random().toString(36).substring(2, 9),
              room: user.room,
              sender: user.username,
              senderId: user.id,
              senderColor: user.color,
              text: (text || "").trim(),
              timestamp: Date.now(),
              type: "user",
              reactions: {},
              image: image || undefined,
            };

            // If room is a DM, route to the two specific users!
            if (user.room.startsWith("dm:")) {
              const parts = user.room.substring(3).split("-");
              if (parts.length === 2) {
                const [id1, id2] = parts;
                const messageStr = JSON.stringify({
                  type: "new_message",
                  payload: { message: newMsg },
                });
                
                // Send to both users' active sockets
                for (const [clientWs, clientUser] of activeSockets.entries()) {
                  if ((clientUser.id === id1 || clientUser.id === id2) && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(messageStr);
                  }
                }

                // Save to room history
                if (!roomHistories[user.room]) {
                  roomHistories[user.room] = [];
                }
                roomHistories[user.room].push(newMsg);
                if (roomHistories[user.room].length > 100) {
                  roomHistories[user.room].shift();
                }
                break;
              }
            }

            if (!roomHistories[user.room]) {
              roomHistories[user.room] = [];
            }
            roomHistories[user.room].push(newMsg);
            if (roomHistories[user.room].length > 100) {
              roomHistories[user.room].shift();
            }

            // Broadcast to the whole room
            broadcastToRoom(user.room, {
              type: "new_message",
              payload: { message: newMsg },
            });
            break;
          }

          case "typing": {
            const user = activeSockets.get(ws);
            if (!user) return;

            const { isTyping } = payload;

            // If it's a DM, send directly to the other participant
            if (user.room.startsWith("dm:")) {
              const parts = user.room.substring(3).split("-");
              if (parts.length === 2) {
                const [id1, id2] = parts;
                const typingStr = JSON.stringify({
                  type: "user_typing",
                  payload: {
                    userId: user.id,
                    username: user.username,
                    room: user.room,
                    isTyping,
                  },
                });
                for (const [clientWs, clientUser] of activeSockets.entries()) {
                  if (clientUser.id !== user.id && (clientUser.id === id1 || clientUser.id === id2) && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(typingStr);
                  }
                }
                break;
              }
            }

            broadcastToRoom(user.room, {
              type: "user_typing",
              payload: {
                userId: user.id,
                username: user.username,
                room: user.room,
                isTyping,
              },
            }, ws);
            break;
          }

          case "reaction": {
            const user = activeSockets.get(ws);
            if (!user) return;

            const { messageId, emoji } = payload;
            const history = roomHistories[user.room] || [];
            const msg = history.find((m) => m.id === messageId);

            if (msg) {
              if (!msg.reactions) {
                msg.reactions = {};
              }
              if (!msg.reactions[emoji]) {
                msg.reactions[emoji] = [];
              }

              const reactors = msg.reactions[emoji];
              const idx = reactors.indexOf(user.username);
              if (idx > -1) {
                // Toggle reaction off
                reactors.splice(idx, 1);
                if (reactors.length === 0) {
                  delete msg.reactions[emoji];
                }
              } else {
                // Add reaction
                reactors.push(user.username);
              }

              // If it's a DM, send to both participants
              if (user.room.startsWith("dm:")) {
                const parts = user.room.substring(3).split("-");
                if (parts.length === 2) {
                  const [id1, id2] = parts;
                  const reactionStr = JSON.stringify({
                    type: "message_reaction",
                    payload: {
                      messageId,
                      reactions: msg.reactions,
                    },
                  });
                  for (const [clientWs, clientUser] of activeSockets.entries()) {
                    if ((clientUser.id === id1 || clientUser.id === id2) && clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(reactionStr);
                    }
                  }
                  break;
                }
              }

              // Broadcast updated reaction to the room
              broadcastToRoom(user.room, {
                type: "message_reaction",
                payload: {
                  messageId,
                  reactions: msg.reactions,
                },
              });
            }
            break;
          }

          case "delete_image": {
            const user = activeSockets.get(ws);
            if (!user) return;

            const { messageId } = payload;
            const history = roomHistories[user.room] || [];
            const msg = history.find((m) => m.id === messageId);

            if (msg && msg.senderId === user.id) {
              msg.image = undefined;

              // If it's a DM, send to both participants
              if (user.room.startsWith("dm:")) {
                const parts = user.room.substring(3).split("-");
                if (parts.length === 2) {
                  const [id1, id2] = parts;
                  const deleteStr = JSON.stringify({
                    type: "image_deleted",
                    payload: { messageId },
                  });
                  for (const [clientWs, clientUser] of activeSockets.entries()) {
                    if ((clientUser.id === id1 || clientUser.id === id2) && clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(deleteStr);
                    }
                  }
                  break;
                }
              }

              // Broadcast that the image was deleted to the room
              broadcastToRoom(user.room, {
                type: "image_deleted",
                payload: {
                  messageId,
                },
              });
            }
            break;
          }

          default:
            console.warn(`Unknown websocket event: ${type}`);
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });

    ws.on("close", () => {
      const user = activeSockets.get(ws);
      if (user) {
        activeSockets.delete(ws);

        const isDM = user.room.startsWith("dm:");

        // System message for leave (only if not DM)
        let systemMsg: ChatMessage | null = null;
        if (!isDM) {
          systemMsg = {
            id: Math.random().toString(36).substring(2, 9),
            room: user.room,
            sender: "System",
            senderId: "system",
            senderColor: "#6b7280",
            text: `${user.username} left the chat`,
            timestamp: Date.now(),
            type: "system",
            reactions: {},
          };

          // Save system message in history
          if (roomHistories[user.room]) {
            roomHistories[user.room].push(systemMsg);
            if (roomHistories[user.room].length > 100) {
              roomHistories[user.room].shift();
            }
          }
        }

        // Broadcast leave and updated presence to room (only if not DM)
        if (!isDM && systemMsg) {
          broadcastToRoom(user.room, {
            type: "user_left",
            payload: {
              userId: user.id,
              systemMessage: systemMsg,
              activeUsers: getUsersInRoom(user.room),
            },
          });
        }

        // Broadcast presence update (all online users) to EVERYONE
        const presencePayload = {
          type: "presence_update",
          payload: {
            allOnlineUsers: getAllOnlineUsers(),
          },
        };
        const presenceStr = JSON.stringify(presencePayload);
        for (const client of activeSockets.keys()) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(presenceStr);
          }
        }

        // Broadcast room list update to EVERYONE
        const updatedRooms = getRoomsWithCounts();
        for (const client of activeSockets.keys()) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "rooms_list",
                payload: { rooms: updatedRooms },
              })
            );
          }
        }
      }
    });
  });

  // REST endpoints can be registered here (e.g., API status check)
  app.get("/api/status", (req, res) => {
    res.json({
      status: "online",
      activeConnections: activeSockets.size,
      rooms: getRoomsWithCounts(),
    });
  });

  // Setup Vite Dev server middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Port is always 3000 as per environment constraints
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Real-time server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
