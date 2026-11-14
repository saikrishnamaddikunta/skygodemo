import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env";
import { logger } from "../utils/logger";

let ioInstance: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  ioInstance = new SocketIOServer(httpServer, {
    cors: {
      origin: [env.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  ioInstance.on("connection", (socket) => {
    logger.debug("Socket client connected", { socketId: socket.id });

    socket.on("join:user", (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on("join:admin", () => {
      socket.join("admin:ops");
    });

    socket.on("disconnect", () => {
      logger.debug("Socket client disconnected", { socketId: socket.id });
    });
  });

  return ioInstance;
}

export function emitRealtimeEvent(channel: string, payload: unknown, room?: string): void {
  if (!ioInstance) return;
  if (room) {
    ioInstance.to(room).emit(channel, payload);
  } else {
    ioInstance.emit(channel, payload);
  }
}
