# Tank Wars

Multiplayer turn-based 2D artillery game inspired by Scorched Earth and Shellshock Live. Players join rooms via room codes, take turns aiming and firing projectiles at each other on destructible terrain. Last tank standing wins.

## Tech Stack

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui components
- Backend: Node.js + Express
- Real-time: Socket.IO (websocket + polling)
- Rendering: HTML5 Canvas for the game, React for lobby and HUD overlays
- Routing: wouter
- State: In-memory on the server

## Project Structure

```
/
├── client/              # Vite + React frontend
├── server/              # Express + Socket.IO backend
├── shared/              # Shared types and constants
├── package.json         # Root scripts
└── README.md
```

## Development

```
npm run dev
```

- Server runs on `http://localhost:5000`
- Vite dev server runs on `http://localhost:5173`

## Production

```
npm run build
npm start
```

The Express server serves both the Socket.IO backend and the built frontend static files from a single port.

## Railway

Build command: `npm run build`

Start command: `npm start`

Optional `railway.json` is included for convenience.
