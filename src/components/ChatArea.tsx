import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Search, Smile, Volume2, VolumeX, Sparkles, Hash, Users, PenTool, Image, Trash2, Code, Eye, EyeOff, Paperclip, Camera, CameraOff, Video } from "lucide-react";
import { ChatMessage, ChatUser, TypingUser } from "../types";
import MessageItem from "./MessageItem";

interface ChatAreaProps {
  currentUser: ChatUser;
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  activeUsersCount: number;
  allOnlineUsers?: ChatUser[];
  knownUsers?: Record<string, { username: string; color: string }>;
  onSendMessage: (text: string, image?: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTyping: (isTyping: boolean) => void;
  onDeleteImage: (messageId: string) => void;
}

const QUICK_EMOJIS = ["👋", "💡", "🚀", "🔥", "🎉", "💯", "❤️", "🙌"];

export default function ChatArea({
  currentUser,
  messages,
  typingUsers,
  activeUsersCount,
  allOnlineUsers = [],
  knownUsers = {},
  onSendMessage,
  onReact,
  onTyping,
  onDeleteImage,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isTypingStateRef = useRef<boolean>(false);

  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showPendingImageCode, setShowPendingImageCode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Camera States and Refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false
      });
      setCameraStream(stream);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(err.message || "Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setPendingImage(dataUrl);
          stopCamera();
        } catch (e) {
          console.error("Failed to generate image from canvas", e);
          alert("Failed to capture image. Please try again.");
        }
      }
    }
  };

  // Sync camera stream to video element
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isCameraOpen]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setPendingImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Audio notifier using Web Audio API synthesis
  useEffect(() => {
    if (messages.length > 0 && soundEnabled) {
      const lastMsg = messages[messages.length - 1];
      // Only play sound if the message is from someone else and it's not a system notice
      if (lastMsg.senderId !== currentUser.id && lastMsg.type === "user") {
        playIncomingChime();
      }
    }
  }, [messages, soundEnabled, currentUser.id]);

  const playIncomingChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = "sine";
      // Arpeggio sound: E5 then A5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // Audio context might be blocked by browser user gesture policies initially
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Notify server we are typing
    if (!isTypingStateRef.current) {
      isTypingStateRef.current = true;
      onTyping(true);
    }

    // Debounce the stop-typing notice
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingStateRef.current = false;
      onTyping(false);
    }, 1500);
  };

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText && !pendingImage) return;

    onSendMessage(cleanText, pendingImage || undefined);
    setInputText("");
    setPendingImage(null);
    setShowPendingImageCode(false);

    // Clear typing state immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingStateRef.current = false;
    onTyping(false);
  };

  const handleQuickEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Filter messages based on search query
  const filteredMessages = messages.filter((m) =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={`flex-1 h-full flex flex-col bg-slate-50/50 selection:bg-indigo-100 selection:text-indigo-900 transition-colors relative ${
        isDragging ? "bg-indigo-50/30" : ""
      }`}
    >
      {/* Drag and Drop Blur overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-indigo-600/10 backdrop-blur-xs z-50 flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-indigo-100 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Image size={24} className="animate-bounce" />
              </div>
              <p className="text-sm font-bold text-gray-900">Drop your image here!</p>
              <p className="text-xs text-gray-400 font-semibold">It will be converted to Base64 code instantly</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top Chat Area Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          {currentUser.room.startsWith("dm:") ? (() => {
            const parts = currentUser.room.substring(3).split("-");
            const otherUserId = parts.find((id) => id !== currentUser.id);
            let dmPartnerName = "Direct Message";
            let dmPartnerColor = "#6366f1";
            let isPartnerOnline = false;

            if (otherUserId) {
              const partner = allOnlineUsers.find((u) => u.id === otherUserId);
              if (partner) {
                dmPartnerName = partner.username;
                dmPartnerColor = partner.color;
                isPartnerOnline = true;
              } else {
                const info = knownUsers[otherUserId];
                if (info) {
                  dmPartnerName = info.username;
                  dmPartnerColor = info.color;
                } else {
                  dmPartnerName = "User " + otherUserId;
                }
              }
            }

            return (
              <>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold relative shadow-sm text-sm shrink-0"
                  style={{ backgroundColor: dmPartnerColor }}
                >
                  {dmPartnerName.slice(0, 2).toUpperCase()}
                  {isPartnerOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-sm font-bold text-gray-900 tracking-tight">
                    {dmPartnerName}
                  </h1>
                  <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isPartnerOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
                    {isPartnerOnline ? "Online now" : "Offline"}
                  </p>
                </div>
              </>
            );
          })() : (
            <>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                <Hash size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 tracking-tight">
                  #{currentUser.room}
                </h1>
                <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mt-0.5">
                  <Users size={11} />
                  {activeUsersCount} active now
                </p>
              </div>
            </>
          )}
        </div>

        {/* Header Actions (Search & Audio & Info) */}
        <div className="flex items-center gap-3">
          {/* Local Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all w-40 focus:w-56"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          </div>

          {/* Sound Toggle Button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-all border cursor-pointer ${
              soundEnabled
                ? "bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100"
                : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
            }`}
            title={soundEnabled ? "Disable chime" : "Enable chime"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {searchQuery && (
          <div className="p-2.5 bg-indigo-50/50 border border-indigo-100/50 rounded-xl text-xs font-medium text-indigo-700 text-center mb-2">
            Showing results for "{searchQuery}" —{" "}
            <button onClick={() => setSearchQuery("")} className="underline font-bold cursor-pointer">
              Clear search
            </button>
          </div>
        )}

        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Sparkles size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation by sending a friendly hello!</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUser={currentUser}
              onReact={onReact}
              onDeleteImage={onDeleteImage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicators & Emoji Tray */}
      <div className="px-6 shrink-0">
        <div className="h-6 flex items-center">
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5"
              >
                <PenTool size={10} className="text-indigo-500 animate-bounce" />
                <span>
                  {typingUsers.map((u) => u.username).join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pending Image Attachment Area */}
      <AnimatePresence>
        {pendingImage && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 10 }}
            className="bg-white border-t border-gray-150 px-6 py-4 flex flex-col gap-3 shrink-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Code size={13} className="text-amber-500" />
                  Image Code (Base64) Ready
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle Code View Button */}
                <button
                  type="button"
                  onClick={() => setShowPendingImageCode(!showPendingImageCode)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                >
                  {showPendingImageCode ? (
                    <>
                      <EyeOff size={13} />
                      <span>Show Image Preview</span>
                    </>
                  ) : (
                    <>
                      <Code size={13} />
                      <span>Show Compiled Code</span>
                    </>
                  )}
                </button>

                {/* Remove Image Button */}
                <button
                  type="button"
                  onClick={() => {
                    setPendingImage(null);
                    setShowPendingImageCode(false);
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-slate-50 border border-slate-200/65 p-3 rounded-xl overflow-hidden max-h-52">
              {!showPendingImageCode ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white shadow-xs shrink-0">
                  <img
                    src={pendingImage}
                    alt="Pending upload"
                    className="max-h-36 max-w-[200px] object-contain"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center font-bold py-1">
                    Compiled base64
                  </div>
                </div>
              ) : (
                <div className="flex-1 font-mono text-[9px] leading-relaxed text-emerald-400 bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-36 break-all scrollbar-thin select-all">
                  <div className="text-gray-400 mb-1 font-sans font-bold text-[10px]">Base64 Image Code:</div>
                  {pendingImage}
                </div>
              )}

              <div className="flex-1 text-xs text-gray-500 space-y-1.5 mt-1">
                <p className="font-bold text-gray-700">Client-Side Image Transformer</p>
                <p>We convert the image directly into a standard text-based UTF-8 string. This allows seamless WebSocket transmission without servers or backend databases.</p>
                <p className="text-[10px] text-gray-400 font-semibold">Press Send to broadcast this compiled picture-code to the room.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Compose Bar */}
      <div className="bg-white border-t border-gray-100 p-4 shadow-sm shrink-0">
        <form onSubmit={handleSendSubmit} className="flex gap-3 items-center max-w-4xl mx-auto relative">
          
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processImageFile(e.target.files[0]);
              }
            }}
            accept="image/*"
            className="hidden"
          />

          {/* Image Upload Trigger Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              pendingImage
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
                : "bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title="Attach or Drag/Drop Image"
          >
            <Paperclip size={18} />
          </button>

          {/* Camera Capture Trigger Button */}
          <button
            type="button"
            onClick={startCamera}
            className="p-3 rounded-xl border bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
            title="Take Photo with Camera"
          >
            <Camera size={18} />
          </button>

          {/* Emoji Trigger Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                showEmojiPicker
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                  : "bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Smile size={18} />
            </button>

            {/* Quick Emoji Picker Dropdown */}
            <AnimatePresence>
              {showEmojiPicker && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-full left-0 mb-3 bg-white border border-gray-150 rounded-2xl p-3 shadow-xl z-30 w-52"
                  >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Quick Emojis
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleQuickEmojiClick(emoji)}
                          className="h-10 text-xl hover:bg-gray-50 rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Message input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={
                pendingImage
                  ? "Add a caption or hit send..."
                  : `Send message or paste/drag image here...`
              }
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Send Action */}
          <button
            type="submit"
            disabled={!inputText.trim() && !pendingImage}
            className={`p-3 rounded-xl transition-all font-semibold flex items-center justify-center text-white cursor-pointer ${
              inputText.trim() || pendingImage
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
                : "bg-gray-200 cursor-not-allowed text-gray-400"
            }`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Camera Capture Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={stopCamera}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100 z-10 p-5 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Video size={16} className="text-indigo-600" />
                    Live Camera Capture
                  </h3>
                  <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                    Align your camera and snap a photo to instantly share with the room.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Viewport / Video Feed */}
              <div className="relative rounded-xl overflow-hidden bg-black border border-gray-200 aspect-video flex items-center justify-center">
                {cameraError ? (
                  <div className="p-6 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                      <CameraOff size={20} />
                    </div>
                    <div className="text-xs font-bold text-red-500">Camera Error</div>
                    <p className="text-[11px] text-gray-400 font-semibold max-w-xs">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                ) : !cameraStream ? (
                  <div className="text-center flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-1" />
                    <p className="text-xs font-bold text-gray-300">Requesting Camera Access...</p>
                    <p className="text-[10px] text-gray-500">Please accept the permission dialog</p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    {/* Visual Guideline overlay */}
                    <div className="absolute inset-4 border border-dashed border-white/20 rounded-lg pointer-events-none flex items-center justify-center">
                      <div className="w-12 h-12 border-2 border-white/20 rounded-full" />
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end items-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!cameraStream}
                  className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 text-white cursor-pointer ${
                    cameraStream
                      ? "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
                      : "bg-gray-200 cursor-not-allowed text-gray-400"
                  }`}
                >
                  <Camera size={14} />
                  <span>Capture Photo</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
