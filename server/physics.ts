import { CANVAS_HEIGHT, CANVAS_WIDTH, TANK_HEIGHT, TANK_WIDTH } from "../shared/constants";
import type { TankState } from "../shared/types";

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const distance = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by);

export const getTankBounds = (tank: TankState): Bounds => ({
  left: tank.x - TANK_WIDTH / 2,
  right: tank.x + TANK_WIDTH / 2,
  top: tank.y - TANK_HEIGHT,
  bottom: tank.y
});

export const isPointInTank = (x: number, y: number, tank: TankState) => {
  const bounds = getTankBounds(tank);
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
};

export const isOutOfBounds = (x: number, y: number) =>
  x < -50 || x > CANVAS_WIDTH + 50 || y < -200 || y > CANVAS_HEIGHT + 200;
