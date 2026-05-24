# Mindmapper Antigravity 🌌

A visually stunning, fully interactive, and serverless mind-mapping web application. Ported from the native macOS SwiftUI **Mindmapper-Codex** app, this application delivers a highly responsive, canvas-based diagramming experience built using modern HTML5, JavaScript ES Modules, and Vanilla CSS3.

## 🚀 Live Access on the Web

The application is deployed serverless and is publicly accessible at:
👉 **[https://lpbrochu.github.io/Mindmapper-Antigravity/](https://lpbrochu.github.io/Mindmapper-Antigravity/)**

*Any changes pushed to the `main` branch of this repository are automatically compiled and re-deployed in the cloud.*

---

## 🎨 Design Aesthetics & Interface
- **frosted Glassmorphism UI**: Semi-translucent panels (`backdrop-filter`) floating above an infinite canvas workspace.
- **Obsidian Dark Theme**: Deep dark interface with an obsidian blueprint grid background, optimized for focus.
- **Neon Theme Accents**: Seven dynamic node colors (Teal, Blue, Indigo, Pink/Rose, Orange/Amber, Green, Graphite) featuring vibrant custom glow shadows and matching connection strokes.
- **Mac-Native Layout**: Three-pane responsive structure mirroring the macOS native split navigation view (Left Document Explorer, Center Board Canvas, Right Property Inspector).

---

## ⚡ Core Features

1. **Intelligent Tree Layout Engine**:
   - Replicates the SwiftUI post-order dendrogram tree reflow algorithm (`Tidy Layout`). Automatically calculates spacing, offsets, and centers parent nodes beautifully.
2. **Dynamic Drag Reparenting**:
   - Translate entire branches (dragging a node automatically shifts all of its descendants).
   - Live bounding-box collision detection: hovering a branch near a new parent changes its border to a glowing yellow active state and renders an animated, flowing dashed preview curve.
3. **Bezier Curve Vector Connectors**:
   - Infinitely sharp cubic Bezier paths (`M sx sy C ...`) drawn over the canvas dynamically. Connectors are colored to match the theme of the child node.
4. **Local Workspace Storage**:
   - **Auto-Save**: Integrates browser `localStorage` backups so your current workspace is automatically preserved across page reloads.
5. **Universal Portability & Import/Export**:
   - Save and load raw JSON workspaces locally.
   - Import and Export standard indented Markdown outlines (converts lists like `- Idea` and notes `  > Notes` into fully structural mindmaps).
   - Drag-and-Drop files directly onto the board viewport to import them.
6. **Precision Controls**:
   - Inspector panel allows numerical coordinate nudges, color wheel overrides, title changes, and descriptive note editing.
   - Dual-mode inline text renames: double-click any node card directly on the board, type its title, and hit `Enter` or click away to save.

---

## 🎹 Keyboard Shortcuts Quick Sheet

| Hotkey | Action |
| :--- | :--- |
| **`Tab`** | Add a new child node to the selection |
| **`Enter`** | Add a new sibling node beside the selection |
| **`Backspace` / `Delete`** | Delete the selected node and its entire branch |
| **`Arrow Keys`** | Nudge the selected node coordinates by 12px |
| **`Escape`** | Deselect active node / dismiss editing state |
| **`Cmd/Ctrl + S`** | Save document as JSON |
| **`Cmd/Ctrl +`** | Zoom Canvas In |
| **`Cmd/Ctrl -`** | Zoom Canvas Out |

---

## 🛠️ Development & Local Setup

The project uses the lightweight **Vite** bundler for rapid hot-reloading development and optimized static builds.

### Prerequisite
Make sure you have [Node.js](https://nodejs.org/) installed (version 18 or higher is recommended).

### 1. Installation
Clone the repository and install dependencies:
```bash
cd Mindmapper-Antigravity
npm install
```

### 2. Run Local Development Server
Start Vite locally:
```bash
npm run dev
```
Open the printed local URL (usually `http://localhost:5173`) in your web browser.

### 3. Build Production Bundle
To bundle the application into highly optimized, minified static HTML/CSS/JS files:
```bash
npm run build
```
The output will be generated inside the `dist/` directory. Thanks to relative path configuration (`base: './'`), the built contents of this folder are completely portable and can be run by double-clicking the `dist/index.html` file on any computer without needing a local server.

---

## ☁️ Continuous Deployment Workflow

The app uses **GitHub Actions** for serverless, continuous deployment:
- Workflow file: `.github/workflows/deploy.yml`
- Triggered automatically on every push to the `main` branch.
- Compiles the static Vite bundle and uploads it to GitHub Pages.
