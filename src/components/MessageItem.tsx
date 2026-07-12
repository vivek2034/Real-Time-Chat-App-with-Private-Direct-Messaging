import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smile, Code, Image, Copy, Check, Maximize2, Trash2 } from "lucide-react";
import { ChatMessage, ChatUser } from "../types";

interface MessageItemProps {
  message: ChatMessage;
  currentUser: ChatUser;
  onReact: (messageId: string, emoji: string) => void;
  onDeleteImage: (messageId: string) => void;
  key?: string;
}

const POPULAR_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉"];

export default function MessageItem({ message, currentUser, onReact, onDeleteImage }: MessageItemProps) {
  const isMe = message.senderId === currentUser.id;
  const isSystem = message.type === "system";

  const [showCode, setShowCode] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    if (message.image) {
      navigator.clipboard.writeText(message.image);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2"
      >
        <span className="bg-gray-100 border border-gray-200/50 text-[11px] font-semibold text-gray-500 px-3 py-1 rounded-full shadow-xs">
          {message.text}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col mb-4 max-w-lg ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
    >
      {/* Sender name & timestamp */}
      <div className="flex items-center gap-1.5 mb-1 px-1">
        {!isMe && (
          <span
            className="text-xs font-bold"
            style={{ color: message.senderColor }}
          >
            {message.sender}
          </span>
        )}
        <span className="text-[10px] text-gray-400 font-medium">
          {formatTime(message.timestamp)}
        </span>
      </div>

      {/* Bubble + Reaction trigger overlay */}
      <div className="relative group flex items-end gap-1.5 max-w-full">
        {/* Quick Emoji Reaction bar (appears on hover) */}
        <div
          className={`absolute z-10 bottom-full mb-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto bg-white border border-gray-100 rounded-full py-1 px-2 shadow-lg flex items-center gap-1 ${
            isMe ? "right-0" : "left-0"
          }`}
        >
          {POPULAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className="hover:scale-130 transition-transform px-1 text-sm cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* The Bubble */}
        <div
          className={`rounded-2xl text-sm leading-relaxed shadow-xs overflow-hidden max-w-full border ${
            isMe
              ? "bg-indigo-600 text-white border-indigo-700 rounded-br-none font-medium"
              : "bg-white border-gray-150 text-gray-800 rounded-bl-none font-medium"
          }`}
        >
          {message.image && (
            <div className="p-1 pb-2">
              {!showCode ? (
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="relative rounded-xl overflow-hidden cursor-zoom-in bg-gray-100 border border-gray-200/50 group/img transition-all hover:opacity-95 max-w-[280px]"
                >
                  <img
                    src={message.image}
                    alt="Chat attachment"
                    className="max-h-56 w-full object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all">
                    <span className="bg-white/95 text-gray-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
                      <Maximize2 size={12} />
                      Zoom Code-Pic
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[9px] rounded-xl overflow-x-auto max-h-48 max-w-[280px] break-all relative select-all scrollbar-thin">
                  <span className="text-gray-400 block font-sans font-bold text-[10px] mb-1">Image UTF-8 String:</span>
                  {message.image}
                </div>
              )}

              {/* Picture/Code utility actions inside bubble */}
              <div className="flex items-center justify-between gap-3 px-2 mt-2">
                <button
                  onClick={() => setShowCode(!showCode)}
                  className={`text-[10px] font-bold flex items-center gap-1 transition-all hover:underline cursor-pointer ${
                    isMe ? "text-indigo-100 hover:text-white" : "text-indigo-600 hover:text-indigo-700"
                  }`}
                >
                  {showCode ? (
                    <>
                      <Image size={11} />
                      <span>Render Image</span>
                    </>
                  ) : (
                    <>
                      <Code size={11} />
                      <span>See Base64 Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyCode}
                  className={`text-[10px] font-bold flex items-center gap-1 transition-all hover:underline cursor-pointer ${
                    isMe ? "text-indigo-100 hover:text-white" : "text-indigo-600 hover:text-indigo-700"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={11} className="text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                {isMe && (
                  <button
                    onClick={() => onDeleteImage(message.id)}
                    className="text-[10px] font-bold flex items-center gap-1 transition-all hover:underline text-rose-200 hover:text-rose-100 cursor-pointer"
                    title="Delete Image"
                  >
                    <Trash2 size={11} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Optional Caption/Text inside the same bubble */}
          {message.text && (
            <div className={`${message.image ? "px-4 pb-3 pt-1 border-t border-indigo-500/10" : "px-4 py-2.5"} break-words`}>
              <p>{message.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reactions Display */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
          {Object.entries(message.reactions).map(([emoji, users]) => {
            if (!users || users.length === 0) return null;
            const hasReacted = users.includes(currentUser.username);
            return (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                title={`Reacted by: ${users.join(", ")}`}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer ${
                  hasReacted
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold scale-[1.02]"
                    : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100 font-medium"
                }`}
              >
                <span>{emoji}</span>
                <span className="text-[10px]">{users.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Zoom / Fullscreen Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && message.image && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-xs cursor-zoom-out"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100/10 z-10 flex flex-col p-2"
            >
              <img
                src={message.image}
                alt="Zoomed attachment"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
              />
              <div className="p-3 flex justify-between items-center bg-gray-50 rounded-b-xl border-t border-gray-150 w-full">
                <span className="text-xs text-gray-500 font-semibold">
                  Sender: <span className="font-bold text-gray-800">{message.sender}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-green-600" />
                        <span className="text-green-600">Copied image code!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Base64 Code</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
