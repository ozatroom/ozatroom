# OZATROOM AI FILM STUDIO

A free-first cinematic pre-production workspace for projects, films, series, storyboards, character locks and generation prompts.

## Current MVP

- Project dashboard with search and type filters
- Create and manage film, series and commercial projects
- Storyboard workspace with scene creation, editing and deletion
- Scene fields for location, time of day, description, action, dialogue, camera and image-generation prompt
- Copy prompt to clipboard
- Responsive desktop and mobile layout
- Browser-local persistence using localStorage

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

## Data

The current MVP stores projects and storyboard scenes locally in the user's browser. Data is not yet synchronized between devices or users. Do not store API keys or private credentials in frontend code.

## Roadmap

1. Character Library and Character Lock
2. Script Studio
3. Prompt Studio presets for image and video generation
4. Media Library and project export
5. Optional cloud database and authentication
