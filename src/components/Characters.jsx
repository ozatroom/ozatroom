import { useMemo, useState } from "react";

const makeId = () => crypto.randomUUID();
const blankCharacter = () => ({ id: makeId(), name: "Новый персонаж", role: "Главный герой", age: "", description: "", appearance: "", wardrobe: "", personality: "", continuity: "", referenceImage: "" });

export default function Characters({ characters, onChange }) {
  const [selectedId, setSelectedId] = useState(characters[0]?.id || null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const selected = characters.find((item) => item.id === selectedId) || characters[0] || null;
  const visible = useMemo(() => characters.filter((item) => (item.name + " " + item.role).toLowerCase().includes(query.toLowerCase())), [characters, query]);

  const addCharacter = () => {
    const item = blankCharacter();
    onChange([item, ...characters]);
    setSelectedId(item.id);
    setShowForm(true);
  };
  const patch = (field, value) => {
    if (!selected) return;
    onChange(characters.map((item) => item.id === selected.id ? { ...item, [field]: value } : item));
  };
  const remove = () => {
    if (!selected || !window.confirm("Удалить персонажа?")) return;
    const next = characters.filter((item) => item.id !== selected.id);
    onChange(next);
    setSelectedId(next[0]?.id || null);
  };

  return <section className="characters-page">
    <div className="characters-heading"><div><div className="eyebrow">CAST / CHARACTER CONTINUITY</div><h1>Библиотека <em>персонажей.</em></h1><p>Создавайте карточки героев и фиксируйте внешность, костюм и визуальные ограничения для стабильной генерации.</p></div><button className="primary-btn" onClick={addCharacter}>＋ Новый персонаж</button></div>
    <div className="characters-workspace">
      <aside className="characters-list">
        <div className="characters-list-top"><strong>CAST</strong><span>{characters.length.toString().padStart(2, "0")}</span></div>
        <label className="characters-search">⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти персонажа..."/></label>
        {visible.map((item) => <button key={item.id} className={selected?.id === item.id ? "character-list-item selected" : "character-list-item"} onClick={() => { setSelectedId(item.id); setShowForm(false); }}>
          <span className="character-avatar">{item.referenceImage ? <img src={item.referenceImage} alt=""/> : "♙"}</span><span><b>{item.name}</b><small>{item.role || "Роль не указана"}</small></span><i>›</i>
        </button>)}
        {visible.length === 0 && <div className="characters-empty-small">Персонажи не найдены.</div>}
      </aside>
      <div className="character-editor">
        {selected ? <>
          <div className="character-editor-top"><div><div className="eyebrow">CHARACTER PROFILE</div><h2>{selected.name || "Новый персонаж"}</h2></div><button className="delete-scene" onClick={remove}>Удалить</button></div>
          <div className="character-profile-grid">
            <div className="character-reference">
              {selected.referenceImage ? <img src={selected.referenceImage} alt={selected.name}/> : <div className="character-reference-empty"><span>♙</span><small>REFERENCE IMAGE</small></div>}
              <label>Ссылка на референс<input value={selected.referenceImage || ""} onChange={(event) => patch("referenceImage", event.target.value)} placeholder="https://..."/></label>
            </div>
            <div className="character-fields">
              <label>Имя персонажа<input value={selected.name} onChange={(event) => patch("name", event.target.value)}/></label>
              <label>Роль в истории<select value={selected.role} onChange={(event) => patch("role", event.target.value)}><option>Главный герой</option><option>Второстепенный персонаж</option><option>Антагонист</option><option>Эпизодический персонаж</option><option>Рассказчик</option></select></label>
              <label>Возраст / диапазон<input value={selected.age || ""} onChange={(event) => patch("age", event.target.value)} placeholder="Например, 28–32"/></label>
              <label className="character-field-wide">Краткая биография<textarea rows="3" value={selected.description || ""} onChange={(event) => patch("description", event.target.value)} placeholder="Кто этот персонаж и какую роль играет в истории?"/></label>
              <label className="character-field-wide">Внешность — CHARACTER LOCK<textarea rows="4" value={selected.appearance || ""} onChange={(event) => patch("appearance", event.target.value)} placeholder="Лицо, волосы, телосложение, отличительные черты. Зафиксируйте неизменные признаки..."/></label>
              <label className="character-field-wide">Костюм и реквизит<textarea rows="3" value={selected.wardrobe || ""} onChange={(event) => patch("wardrobe", event.target.value)} placeholder="Одежда, обувь, аксессуары и предметы, которые должны сохраняться..."/></label>
              <label className="character-field-wide">Характер и поведение<textarea rows="3" value={selected.personality || ""} onChange={(event) => patch("personality", event.target.value)} placeholder="Манера речи, жесты, эмоциональные особенности..."/></label>
              <label className="character-field-wide">Правила непрерывности<textarea rows="3" value={selected.continuity || ""} onChange={(event) => patch("continuity", event.target.value)} placeholder="Что нельзя менять между кадрами и эпизодами?"/></label>
            </div>
          </div>
          <div className="character-lock-note"><span>✳</span><div><b>VISUAL CONTINUITY LOCK</b><p>Используйте это описание как постоянную основу при подготовке промптов для всех сцен с персонажем.</p></div></div>
        </> : <div className="no-scene"><div>♙</div><h2>Добавьте первого персонажа</h2><p>Создайте профиль, чтобы закрепить внешний вид и детали героя.</p><button className="primary-btn" onClick={addCharacter}>＋ Создать персонажа</button></div>}
      </div>
    </div>
  </section>;
}
