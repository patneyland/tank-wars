import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../shared/constants";
import { clamp } from "./physics";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const generateSmoothNoise = (width: number, scale: number) => {
  const samples = Math.ceil(width / scale) + 2;
  const values = Array.from({ length: samples }, () => Math.random());
  const noise = new Array<number>(width);
  for (let x = 0; x < width; x += 1) {
    const sampleIndex = Math.floor(x / scale);
    const t = x / scale - sampleIndex;
    noise[x] = lerp(values[sampleIndex], values[sampleIndex + 1], t);
  }
  return noise;
};

export const generateTerrain = () => {
  const width = CANVAS_WIDTH;
  const minHeight = CANVAS_HEIGHT * 0.3;
  const maxHeight = CANVAS_HEIGHT * 0.85;

  const octaves = [
    { scale: 220, weight: 0.55 },
    { scale: 120, weight: 0.3 },
    { scale: 60, weight: 0.15 }
  ];

  const combined = new Array<number>(width).fill(0);
  for (const octave of octaves) {
    const noise = generateSmoothNoise(width, octave.scale);
    for (let x = 0; x < width; x += 1) {
      combined[x] += noise[x] * octave.weight;
    }
  }

  const terrain = combined.map((value) => minHeight + value * (maxHeight - minHeight));
  return smoothTerrain(terrain, 3);
};

export const smoothTerrain = (terrain: number[], passes = 3) => {
  let current = terrain;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.map((_, index) => {
      let sum = 0;
      let count = 0;
      for (let offset = -2; offset <= 2; offset += 1) {
        const idx = index + offset;
        if (idx >= 0 && idx < current.length) {
          sum += current[idx];
          count += 1;
        }
      }
      return sum / count;
    });
    current = next;
  }
  return current;
};

export const deformTerrain = (terrain: number[], centerX: number, centerY: number, radius: number) => {
  const startX = Math.floor(centerX - radius);
  const endX = Math.ceil(centerX + radius);
  for (let x = startX; x <= endX; x += 1) {
    if (x < 0 || x >= terrain.length) {
      continue;
    }
    const distX = x - centerX;
    const distSq = radius * radius - distX * distX;
    if (distSq <= 0) {
      continue;
    }
    const depth = Math.sqrt(distSq);
    const craterY = clamp(centerY + depth, 0, CANVAS_HEIGHT);
    if (terrain[x] < craterY) {
      terrain[x] = craterY;
    }
  }
  return terrain;
};
