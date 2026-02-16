import * as React from "react";
import type { GameState, TankState } from "@shared/types";
import { BARREL_LENGTH, CANVAS_HEIGHT, CANVAS_WIDTH, TANK_HEIGHT, TANK_WIDTH } from "@shared/constants";

interface GameCanvasProps {
  gameState: GameState;
}

const hexToRgb = (hex: string) => {
  const raw = hex.replace("#", "");
  const bigint = parseInt(raw, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const shade = (hex: string, amount: number) => {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.min(255, Math.max(0, r + amount));
  const ng = Math.min(255, Math.max(0, g + amount));
  const nb = Math.min(255, Math.max(0, b + amount));
  return `rgb(${nr}, ${ng}, ${nb})`;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

export const GameCanvas = ({ gameState }: GameCanvasProps) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stateRef = React.useRef<GameState>(gameState);
  const starsRef = React.useRef<{ x: number; y: number; r: number; a: number }[]>([]);

  React.useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  React.useEffect(() => {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT * 0.5,
      r: 0.8 + Math.random() * 1.6,
      a: 0.4 + Math.random() * 0.6
    }));
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const resize = () => {
      const parent = canvas.parentElement ?? document.body;
      const { width, height } = parent.getBoundingClientRect();
      const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
      canvas.style.width = `${CANVAS_WIDTH * scale}px`;
      canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    };

    resize();
    window.addEventListener("resize", resize);

    let frameId = 0;
    const render = () => {
      const state = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      sky.addColorStop(0, "#07152d");
      sky.addColorStop(0.55, "#2e1c24");
      sky.addColorStop(1, "#c07a2f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      for (const star of starsRef.current) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.a})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (state.terrain.length > 0) {
        const terrainGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.4, 0, CANVAS_HEIGHT);
        terrainGradient.addColorStop(0, "#2f7a47");
        terrainGradient.addColorStop(1, "#5b3a1d");
        ctx.fillStyle = terrainGradient;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT);
        state.terrain.forEach((height, index) => {
          ctx.lineTo(index, height);
        });
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#3bd671";
        ctx.lineWidth = 2;
        ctx.beginPath();
        state.terrain.forEach((height, index) => {
          if (index === 0) {
            ctx.moveTo(index, height);
          } else {
            ctx.lineTo(index, height);
          }
        });
        ctx.stroke();
      }

      for (const tank of state.players) {
        if (!tank.alive) {
          continue;
        }
        drawTank(ctx, tank, state.turn.currentPlayerId === tank.id);
      }

      for (const projectile of state.projectiles) {
        ctx.save();
        ctx.shadowColor = "rgba(255, 170, 60, 0.8)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#f7b733";
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff0c2";
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const explosion of state.explosions) {
        const progress = explosion.frame / explosion.maxFrames;
        const radius = explosion.radius * (0.35 + progress * 0.9);
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = "rgba(255, 214, 102, 0.8)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 120, 64, 0.7)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(60, 60, 60, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        const particles = 12;
        for (let i = 0; i < particles; i += 1) {
          const angle = (i / particles) * Math.PI * 2 + progress * 0.8;
          const pr = radius * (0.4 + (i % 3) * 0.15);
          const px = explosion.x + Math.cos(angle) * pr;
          const py = explosion.y + Math.sin(angle) * pr;
          ctx.fillStyle = "rgba(255, 200, 120, 0.7)";
          ctx.fillRect(px, py, 2, 2);
        }

        ctx.restore();
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
};

const drawTank = (ctx: CanvasRenderingContext2D, tank: TankState, isCurrentTurn: boolean) => {
  const x = tank.x - TANK_WIDTH / 2;
  const y = tank.y - TANK_HEIGHT;
  const bodyGradient = ctx.createLinearGradient(x, y, x, y + TANK_HEIGHT);
  bodyGradient.addColorStop(0, shade(tank.color, 30));
  bodyGradient.addColorStop(1, shade(tank.color, -40));

  ctx.save();
  if (isCurrentTurn) {
    ctx.shadowColor = tank.color;
    ctx.shadowBlur = 16;
  }

  drawRoundedRect(ctx, x, y, TANK_WIDTH, TANK_HEIGHT, 5);
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(x + 2, y + TANK_HEIGHT - 6, TANK_WIDTH - 4, 5);

  const turretX = tank.x;
  const turretY = tank.y - TANK_HEIGHT + 6;
  const turretGradient = ctx.createRadialGradient(turretX, turretY, 2, turretX, turretY, 10);
  turretGradient.addColorStop(0, shade(tank.color, 40));
  turretGradient.addColorStop(1, shade(tank.color, -30));
  ctx.fillStyle = turretGradient;
  ctx.beginPath();
  ctx.arc(turretX, turretY, 8, 0, Math.PI * 2);
  ctx.fill();

  const angle = (tank.angle * Math.PI) / 180;
  const barrelEndX = turretX + Math.cos(angle) * BARREL_LENGTH;
  const barrelEndY = turretY + Math.sin(angle) * BARREL_LENGTH;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#10131a";
  ctx.beginPath();
  ctx.moveTo(turretX, turretY);
  ctx.lineTo(barrelEndX, barrelEndY);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  ctx.moveTo(turretX, turretY);
  ctx.lineTo(barrelEndX, barrelEndY);
  ctx.stroke();

  const hpPercent = Math.max(0, Math.min(1, tank.hp / 100));
  let hpColor = "#3bd671";
  if (hpPercent < 0.34) {
    hpColor = "#e74c3c";
  } else if (hpPercent < 0.67) {
    hpColor = "#f7b733";
  }
  const barWidth = 50;
  const barHeight = 6;
  const barX = tank.x - barWidth / 2;
  const barY = y - 14;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

  const tagText = tank.name;
  ctx.font = "12px Rajdhani";
  const textWidth = ctx.measureText(tagText).width + 16;
  const tagX = tank.x - textWidth / 2;
  const tagY = barY - 18;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  drawRoundedRect(ctx, tagX, tagY, textWidth, 16, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tagText, tank.x, tagY + 8);

  ctx.restore();
};
