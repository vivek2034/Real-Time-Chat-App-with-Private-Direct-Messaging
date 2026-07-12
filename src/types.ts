export interface ChatUser {
  id: string;
  username: string;
  room: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  room: string;
  sender: string;
  senderId: string;
  senderColor: string;
  text: string;
  timestamp: number;
  type: "user" | "system";
  reactions?: Record<string, string[]>; // emoji -> array of usernames
  image?: string; // Base64 data URI or image code
}

export interface RoomInfo {
  name: string;
  count: number;
}

export interface TypingUser {
  userId: string;
  username: string;
}
