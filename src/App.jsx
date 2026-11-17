import { useMemo, useState } from "react";
import { readCollection, writeCollection } from "./core/storage.js";
import { normalizeWorkspace } from "./core/schema.js";
import { MODULES } from "./core/modules.js";
import ProjectManager from "./components/ProjectManager.jsx";

const starterProjects = [
  { id: "last-route", title: "THE LAST ROUTE", type: "Сериал", genre: "Crime thriller · Adventure", status: "В работе", scenes: 12, updated: "17 ноября 2026", description: "Последний маршрут. История о дороге, которая меняет всё.", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85" },
  { id: "dream", title: "ПУТЬ ДИЗАЙНЕРА", type: "Анимационный сериал", genre: "Animation · Drama", status: "Черновик", scenes: 8, updated: "12 ноября 2026", description: "История мечты, творчества и пути к собственной студии.", image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85" },
  { id: "untitled", title: "Новый проект", type: "Фильм", genre: "Не выбран", status: "Идея", scenes: 0, updated: "—", description: "Начните с идеи и создайте свою следующую историю.", image: "" }
];
const emptyScene = (number) => ({ id: crypto.randomUUID(), number, title: "Новая сцена", location: "", time: "День", description: "", action: "", dialogue: "", camera: "", prompt: "" });
const Icon = ({ children }) => <span className="icon" aria-hidden="true">{children}</span>;

function App() {
  const [initialWorkspace] = useState(() => normalizeWorkspace({
    projects: readCollection("projects", "ozatroom-projects", starterProjects),
    storyboards: readCollection("storyboards", "ozatroom-storyboards", {})
  }));
  const [projects, setProjects] = useState(initialWorkspace.projects);
  const [storyboards, setStoryboards] = useState(initialWorkspace.storyboards);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Все проекты");
  const [modal, setModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Фильм");
  const [activeProject, setActiveProject] = useState(null);
  const [activeModule, setActiveModule] = useState("overview");
  const [selectedScene, setSelectedScene] = useState(null);
  const [notice, setNotice] = useState("");

  const saveProjects = (next) => { setProjects(next); writeCollection("projects", next); };
  const saveBoards = (next) => { setStoryboards(next); writeCollection("storyboards", next); };
  const visible = useMemo(() => projects.filter(p => (p.title + " " + p.genre).toLowerCase().includes(query.toLowerCase()) && (filter === "Все проекты" || p.type.toLowerCase().includes(filter.toLowerCase()))), [projects, query, filter]);
  const currentProject = projects.find(p => p.id === activeProject?.id) || projects[0];
  const scenes = currentProject ? (storyboards[currentProject.id] || []) : [];
  const currentScene = scenes.find(s => s.id === selectedScene) || scenes[0] || null;
  const activeModuleInfo = MODULES.find(module => module.id === activeModule);

  function createProject(e) {
    e.preventDefault(); if (!newTitle.trim()) return;
    const project = { id: crypto.randomUUID(), title: newTitle.trim().toUpperCase(), type: newType, genre: "Жанр не выбран", status: "Идея", scenes: 0, updated: "Только что", description: "Новый кинопроект OZATROOM.", image: "" };
    saveProjects([project, ...projects]); setNewTitle(""); setModal(false); setActiveProject(project); setActiveModule("project-manager");
  }
  function addScene() {
    if (!currentProject) return;
    const scene = emptyScene(scenes.length + 1);
    const next = { ...storyboards, [currentProject.id]: [...scenes, scene] };
    saveBoards(next); setSelectedScene(scene.id);
    saveProjects(projects.map(p => p.id === currentProject.id ? { ...p, scenes: scenes.length + 1, updated: "Только что" } : p));
  }
  function updateScene(field, value) {
    if (!currentProject || !currentScene) return;
    saveBoards({ ...storyboards, [currentProject.id]: scenes.map(s => s.id === currentScene.id ? { ...s, [field]: value } : s) });
  }
  function deleteScene() {
    if (!currentProject || !currentScene) return;
    const nextScenes = scenes.filter(s => s.id !== currentScene.id).map((s, i) => ({ ...s, number: i + 1 }));
    saveBoards({ ...storyboards, [currentProject.id]: nextScenes }); setSelectedScene(nextScenes[0]?.id || null);
    saveProjects(projects.map(p => p.id === currentProject.id ? { ...p, scenes: nextScenes.length } : p));
  }
  async function copyPrompt() {
    if (!currentScene?.prompt) return;
    try { await navigator.clipboard.writeText(currentScene.prompt); setNotice("Промпт скопирован"); setTimeout(() => setNotice(""), 1800); } catch { setNotice("Не удалось скопировать"); }
  }
  const updateProject = (updated) => saveProjects(projects.map((project) => project.id === updated.id ? updated : project));
  const openProjectManager = (project = currentProject) => { setActiveProject(project); setActiveModule("project-manager"); };
  const openStoryboard = (project = currentProject) => { setActiveProject(project); setActiveModule("storyboard"); setSelectedScene(storyboards[project?.id]?.[0]?.id || null); };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">O.</div><div><strong>OZATROOM</strong><small>AI FILM STUDIO</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        <button className={activeModule === "overview" ? "nav-item active" : "nav-item"} onClick={() => setActiveModule("overview")}><Icon>▦</Icon> Обзор</button>
        <button className={activeModule === "project-manager" ? "nav-item active" : "nav-item"} onClick={() => openProjectManager()}><Icon>▣</Icon> Мои проекты <span className="nav-count">{projects.length}</span></button>
        <button className={activeModule === "storyboard" ? "nav-item active" : "nav-item"} onClick={() => openStoryboard()}><Icon>▤</Icon> Раскадровка</button>
        <button className="nav-item" onClick={() => { setActiveModule("placeholder"); setNotice("Модуль персонажей — следующий этап разработки."); }}><Icon>♙</Icon> Персонажи</button>
        <button className="nav-item" onClick={() => { setActiveModule("placeholder"); setNotice("Prompt Studio — следующий этап разработки."); }}><Icon>✧</Icon> Prompt Studio</button>
        <button className="nav-item" onClick={() => { setActiveModule("placeholder"); setNotice("Медиатека — следующий этап разработки."); }}><Icon>▧</Icon> Медиатека</button>
      </nav>
      <div className="sidebar-bottom"><div className="storage-card"><div className="storage-top"><span>ЛОКАЛЬНОЕ ХРАНИЛИЩЕ</span><span className="green-dot"/></div><strong>Ваши проекты</strong><p>Данные сохраняются в этом браузере.</p><div className="storage-line"><i/></div><small>Бесплатный режим · MVP</small></div><div className="profile"><div className="avatar">O</div><div><strong>OZATROOM</strong><small>Creator workspace</small></div><span className="profile-dots">•••</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb">WORKSPACE <span>/</span> <b>{activeModuleInfo?.label?.toUpperCase() || "ОБЗОР"}</b></div><div className="top-actions"><span className="system-status"><i/> Автосохранение включено</span><button className="help-btn" onClick={() => setNotice("OZATROOM AI FILM STUDIO — рабочее пространство для кинопроизводства.")}>? <span>Помощь</span></button></div></header>
      {activeModule === "project-manager" ? <ProjectManager project={currentProject} onUpdate={updateProject} onStoryboard={() => openStoryboard(currentProject)}/> : activeModule === "storyboard" ? <section className="storyboard-page">
        <div className="storyboard-heading"><div><div className="eyebrow">PRE-PRODUCTION / SHOT PLANNING</div><h1>Раскадровка <em>проекта.</em></h1><p>Разложите историю на сцены и подготовьте каждый кадр к производству.</p></div><button className="primary-btn" onClick={addScene}>＋ Добавить сцену</button></div>
        <div className="storyboard-toolbar"><label>Проект<select value={currentProject?.id || ""} onChange={e => { const p = projects.find(x => x.id === e.target.value); setActiveProject(p); setSelectedScene(storyboards[p?.id]?.[0]?.id || null); }} >{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><div className="scene-total"><strong>{scenes.length.toString().padStart(2,"0")}</strong><span>СЦЕН В РАСКАДРОВКЕ</span></div></div>
        <div className="storyboard-layout">
          <aside className="scene-list"><div className="scene-list-head"><strong>СЦЕНЫ</strong><span>{scenes.length}</span></div>{scenes.map(scene => <button key={scene.id} className={currentScene?.id === scene.id ? "scene-list-item selected" : "scene-list-item"} onClick={() => setSelectedScene(scene.id)}><span className="scene-number">{String(scene.number).padStart(2,"0")}</span><span><b>{scene.title || "Без названия"}</b><small>{scene.location || "Локация не указана"} · {scene.time}</small></span><i>›</i></button>)}{scenes.length === 0 && <div className="scene-empty">Пока нет сцен.<br/>Нажмите «Добавить сцену», чтобы начать.</div>}<button className="scene-add" onClick={addScene}>＋ Новая сцена</button></aside>
          <div className="scene-editor">{currentScene ? <>
            <div className="editor-top"><div><div className="eyebrow">SCENE {String(currentScene.number).padStart(2,"0")}</div><h2>Параметры сцены</h2></div><button className="delete-scene" onClick={deleteScene}>Удалить сцену</button></div>
            <div className="editor-fields">
              <label className="field-wide">Название сцены<input value={currentScene.title} onChange={e=>updateScene("title",e.target.value)} placeholder="Например, Прибытие к резиденции"/></label>
              <label>Локация<input value={currentScene.location} onChange={e=>updateScene("location",e.target.value)} placeholder="Горная дорога, резиденция..."/></label>
              <label>Время<select value={currentScene.time} onChange={e=>updateScene("time",e.target.value)}><option>Рассвет</option><option>Утро</option><option>День</option><option>Закат</option><option>Ночь</option></select></label>
              <label className="field-wide">Краткое описание<textarea rows="2" value={currentScene.description} onChange={e=>updateScene("description",e.target.value)} placeholder="Что происходит в этой сцене?"/></label>
              <label className="field-wide">Действие / постановка<textarea rows="3" value={currentScene.action} onChange={e=>updateScene("action",e.target.value)} placeholder="Опишите действия персонажей, движение и развитие сцены..."/></label>
              <label className="field-wide">Диалоги<textarea rows="2" value={currentScene.dialogue} onChange={e=>updateScene("dialogue",e.target.value)} placeholder="Персонаж: реплика..."/></label>
              <label className="field-wide">Камера и композиция<textarea rows="2" value={currentScene.camera} onChange={e=>updateScene("camera",e.target.value)} placeholder="План, объектив, движение камеры, композиция..."/></label>
              <label className="field-wide">Промпт для генерации кадра<textarea rows="4" value={currentScene.prompt} onChange={e=>updateScene("prompt",e.target.value)} placeholder="Write your image-generation prompt in English..."/></label>
            </div>
            <div className="editor-actions"><span><i/> Изменения сохраняются автоматически</span><button className="primary-btn" onClick={copyPrompt}>Копировать промпт ↗</button></div>
          </> : <div className="no-scene"><div>✳</div><h2>Создайте первую сцену</h2><p>Добавьте сцену, чтобы начать работу над раскадровкой.</p><button className="primary-btn" onClick={addScene}>＋ Добавить сцену</button></div>}</div>
        </div>
      </section> : activeModule === "placeholder" ? <section className="placeholder-page"><div className="eyebrow">COMING NEXT</div><h1>Модуль в разработке.</h1><p>{notice || "Этот инструмент появится в следующих этапах OZATROOM AI FILM STUDIO."}</p><button className="primary-btn" onClick={() => setActiveModule("overview")}>Вернуться к проектам</button></section> : <>
        <section className="welcome"><div><div className="eyebrow"><span/> YOUR CREATIVE PRODUCTION SPACE</div><h1>Каждая большая история<br/><em>начинается здесь.</em></h1><p>От первой идеи до финального кадра. Всё кинопроизводство — в одном пространстве.</p><button className="primary-btn" onClick={() => setModal(true)}><span>＋</span> Создать проект</button></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><span>O.</span><small>DIRECTOR'S SPACE</small></div><div className="art-tag tag-one">01 / STORY</div><div className="art-tag tag-two">02 / FRAME</div><div className="art-tag tag-three">03 / CINEMA</div></div></section>
        <section className="stats"><div className="stat"><span>ВСЕ ПРОЕКТЫ</span><strong>{projects.length.toString().padStart(2,"0")}</strong><small>В вашей библиотеке</small></div><div className="stat"><span>СЦЕНЫ</span><strong>{projects.reduce((a,p)=>a+(p.scenes||0),0).toString().padStart(2,"0")}</strong><small>Во всех проектах</small></div><div className="stat"><span>В РАБОТЕ</span><strong>{projects.filter(p=>p.status==="В работе").length.toString().padStart(2,"0")}</strong><small>Активные проекты</small></div><div className="stat stat-note"><span>СЛЕДУЮЩИЙ ШАГ</span><strong>AI DIRECTOR <b>↗</b></strong><small>Скоро в рабочем пространстве</small></div></section>
        <section className="projects-section"><div className="section-heading"><div><div className="eyebrow">YOUR LIBRARY</div><h2>Мои проекты <span>{projects.length}</span></h2></div><button className="text-btn" onClick={() => setModal(true)}>＋ Новый проект</button></div><div className="project-tools"><div className="filters">{["Все проекты","Фильм","Сериал"].map(f=><button key={f} className={filter===f?"filter active-filter":"filter"} onClick={()=>setFilter(f)}>{f}</button>)}</div><label className="search"><Icon>⌕</Icon><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск проектов..."/><kbd>⌘ K</kbd></label></div><div className="project-grid">{visible.map(p=><article className="project-card" key={p.id} onClick={()=>openProjectManager(p)}><div className={"project-cover "+(!p.image?"no-image":"")} style={p.image?{backgroundImage:"linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.55)),url("+p.image+")"}:{}}><span className="project-type">{p.type}</span><span className="cover-title">{p.title}</span>{!p.image&&<div className="cover-placeholder">O.</div>}</div><div className="project-info"><div className="project-meta"><span className={"status "+(p.status==="В работе"?"in-progress":"")}>{p.status}</span><span>{p.updated}</span></div><p>{p.description}</p><div className="project-footer"><span><Icon>▤</Icon> {storyboards[p.id]?.length || p.scenes || 0} сцен</span><span className="open-project">Открыть проект ↗</span></div></div></article>)}{visible.length===0&&<div className="empty-state">Проекты не найдены. Попробуйте изменить запрос или создайте новый проект.</div>}<button className="add-card" onClick={()=>setModal(true)}><span>＋</span><strong>Создать новый проект</strong><small>Начните новую историю с чистого листа</small></button></div></section>
      </>}
      <footer><span>© 2026 OZATROOM AI FILM STUDIO</span><span>MADE FOR STORYTELLERS <b>✳</b></span></footer>
    </main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal" onSubmit={createProject}><button type="button" className="modal-close" onClick={()=>setModal(false)}>×</button><div className="eyebrow">NEW PRODUCTION</div><h2>Создать проект</h2><p>Дайте вашей следующей истории имя.</p><label>Название проекта<input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Например, THE LAST ROUTE" required/></label><label>Тип проекта<select value={newType} onChange={e=>setNewType(e.target.value)}><option>Фильм</option><option>Сериал</option><option>Рекламный ролик</option><option>Музыкальное видео</option><option>Анимационный сериал</option></select></label><button className="primary-btn modal-submit" type="submit">Создать проект <span>→</span></button></form></div>}
    {notice && <div className="toast">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
  </div>;
}
export default App;
