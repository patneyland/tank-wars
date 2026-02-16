import * as React from "react";
import type { GameState, RoomUpdate } from "@shared/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { SkullIcon, TrophyIcon } from "./icons";

interface RoundEndScreenProps {
  gameState: GameState;
  room: RoomUpdate | null;
  socketId: string | null;
  onRestart: () => void;
}

export const RoundEndScreen = ({ gameState, room, socketId, onRestart }: RoundEndScreenProps) => {
  const winner = gameState.players.find((player) => player.id === gameState.winnerId);
  const scoreboard = [...gameState.players].sort((a, b) => b.wins - a.wins);
  const isHost = room && socketId && room.hostSocketId === socketId;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <Card className="w-full max-w-xl p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            {winner ? (
              <TrophyIcon className="text-amber-300" />
            ) : (
              <SkullIcon className="text-red-300" />
            )}
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Round Result</div>
              <div className="text-2xl font-semibold text-white">
                {winner ? `${winner.name} Wins` : "Draw"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">Scoreboard</div>
            <div className="mt-3 flex flex-col gap-2">
              {scoreboard.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: player.color }} />
                    <span className="text-sm text-white">{player.name}</span>
                  </div>
                  <span className="text-sm text-white/70">Wins: {player.wins}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-white/60">Host can start the next round.</div>
            {isHost && (
              <Button onClick={onRestart}>
                Play Again
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
