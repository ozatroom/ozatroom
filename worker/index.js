const ALLOWED_ORIGIN = "https://ozatroom.github.io";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8",
      "Vary": "Origin"
    };

    if (origin && origin !== ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers });
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return Response.json({ error: "Use POST" }, { status: 405, headers });
    if (!env.GROQ_API_KEY) return Response.json({ error: "Server is missing GROQ_API_KEY secret" }, { status: 500, headers });

    try {
      const body = await request.json();
      const incoming = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
      if (!incoming.length) return Response.json({ error: "No messages provided" }, { status: 400, headers });

      const projectContext = body.project?.name
        ? `\nCurrent film project: ${String(body.project.name).slice(0, 160)}.`
        : "";

      const messages = [
        {
          role: "system",
          content: "Ты OZATROOM AI DIRECTOR — профессиональный творческий помощник по кинопроизводству. Отвечай на русском языке, если пользователь не просит другой язык. Помогай с разработкой концепций, логлайнов, драматургии, сценариев, диалогов, персонажей, раскадровок, планов камеры, света, монтажа и промптов для генеративных инструментов. Давай конкретные, кинематографически грамотные ответы, структурируй длинные материалы. Для промптов генерации изображений и видео используй английский язык, если пользователь не попросил иначе. Не выдумывай, что ты реально сгенерировал файл или изображение. Сохраняй непрерывность персонажей и деталей проекта." + projectContext
        },
        ...incoming.map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 12000)
        }))
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL || "openai/gpt-oss-120b",
          messages,
          temperature: 0.7,
          max_completion_tokens: 1800
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return Response.json({ error: data.error?.message || "Groq API request failed" }, { status: response.status, headers });
      }
      const answer = data.choices?.[0]?.message?.content;
      if (!answer) return Response.json({ error: "AI returned an empty response" }, { status: 502, headers });
      return Response.json({ reply: answer }, { headers });
    } catch (error) {
      return Response.json({ error: error.message || "Unexpected server error" }, { status: 500, headers });
    }
  }
};
