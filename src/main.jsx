import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("OZATROOM render error:", error, info);
  }
  render() {
    if (this.state.error) {
      return <main style={{minHeight:"100vh",background:"#101114",color:"#f1eee8",display:"grid",placeItems:"center",padding:"24px",fontFamily:"Arial,sans-serif"}}>
        <section style={{maxWidth:"680px",width:"100%",border:"1px solid #514636",borderRadius:"12px",padding:"24px",background:"#191a1e"}}>
          <div style={{color:"#c5a77b",fontSize:"11px",letterSpacing:"2px"}}>OZATROOM AI FILM STUDIO / STARTUP ERROR</div>
          <h1 style={{fontSize:"22px",margin:"16px 0 8px"}}>Не удалось запустить интерфейс</h1>
          <p style={{color:"#aaa",fontSize:"13px",lineHeight:1.6}}>Браузер обнаружил ошибку приложения. Отправь этот экран разработчику.</p>
          <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",padding:"14px",background:"#101114",borderRadius:"8px",color:"#e5a69a",fontSize:"12px",lineHeight:1.5}}>{String(this.state.error?.stack || this.state.error)}</pre>
          <button onClick={()=>window.location.reload()} style={{background:"#c5a77b",color:"#191817",border:0,borderRadius:"6px",padding:"12px 16px",fontWeight:700}}>Перезагрузить</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  console.error("OZATROOM global error:", event.message, event.filename, event.lineno);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("OZATROOM promise error:", event.reason);
});

const root = createRoot(document.getElementById("root"));
root.render(<React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>);
