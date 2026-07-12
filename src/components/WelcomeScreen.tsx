import React, { useState } from "react";
import { motion } from "motion/react";
import { MessageSquare, ArrowRight, Sparkles, Hash } from "lucide-react";
import { RoomInfo } from "../types";

interface WelcomeScreenProps {
  onJoin: (username: string, color: string, room: string) => void;
  availableRooms: RoomInfo[];
}

const PASTEL_COLORS = [
  { name: "Indigo Wave", hex: "#6366f1" },
  { name: "Teal Forest", hex: "#0d9488" },
  { name: "Emerald Slate", hex: "#10b981" },
  { name: "Orchid Velvet", hex: "#d946ef" },
  { name: "Rose Sunset", hex: "#f43f5e" },
  { name: "Amber Glow", hex: "#f59e0b" },
  { name: "Violet Mist", hex: "#8b5cf6" },
  { name: "Slate Storm", hex: "#475569" },
];

export default function WelcomeScreen({ onJoin, availableRooms }: WelcomeScreenProps) {
  const [username, setUsername] = useState("");
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0].hex);
  const [selectedRoom, setSelectedRoom] = useState("General");
  const [customRoom, setCustomRoom] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Please enter a username");
      return;
    }
    if (cleanUsername.length < 2) {
      setError("Username must be at least 2 characters long");
      return;
    }
    if (cleanUsername.length > 20) {
      setError("Username cannot exceed 20 characters");
      return;
    }

    const roomToJoin = isCreatingRoom ? customRoom.trim() : selectedRoom;
    if (isCreatingRoom && !roomToJoin) {
      setError("Please enter a custom room name");
      return;
    }

    const finalRoom = roomToJoin || "General";
    onJoin(cleanUsername, selectedColor, finalRoom);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
      >
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 border-b border-gray-100 text-center relative">
          <div className="absolute top-4 right-4 text-indigo-500 animate-pulse">
            <Sparkles size={18} />
          </div>
          <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-md shadow-indigo-200">
            <MessageSquare size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Join Real-Time Chat
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Connect instantly with others. Simple, fast, and server-powered.
          </p>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium"
            >
              {error}
            </motion.div>
          )}

          {/* Username Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Your Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="e.g. Alex"
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
            />
          </div>

          {/* Avatar / Presence Color Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Choose Avatar Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PASTEL_COLORS.map((color) => {
                const isSelected = selectedColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setSelectedColor(color.hex)}
                    className={`h-11 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 scale-[1.03] shadow-sm"
                        : "border-transparent hover:scale-102"
                    }`}
                    style={{ backgroundColor: color.hex + "15" }}
                  >
                    <div
                      className="w-4 h-4 rounded-full shadow-inner transition-transform"
                      style={{
                        backgroundColor: color.hex,
                        transform: isSelected ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Selection Toggle */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Select Chat Room
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingRoom(!isCreatingRoom);
                  setError("");
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
              >
                {isCreatingRoom ? "Choose Existing Room" : "Create New Room"}
              </button>
            </div>

            {isCreatingRoom ? (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Hash size={16} />
                </div>
                <input
                  type="text"
                  value={customRoom}
                  onChange={(e) => {
                    setCustomRoom(e.target.value.replace(/[^a-zA-Z0-9\s-_]/g, ""));
                    setError("");
                  }}
                  placeholder="e.g. Design Space"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </motion.div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 border border-gray-100 rounded-xl p-1 bg-gray-50/50">
                {availableRooms.map((room) => {
                  const isSelected = selectedRoom === room.name;
                  return (
                    <button
                      key={room.name}
                      type="button"
                      onClick={() => setSelectedRoom(room.name)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Hash size={15} className={isSelected ? "text-indigo-200" : "text-gray-400"} />
                        <span className="text-sm font-semibold">{room.name}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isSelected ? "bg-indigo-700 text-indigo-100" : "bg-gray-200/60 text-gray-500"
                        }`}
                      >
                        {room.count} active
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-98 cursor-pointer mt-4"
          >
            <span>Enter Conversation</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
