import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RoomInfo, ChatUser } from "../types";
import { MessageSquare as MsgIcon, Hash as HashIcon, Users as UsersIcon, Plus as PlusIcon, LogOut as LogOutIcon, ChevronRight as ChevronIcon, Compass as CompassIcon, MessageCircle as MessageCircleIcon } from "lucide-react";

interface SidebarProps {
  currentUser: ChatUser;
  rooms: RoomInfo[];
  activeUsers: ChatUser[];
  allOnlineUsers: ChatUser[];
  unreadDMs: Record<string, number>;
  activeDMSessions: string[];
  onSwitchRoom: (newRoom: string) => void;
  onStartDM: (otherUser: ChatUser) => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentUser,
  rooms,
  activeUsers,
  allOnlineUsers = [],
  unreadDMs = {},
  activeDMSessions = [],
  onSwitchRoom,
  onStartDM,
  onLogout,
}: SidebarProps) {
  const [newRoomName, setNewRoomName] = useState("");
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [roomError, setRoomError] = useState("");

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = newRoomName.trim().replace(/[^a-zA-Z0-9\s-_]/g, "");
    if (!cleanRoom) {
      setRoomError("Room name is required");
      return;
    }
    if (cleanRoom.toLowerCase() === currentUser.room.toLowerCase()) {
      setRoomError("You are already here");
      return;
    }
    onSwitchRoom(cleanRoom);
    setNewRoomName("");
    setIsAddingRoom(false);
    setRoomError("");
  };

  // Find all users we can DM (online users + offline users with active sessions)
  const otherOnlineUsers = allOnlineUsers.filter((u) => u.id !== currentUser.id);

  // We can look up offline users who have active DM sessions with us
  // For safety, let's keep track of known user profiles
  const dmList = otherOnlineUsers.map((u) => {
    const dmRoomId = "dm:" + [currentUser.id, u.id].sort().join("-");
    const unreadCount = unreadDMs[dmRoomId] || 0;
    const isCurrent = currentUser.room === dmRoomId;
    return {
      ...u,
      dmRoomId,
      unreadCount,
      isCurrent,
      isOnline: true,
    };
  });

  return (
    <div className="w-80 h-full flex flex-col bg-white border-r border-gray-100 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold">
            <MsgIcon size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">
              Real-Time Chat
            </h2>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </p>
          </div>
        </div>
      </div>

      {/* Main Nav Area (Rooms & Active Users) */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-7 scrollbar-thin scrollbar-thumb-gray-200">
        {/* Rooms Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <CompassIcon size={12} />
              Channels
            </h3>
            <button
              onClick={() => {
                setIsAddingRoom(!isAddingRoom);
                setRoomError("");
              }}
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded transition-all cursor-pointer"
              title="Create Room"
            >
              <PlusIcon size={14} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {isAddingRoom && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddRoomSubmit}
                className="space-y-1.5 overflow-hidden"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => {
                      setNewRoomName(e.target.value);
                      setRoomError("");
                    }}
                    placeholder="New channel name..."
                    autoFocus
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
                {roomError && (
                  <p className="text-[10px] font-semibold text-red-500 px-1">
                    {roomError}
                  </p>
                )}
                <div className="flex gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingRoom(false);
                      setNewRoomName("");
                      setRoomError("");
                    }}
                    className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-0.5">
            {rooms.map((room) => {
              const isActive = room.name.toLowerCase() === currentUser.room.toLowerCase();
              return (
                <button
                  key={room.name}
                  onClick={() => onSwitchRoom(room.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer group ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "hover:bg-gray-50 text-gray-600 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <HashIcon
                      size={14}
                      className={isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-500"}
                    />
                    <span className="text-xs truncate">{room.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-gray-100 text-gray-400 group-hover:bg-gray-200/60"
                      }`}
                    >
                      {room.count}
                    </span>
                    <ChevronIcon
                      size={10}
                      className={`transition-transform duration-200 ${
                        isActive ? "text-indigo-400 translate-x-0.5" : "text-transparent group-hover:text-gray-300"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Private Direct Messages Section */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
            <MessageCircleIcon size={12} />
            Direct Messages
          </h3>
          <div className="space-y-0.5">
            {dmList.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic px-3 py-1">
                No other online users
              </p>
            ) : (
              dmList.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onStartDM(user)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer group ${
                    user.isCurrent
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "hover:bg-gray-50 text-gray-600 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-sm relative"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.username.slice(0, 2).toUpperCase()}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <span className="text-xs truncate">{user.username}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {user.unreadCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-rose-500 text-white animate-pulse">
                        {user.unreadCount}
                      </span>
                    )}
                    <ChevronIcon
                      size={10}
                      className={`transition-transform duration-200 ${
                        user.isCurrent ? "text-indigo-400 translate-x-0.5" : "text-transparent group-hover:text-gray-300"
                      }`}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Active Users in current room (only if not a DM room) */}
        {!currentUser.room.startsWith("dm:") && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <UsersIcon size={12} />
              Room Users ({activeUsers.length})
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activeUsers.map((user) => {
                const isMe = user.id === currentUser.id;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50/50 rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm relative"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.username.slice(0, 2).toUpperCase()}
                        <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 truncate">
                        {user.username}
                        {isMe && <span className="text-[10px] font-normal text-gray-400 ml-1">(you)</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate leading-tight">
              {currentUser.username}
            </p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              {currentUser.room.startsWith("dm:") ? "Direct Messaging" : `Room: #${currentUser.room}`}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer"
          title="Leave Conversation"
        >
          <LogOutIcon size={16} />
        </button>
      </div>
    </div>
  );
}
