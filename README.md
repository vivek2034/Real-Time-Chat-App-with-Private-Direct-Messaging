# Real-Time Chat App with Private Direct Messaging (DMs)

An elegant, modern, and highly responsive real-time chat application built using **React 19**, **Vite**, **Express**, **TypeScript**, and **WebSockets**. It features multi-room group conversations, dynamic live user presence tracking, live typing indicators, image sharing, message reactions, and fully integrated **Private Direct Messages (DMs)**.

## Key Features

-   **Channels & Group Chats**: Join predefined channels like *General*, *Tech Talk*, *Chill Zone*, or *Random*. Users can also dynamically create and join new custom channels.
-   **Private Direct Messaging (DMs)**: Seamlessly start private one-on-one direct message sessions with any online user by selecting them from the "Direct Messages" section in the sidebar.
-   **Presence & Status Indicators**: Real-time visualization of currently online users with customizable profile color tags. Live connection status alerts users to any connection changes.
-   **Typing Indicators**: Shows who is typing in real time, filtered specifically to your active room or private DM thread.
-   **Rich Interactions**: React to messages with emojis and share custom image attachments within chats. Image attachments can be dynamically deleted by their sender.
-   **Seamless Reconnection Logic**: Built-in automatic reconnection keeps the application resilient under changing network conditions.

## Technical Architecture

-   **Frontend**: React (Functional Components + Hooks), Tailwind CSS, Motion/React (Animations), Lucide Icons.
-   **Backend**: Express + Native WebSockets server.
-   **Routing & Scope Filtering**: The server routes DM packets securely to authorized session participants under partitioned virtual room addresses (e.g. `dm:id1-id2`).
-   **Build Process**: Optimized production builds bundle the server into a standalone ES/CommonJS artifact in `dist/` using `esbuild`.
