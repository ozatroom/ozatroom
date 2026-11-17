import { useMemo, useState } from "react";

const starterProjects = [
  { id: "last-route", title: "THE LAST ROUTE", type: "Сериал", genre: "Crime thriller · Adventure", status: "В работе", scenes: 12, updated: "17 ноября 2026", accent: "route", description: "Последний маршрут. История о дороге, которая меняет всё.", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85" },
  { id: "dream", title: "ПУТЬ ДИЗАЙНЕРА", type: "Анимационный сериал", genre: "Animation · Drama", status: "Черновик", scenes: 8, updated: "12 ноября 2026", accent: "dream", description: "История мечты, творчества и пути к собственной студии.", image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85" },
  { id: "untitled", title: "Новый проект", type: "Фильм", genre: "Не выбран", status: "Идея", scenes: 0, updated: "—", accent: "new", description: "Начните с идеи и создайте свою следующую историю.", image: "" }
];

const Icon = ({ children }) => <span className="icon" aria-hidden="true">{children}</span>;

function App() {
  const [projects, setProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ozatroom-projects")) || starterProjects; }
    catch { return starterProjects; }
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Все проекты");
  const [modal, setModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Фильм");
  const [activeProject, setActiveProject] = useState(null);

  const save = (next) => {
    setProjects(next);
    localStorage.setItem("ozatroom-projects", JSON.stringify(next));
  };
  const visible = useMemo(() => projects.filter(p => {
    const matchesQuery = (p.title + " " + p.genre).toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "Все проекты" || p.type.toLowerCase().includes(filter.toLowerCase());
    return matchesQuery && matchesFilter;
  }), [projects, query, filter]);

  function createProject(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const project = { id: crypto.randomUUID(), title: newTitle.trim().toUpperCase(), type: newType, genre: "Жанр не выбран", status: "Идея", scenes: 0, updated: "Только что", description: "Новый кинопроект OZATROOM.", image: "" };
    save([project, ...projects]);
    setNewTitle("");
    setModal(false);
    setActiveProject(project);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">O.</div><div><strong>OZATROOM</strong><small>AI FILM STUDIO</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        <button className="nav-item active"><Icon>▦</Icon> Обзор</button>
        <button className="nav-item" onClick={() => setFilter("Все проекты")}><Icon>▣</Icon> Мои проекты <span className="nav-count">{projects.length}</span></button>
        <button className="nav-item" onClick={() => setActiveProject({title:"Storyboard", type:"Модуль", description:"Модуль раскадровки будет доступен после выбора проекта."})}><Icon>▤</Icon> Раскадровка</button>
        <button className="nav-item" onClick={() => setActiveProject({title:"Character Library", type:"Модуль", description:"Здесь будут храниться персонажи, внешность и Character Lock."})}><Icon>♙</Icon> Персонажи</button>
        <button className="nav-item" onClick={() => setActiveProject({title:"Prompt Studio", type:"Модуль", description:"Генератор промптов для Nano Banana и Google Flow появится на следующем этапе."})}><Icon>✧</Icon> Prompt Studio</button>
        <button className="nav-item" onClick={() => setActiveProject({title:"Media Library", type:"Модуль", description:"Единая библиотека изображений, видео и референсов."})}><Icon>▧</Icon> Медиатека</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="storage-card"><div className="storage-top"><span>ЛОКАЛЬНОЕ ХРАНИЛИЩЕ</span><span className="green-dot"/></div><strong>Ваши проекты</strong><p>Данные сохраняются в этом браузере.</p><div className="storage-line"><i/></div><small>Бесплатный режим · MVP</small></div>
        <div className="profile"><div className="avatar">O</div><div><strong>OZATROOM</strong><small>Creator workspace</small></div><span className="profile-dots">•••</span></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumb">WORKSPACE <span>/</span> <b>ОБЗОР</b></div><div className="top-actions"><span className="system-status"><i/> Все изменения сохранены</span><button className="help-btn" onClick={() => setActiveProject({title:"OZATROOM AI FILM STUDIO",type:"Помощь",description:"Рабочее пространство для разработки фильмов и сериалов: проекты, сцены, персонажи, раскадровка и промпты."})}>? <span>Помощь</span></button></div></header>
      <section className="welcome">
        <div><div className="eyebrow"><span/> YOUR CREATIVE PRODUCTION SPACE</div><h1>Каждая большая история<br/><em>начинается здесь.</em></h1><p>От первой идеи до финального кадра. Всё кинопроизводство — в одном пространстве.</p><button className="primary-btn" onClick={() => setModal(true)}><span>＋</span> Создать проект</button></div>
        <div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><span>O.</span><small>DIRECTOR'S SPACE</small></div><div className="art-tag tag-one">01 / STORY</div><div className="art-tag tag-two">02 / FRAME</div><div className="art-tag tag-three">03 / CINEMA</div></div>
      </section>

      <section className="stats">
        <div className="stat"><span>ВСЕ ПРОЕКТЫ</span><strong>{projects.length.toString().padStart(2,"0")}</strong><small>В вашей библиотеке</small></div>
        <div className="stat"><span>СЦЕНЫ</span><strong>{projects.reduce((a,p)=>a+(p.scenes||0),0).toString().padStart(2,"0")}</strong><small>Во всех проектах</small></div>
        <div className="stat"><span>В РАБОТЕ</span><strong>{projects.filter(p=>p.status==="В работе").length.toString().padStart(2,"0")}</strong><small>Активные проекты</small></div>
        <div className="stat stat-note"><span>СЛЕДУЮЩИЙ ШАГ</span><strong>AI DIRECTOR <b>↗</b></strong><small>Скоро в рабочем пространстве</small></div>
      </section>

      <section className="projects-section">
        <div className="section-heading"><div><div className="eyebrow">YOUR LIBRARY</div><h2>Мои проекты <span>{projects.length}</span></h2></div><button className="text-btn" onClick={() => setModal(true)}>＋ Новый проект</button></div>
        <div className="project-tools"><div className="filters">{["Все проекты","Фильм","Сериал"].map(f=><button key={f} className={filter===f?"filter active-filter":"filter"} onClick={()=>setFilter(f)}>{f}</button>)}</div><label className="search"><Icon>⌕</Icon><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск проектов..."/><kbd>⌘ K</kbd></label></div>
        <div className="project-grid">{visible.map((p,i)=><article className="project-card" key={p.id} onClick={()=>setActiveProject(p)}>
          <div className={"project-cover "+(!p.image?"no-image":"")} style={p.image?{backgroundImage:"linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.55)),url("+p.image+")"}:{}}>
            <span className="project-type">{p.type}</span><button className="more-btn" onClick={e=>{e.stopPropagation();setActiveProject(p)}}>•••</button>{!p.image&&<div className="cover-placeholder">O.</div>}<span className="cover-title">{p.title}</span>
          </div>
          <div className="project-info"><div className="project-meta"><span className={"status "+(p.status==="В работе"?"in-progress":"")}>{p.status}</span><span>{p.updated}</span></div><p>{p.description}</p><div className="project-footer"><span><Icon>▤</Icon> {p.scenes} сцен</span><span className="open-project">Открыть проект ↗</span></div></div>
        </article>)}
        {visible.length===0&&<div className="empty-state">Проекты не найдены. Попробуйте изменить запрос или создайте новый проект.</div>}
        <button className="add-card" onClick={()=>setModal(true)}><span>＋</span><strong>Создать новый проект</strong><small>Начните новую историю с чистого листа</small></button>
        </div>
      </section>
      <footer><span>© 2026 OZATROOM AI FILM STUDIO</span><span>MADE FOR STORYTELLERS <b>✳</b></span></footer>
    </main>

    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal" onSubmit={createProject}><button type="button" className="modal-close" onClick={()=>setModal(false)}>×</button><div className="eyebrow">NEW PRODUCTION</div><h2>Создать проект</h2><p>Дайте вашей следующей истории имя.</p><label>Название проекта<input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Например, THE LAST ROUTE" required/></label><label>Тип проекта<select value={newType} onChange={e=>setNewType(e.target.value)}><option>Фильм</option><option>Сериал</option><option>Рекламный ролик</option><option>Музыкальное видео</option><option>Анимационный сериал</option></select></label><button className="primary-btn modal-submit" type="submit">Создать проект <span>→</span></button></form></div>}
    {activeProject&&<div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setActiveProject(null)}}><aside className="project-drawer"><button className="modal-close" onClick={()=>setActiveProject(null)}>×</button><div className="eyebrow">PROJECT WORKSPACE</div><h2>{activeProject.title}</h2><span className="drawer-type">{activeProject.type}</span><p>{activeProject.description}</p><div className="drawer-divider"/><h3>Рабочие модули</h3>{["Сценарий и структура","Раскадровка","Персонажи и Character Lock","Prompt Studio","Медиатека"].map((x,i)=><div className="module-row" key={x}><span>0{i+1}</span>{x}<b>Скоро</b></div>)}<div className="drawer-note">Это первый этап платформы. Следующим шагом подключим рабочее пространство сцен и раскадровки.</div></aside></div>}
  </div>;
}

export default App;
