import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

const editor = document.querySelector("#editor");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const sampleButton = document.querySelector("#sampleButton");
const clearButton = document.querySelector("#clearButton");

const STORAGE_KEY = "mdview:markdown";
const INCOMING_KEY = "mdview:incoming";
const SAMPLE = `# MDView

Uma aplicacao HTML + JS para visualizar Markdown gerado por outras ferramentas.

## Recursos

- Editor minimalista
- Preview instantaneo
- Renderizacao de Mermaid
- Recebimento por URL ou \`postMessage\`

\`\`\`mermaid
flowchart LR
  A[App externa] -->|Markdown| B[MDView]
  B --> C[HTML renderizado]
\`\`\`
`;

marked.setOptions({
  breaks: true,
  gfm: true,
});

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "default",
});

function decodeMarkdownFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hash);
  const raw = params.get("md") || hashParams.get("md") || decodeRawHashMarkdown(params, hash);
  const encoded = params.get("md64") || hashParams.get("md64");

  if (encoded) {
    try {
      return decodeURIComponent(escape(atob(encoded)));
    } catch {
      setStatus("md64 invalido");
    }
  }

  return raw;
}

function decodeRawHashMarkdown(params, hash) {
  if (!hash || !params.has("md") || params.get("md") !== "") {
    return null;
  }

  try {
    return `#${decodeURIComponent(hash)}`;
  } catch {
    return `#${hash}`;
  }
}

function setStatus(message) {
  status.textContent = message;
}

function replaceMermaidBlocks(markdown) {
  return markdown.replace(
    /```mermaid\s*([\s\S]*?)```/gi,
    (_, graph) => `<pre class="mermaid">${escapeHtml(graph.trim())}</pre>`,
  );
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function render(markdown) {
  const html = marked.parse(replaceMermaidBlocks(markdown));
  preview.innerHTML = DOMPurify.sanitize(html, {
    ADD_TAGS: ["foreignObject"],
    ADD_ATTR: ["target"],
  });

  try {
    await mermaid.run({
      nodes: preview.querySelectorAll(".mermaid"),
    });
    setStatus("Renderizado");
  } catch (error) {
    setStatus("Erro no Mermaid");
    console.error(error);
  }
}

function setMarkdown(markdown, shouldStore = true) {
  editor.value = markdown;
  if (shouldStore) {
    localStorage.setItem(STORAGE_KEY, markdown);
  }
  render(markdown);
}

function getInitialMarkdown() {
  const incoming = sessionStorage.getItem(INCOMING_KEY);
  if (incoming !== null) {
    sessionStorage.removeItem(INCOMING_KEY);
    return incoming;
  }

  return (
    decodeMarkdownFromUrl() ||
    localStorage.getItem(STORAGE_KEY) ||
    "# Ola\n\nDigite Markdown no painel esquerdo."
  );
}

editor.addEventListener("input", () => {
  setMarkdown(editor.value);
});

sampleButton.addEventListener("click", () => {
  setMarkdown(SAMPLE);
});

clearButton.addEventListener("click", () => {
  setMarkdown("");
});

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "mdview:render" || typeof data.markdown !== "string") {
    return;
  }

  setMarkdown(data.markdown);
  event.source?.postMessage(
    {
      type: "mdview:rendered",
      length: data.markdown.length,
    },
    event.origin,
  );
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((error) => {
    console.warn("Service Worker indisponivel", error);
  });
}

setMarkdown(getInitialMarkdown(), false);
