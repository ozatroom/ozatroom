import { useEffect, useRef, useState } from "react";

const starters = [
  { icon: "✧", title: "Разработать идею", prompt: "Помоги разработать идею нового фильма: логлайн, жанр, конфликт и уникальная концепция." },
  { icon: "▤", title: "Написать сценарий", prompt: "Помоги написать сценарий сцены с профессиональными ремарками и диалогами." },
  { icon: "▧", title: "Создать раскадровку", prompt: "Разбей мою сцену на кинематографические кадры с планами, ракурсами и движением камеры." },
  { icon: "♙", title: "Разработать персонажа", prompt: "Помоги создать глубокого персонажа и зафиксировать его Character Lock." }
];

export default function FilmChat({ messages, onChange, project }) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = (text = draft) => {
    const value = text.trim();
    if (!value) return;
    onChange([...messages, { id: crypto.randomUUID(), role: "user", content: value, time: new Date().toISOString() }]);
    setDraft("");
  };
  const clear = () => {
    if (window.confirm("Очистить историю этого чата?")) onChange([]);
  };

  return <section className="film-chat-page">
    <header className="film-chat-heading">
      <div><div className="eyebrow">OZATROOM INTELLIGENCE / CREATIVE COPILOT</div><h1>AI <em>Director.</em></h1><p>Творческий помощник для разработки фильмов, сериалов, сценариев и кинематографических кадров.</p></div>
      <div className="chat-model-status"><span className="chat-status-dot"/> AI ENGINE <b>НЕ ПОДКЛЮЧЁН</b></div>
    </header>
    <div className="film-chat-workspace">
      <div className="film-chat-top"><div className="chat-assistant-avatar">O.</div><div><strong>OZATROOM AI DIRECTOR</strong><small>Ваш помощник по кинопроизводству</small></div><button onClick={clear} title="Очистить историю">Очистить чат</button></div>
      <div className="film-chat-scroll">
        {messages.length === 0 ? <div className="chat-welcome"><div className="chat-orb">O.</div><div className="eyebrow">YOUR CREATIVE PARTNER</div><h2>Что будем <em>создавать?</em></h2><p>Обсудим идею, напишем сцену, построим драматургию или подготовим промпт для генерации.</p>
          <div className="chat-starters">{starters.map(item=><button key={item.title} onClick={()=>send(item.prompt)}><span>{item.icon}</span><b>{item.title}</b><i>↗</i></button>)}</div>
        </div> : <div className="chat-message-list">{messages.map(message=><article key={message.id} className={"chat-message "+message.role}><div className="chat-message-avatar">{message.role==="user"?"Y":"O."}</div><div className="chat-message-body"><div className="chat-message-author">{message.role==="user"?"ВЫ":"OZATROOM AI DIRECTOR"}</div><p>{message.content}</p>{message.role==="user"&&<div className="chat-not-connected">Сообщение сохранено. Чтобы AI мог отвечать, необходимо подключить модель через защищённый сервер.</div>}</div></article>)}</div>}
        <div ref={bottomRef}/>
      </div>
      <form className="film-chat-composer" onSubmit={event=>{event.preventDefault();send();}}>
        <textarea value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send();}}} placeholder="Напишите идею, задачу или вопрос..." rows="2"/>
        <div className="chat-composer-bottom"><span>Enter — отправить · Shift + Enter — новая строка</span><button type="submit" disabled={!draft.trim()}>Отправить <b>↑</b></button></div>
      </form>
    </div>
    <p className="chat-disclaimer">История чата сохраняется локально в этом браузере. Ответы AI появятся после подключения API-движка; сейчас интерфейс не имитирует ответы модели.</p>
  </section>;
}
