# OZATROOM PREVIS

**Cinematic Previsualization Studio** — browser-based 3D scene builder foundation.

## Run locally
Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local Vite URL (normally http://localhost:5173).

## Production build
```bash
npm run build
npm run preview
```

## v0.1.0 — Scene Builder foundation
- Three.js viewport through React Three Fiber
- Perspective orbit navigation, realtime lighting and ground grid
- Scene hierarchy / Outliner
- Add box, sphere, cylinder and plane primitives
- Select objects in viewport or Outliner
- Translate, rotate and scale gizmos
- Numeric transform inspector and material color editing
- Duplicate, delete and visibility toggle
- Save and load local `.ozprevis.json` project files

## Roadmap
1. GLB/glTF asset import and robust selection
2. Cinematic camera system: sensor, focal length, focus, DOF and camera rigs
3. Shot timeline, keyframes and motion paths
4. Storyboard and shot list
5. Secure backend adapters for Higgsfield, Kling and Veo

AI provider credentials must remain on the server and must never be embedded in browser code.

This is an initial development scaffold, not a production release. AI provider integrations, cloud storage, collaboration and final video rendering are not implemented yet.
