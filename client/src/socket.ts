import { io } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types";

const socketUrl = import.meta.env.DEV ? "http://localhost:5000" : window.location.origin;

export const socket = io<ServerToClientEvents, ClientToServerEvents>(socketUrl, {
  transports: ["websocket", "polling"]
});
