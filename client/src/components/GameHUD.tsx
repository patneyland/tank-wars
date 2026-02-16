import * as React from "react";
import type { GameState } from "@shared/types";
import { WEAPON_DEFS } from "@shared/weapons";
import { socket } from "../socket";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Card } from "./ui/card";
import { ArrowIcon } from "./icons";

interface GameHUDProps {
  gameState: GameState;
  myPlayerIds: string[];
}

const useNow = (interval = 250) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
};

export const GameHUD = ({ gameState, myPlayerIds }: GameHUDProps) => {
  const now = useNow();
  const currentPlayer = gameState.players.find(
    (player) => player.id === gameState.turn.currentPlayerId
  );
  const isMyTurn = !!currentPlayer && myPlayerIds.includes(currentPlayer.id);
  const canControl = isMyTurn && !gameState.turn.projectileActive && gameState.phase === "playing";
  const showControls = canControl;
  const remaining = Math.max(0, Math.ceil((gameState.turn.turnEndsAt - now) / 1000));
  const windDirection = gameState.turn.wind >= 0 ? 1 : -1;

  const moveIntervalRef = React.useRef<number | null>(null);

  const stopMove = React.useCallback(() => {
    if (moveIntervalRef.current) {
      window.clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }, []);

  const startMove = React.useCallback(
    (direction: "left" | "right") => {
      if (!currentPlayer || !canControl) {
        return;
      }
      if (moveIntervalRef.current) {
        return;
      }
      socket.emit("player:move", { playerId: currentPlayer.id, direction });
      moveIntervalRef.current = window.setInterval(() => {
        socket.emit("player:move", { playerId: currentPlayer.id, direction });
      }, 140);
    },
    [currentPlayer, canControl]
  );

  React.useEffect(() => () => stopMove(), [stopMove]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">Wind</div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10">
              <ArrowIcon
                className={`text-amber-300 ${windDirection > 0 ? "" : "rotate-180"}`}
              />
            </span>
            <span>{Math.abs(gameState.turn.wind)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/60 px-4 py-2 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.3em] text-white/60">Turn</div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: currentPlayer?.color ?? "#999" }}
            />
            <span className={`text-sm font-semibold ${isMyTurn ? "text-[#ffd700]" : "text-white"}`}>
              {currentPlayer ? currentPlayer.name : "-"}
            </span>
          </div>
        </div>

        <div
          className={`rounded-xl border border-white/10 bg-black/60 px-4 py-2 text-lg font-semibold backdrop-blur ${
            remaining <= 5 ? "text-red-400" : "text-white"
          }`}
        >
          {remaining}s
        </div>
      </div>

      <div className="flex justify-end">
        <Card className="pointer-events-auto w-64 p-3">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">Players</div>
          <div className="mt-3 flex flex-col gap-2">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 ${
                  player.alive ? "bg-white/5" : "bg-white/5 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: player.color }} />
                  <span className="text-sm text-white">{player.name}</span>
                </div>
                <span className={`text-xs ${player.alive ? "text-white/70" : "text-red-400"}`}>
                  {player.alive ? `${player.hp} HP` : "DEAD"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {currentPlayer && isMyTurn && showControls && (
        <div className="pointer-events-auto">
          <Card className="mx-auto w-full max-w-4xl p-4">
            <div className="flex flex-col gap-4">
              <div className="grid gap-2 md:grid-cols-5">
                {WEAPON_DEFS.map((weapon) => {
                  const ammo = currentPlayer.weaponAmmo[weapon.id];
                  const isSelected = currentPlayer.weapon === weapon.id;
                  const isDisabled = ammo === 0 || !canControl;
                  const ammoLabel = ammo < 0 ? "INF" : ammo;
                  return (
                    <Button
                      key={weapon.id}
                      variant={isSelected ? "default" : "secondary"}
                      size="sm"
                      disabled={isDisabled}
                      onClick={() =>
                        socket.emit("player:weapon", { playerId: currentPlayer.id, weapon: weapon.id })
                      }
                    >
                      <div className="flex w-full flex-col items-start text-left">
                        <span className="text-xs uppercase tracking-wide">{weapon.name}</span>
                        <span className="text-[11px] text-white/70">Ammo: {ammoLabel}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!canControl}
                    onMouseDown={() => startMove("left")}
                    onMouseUp={stopMove}
                    onMouseLeave={stopMove}
                    onTouchStart={() => startMove("left")}
                    onTouchEnd={stopMove}
                  >
                    L
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!canControl}
                    onMouseDown={() => startMove("right")}
                    onMouseUp={stopMove}
                    onMouseLeave={stopMove}
                    onTouchStart={() => startMove("right")}
                    onTouchEnd={stopMove}
                  >
                    R
                  </Button>
                  <div className="ml-3">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/40">Fuel</div>
                    <div className="mt-1 h-2 w-28 rounded-full bg-white/10">
                      <div
                        className={`h-2 rounded-full ${
                          currentPlayer.fuel > 60
                            ? "bg-cyan-400"
                            : currentPlayer.fuel > 30
                              ? "bg-yellow-400"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, currentPlayer.fuel))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
                      <span>Angle</span>
                      <span className="text-white/60">{Math.round(currentPlayer.angle)} deg</span>
                    </div>
                    <Slider
                      min={-180}
                      max={0}
                      step={1}
                      value={currentPlayer.angle}
                      disabled={!canControl}
                      onChange={(event) =>
                        socket.emit("player:angle", {
                          playerId: currentPlayer.id,
                          angle: Number(event.target.value)
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
                      <span>Power</span>
                      <span className="text-white/60">{Math.round(currentPlayer.power)}</span>
                    </div>
                    <Slider
                      min={10}
                      max={100}
                      step={1}
                      value={currentPlayer.power}
                      disabled={!canControl}
                      onChange={(event) =>
                        socket.emit("player:power", {
                          playerId: currentPlayer.id,
                          power: Number(event.target.value)
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-white/60">
                  {canControl
                    ? "Adjust angle, power, and fire when ready."
                    : gameState.turn.projectileActive
                      ? "Projectile in flight..."
                      : "Waiting for your turn."}
                </div>
                <Button
                  variant="danger"
                  size="lg"
                  disabled={!canControl}
                  onClick={() => socket.emit("player:fire", { playerId: currentPlayer.id })}
                >
                  FIRE
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
