export const WORKSPACE_SCHEMA_VERSION = 1;

export function normalizeProject(project = {}) {
  return {
    id: project.id || crypto.randomUUID(),
    title: String(project.title || "Новый проект"),
    type: project.type || "Фильм",
    genre: project.genre || "Жанр не выбран",
    status: project.status || "Идея",
    scenes: Number.isFinite(Number(project.scenes)) ? Number(project.scenes) : 0,
    updated: project.updated || "—",
    description: project.description || "",
    image: project.image || ""
  };
}

export function normalizeScene(scene = {}, index = 0) {
  return {
    id: scene.id || crypto.randomUUID(),
    number: Number(scene.number) || index + 1,
    title: scene.title || "Новая сцена",
    location: scene.location || "",
    time: scene.time || "День",
    description: scene.description || "",
    action: scene.action || "",
    dialogue: scene.dialogue || "",
    camera: scene.camera || "",
    prompt: scene.prompt || ""
  };
}

export function normalizeWorkspace({ projects = [], storyboards = {} } = {}) {
  const normalizedProjects = projects.map(normalizeProject);
  const normalizedBoards = {};

  for (const project of normalizedProjects) {
    const scenes = Array.isArray(storyboards[project.id]) ? storyboards[project.id] : [];
    normalizedBoards[project.id] = scenes.map(normalizeScene);
  }

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    projects: normalizedProjects,
    storyboards: normalizedBoards
  };
}
