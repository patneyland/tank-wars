import type { WeaponType } from "./weapons";

export type RoomState = "lobby" | "playing" | "roundEnd";

export interface PlayerPublic {
  id: string;
  name: string;
  color: string;
  wins: number;
  isHost: boolean;
  isConnected: boolean;
}

export interface RoomUpdate {
  roomId: string;
  state: RoomState;
  players: PlayerPublic[];
  hostSocketId: string;
  roomCode: string;
  maxPlayers: number;
}

export interface TankState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  power: number;
  hp: number;
  fuel: number;
  alive: boolean;
  weapon: WeaponType;
  weaponAmmo: Record<WeaponType, number>;
  wins: number;
}

export interface ProjectileState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weapon: WeaponType;
  ownerId: string;
  ticksAlive: number;
  rolling: boolean;
  rollTicks: number;
}

export interface ExplosionState {
  id: string;
  x: number;
  y: number;
  radius: number;
  frame: number;
  maxFrames: number;
}

export interface TurnState {
  currentPlayerId: string | null;
  turnEndsAt: number;
  wind: number;
  projectileActive: boolean;
}

export interface GameState {
  roomId: string;
  phase: RoomState;
  terrain: number[];
  players: TankState[];
  projectiles: ProjectileState[];
  explosions: ExplosionState[];
  turn: TurnState;
  winnerId: string | null;
}

export interface ClientToServerEvents {
  "room:create": (payload: { nicknames: string[] }) => void;
  "room:join": (payload: { roomId: string; nicknames: string[] }) => void;
  "room:rejoin": (payload: { roomId: string; oldSocketId: string }) => void;
  "game:start": () => void;
  "game:restart": () => void;
  "player:move": (payload: { playerId: string; direction: "left" | "right" }) => void;
  "player:angle": (payload: { playerId: string; angle: number }) => void;
  "player:power": (payload: { playerId: string; power: number }) => void;
  "player:weapon": (payload: { playerId: string; weapon: WeaponType }) => void;
  "player:fire": (payload: { playerId: string }) => void;
}

export interface ServerToClientEvents {
  "room:update": (payload: RoomUpdate) => void;
  "room:myPlayers": (payload: string[]) => void;
  "game:state": (payload: GameState) => void;
  "error:message": (payload: string) => void;
}
