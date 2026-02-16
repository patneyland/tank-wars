export type WeaponType = "standard" | "big" | "sniper" | "shotgun" | "roller";

export interface WeaponDef {
  id: WeaponType;
  name: string;
  damage: number;
  radius: number;
  speed: number;
  ammo: number;
  special: string;
  pellets?: number;
  spreadAngles?: number[];
  delayMs?: number;
  rollDecel?: number;
  rollStopSpeed?: number;
  rollMaxTicks?: number;
}

export const WEAPON_DEFS: WeaponDef[] = [
  {
    id: "standard",
    name: "Standard",
    damage: 25,
    radius: 35,
    speed: 1,
    ammo: -1,
    special: "Basic shot"
  },
  {
    id: "big",
    name: "Big Shot",
    damage: 40,
    radius: 55,
    speed: 0.85,
    ammo: 2,
    special: "Large explosion"
  },
  {
    id: "sniper",
    name: "Sniper",
    damage: 50,
    radius: 20,
    speed: 1.5,
    ammo: 2,
    special: "Fast, small radius"
  },
  {
    id: "shotgun",
    name: "Shotgun",
    damage: 15,
    radius: 25,
    speed: 0.9,
    ammo: 3,
    special: "Fires 3 spread projectiles",
    pellets: 3,
    spreadAngles: [-0.12, 0, 0.12],
    delayMs: 200
  },
  {
    id: "roller",
    name: "Roller",
    damage: 30,
    radius: 30,
    speed: 0.7,
    ammo: 2,
    special: "Rolls along the surface",
    rollDecel: 0.995,
    rollStopSpeed: 0.1,
    rollMaxTicks: 180
  }
];

export const WEAPON_MAP: Record<WeaponType, WeaponDef> = WEAPON_DEFS.reduce(
  (acc, weapon) => {
    acc[weapon.id] = weapon;
    return acc;
  },
  {} as Record<WeaponType, WeaponDef>
);

export const WEAPON_ORDER = WEAPON_DEFS.map((weapon) => weapon.id);
