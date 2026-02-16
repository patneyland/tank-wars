import type { Server } from "socket.io";
import {
  BARREL_LENGTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FUEL_COST_PER_MOVE,
  FUEL_PER_TURN,
  GRAVITY,
  MAX_LOCAL_PLAYERS,
  MAX_PLAYERS,
  MOVE_SPEED,
  TANK_COLORS,
  TANK_HEIGHT,
  TANK_WIDTH,
  TURN_DURATION_MS,
  WIND_FORCE,
  WIND_MAX,
  WIND_MIN
} from "../shared/constants";
import { WEAPON_MAP, WEAPON_ORDER, type WeaponType } from "../shared/weapons";
import type {
  ExplosionState,
  GameState,
  PlayerPublic,
  ProjectileState,
  RoomState,
  RoomUpdate,
  TankState
} from "../shared/types";
import { clamp, distance, isOutOfBounds, isPointInTank } from "./physics";
import { deformTerrain, generateTerrain } from "./terrain";

interface PlayerData extends TankState {
  socketId: string;
  isConnected: boolean;
}

const createId = () => Math.random().toString(36).slice(2, 10);

const randomWind = () =>
  Math.floor(Math.random() * (WIND_MAX - WIND_MIN + 1)) + WIND_MIN;

const makeAmmo = (): Record<WeaponType, number> => {
  const ammo = {} as Record<WeaponType, number>;
  for (const weapon of WEAPON_ORDER) {
    ammo[weapon] = WEAPON_MAP[weapon].ammo;
  }
  return ammo;
};

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export class GameRoom {
  readonly io: Server;
  readonly roomId: string;
  state: RoomState = "lobby";
  hostSocketId: string | null = null;
  players = new Map<string, PlayerData>();
  socketPlayers = new Map<string, string[]>();
  terrain: number[] = generateTerrain();
  projectiles: ProjectileState[] = [];
  explosions: ExplosionState[] = [];
  turnOrder: string[] = [];
  turnIndex = 0;
  currentPlayerId: string | null = null;
  turnEndsAt = 0;
  wind = 0;
  projectileActive = false;
  pendingShots = 0;
  awaitingResolution = false;
  winnerId: string | null = null;
  turnTimer?: NodeJS.Timeout;
  tickTimer?: NodeJS.Timeout;
  disconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(io: Server, roomId: string) {
    this.io = io;
    this.roomId = roomId;
  }

  getRoomUpdate(): RoomUpdate {
    const players: PlayerPublic[] = Array.from(this.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      wins: player.wins,
      isHost: player.socketId === this.hostSocketId,
      isConnected: player.isConnected
    }));

    return {
      roomId: this.roomId,
      roomCode: this.roomId,
      state: this.state,
      players,
      hostSocketId: this.hostSocketId ?? "",
      maxPlayers: MAX_PLAYERS
    };
  }

  getGameState(): GameState {
    return {
      roomId: this.roomId,
      phase: this.state,
      terrain: this.terrain,
      players: Array.from(this.players.values()),
      projectiles: this.projectiles,
      explosions: this.explosions,
      turn: {
        currentPlayerId: this.currentPlayerId,
        turnEndsAt: this.turnEndsAt,
        wind: this.wind,
        projectileActive: this.projectileActive
      },
      winnerId: this.winnerId
    };
  }

  emitRoomUpdate() {
    this.io.to(this.roomId).emit("room:update", this.getRoomUpdate());
  }

  emitGameState() {
    this.io.to(this.roomId).emit("game:state", this.getGameState());
  }

  getPlayerIdsForSocket(socketId: string) {
    return this.socketPlayers.get(socketId) ?? [];
  }

  addPlayers(socketId: string, nicknames: string[]) {
    const cleaned = nicknames.map((name) => name.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      throw new Error("At least one nickname is required.");
    }
    if (cleaned.length > MAX_LOCAL_PLAYERS) {
      throw new Error("Max 4 players per device.");
    }
    if (this.players.size + cleaned.length > MAX_PLAYERS) {
      throw new Error("Room is full.");
    }

    const assignedIds: string[] = [];
    for (const nickname of cleaned) {
      const id = createId();
      const color = TANK_COLORS[this.players.size % TANK_COLORS.length];
      const player: PlayerData = {
        id,
        name: nickname,
        color,
        socketId,
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        angle: -90,
        power: 60,
        hp: 100,
        fuel: FUEL_PER_TURN,
        alive: true,
        weapon: "standard",
        weaponAmmo: makeAmmo(),
        wins: 0,
        isConnected: true
      };
      this.players.set(id, player);
      assignedIds.push(id);
    }

    const existing = this.socketPlayers.get(socketId) ?? [];
    this.socketPlayers.set(socketId, [...existing, ...assignedIds]);

    if (!this.hostSocketId) {
      this.hostSocketId = socketId;
    }

    return assignedIds;
  }

  reassignSocket(oldSocketId: string, newSocketId: string) {
    const playerIds = this.socketPlayers.get(oldSocketId);
    if (!playerIds || playerIds.length === 0) {
      return false;
    }

    this.socketPlayers.delete(oldSocketId);
    this.socketPlayers.set(newSocketId, playerIds);
    for (const id of playerIds) {
      const player = this.players.get(id);
      if (player) {
        player.socketId = newSocketId;
        player.isConnected = true;
      }
    }

    const timer = this.disconnectTimers.get(oldSocketId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(oldSocketId);
    }

    if (this.hostSocketId === oldSocketId) {
      this.hostSocketId = newSocketId;
    }

    return true;
  }

  handleDisconnect(socketId: string) {
    const playerIds = this.socketPlayers.get(socketId) ?? [];
    if (playerIds.length === 0) {
      return;
    }

    if (this.state === "lobby") {
      this.removeSocketPlayers(socketId);
      this.emitRoomUpdate();
      return;
    }

    for (const id of playerIds) {
      const player = this.players.get(id);
      if (player) {
        player.isConnected = false;
      }
    }

    const timer = setTimeout(() => {
      this.removeSocketPlayers(socketId);
      this.emitRoomUpdate();
    }, 60000);
    this.disconnectTimers.set(socketId, timer);
    this.emitRoomUpdate();
  }

  removeSocketPlayers(socketId: string) {
    const playerIds = this.socketPlayers.get(socketId) ?? [];
    for (const id of playerIds) {
      this.players.delete(id);
    }
    this.socketPlayers.delete(socketId);

    if (this.hostSocketId === socketId) {
      const nextHost = Array.from(this.socketPlayers.keys())[0] ?? null;
      this.hostSocketId = nextHost;
    }

    if (this.state !== "lobby") {
      if (!this.projectileActive && !this.awaitingResolution) {
        if (!this.currentPlayerId || !this.players.has(this.currentPlayerId)) {
          this.advanceTurn();
        }
        const alivePlayers = Array.from(this.players.values()).filter((player) => player.alive);
        if (alivePlayers.length <= 1 && !this.projectileActive) {
          this.endRound();
          return;
        }
      }
      this.emitGameState();
    }
  }

  isEmpty() {
    return this.players.size === 0;
  }

  dispose() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
  }

  startRound() {
    this.state = "playing";
    this.terrain = generateTerrain();
    this.projectiles = [];
    this.explosions = [];
    this.pendingShots = 0;
    this.awaitingResolution = false;
    this.winnerId = null;

    const players = Array.from(this.players.values());
    const spacing = CANVAS_WIDTH / (players.length + 1);
    players.forEach((player, index) => {
      const x = clamp(spacing * (index + 1), TANK_WIDTH / 2 + 4, CANVAS_WIDTH - TANK_WIDTH / 2 - 4);
      const terrainIndex = clamp(Math.round(x), 0, this.terrain.length - 1);
      player.x = x;
      player.y = this.terrain[terrainIndex];
      player.hp = 100;
      player.alive = true;
      player.angle = -90;
      player.power = 60;
      player.weapon = "standard";
      player.weaponAmmo = makeAmmo();
      player.fuel = FUEL_PER_TURN;
    });

    this.turnOrder = shuffle(players.map((player) => player.id));
    this.turnIndex = 0;
    this.currentPlayerId = this.turnOrder[0] ?? null;
    this.wind = randomWind();
    this.projectileActive = false;

    this.setTurnTimer();
    this.startTicking();
    this.emitRoomUpdate();
    this.emitGameState();
  }

  restartRound() {
    this.startRound();
  }

  private startTicking() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }
    this.tickTimer = setInterval(() => this.tick(), 1000 / 60);
  }

  private setTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
    this.turnEndsAt = Date.now() + TURN_DURATION_MS;
    this.turnTimer = setTimeout(() => {
      if (this.currentPlayerId && !this.projectileActive) {
        this.fireWeapon(this.currentPlayerId);
      }
    }, TURN_DURATION_MS);
  }

  private nextAlivePlayerIndex(startIndex: number) {
    if (this.turnOrder.length === 0) {
      return -1;
    }
    for (let offset = 1; offset <= this.turnOrder.length; offset += 1) {
      const index = (startIndex + offset) % this.turnOrder.length;
      const id = this.turnOrder[index];
      const player = this.players.get(id);
      if (player?.alive) {
        return index;
      }
    }
    return -1;
  }

  private advanceTurn() {
    const startIndex = this.currentPlayerId ? this.turnIndex : -1;
    const nextIndex = this.nextAlivePlayerIndex(startIndex);
    if (nextIndex === -1) {
      this.endRound();
      return;
    }
    this.turnIndex = nextIndex;
    this.currentPlayerId = this.turnOrder[this.turnIndex];
    this.wind = randomWind();
    this.projectileActive = false;
    const player = this.players.get(this.currentPlayerId);
    if (player) {
      player.fuel = FUEL_PER_TURN;
    }
    this.setTurnTimer();
  }

  private endRound() {
    this.state = "roundEnd";
    this.currentPlayerId = null;
    this.turnEndsAt = 0;
    this.projectileActive = false;
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }

    const alivePlayers = Array.from(this.players.values()).filter((player) => player.alive);
    if (alivePlayers.length === 1) {
      this.winnerId = alivePlayers[0].id;
      alivePlayers[0].wins += 1;
    } else {
      this.winnerId = null;
    }

    this.emitRoomUpdate();
    this.emitGameState();
  }

  private isPlayersTurn(playerId: string) {
    return this.currentPlayerId === playerId;
  }

  private ownsPlayer(socketId: string, playerId: string) {
    const playerIds = this.socketPlayers.get(socketId) ?? [];
    return playerIds.includes(playerId);
  }

  handleMove(socketId: string, playerId: string, direction: "left" | "right") {
    if (!this.ownsPlayer(socketId, playerId) || !this.isPlayersTurn(playerId)) {
      return;
    }
    const player = this.players.get(playerId);
    if (!player || !player.alive || this.projectileActive) {
      return;
    }
    if (player.fuel < FUEL_COST_PER_MOVE) {
      return;
    }
    const delta = direction === "left" ? -MOVE_SPEED : MOVE_SPEED;
    const nextX = clamp(player.x + delta, TANK_WIDTH / 2, CANVAS_WIDTH - TANK_WIDTH / 2);
    player.x = nextX;
    const terrainIndex = clamp(Math.round(nextX), 0, this.terrain.length - 1);
    player.y = this.terrain[terrainIndex];
    player.fuel = Math.max(0, player.fuel - FUEL_COST_PER_MOVE);
    this.emitGameState();
  }

  handleAngle(socketId: string, playerId: string, angle: number) {
    if (!this.ownsPlayer(socketId, playerId) || !this.isPlayersTurn(playerId)) {
      return;
    }
    const player = this.players.get(playerId);
    if (!player || !player.alive) {
      return;
    }
    player.angle = clamp(angle, -180, 0);
    this.emitGameState();
  }

  handlePower(socketId: string, playerId: string, power: number) {
    if (!this.ownsPlayer(socketId, playerId) || !this.isPlayersTurn(playerId)) {
      return;
    }
    const player = this.players.get(playerId);
    if (!player || !player.alive) {
      return;
    }
    player.power = clamp(power, 10, 100);
    this.emitGameState();
  }

  handleWeapon(socketId: string, playerId: string, weapon: WeaponType) {
    if (!this.ownsPlayer(socketId, playerId) || !this.isPlayersTurn(playerId)) {
      return;
    }
    const player = this.players.get(playerId);
    if (!player || !player.alive) {
      return;
    }
    const ammo = player.weaponAmmo[weapon];
    if (ammo === 0) {
      return;
    }
    player.weapon = weapon;
    this.emitGameState();
  }

  handleFire(socketId: string, playerId: string) {
    if (!this.ownsPlayer(socketId, playerId) || !this.isPlayersTurn(playerId)) {
      return;
    }
    this.fireWeapon(playerId);
  }

  private fireWeapon(playerId: string) {
    if (this.projectileActive) {
      return;
    }
    const player = this.players.get(playerId);
    if (!player || !player.alive) {
      return;
    }
    let weaponId = player.weapon;
    if (player.weaponAmmo[weaponId] === 0) {
      weaponId = "standard";
      player.weapon = "standard";
    }

    const weapon = WEAPON_MAP[weaponId];
    if (weapon.ammo > 0) {
      player.weaponAmmo[weaponId] = Math.max(0, player.weaponAmmo[weaponId] - 1);
    }

    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }

    this.awaitingResolution = true;
    this.projectileActive = true;
    this.emitGameState();

    const baseAngle = (player.angle * Math.PI) / 180;
    const speed = player.power * 0.15 * weapon.speed;
    const barrelX = player.x + Math.cos(baseAngle) * BARREL_LENGTH;
    const barrelY = player.y - TANK_HEIGHT + 6 + Math.sin(baseAngle) * BARREL_LENGTH;

    if (weaponId === "shotgun" && weapon.spreadAngles && weapon.delayMs) {
      this.pendingShots = weapon.spreadAngles.length;
      weapon.spreadAngles.forEach((offset, index) => {
        setTimeout(() => {
          if (this.state !== "playing") {
            this.pendingShots = Math.max(0, this.pendingShots - 1);
            return;
          }
          this.spawnProjectile(
            playerId,
            weaponId,
            barrelX,
            barrelY,
            baseAngle + offset,
            speed
          );
          this.pendingShots = Math.max(0, this.pendingShots - 1);
        }, weapon.delayMs * index);
      });
      return;
    }

    this.spawnProjectile(playerId, weaponId, barrelX, barrelY, baseAngle, speed);
  }

  private spawnProjectile(
    ownerId: string,
    weapon: WeaponType,
    x: number,
    y: number,
    angle: number,
    speed: number
  ) {
    const projectile: ProjectileState = {
      id: createId(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      weapon,
      ownerId,
      ticksAlive: 0,
      rolling: false,
      rollTicks: 0
    };
    this.projectiles.push(projectile);
    this.emitGameState();
  }

  private settleTanks() {
    for (const player of this.players.values()) {
      if (!player.alive) {
        continue;
      }
      const idx = clamp(Math.round(player.x), 0, this.terrain.length - 1);
      player.y = this.terrain[idx];
    }
  }

  private applyExplosionDamage(centerX: number, centerY: number, radius: number, damage: number) {
    for (const player of this.players.values()) {
      if (!player.alive) {
        continue;
      }
      const centerTankY = player.y - TANK_HEIGHT / 2;
      const dist = distance(centerX, centerY, player.x, centerTankY);
      const damageFactor = Math.max(0, 1 - dist / (radius + TANK_WIDTH / 2));
      if (damageFactor <= 0) {
        continue;
      }
      const actualDamage = Math.round(damage * (0.5 + damageFactor * 0.5));
      player.hp = Math.max(0, player.hp - actualDamage);
      if (player.hp <= 0) {
        player.alive = false;
      }
    }
  }

  private triggerExplosion(x: number, y: number, weapon: WeaponType) {
    const weaponDef = WEAPON_MAP[weapon];
    deformTerrain(this.terrain, x, y, weaponDef.radius);
    this.applyExplosionDamage(x, y, weaponDef.radius, weaponDef.damage);
    this.settleTanks();
    this.explosions.push({
      id: createId(),
      x,
      y,
      radius: weaponDef.radius,
      frame: 0,
      maxFrames: 30
    });
  }

  private findTankHit(x: number, y: number) {
    for (const player of this.players.values()) {
      if (!player.alive) {
        continue;
      }
      if (isPointInTank(x, y, player)) {
        return player;
      }
    }
    return null;
  }

  private tick() {
    if (this.state !== "playing") {
      return;
    }

    let stateChanged = false;

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      const weaponDef = WEAPON_MAP[projectile.weapon];

      if (projectile.rolling) {
        projectile.rollTicks += 1;
        projectile.vx *= weaponDef.rollDecel ?? 0.995;
        projectile.x += projectile.vx;

        const idx = Math.round(projectile.x);
        if (idx < 0 || idx >= this.terrain.length) {
          this.projectiles.splice(i, 1);
          this.triggerExplosion(projectile.x, projectile.y, projectile.weapon);
          stateChanged = true;
          continue;
        }
        projectile.y = this.terrain[idx];

        const hitTank = this.findTankHit(projectile.x, projectile.y - 4);
        if (hitTank) {
          this.projectiles.splice(i, 1);
          this.triggerExplosion(projectile.x, projectile.y, projectile.weapon);
          stateChanged = true;
          continue;
        }

        if (
          Math.abs(projectile.vx) < (weaponDef.rollStopSpeed ?? 0.1) ||
          projectile.rollTicks >= (weaponDef.rollMaxTicks ?? 180)
        ) {
          this.projectiles.splice(i, 1);
          this.triggerExplosion(projectile.x, projectile.y, projectile.weapon);
          stateChanged = true;
        }
        continue;
      }

      projectile.vx += this.wind * WIND_FORCE;
      projectile.vy += GRAVITY;
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      projectile.ticksAlive += 1;

      const tankHit = this.findTankHit(projectile.x, projectile.y);
      if (tankHit) {
        this.projectiles.splice(i, 1);
        this.triggerExplosion(projectile.x, projectile.y, projectile.weapon);
        stateChanged = true;
        continue;
      }

      const terrainIndex = Math.round(projectile.x);
      if (terrainIndex >= 0 && terrainIndex < this.terrain.length) {
        const groundY = this.terrain[terrainIndex];
        if (projectile.y >= groundY) {
          if (projectile.weapon === "roller") {
            projectile.rolling = true;
            projectile.rollTicks = 0;
            projectile.y = groundY;
            projectile.vy = 0;
          } else {
            this.projectiles.splice(i, 1);
            this.triggerExplosion(projectile.x, projectile.y, projectile.weapon);
          }
          stateChanged = true;
          continue;
        }
      }

      if (isOutOfBounds(projectile.x, projectile.y)) {
        this.projectiles.splice(i, 1);
        if (projectile.weapon === "roller") {
          this.triggerExplosion(projectile.x, projectile.y, projectile.weapon);
        }
        stateChanged = true;
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i -= 1) {
      const explosion = this.explosions[i];
      explosion.frame += 1;
      if (explosion.frame >= explosion.maxFrames) {
        this.explosions.splice(i, 1);
        stateChanged = true;
      }
    }

    const activeNow =
      this.projectiles.length > 0 || this.explosions.length > 0 || this.pendingShots > 0;
    if (this.projectileActive !== activeNow) {
      this.projectileActive = activeNow;
      stateChanged = true;
    }

    if (!activeNow && this.awaitingResolution) {
      this.awaitingResolution = false;
      const alivePlayers = Array.from(this.players.values()).filter((player) => player.alive);
      if (alivePlayers.length <= 1) {
        this.endRound();
        return;
      }
      this.advanceTurn();
      stateChanged = true;
    }

    if (stateChanged || activeNow) {
      this.emitGameState();
    }
  }
}
