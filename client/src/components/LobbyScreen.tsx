import * as React from "react";
import type { RoomUpdate } from "@shared/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { CrownIcon } from "./icons";

interface LobbyScreenProps {
  room: RoomUpdate | null;
  socketId: string | null;
  onCreate: (nicknames: string[]) => void;
  onJoin: (roomId: string, nicknames: string[]) => void;
  onStart: () => void;
}

type Mode = "menu" | "create" | "join";

const blankNames = (count: number) => Array.from({ length: count }, () => "");

export const LobbyScreen = ({ room, socketId, onCreate, onJoin, onStart }: LobbyScreenProps) => {
  const [mode, setMode] = React.useState<Mode>("menu");
  const [names, setNames] = React.useState<string[]>(blankNames(1));
  const [roomCode, setRoomCode] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (room) {
      return;
    }
    setCopied(false);
  }, [room]);

  const updateName = (index: number, value: string) => {
    setNames((prev) => prev.map((name, idx) => (idx === index ? value : name)));
  };

  const addPlayerField = () => {
    setNames((prev) => (prev.length >= 4 ? prev : [...prev, ""]));
  };

  const removePlayerField = () => {
    setNames((prev) => (prev.length <= 1 ? prev : prev.slice(0, prev.length - 1)));
  };

  const submitCreate = () => {
    onCreate(names);
  };

  const submitJoin = () => {
    if (!roomCode.trim()) {
      return;
    }
    onJoin(roomCode.trim(), names);
  };

  const copyCode = async () => {
    if (!room) {
      return;
    }
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (room && room.state === "lobby") {
    const isHost = socketId && room.hostSocketId === socketId;
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#0f1425] to-[#1a0f28] px-4 py-10">
        <Card className="w-full max-w-3xl p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl font-semibold tracking-wide text-white">Tank Wars Lobby</h1>
              <p className="text-sm text-white/60">Room code and roster sync in real time.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-2">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">Room Code</div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl text-white">{room.roomCode}</span>
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    {copied ? "COPIED" : "COPY"}
                  </Button>
                </div>
              </div>
              <Badge>{room.players.length}/{room.maxPlayers} Players</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: player.color }} />
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        {player.name}
                        {player.isHost && <CrownIcon className="text-amber-300" />}
                      </div>
                      <div className="text-xs text-white/50">
                        {player.isConnected ? "CONNECTED" : "OFFLINE"}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs uppercase text-white/50">Wins: {player.wins}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-white/60">Host can start when 2+ players are ready.</div>
              {isHost && (
                <Button onClick={onStart} disabled={room.players.length < 2}>
                  Start Game
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#0f1425] to-[#1a0f28] px-4 py-10">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-4xl font-semibold text-white">Tank Wars</h1>
            <p className="mt-2 text-sm text-white/60">Turn-based artillery combat on destructible terrain.</p>
          </div>

          {mode === "menu" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Button size="lg" onClick={() => setMode("create")}>
                Create Room
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setMode("join")}>
                Join Room
              </Button>
            </div>
          )}

          {(mode === "create" || mode === "join") && (
            <div className="flex flex-col gap-4">
              {mode === "join" && (
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-white/40">Room Code</label>
                  <Input
                    value={roomCode}
                    onChange={(event) =>
                      setRoomCode(event.target.value.toUpperCase().replace(/\s/g, ""))
                    }
                    placeholder="ABCDE"
                    className="mt-2"
                    maxLength={5}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-[0.3em] text-white/40">Player Names</label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={removePlayerField}>
                    -
                  </Button>
                  <Button variant="outline" size="sm" onClick={addPlayerField}>
                    +
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {names.map((name, index) => (
                  <Input
                    key={`name-${index}`}
                    value={name}
                    onChange={(event) => updateName(index, event.target.value)}
                    placeholder={`Player ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setMode("menu")}>
                  Back
                </Button>
                {mode === "create" ? (
                  <Button onClick={submitCreate}>Create Room</Button>
                ) : (
                  <Button onClick={submitJoin}>Join Room</Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
