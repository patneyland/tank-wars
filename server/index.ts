import path from "path";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { GameRoom } from "./GameRoom";
import {
  type ClientToServerEvents,
  type ServerToClientEvents
} from "../shared/types";
import { ROOM_CODE_CHARS } from "../shared/constants";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

const rooms = new Map<string, GameRoom>();

const createRoomCode = () => {
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    const index = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[index];
  }
  if (rooms.has(code)) {
    return createRoomCode();
  }
  return code;
};

io.on("connection", (socket) => {
  socket.on("room:create", ({ nicknames }) => {
    try {
      const roomId = createRoomCode();
      const room = new GameRoom(io, roomId);
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.data.roomId = roomId;
      const playerIds = room.addPlayers(socket.id, nicknames);
      socket.emit("room:myPlayers", playerIds);
      room.emitRoomUpdate();
    } catch (error) {
      socket.emit("error:message", error instanceof Error ? error.message : "Unable to create room.");
    }
  });

  socket.on("room:join", ({ roomId, nicknames }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error:message", "Room not found.");
      return;
    }
    if (room.state !== "lobby") {
      socket.emit("error:message", "Room already started.");
      return;
    }
    try {
      socket.join(roomId);
      socket.data.roomId = roomId;
      const playerIds = room.addPlayers(socket.id, nicknames);
      socket.emit("room:myPlayers", playerIds);
      room.emitRoomUpdate();
    } catch (error) {
      socket.emit("error:message", error instanceof Error ? error.message : "Unable to join room.");
    }
  });

  socket.on("room:rejoin", ({ roomId, oldSocketId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error:message", "Room not found.");
      return;
    }
    const success = room.reassignSocket(oldSocketId, socket.id);
    if (!success) {
      socket.emit("error:message", "Rejoin failed.");
      return;
    }
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit("room:myPlayers", room.getPlayerIdsForSocket(socket.id));
    room.emitRoomUpdate();
    room.emitGameState();
  });

  socket.on("game:start", () => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    if (!room || room.hostSocketId !== socket.id || room.state !== "lobby") {
      return;
    }
    if (room.players.size < 2) {
      socket.emit("error:message", "Need at least 2 players to start.");
      return;
    }
    room.startRound();
  });

  socket.on("game:restart", () => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    if (!room || room.hostSocketId !== socket.id || room.state !== "roundEnd") {
      return;
    }
    room.restartRound();
  });

  socket.on("player:move", ({ playerId, direction }) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    room?.handleMove(socket.id, playerId, direction);
  });

  socket.on("player:angle", ({ playerId, angle }) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    room?.handleAngle(socket.id, playerId, angle);
  });

  socket.on("player:power", ({ playerId, power }) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    room?.handlePower(socket.id, playerId, power);
  });

  socket.on("player:weapon", ({ playerId, weapon }) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    room?.handleWeapon(socket.id, playerId, weapon);
  });

  socket.on("player:fire", ({ playerId }) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    room?.handleFire(socket.id, playerId);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }
    room.handleDisconnect(socket.id);
    if (room.isEmpty()) {
      room.dispose();
      rooms.delete(roomId);
    }
  });
});

if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
server.listen(PORT, () => {
  console.log(`Tank Wars server listening on ${PORT}`);
});
