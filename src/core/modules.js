export const MODULES = [
  { id: "overview", label: "Обзор", group: "workspace", status: "ready" },
  { id: "projects", label: "Мои проекты", group: "workspace", status: "ready" },
  { id: "project-manager", label: "Управление проектом", group: "workspace", status: "ready" },
  { id: "storyboard", label: "Раскадровка", group: "production", status: "ready" },
  { id: "characters", label: "Персонажи", group: "production", status: "ready" },
  { id: "ai-chat", label: "AI Director", group: "workspace", status: "ready" },
  { id: "locations", label: "Локации", group: "production", status: "planned" },
  { id: "script", label: "Сценарий", group: "production", status: "planned" },
  { id: "prompts", label: "Prompt Studio", group: "production", status: "planned" },
  { id: "media", label: "Медиатека", group: "assets", status: "planned" },
  { id: "export", label: "Экспорт", group: "assets", status: "planned" }
];

export const getModule = (id) => MODULES.find((module) => module.id === id) || MODULES[0];
