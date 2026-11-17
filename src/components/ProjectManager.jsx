import { useState } from "react";

const makeId = () => crypto.randomUUID();
const isSeries = (type = "") => type.toLowerCase().includes("сериал");

export default function ProjectManager({ project, onUpdate, onStoryboard }) {
  const [seasonId, setSeasonId] = useState(null);
  const [episodeId, setEpisodeId] = useState(null);
  const seasons = project?.seasons || [];
  const activeSeason = seasons.find((season) => season.id === seasonId) || seasons[0] || null;
  const episodes = activeSeason?.episodes || [];
  const activeEpisode = episodes.find((episode) => episode.id === episodeId) || episodes[0] || null;
  const patchProject = (patch) => onUpdate({ ...project, ...patch, updated: "Только что" });

  const addSeason = () => {
    const season = { id: makeId(), number: seasons.length + 1, title: `Сезон ${seasons.length + 1}`, episodes: [] };
    patchProject({ seasons: [...seasons, season] }); setSeasonId(season.id); setEpisodeId(null);
  };
  const updateSeason = (patch) => {
    if (activeSeason) patchProject({ seasons: seasons.map((item) => item.id === activeSeason.id ? { ...item, ...patch } : item) });
  };
  const deleteSeason = () => {
    if (!activeSeason) return;
    const next = seasons.filter((item) => item.id !== activeSeason.id).map((item, index) => ({ ...item, number: index + 1 }));
    patchProject({ seasons: next }); setSeasonId(next[0]?.id || null); setEpisodeId(null);
  };
  const addEpisode = () => {
    if (!activeSeason) return;
    const episode = { id: makeId(), number: episodes.length + 1, title: `Эпизод ${episodes.length + 1}`, status: "Планируется", summary: "", duration: "" };
    patchProject({ seasons: seasons.map((item) => item.id === activeSeason.id ? { ...item, episodes: [...(item.episodes || []), episode] } : item) });
    setEpisodeId(episode.id);
  };
  const updateEpisode = (patch) => {
    if (activeSeason && activeEpisode) patchProject({ seasons: seasons.map((item) => item.id === activeSeason.id ? { ...item, episodes: (item.episodes || []).map((episode) => episode.id === activeEpisode.id ? { ...episode, ...patch } : episode) } : item) });
  };
  const deleteEpisode = () => {
    if (!activeSeason || !activeEpisode) return;
    const next = episodes.filter((item) => item.id !== activeEpisode.id).map((item, index) => ({ ...item, number: index + 1 }));
    patchProject({ seasons: seasons.map((item) => item.id === activeSeason.id ? { ...item, episodes: next } : item) });
    setEpisodeId(next[0]?.id || null);
  };
  const totalEpisodes = seasons.reduce((sum, season) => sum + (season.episodes?.length || 0), 0);

  if (!project) return <section className="placeholder-page"><h1>Проект не выбран</h1><p>Вернитесь к библиотеке и выберите проект.</p></section>;

  return <section className="project-manager-page">
    <div className="pm-heading"><div><div className="eyebrow">PRODUCTION / PROJECT MANAGEMENT</div><h1>{project.title}</h1><p>Управляйте параметрами проекта, сезонами и эпизодами в одном месте.</p></div><button className="primary-btn" onClick={onStoryboard}>Открыть раскадровку ↗</button></div>
    <div className="pm-overview-grid">
      <div className="pm-stat"><span>ТИП ПРОЕКТА</span><strong>{project.type}</strong></div>
      <div className="pm-stat"><span>СЦЕНЫ</span><strong>{project.scenes || 0}</strong></div>
      <div className="pm-stat"><span>СЕЗОНЫ</span><strong>{seasons.length}</strong></div>
      <div className="pm-stat"><span>ЭПИЗОДЫ</span><strong>{totalEpisodes}</strong></div>
    </div>
    <div className="pm-panel">
      <div className="pm-panel-heading"><div><div className="eyebrow">PROJECT SETTINGS</div><h2>Информация о проекте</h2></div><span className="pm-save-state"><i/> Автосохранение</span></div>
      <div className="pm-fields">
        <label>Название<input value={project.title} onChange={(event) => patchProject({ title: event.target.value })}/></label>
        <label>Тип проекта<select value={project.type} onChange={(event) => patchProject({ type: event.target.value })}><option>Фильм</option><option>Сериал</option><option>Рекламный ролик</option><option>Музыкальное видео</option><option>Анимационный сериал</option></select></label>
        <label>Жанр<input value={project.genre || ""} onChange={(event) => patchProject({ genre: event.target.value })} placeholder="Например, Crime thriller"/></label>
        <label>Статус<select value={project.status || "Идея"} onChange={(event) => patchProject({ status: event.target.value })}><option>Идея</option><option>Черновик</option><option>В работе</option><option>На паузе</option><option>Завершён</option></select></label>
        <label className="pm-wide">Описание<textarea rows="3" value={project.description || ""} onChange={(event) => patchProject({ description: event.target.value })} placeholder="Краткое описание истории и творческого замысла..."/></label>
      </div>
    </div>
    {isSeries(project.type) ? <div className="pm-panel pm-series-panel">
      <div className="pm-panel-heading"><div><div className="eyebrow">SERIES STRUCTURE</div><h2>Сезоны и эпизоды</h2><p>Разделите сериал на сезоны, а каждый сезон — на отдельные эпизоды.</p></div><button className="outline-btn" onClick={addSeason}>＋ Добавить сезон</button></div>
      {seasons.length === 0 ? <div className="pm-empty"><span>▤</span><strong>Сезонов пока нет</strong><p>Создайте первый сезон, чтобы добавить эпизоды и распределить сцены.</p><button className="primary-btn" onClick={addSeason}>Создать первый сезон</button></div> : <div className="pm-season-layout">
        <aside className="pm-season-list">{seasons.map((season) => <button key={season.id} className={activeSeason?.id === season.id ? "pm-season-item selected" : "pm-season-item"} onClick={() => { setSeasonId(season.id); setEpisodeId(null); }}><span className="pm-season-number">{String(season.number).padStart(2, "0")}</span><span><b>{season.title}</b><small>{season.episodes?.length || 0} эпизодов</small></span><i>›</i></button>)}</aside>
        <div className="pm-episode-area">{activeSeason && <>
          <div className="pm-season-title"><input aria-label="Название сезона" value={activeSeason.title} onChange={(event) => updateSeason({ title: event.target.value })}/><button className="delete-scene" onClick={deleteSeason}>Удалить сезон</button></div>
          <div className="pm-episode-layout">
            <div className="pm-episode-list">{(activeSeason.episodes || []).map((episode) => <button key={episode.id} className={activeEpisode?.id === episode.id ? "pm-episode-item selected" : "pm-episode-item"} onClick={() => setEpisodeId(episode.id)}><span>EP {String(episode.number).padStart(2, "0")}</span><b>{episode.title}</b><small>{episode.status}</small></button>)}<button className="scene-add" onClick={addEpisode}>＋ Добавить эпизод</button></div>
            {activeEpisode ? <div className="pm-episode-editor">
              <div className="pm-episode-editor-top"><div className="eyebrow">EPISODE {String(activeEpisode.number).padStart(2, "0")}</div><button className="delete-scene" onClick={deleteEpisode}>Удалить</button></div>
              <label>Название эпизода<input value={activeEpisode.title} onChange={(event) => updateEpisode({ title: event.target.value })}/></label>
              <div className="pm-fields-inline"><label>Статус<select value={activeEpisode.status} onChange={(event) => updateEpisode({ status: event.target.value })}><option>Планируется</option><option>Сценарий</option><option>В производстве</option><option>Готов</option></select></label><label>Длительность<input value={activeEpisode.duration || ""} onChange={(event) => updateEpisode({ duration: event.target.value })} placeholder="Например, 8 минут"/></label></div>
              <label>Краткое содержание<textarea rows="4" value={activeEpisode.summary || ""} onChange={(event) => updateEpisode({ summary: event.target.value })} placeholder="Что происходит в этом эпизоде?"/></label>
            </div> : <div className="pm-episode-empty"><strong>Выберите или создайте эпизод</strong><p>Эпизоды хранят название, статус, длительность и краткое содержание.</p><button className="primary-btn" onClick={addEpisode}>＋ Создать эпизод</button></div>}
          </div>
        </>}</div>
      </div>}
    </div> : <div className="pm-panel pm-production-note"><div className="eyebrow">PRODUCTION STRUCTURE</div><h2>Проект готов к планированию</h2><p>Для фильма и рекламного ролика структура строится напрямую через сцены в раскадровке. Сезоны и эпизоды доступны для сериалов.</p><button className="primary-btn" onClick={onStoryboard}>Перейти к сценам ↗</button></div>}
  </section>;
}
