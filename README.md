# OZATROOM PREVIS

**v0.8.0 — Storyboard Frame Export**
- Export every storyboard shot as a numbered PNG frame in one ZIP archive
- Each frame is captured from the live WebGL viewport using that shot's saved camera position, target and focal length
- Original camera rig and focal length are restored after export
- PNGs use the viewport's actual pixel dimensions; output resolution presets and framing overlays are not baked into exported images

**v0.7.0 — Architectural Blockout Tools**
- Add editable wall, floor and ceiling blockout elements from the ARCH tab
- Preset dimensions: wall 4.0 × 2.8 × 0.2 m; floor/ceiling 4.0 × 0.12 × 4.0 m
- Transform inspector provides numeric width, height and depth editing through scale axes
- Unit display presets for meters, centimeters and millimeters (scene coordinates remain meters)
- Architectural elements are regular editable scene meshes and are saved in project files

**Cinematic Previsualization Studio** — browser-based 3D scene builder.

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

## v0.6.0 — Cinematic Render Preview
- Preview framing guides for 16:9, 9:16, 1:1, 4:3 and 2.39:1 aspect ratios
- Composition overlay with action/title safe zones and center guides
- Resolution target presets from HD through 4K and vertical formats
- Export the current WebGL viewport as a PNG image
- Render preview settings are saved in the project file
- PNG export uses the viewport's actual pixel dimensions; selected resolution is a target preset, not an offline render resolution

## v0.5.0 — Storyboard & Shot Manager
- Create and manage storyboard shots in a dedicated SHOTS tab
- Edit shot names, shot type, duration and director's notes
- Capture the current camera position, target and focal length into a shot
- Recall a saved shot to restore its camera framing
- Storyboard data is included in .ozprevis.json project files

## v0.4.0 — Camera Rig & Shot Timeline
- Camera rig mode with Dolly, Truck and Pedestal movement controls
- Pan and Tilt aiming controls with adjustable target point
- Save camera positions, targets and focal lengths as shot keyframes
- Select keyframes to restore a shot; play a linear camera move between keyframes
- Camera rig and keyframes are stored in the .ozprevis.json project

## v0.3.0 — Cinematic Camera
- ARRI Alexa 35, ARRI Alexa Mini LF, Sony Venice 2 and Super 35 profiles
- Focal length presets and live horizontal field-of-view updates
- Aperture metadata stored with camera settings (optical depth of field is not yet rendered)

## v0.2.0 — GLB Asset Import
- Import binary glTF (.glb) assets up to 100 MB
- Imported models appear as selectable Outliner items
- Imported model transform uses Move / Rotate / Scale gizmos
- Model size is normalized on import while preserving proportions
- Imported model data is embedded in the .ozprevis.json project file
- Reopen saved projects with embedded GLB assets

## v0.1.0 — Scene Builder
- Three.js viewport through React Three Fiber
- Perspective orbit navigation, realtime lighting and ground grid
- Scene hierarchy / Outliner
- Add box, sphere, cylinder and plane primitives
- Select objects in viewport or Outliner
- Translate, rotate and scale gizmos
- Numeric transform inspector and material color editing
- Duplicate, delete and visibility toggle
- Save and load local .ozprevis.json project files

## Roadmap
1. Improve asset browser, drag-and-drop and GLTF support
2. Cinematic camera system: sensor, focal length, focus, DOF and camera rigs
3. Shot timeline, keyframes and motion paths
4. Storyboard and shot list
5. Secure backend adapters for Higgsfield, Kling and Veo

AI provider credentials must remain on the server and must never be embedded in browser code.

**Note:** This is an evolving development build. The GLB importer supports self-contained binary GLB files; standalone .gltf files with external texture/buffer references are not supported yet.


## GitHub Pages

The `previs` branch is configured for automatic GitHub Pages deployment via GitHub Actions.
