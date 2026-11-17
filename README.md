# OZATROOM AI FILM STUDIO

A free-first cinematic pre-production workspace for films, series, storyboards, character continuity and AI-generation prompts.

## Current MVP

- Project dashboard with search and type filters
- Create film, series, commercial and animation projects
- Project Manager with editable project metadata and production status
- Series management with seasons and episodes, including summaries, duration and workflow status
- Storyboard workspace with scene creation, editing and deletion
- Scene fields for location, time of day, description, action, dialogue, camera and image-generation prompt
- Copy prompt to clipboard
- Responsive desktop and mobile layout
- Browser-local persistence with automatic migration from the original MVP storage keys

## Core architecture

```text
src/
  core/
    storage.js
    schema.js
    modules.js
  components/
    ProjectManager.jsx
  App.jsx
  main.jsx
  styles.css
```

- `storage.js`: namespaced, versioned local persistence and legacy-key migration
- `schema.js`: workspace, project, season, episode and scene normalization
- `modules.js`: central module registry
- `ProjectManager.jsx`: project settings, seasons and episode management

### Data layer

- Core storage uses namespaced keys: `ozatroom:core:v1:*`
- Existing `ozatroom-projects` and `ozatroom-storyboards` data is migrated on first read.
- Workspace schema is versioned independently from the storage-key version.
- Projects, seasons, episodes and storyboards remain local to the current browser.
- Cloud sync, accounts and remote media storage are intentionally deferred.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Cloudflare Pages settings: build command `npm run build`, output directory `dist`.

## Product principles

- Free-first: no mandatory paid AI API for the core workspace.
- Local-first: projects remain usable without an account or backend.
- Modular: production tools are separated into independent modules.
- Continuity-first: characters, locations, props and visual locks will be reusable across scenes.
- Never place API keys or private credentials in frontend code.

## Roadmap

1. Core architecture and versioned storage — implemented
2. Project Manager: seasons, episodes and production status — initial module implemented
3. Character and Location Libraries with continuity locks
4. Script Studio and expanded Storyboard
5. Prompt Studio with reusable image/video prompt presets
6. Media Library, versions and production export
7. Optional cloud database, authentication and synchronization
