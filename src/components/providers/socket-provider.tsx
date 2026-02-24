"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // Connect to the Socket.IO server
        const socketInstance = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
        });

        setTimeout(() => setSocket(socketInstance), 0);

        socketInstance.on("connect", () => {
            setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
        });

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider
            value={{
                socket,
                isConnected,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
}
