/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, WifiOff, RefreshCw } from "lucide-react";
import { ChatUser, ChatMessage, RoomInfo, TypingUser } from "./types";
import WelcomeScreen from "./components/WelcomeScreen";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";

export default function App() {
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [rooms, setRooms] = useState<RoomInfo[]>([
    { name: "General", count: 0 },
    { name: "Tech Talk", count: 0 },
    { name: "Chill Zone", count: 0 },
    { name: "Random", count: 0 },
  ]);
  const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  // DM and presence state
  const [allOnlineUsers, setAllOnlineUsers] = useState<ChatUser[]>([]);
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({});
  const [activeDMSessions, setActiveDMSessions] = useState<string[]>([]);
  const [knownUsers, setKnownUsers] = useState<Record<string, { username: string; color: string }>>({});

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const joinCredentialsRef = useRef<{ username: string; color: string; room: string } | null>(null);
  
  // Ref to bypass stale closures in websocket message handling
  const currentUserRef = useRef<ChatUser | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Derive WebSocket URL dynamically based on environment
  const getSocketUrl = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  };

  const connectSocket = (username: string, color: string, room: string) => {
    // Save credentials in ref for potential automatic/manual reconnects
    joinCredentialsRef.current = { username, color, room };
    setIsReconnecting(true);

    if (socketRef.current) {
      socketRef.current.close();
    }

    const socketUrl = getSocketUrl();
    const ws = new WebSocket(socketUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }

      // Join the room
      ws.send(
        JSON.stringify({
          type: "join",
          payload: { username, color, room },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        switch (type) {
          case "welcome": {
            const { userId, room: welcomedRoom, history, activeUsers: users, rooms: updatedRooms, allOnlineUsers: onlineUsers } = payload;
            const updatedUser = {
              id: userId,
              username,
              color,
              room: welcomedRoom || room,
            };
            setCurrentUser(updatedUser);
            currentUserRef.current = updatedUser;
            setMessages(history);
            setActiveUsers(users);
            setRooms(updatedRooms);
            if (onlineUsers) {
              setAllOnlineUsers(onlineUsers);
              setKnownUsers((prev) => {
                const next = { ...prev };
                onlineUsers.forEach((u: ChatUser) => {
                  next[u.id] = { username: u.username, color: u.color };
                });
                return next;
              });
            }
            break;
          }

          case "user_joined": {
            const { user, systemMessage, activeUsers: users } = payload;
            setActiveUsers(users);
            setMessages((prev) => [...prev, systemMessage]);
            break;
          }

          case "user_left": {
            const { userId, systemMessage, activeUsers: users } = payload;
            setActiveUsers(users);
            setMessages((prev) => [...prev, systemMessage]);
            // Remove from typing state if they were typing
            setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
            break;
          }

          case "presence_update": {
            const { allOnlineUsers: onlineUsers } = payload;
            if (onlineUsers) {
              setAllOnlineUsers(onlineUsers);
              setKnownUsers((prev) => {
                const next = { ...prev };
                onlineUsers.forEach((u: ChatUser) => {
                  next[u.id] = { username: u.username, color: u.color };
                });
                return next;
              });
            }
            break;
          }

          case "new_message": {
            const { message } = payload;
            const currentU = currentUserRef.current;

            if (message.senderId && message.senderId !== "system") {
              setKnownUsers((prev) => ({
                ...prev,
                [message.senderId]: { username: message.sender, color: message.senderColor },
              }));
            }

            if (message.room.startsWith("dm:")) {
              if (currentU && message.room === currentU.room) {
                setMessages((prev) => [...prev, message]);
              } else if (currentU) {
                const otherUserId = message.senderId === currentU.id ? null : message.senderId;
                if (otherUserId) {
                  setActiveDMSessions((prev) => {
                    if (prev.includes(otherUserId)) return prev;
                    return [...prev, otherUserId];
                  });
                  setUnreadDMs((prev) => ({
                    ...prev,
                    [message.room]: (prev[message.room] || 0) + 1,
                  }));
                }
              }
            } else {
              if (currentU && message.room === currentU.room) {
                setMessages((prev) => [...prev, message]);
              }
            }
            break;
          }

          case "user_typing": {
            const { userId, username: typingName, room: typingRoom, isTyping } = payload;
            const currentU = currentUserRef.current;
            if (isTyping && currentU && typingRoom === currentU.room) {
              setTypingUsers((prev) => {
                if (prev.some((u) => u.userId === userId)) return prev;
                return [...prev, { userId, username: typingName }];
              });
            } else {
              setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
            }
            break;
          }

          case "message_reaction": {
            const { messageId, reactions } = payload;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, reactions } : msg
              )
            );
            break;
          }

          case "image_deleted": {
            const { messageId } = payload;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, image: undefined } : msg
              )
            );
            break;
          }

          case "rooms_list": {
            const { rooms: updatedRooms } = payload;
            setRooms(updatedRooms);
            break;
          }

          default:
            console.warn("Unhandled message type:", type);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsReconnecting(false);
      // Trigger reconnection sequence if we had logged in
      if (joinCredentialsRef.current && !reconnectIntervalRef.current) {
        reconnectIntervalRef.current = setInterval(() => {
          if (joinCredentialsRef.current) {
            const { username: u, color: c, room: r } = joinCredentialsRef.current;
            connectSocket(u, c, r);
          }
        }, 5000);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  };

  const handleJoin = (username: string, color: string, room: string) => {
    connectSocket(username, color, room);
  };

  const handleSwitchRoom = (newRoom: string) => {
    if (!currentUser) return;

    if (newRoom.startsWith("dm:")) {
      setUnreadDMs((prev) => {
        const next = { ...prev };
        delete next[newRoom];
        return next;
      });
    }

    // Update currentUser state locally first and switch
    const updatedUser = { ...currentUser, room: newRoom };
    setCurrentUser(updatedUser);
    currentUserRef.current = updatedUser;
    setIsMobileSidebarOpen(false);
    setMessages([]);
    setTypingUsers([]);

    // Re-join websocket on the new room
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Re-trigger connection credentials ref
      joinCredentialsRef.current = {
        username: currentUser.username,
        color: currentUser.color,
        room: newRoom,
      };
      socketRef.current.send(
        JSON.stringify({
          type: "join",
          payload: {
            username: currentUser.username,
            color: currentUser.color,
            room: newRoom,
          },
        })
      );
    }
  };

  const handleStartDM = (otherUser: ChatUser) => {
    if (!currentUser) return;
    const dmRoomId = "dm:" + [currentUser.id, otherUser.id].sort().join("-");
    
    setActiveDMSessions((prev) => {
      if (prev.includes(otherUser.id)) return prev;
      return [...prev, otherUser.id];
    });

    handleSwitchRoom(dmRoomId);
  };

  const handleSendMessage = (text: string, image?: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "message",
          payload: { text, image },
        })
      );
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "reaction",
          payload: { messageId, emoji },
        })
      );
    }
  };

  const handleDeleteImage = (messageId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "delete_image",
          payload: { messageId },
        })
      );
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing",
          payload: { isTyping },
        })
      );
    }
  };

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }
    joinCredentialsRef.current = null;
    setCurrentUser(null);
    currentUserRef.current = null;
    setMessages([]);
    setActiveUsers([]);
    setTypingUsers([]);
    setAllOnlineUsers([]);
    setUnreadDMs({});
    setActiveDMSessions([]);
    setKnownUsers({});
    setIsConnected(false);
  };

  const handleManualReconnect = () => {
    if (joinCredentialsRef.current) {
      const { username: u, color: c, room: r } = joinCredentialsRef.current;
      connectSocket(u, c, r);
    }
  };

  // On mount: fetch existing rooms so they show up on the welcome screen
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/status");
        if (res.ok) {
          const data = await res.json();
          if (data.rooms) {
            setRooms(data.rooms);
          }
        }
      } catch (e) {
        // Fallback to defaults
      }
    };
    fetchRooms();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
      }
    };
  }, []);

  // 1. Welcome state
  if (!currentUser) {
    return (
      <WelcomeScreen
        onJoin={handleJoin}
        availableRooms={rooms}
      />
    );
  }

  // 2. Main Chat Layout (with Sidebar + Chat Area)
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 relative font-sans">
      
      {/* Offline Alert Bar */}
      {!isConnected && (
        <div className="absolute top-0 inset-x-0 z-50 bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="animate-pulse" />
            <span>Connection lost. Attempting to reconnect...</span>
          </div>
          <button
            onClick={handleManualReconnect}
            disabled={isReconnecting}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-700 hover:bg-red-800 rounded-md font-bold cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={isReconnecting ? "animate-spin" : ""} />
            {isReconnecting ? "Connecting..." : "Reconnect Now"}
          </button>
        </div>
      )}

      {/* Hamburger Toggle button for small screen sidebars */}
      <div className="absolute left-4 top-4.5 z-40 md:hidden">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2.5 bg-white border border-gray-150 rounded-xl shadow-md text-gray-600 active:scale-95 cursor-pointer"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Sidebar - Desktop Layout */}
      <div className="hidden md:block h-full">
        <Sidebar
          currentUser={currentUser}
          rooms={rooms}
          activeUsers={activeUsers}
          allOnlineUsers={allOnlineUsers}
          unreadDMs={unreadDMs}
          activeDMSessions={activeDMSessions}
          onSwitchRoom={handleSwitchRoom}
          onStartDM={handleStartDM}
          onLogout={handleLogout}
        />
      </div>

      {/* Sidebar - Responsive Mobile Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Click-away backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
            {/* Drawer container */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-80 bg-white z-50 shadow-2xl md:hidden h-full flex flex-col"
            >
              {/* Close button inside drawer */}
              <div className="absolute right-4 top-4 z-50">
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Sidebar
                  currentUser={currentUser}
                  rooms={rooms}
                  activeUsers={activeUsers}
                  allOnlineUsers={allOnlineUsers}
                  unreadDMs={unreadDMs}
                  activeDMSessions={activeDMSessions}
                  onSwitchRoom={handleSwitchRoom}
                  onStartDM={handleStartDM}
                  onLogout={handleLogout}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Feed Area */}
      <div className="flex-1 h-full min-w-0 flex flex-col pl-0 md:pl-0 pt-0">
        <ChatArea
          currentUser={currentUser}
          messages={messages}
          typingUsers={typingUsers}
          activeUsersCount={activeUsers.length}
          allOnlineUsers={allOnlineUsers}
          knownUsers={knownUsers}
          onSendMessage={handleSendMessage}
          onReact={handleReact}
          onTyping={handleTyping}
          onDeleteImage={handleDeleteImage}
        />
      </div>
    </div>
  );
}
