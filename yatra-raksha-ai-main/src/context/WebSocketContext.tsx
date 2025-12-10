

// import { createContext, useContext, useEffect, useState } from "react";

// const WebSocketContext = createContext<WebSocket | null>(null);

// export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
//   const [socket, setSocket] = useState<WebSocket | null>(null);

//   useEffect(() => {
//     const ws = new WebSocket("ws://localhost:8000/ws");

//     ws.onopen = () => console.log("🔥 WebSocket Connected");
//     ws.onclose = () => console.log("❌ WebSocket Disconnected");
//     ws.onerror = (err) => console.error("⚠️ WebSocket Error:", err);

//     setSocket(ws);

//     return () => ws.close();
//   }, []);

//   return (
//     <WebSocketContext.Provider value={socket}>
//       {children}
//     </WebSocketContext.Provider>
//   );
// };

// export const useWebSocket = () => useContext(WebSocketContext);


import { createContext, useContext, useEffect, useRef, useState } from "react";

const WebSocketContext = createContext<WebSocket | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const reconnectTimeout = useRef<number>(1000); // start with 1s

  const connectWebSocket = () => {
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => {
      console.log("🔥 WebSocket Connected");
      reconnectTimeout.current = 1000;  // reset retry delay
      setSocket(ws);
    };

    ws.onclose = () => {
      console.log("❌ WebSocket Disconnected. Retrying...");

      setTimeout(() => {
        reconnectTimeout.current = Math.min(reconnectTimeout.current * 2, 10000); // max 10s
        connectWebSocket();
      }, reconnectTimeout.current);
    };

    ws.onerror = () => {
      console.error("⚠️ WebSocket Error - Will Retry");
      ws.close();
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => socket?.close();
  }, []);

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
