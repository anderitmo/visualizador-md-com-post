const INCOMING_KEY = "mdview:incoming";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isRenderPost =
    event.request.method === "POST" &&
    (url.pathname.endsWith("/render") || url.pathname.endsWith("/post"));

  if (isRenderPost) {
    event.respondWith(renderPost(event.request));
  }
});

async function renderPost(request) {
  const markdown = await readMarkdown(request);
  const safeMarkdown = JSON.stringify(markdown).replaceAll("<", "\\u003c");

  return new Response(
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>MDView - recebendo Markdown</title>
  </head>
  <body>
    <script>
      sessionStorage.setItem(${JSON.stringify(INCOMING_KEY)}, ${safeMarkdown});
      location.replace("./");
    </script>
    <noscript>JavaScript precisa estar ativo para renderizar o Markdown enviado.</noscript>
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
}

async function readMarkdown(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await request.json();
    return payload.markdown || payload.md || payload.content || "";
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    return (
      formData.get("markdown") ||
      formData.get("md") ||
      formData.get("content") ||
      ""
    ).toString();
  }

  return request.text();
}
