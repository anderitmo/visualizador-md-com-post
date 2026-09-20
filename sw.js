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
  const url = new URL(request.url);
  const urlDownload = url.searchParams.get("download") || url.searchParams.get("dl");
  const urlFilename = url.searchParams.get("filename");

  const parsed = await readPostData(request);

  const markdown = parsed.markdown;
  const download = parsed.download !== undefined ? parsed.download : urlDownload;
  const filename = parsed.filename || urlFilename || "documento.md";

  const isDownload =
    download === true ||
    (typeof download === "string" &&
      download.toLowerCase() !== "false" &&
      download.toLowerCase() !== "0" &&
      download !== "");

  const finalFilename =
    typeof download === "string" && download.toLowerCase().endsWith(".md")
      ? download
      : filename;

  const payload = {
    markdown,
    download: isDownload,
    filename: finalFilename,
  };

  const safePayload = JSON.stringify(payload).replaceAll("<", "\\u003c");

  return new Response(
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>MDView - recebendo Markdown</title>
  </head>
  <body>
    <script>
      sessionStorage.setItem(${JSON.stringify(INCOMING_KEY)}, JSON.stringify(${safePayload}));
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

async function readPostData(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const payload = await request.json();
      return {
        markdown: payload.markdown || payload.md || payload.content || "",
        download: payload.download ?? payload.dl,
        filename: payload.filename,
      };
    } catch {
      return { markdown: "" };
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const formData = await request.formData();
      return {
        markdown: (
          formData.get("markdown") ||
          formData.get("md") ||
          formData.get("content") ||
          ""
        ).toString(),
        download: formData.get("download") ?? formData.get("dl"),
        filename: formData.get("filename")?.toString(),
      };
    } catch {
      return { markdown: "" };
    }
  }

  const text = await request.text();
  return { markdown: text };
}
