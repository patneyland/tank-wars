import * as React from "react";
import { Route, Router, Switch } from "wouter";
import type { GameState, RoomUpdate } from "@shared/types";
import { socket } from "./socket";
import { LobbyScreen } from "./components/LobbyScreen";
import { GameCanvas } from "./components/GameCanvas";
import { GameHUD } from "./components/GameHUD";
import { RoundEndScreen } from "./components/RoundEndScreen";

const App = () => {
  const [room, setRoom] = React.useState<RoomUpdate | null>(null);
  const [gameState, setGameState] = React.useState<GameState | null>(null);
  const [myPlayerIds, setMyPlayerIds] = React.useState<string[]>([]);
  const [socketId, setSocketId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleConnect = () => {
      const oldSocketId = sessionStorage.getItem("socketId");
      const roomId = sessionStorage.getItem("roomId");
      if (socket.id) {
        setSocketId(socket.id);
        sessionStorage.setItem("socketId", socket.id);
        if (roomId && oldSocketId && oldSocketId !== socket.id) {
          socket.emit("room:rejoin", { roomId, oldSocketId });
        }
      }
    };

    const handleRoomUpdate = (update: RoomUpdate) => {
      setRoom(update);
      sessionStorage.setItem("roomId", update.roomId);
    };

    const handleMyPlayers = (ids: string[]) => {
      setMyPlayerIds(ids);
    };

    const handleGameState = (state: GameState) => {
      setGameState(state);
    };

    const handleError = (message: string) => {
      setError(message);
      window.setTimeout(() => setError(null), 3500);
    };

    socket.on("connect", handleConnect);
    socket.on("room:update", handleRoomUpdate);
    socket.on("room:myPlayers", handleMyPlayers);
    socket.on("game:state", handleGameState);
    socket.on("error:message", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room:update", handleRoomUpdate);
      socket.off("room:myPlayers", handleMyPlayers);
      socket.off("game:state", handleGameState);
      socket.off("error:message", handleError);
    };
  }, []);

  const showLobby = !room || room.state === "lobby";
  const showGame = !!room && room.state !== "lobby" && !!gameState;

  return (
    <Router>
      <Switch>
        <Route path="/">
          <div className="relative min-h-screen overflow-hidden">
            {showLobby && (
              <LobbyScreen
                room={room}
                socketId={socketId}
                onCreate={(nicknames) => socket.emit("room:create", { nicknames })}
                onJoin={(roomId, nicknames) => socket.emit("room:join", { roomId, nicknames })}
                onStart={() => socket.emit("game:start")}
              />
            )}

            {showGame && gameState && (
              <>
                <GameCanvas gameState={gameState} />
                <GameHUD gameState={gameState} myPlayerIds={myPlayerIds} />
              </>
            )}

            {room?.state === "roundEnd" && gameState && (
              <RoundEndScreen
                gameState={gameState}
                room={room}
                socketId={socketId}
                onRestart={() => socket.emit("game:restart")}
              />
            )}

            {error && (
              <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-red-400/40 bg-red-900/40 px-4 py-2 text-sm text-red-100 backdrop-blur">
                {error}
              </div>
            )}
          </div>
        </Route>
      </Switch>
    </Router>
  );
};

export default App;
