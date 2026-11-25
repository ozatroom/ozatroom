# OZATROOM PREVIS

**v1.2.0 — Camera Track & Video Preview**
- Record camera-rig keyframes and play a continuous interpolated camera move in the viewport
- Export the camera move as a browser-recorded WebM video at a 24 fps capture stream
- Video export uses the live viewport canvas and current viewport dimensions; it is a realtime preview capture, not an offline 1080p/4K render
- WebM is used because browser MediaRecorder support for MP4 is inconsistent; MP4 export is not included in this release

**v1.1.0 — Editing Safety & Recovery**
- Undo/Redo project history with Ctrl+Z, Ctrl+Y and toolbar controls (up to 60 snapshots)
- Debounced local autosave in browser IndexedDB and automatic project recovery on next launch
- Per-object timeline tracks with Linear, Ease In-Out and Hold interpolation selectors
- Delete individual object keyframes directly from the timeline

**v1.0.0 — Object Animation Timeline**
- Animate selected objects with transform keyframes recorded at the timeline playhead
- Scrub the timeline and preview interpolated position, rotation and scale changes
- Per-segment interpolation: Linear, Ease In-Out and Hold
- Set sequence duration from 1 to 60 seconds and play object animation in the viewport
- Object animation data, playhead and duration are saved in `.ozprevis.json`

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


## v0.9.0 — Workspace Modes
- Build / Animate / Camera workspace modes with B / A / C shortcuts.
- Animate mode captures selected object transform keyframes with K and displays object keyframe markers in the timeline.
- Camera mode opens the camera inspector and enables camera rig controls.
- Space toggles timeline playback; Delete removes the selected object; W/E/R/Q switch transform tools.
- Object keyframes are stored in the .ozprevis.json project file and can be played or scrubbed with Linear, Ease In-Out and Hold interpolation.


## v1.4.0 — Camera Rig Presets
- Added Director, Dolly, Orbit, Crane and FPV camera rig presets with one-click camera positioning.
- Added a 360-degree Orbit Path generator that creates eight editable camera keyframes around the current target.
- Camera rig type is saved in project snapshots and local autosave recovery.
- Orbit generation replaces the current camera keyframe track; export remains realtime viewport WebM.


## v1.5.0 — Camera Animation
- Camera track playback now uses an adjustable total duration (2–30 seconds).
- Per-waypoint interpolation: Linear, Ease In/Out, and Hold.
- Video preview recording uses the configured camera-track duration.
- Dolly Zoom utility adjusts focal lengths along an existing camera track based on camera-to-target distance. This is a simplified previs effect, not a physically calibrated lens simulation.
- Camera duration and rig settings persist in project snapshots and local autosave.


## v1.6.0 — Cinematic Camera Tools
- Added a live procedural handheld camera shake control for rig preview and WebM recording.
- Added focus-distance metadata controls (0.2–50 m), saved with project settings.
- Aperture and focus distance remain shot-planning metadata; optical depth-of-field rendering is not implemented in this version.
- Camera shake is a realtime preview effect and is not baked into camera keyframe coordinates.


## v1.7.0 — Cinematic Camera Presets
- Added one-click camera movement tracks: push-in, pull-out, truck left/right, crane up/down and pan left/right. Each creates editable start/end camera keyframes.
- Added camera look presets: Cinematic, Portrait, Wide, Telephoto, Documentary and Anamorphic. Presets configure lens/sensor metadata for shot planning.
- Presets create or update camera settings and keyframes within the current project; they do not claim to simulate physical camera hardware.



## v1.8.0 — AI Script to 3D Scene (Local Prototype)
- Added an AI Scene workspace with a chat-style script input and generated prompt panel.
- Added a local keyword-based blockout builder that creates basic scene objects, a three-shot storyboard and camera keyframes from a written scene description.
- The generated video prompt can be copied for use in external AI video tools.
- This release does not call ChatGPT or any external model. A secure server-side GPT API integration is still required for genuine conversational script analysis and robust scene generation.


## v1.8.1 — Manual ChatGPT Scene Handoff
- Added a paste-in JSON scene workflow that does not require an API connection.
- ChatGPT can author a structured scene payload; paste it into AI SCENE to create editable 3D blockout objects, storyboard shots and camera keyframes.
- The previous local keyword blockout remains available as a quick fallback.


## v1.9.0 — Animation Engine JSON Import

- Imports per-object transform animation tracks from `animations[]` using object names and timed keyframes.
- Imports camera motion keyframes from `camera.keyframes[]` and storyboard camera shots.
- Supports position, rotation, scale, and Linear / Ease In-Out / Hold interpolation.
- Sets the animation timeline duration and opens Animate mode when object tracks are present.
- Character movement can be previs-blocked using named proxy objects; skeletal rigs and motion capture are not included.
- This is transform-based previs, not a physics solver or offline renderer.
