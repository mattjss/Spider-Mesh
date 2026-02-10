# Spider Mesh

An interactive **spider mesh** pattern built with Three.js, React Three Fiber, and Tweakpane.

## About

Spider Mesh is a responsive grid of nodes that react to the pointer: nodes near the cursor grow and brighten, and thin lines connect the active hub to nearby nodes, forming a web-like cluster.

## Tech stack

- **Vite** – build tool
- **React** – UI
- **Three.js** – 3D / WebGL
- **React Three Fiber** – React renderer for Three.js
- **Tweakpane** – live parameter controls

## Setup

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (e.g. `http://localhost:5173`). Move the pointer over the canvas to interact with the mesh. Use the Tweakpane panel to adjust grid size, node sizes, interaction radius, connection radius, and colors.

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run preview` – preview production build

## Repository

[https://github.com/mattjss/Spider-Mesh](https://github.com/mattjss/Spider-Mesh)
