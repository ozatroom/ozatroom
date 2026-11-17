import { useEffect, useRef, useState } from "react";

const starters = [
  { icon: "✧", title: "Разработать идею", prompt: "Помоги разработать идею нового фильма: логлайн, жанр, конфликт и уникальная концепция." },
  { icon: "▤", title: "Написать сценарий", prompt: "Помоги написать сценарий сцены с профессиональными ремарками и диалогами." },
  { icon: "▧", title: "Создать раскадровку", prompt: "Разбей мою сцену на кинематографические кадры с планами, ракурсами и движением камеры." },
  { icon: "♙", title: "Разработать персонажа", prompt: "Помоги создать глубокого персонажа и зафиксировать его Character Lock." }
];

const endpointKey = "ozatroom-ai-endpoint";

export default function FilmChat({ messages, onChange, project }) {
  const [draft, setDraft] = useState("");
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem(endpointKey) || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, busy]);

  const send = async (text = draft) => {
    const value = text.trim();
    if (!value || busy) return;
    if (!endpoint.trim()) {
      setError("Сначала подключите бесплатный AI-сервер. Инструкция будет в настройках подключения ниже.");
      return;
    }

    const userMessage = { id: crypto.randomUUID(), role: "user", content: value, time: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    onChange(nextMessages);
    setDraft("");
    setError("");
    setBusy(true);

    try {
      const response = await fetch(endpoint.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-24).map(({ role, content }) => ({ role, content })),
          project: project ? { name: project.name || project.title || "" } : null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Ошибка сервера: ${response.status}`);
      if (!data.reply) throw new Error("Сервер не вернул ответ AI.");
      onChange([...nextMessages, { id: crypto.randomUUID(), role: "assistant", content: data.reply, time: new Date().toISOString() }]);
    } catch (err) {
      setError(err.message || "Не удалось связаться с AI-сервером.");
    } finally {
      setBusy(false);
    }
  };

  const saveEndpoint = () => {
    localStorage.setItem(endpointKey, endpoint.trim());
    setError("Адрес сервера сохранён в этом браузере.");
  };
  const clear = () => {
    if (window.confirm("Очистить историю этого чата?")) onChange([]);
  };

  return <section className="film-chat-page">
    <header className="film-chat-heading">
      <div><div className="eyebrow">OZATROOM INTELLIGENCE / CREATIVE COPILOT</div><h1>AI <em>Director.</em></h1><p>Творческий помощник для разработки фильмов, сериалов, сценариев и кинематографических кадров.</p></div>
      <div className="chat-model-status"><span className="chat-status-dot" /> AI ENGINE <b>{endpoint ? "СЕРВЕР НАСТРОЕН" : "НУЖНО ПОДКЛЮЧИТЬ"}</b></div>
    </header>
    <div className="film-chat-workspace">
      <div className="film-chat-top"><div className="chat-assistant-avatar">O.</div><div><strong>OZATROOM AI DIRECTOR</strong><small>{busy ? "AI Director готовит ответ..." : "Ваш помощник по кинопроизводству"}</small></div><button onClick={clear} title="Очистить историю">Очистить чат</button></div>
      <div className="film-chat-scroll">
        {messages.length === 0 ? <div className="chat-welcome"><div className="chat-orb">O.</div><div className="eyebrow">YOUR CREATIVE PARTNER</div><h2>Что будем <em>создавать?</em></h2><p>Обсудим идею, напишем сцену, построим драматургию или подготовим промпт для генерации.</p>
          <div className="chat-starters">{starters.map(item=><button key={item.title} onClick={()=>send(item.prompt)}><span>{item.icon}</span><b>{item.title}</b><i>↗</i></button>)}</div>
        </div> : <div className="chat-message-list">{messages.map(message=><article key={message.id} className={"chat-message "+message.role}><div className="chat-message-avatar">{message.role==="user"?"Y":"O."}</div><div className="chat-message-body"><div className="chat-message-author">{message.role==="user"?"ВЫ":"OZATROOM AI DIRECTOR"}</div><p>{message.content}</p></div></article>)}</div>}
        {busy && <div className="chat-typing">OZATROOM AI DIRECTOR · думает…</div>}
        <div ref={bottomRef}/>
      </div>
      {error && <div className="chat-error">{error}</div>}
      <form className="film-chat-composer" onSubmit={event=>{event.preventDefault();send();}}>
        <textarea value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send();}}} placeholder="Напишите идею, задачу или вопрос..." rows="2"/>
        <div className="chat-composer-bottom"><span>Enter — отправить · Shift + Enter — новая строка</span><button type="submit" disabled={!draft.trim()||busy}>{busy?"Думаю…":"Отправить"} <b>↑</b></button></div>
      </form>
    </div>
    <details className="chat-connection-settings">
      <summary>Настройка подключения бесплатного AI</summary>
      <p>Вставьте URL Cloudflare Worker после его публикации. Ключ Groq хранится только на сервере и не попадает в браузер.</p>
      <div className="chat-endpoint-row"><input value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="https://название.workers.dev"/><button onClick={saveEndpoint} type="button">Сохранить</button></div>
      <p className="chat-help-note">Серверный код уже добавлен в GitHub: папка <code>worker/</code>. Для запуска ещё нужно создать бесплатный Groq API key и Cloudflare Worker, добавить ключ как секрет GROQ_API_KEY и опубликовать Worker.</p>
    </details>
    <p className="chat-disclaimer">История переписки хранится в этом браузере. Бесплатный тариф AI имеет ограничения по запросам.</p>
  </section>;
}
