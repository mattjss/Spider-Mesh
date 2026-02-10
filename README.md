# Spider-Mesh

Pattern experiment. Spider particle mesh.

## About

A cursor-following spider mesh: dense grid of orange dots on black. The cursor is the hub; the closest particles stretch toward it (elastic pull), scale up, and connect with lines. Legs have configurable stretch and elastic overshoot.

## Tech stack

- **Vite** – build tool
- **TypeScript** – language
- **Canvas 2D** – rendering
- **Tweakpane** – live controls

## Setup

```bash
npm install
npm run dev
```

Open the URL (e.g. `http://localhost:5173`). Move the cursor over the canvas. Use the Tweakpane panel for grid spacing, neighbor count, pull strength, elasticity, and colors.

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run preview` – preview production build

## Repository

[https://github.com/mattjss/Spider-Mesh](https://github.com/mattjss/Spider-Mesh)
