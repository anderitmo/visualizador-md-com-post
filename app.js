import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
}

const editor = document.querySelector("#editor");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const sampleButton = document.querySelector("#sampleButton");
const clearButton = document.querySelector("#clearButton");
const copyMarkdownButton = document.querySelector("#copyMarkdownButton");
const saveMarkdownButton = document.querySelector("#saveMarkdownButton");
const copyPreviewButton = document.querySelector("#copyPreviewButton");
const importFileInput = document.querySelector("#importFileInput");
const langSelect = document.querySelector("#langSelect");

const I18N = {
  "pt-BR": {
    convertBtn: "Converter PDF/DOCX",
    convertTooltip: "Converter arquivo PDF ou DOCX para Markdown",
    sampleBtn: "Exemplo",
    clearBtn: "Limpar",
    editorHeader: "Markdown",
    statusReady: "Pronto",
    saveMdBtn: "Salvar .MD",
    copyMdBtn: "Copiar Markdown",
    previewHeader: "Preview",
    mermaidHint: "Suporta blocos ```mermaid",
    copyPreviewBtn: "Copiar visualizador",
    docsSummary: "Como enviar Markdown para o MDView",
    docFormTitle: "POST via formulário",
    docFetchTitle: "POST via fetch (com download)",
    docGetTitle: "GET com download automático",
    docFooterNote: "Em GitHub Pages, o POST e interceptado por Service Worker no navegador. Abra a pagina uma vez antes de testar /render. Use o parâmetro download=true para baixar o arquivo .md automaticamente.",
    editorPlaceholder: "Digite Markdown aqui ou envie por postMessage/URL...",
    statusRendered: "Renderizado",
    statusMermaidError: "Erro no Mermaid",
    statusCopied: "Markdown copiado",
    statusPreviewCopied: "Visualizador copiado",
    statusCopyError: "Não foi possível copiar",
    statusSaved: "Arquivo .MD baixado",
    statusConverting: "Convertendo arquivo...",
    statusFormatError: "Formato não suportado. Use .docx ou .pdf",
    statusConvertError: "Erro ao converter arquivo",
    statusAutoDownload: "Download automático iniciado",
  },
  "en": {
    convertBtn: "Convert PDF/DOCX",
    convertTooltip: "Convert PDF or DOCX file to Markdown",
    sampleBtn: "Sample",
    clearBtn: "Clear",
    editorHeader: "Markdown",
    statusReady: "Ready",
    saveMdBtn: "Save .MD",
    copyMdBtn: "Copy Markdown",
    previewHeader: "Preview",
    mermaidHint: "Supports ```mermaid blocks",
    copyPreviewBtn: "Copy renderer",
    docsSummary: "How to send Markdown to MDView",
    docFormTitle: "POST via form",
    docFetchTitle: "POST via fetch (with download)",
    docGetTitle: "GET with auto-download",
    docFooterNote: "On GitHub Pages, POST is intercepted by a Service Worker in the browser. Open the page once before testing /render. Use the download=true parameter to automatically download the .md file.",
    editorPlaceholder: "Type Markdown here or send via postMessage/URL...",
    statusRendered: "Rendered",
    statusMermaidError: "Mermaid error",
    statusCopied: "Markdown copied",
    statusPreviewCopied: "Renderer copied",
    statusCopyError: "Could not copy",
    statusSaved: ".MD file downloaded",
    statusConverting: "Converting file...",
    statusFormatError: "Unsupported format. Use .docx or .pdf",
    statusConvertError: "Error converting file",
    statusAutoDownload: "Automatic download started",
  }
};

let currentLang = "pt-BR";

function setLanguage(lang) {
  if (!I18N[lang]) lang = "pt-BR";
  currentLang = lang;
  if (langSelect) langSelect.value = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (I18N[lang][key]) {
      el.textContent = I18N[lang][key];
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (I18N[lang][key]) {
      el.setAttribute("title", I18N[lang][key]);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (I18N[lang][key]) {
      el.setAttribute("placeholder", I18N[lang][key]);
    }
  });
}

function detectBrowserLanguage() {
  const userLang = navigator.language || navigator.userLanguage || "";
  return userLang.startsWith("pt") ? "pt-BR" : "en";
}

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

function applyToolbarAction(action) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;
  const selected = text.slice(start, end);

  let replacement = "";
  let cursorOffset = 0;

  switch (action) {
    case "bold":
      replacement = `**${selected || "texto em negrito"}**`;
      cursorOffset = selected ? replacement.length : 2;
      break;
    case "italic":
      replacement = `*${selected || "texto em itálico"}*`;
      cursorOffset = selected ? replacement.length : 1;
      break;
    case "strikethrough":
      replacement = `~~${selected || "texto tachado"}~~`;
      cursorOffset = selected ? replacement.length : 2;
      break;
    case "h1":
      replacement = `# ${selected || "Título 1"}`;
      cursorOffset = replacement.length;
      break;
    case "h2":
      replacement = `## ${selected || "Título 2"}`;
      cursorOffset = replacement.length;
      break;
    case "h3":
      replacement = `### ${selected || "Título 3"}`;
      cursorOffset = replacement.length;
      break;
    case "ul":
      replacement = selected
        ? selected.split("\n").map(line => `- ${line}`).join("\n")
        : "- Item da lista";
      cursorOffset = replacement.length;
      break;
    case "ol":
      replacement = selected
        ? selected.split("\n").map((line, idx) => `${idx + 1}. ${line}`).join("\n")
        : "1. Item ordenado";
      cursorOffset = replacement.length;
      break;
    case "task":
      replacement = selected
        ? selected.split("\n").map(line => `- [ ] ${line}`).join("\n")
        : "- [ ] Tarefa a cumprir";
      cursorOffset = replacement.length;
      break;
    case "quote":
      replacement = selected
        ? selected.split("\n").map(line => `> ${line}`).join("\n")
        : "> Citação aqui";
      cursorOffset = replacement.length;
      break;
    case "code":
      replacement = `\`${selected || "código"}\``;
      cursorOffset = selected ? replacement.length : 1;
      break;
    case "codeblock":
      replacement = `\`\`\`javascript\n${selected || "// Seu código aqui"}\n\`\`\``;
      cursorOffset = selected ? replacement.length : 14;
      break;
    case "link":
      replacement = `[${selected || "Texto do link"}](https://exemplo.com)`;
      cursorOffset = replacement.length;
      break;
    case "image":
      replacement = `![${selected || "Descrição da imagem"}](https://via.placeholder.com/150)`;
      cursorOffset = replacement.length;
      break;
    case "table":
      replacement = `| Cabeçalho 1 | Cabeçalho 2 |\n| ----------- | ----------- |\n| Célula 1   | Célula 2   |`;
      cursorOffset = replacement.length;
      break;
    case "hr":
      replacement = `\n---\n`;
      cursorOffset = replacement.length;
      break;
    case "undo":
      document.execCommand("undo");
      return;
    case "redo":
      document.execCommand("redo");
      return;
    default:
      return;
  }

  editor.focus();
  document.execCommand("insertText", false, replacement);
  setMarkdown(editor.value);
}

document.querySelectorAll(".editor-toolbar .tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.getAttribute("data-action");
    if (action) {
      applyToolbarAction(action);
    }
  });
});

async function copyText(text, successMessage) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    fallbackCopy(text);
  }

  setStatus(successMessage);
}

async function copyPreview() {
  const html = preview.innerHTML;
  const text = preview.innerText;

  if (navigator.clipboard?.write && window.ClipboardItem) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
  } else {
    fallbackCopy(text);
  }

  setStatus("Visualizador copiado");
}

function fallbackCopy(text) {
  const copyArea = document.createElement("textarea");
  copyArea.value = text;
  copyArea.setAttribute("readonly", "");
  copyArea.className = "copy-fallback";
  document.body.append(copyArea);
  copyArea.select();
  document.execCommand("copy");
  copyArea.remove();
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
    setStatus(I18N[currentLang]?.statusRendered || "Renderizado");
  } catch (error) {
    setStatus(I18N[currentLang]?.statusMermaidError || "Erro no Mermaid");
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

function downloadMarkdownFile(markdownText, filename = "documento.md") {
  const blob = new Blob([markdownText], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function convertDocxToMarkdown(arrayBuffer) {
  if (!window.mammoth || !window.TurndownService) {
    throw new Error("Bibliotecas de conversao nao disponiveis");
  }
  const result = await window.mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  const turndownService = new window.TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  return turndownService.turndown(html);
}

async function convertPdfToMarkdown(arrayBuffer) {
  if (!window.pdfjsLib) {
    throw new Error("Biblioteca PDF.js nao disponivel");
  }
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pagesText = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    let lastY;
    let pageLines = [];
    let currentLine = "";

    for (const item of textContent.items) {
      if (!item.str) continue;
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== undefined && y !== null && Math.abs(y - lastY) > 5) {
        pageLines.push(currentLine.trim());
        currentLine = item.str;
      } else {
        currentLine += (currentLine ? " " : "") + item.str;
      }
      if (y !== null) lastY = y;
    }
    if (currentLine) {
      pageLines.push(currentLine.trim());
    }

    if (numPages > 1) {
      pagesText.push(`<!-- Pagina ${i} -->\n` + pageLines.join("\n"));
    } else {
      pagesText.push(pageLines.join("\n"));
    }
  }

  return pagesText.join("\n\n");
}

async function handleFileImport(file) {
  if (!file) return;
  setStatus("Convertendo arquivo...");
  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileNameLower = file.name.toLowerCase();
    let convertedMd = "";

    if (fileNameLower.endsWith(".docx")) {
      convertedMd = await convertDocxToMarkdown(arrayBuffer);
    } else if (fileNameLower.endsWith(".pdf")) {
      convertedMd = await convertPdfToMarkdown(arrayBuffer);
    } else {
      setStatus("Formato nao suportado. Use .docx ou .pdf");
      return;
    }

    setMarkdown(convertedMd);
    setStatus(`Arquivo ${file.name} convertido`);
  } catch (err) {
    console.error("Erro na conversao:", err);
    setStatus("Erro ao converter arquivo");
  } finally {
    importFileInput.value = "";
  }
}

function checkDownloadUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hash);

  const downloadParam = params.get("download") || params.get("dl") || hashParams.get("download") || hashParams.get("dl");
  const filenameParam = params.get("filename") || hashParams.get("filename") || "documento.md";

  if (downloadParam !== null) {
    const lower = downloadParam.toLowerCase();
    const isDownload = lower !== "false" && lower !== "0";
    if (isDownload) {
      const finalFilename = lower.endsWith(".md") ? downloadParam : filenameParam;
      return { download: true, filename: finalFilename };
    }
  }

  return null;
}

function processInitialData() {
  const savedLang = localStorage.getItem("mdview:lang") || detectBrowserLanguage();
  setLanguage(savedLang);

  const incomingStr = sessionStorage.getItem(INCOMING_KEY);
  let markdown = "";
  let autoDownloadInfo = null;

  if (incomingStr !== null) {
    sessionStorage.removeItem(INCOMING_KEY);
    try {
      const parsed = JSON.parse(incomingStr);
      if (parsed && typeof parsed === "object" && typeof parsed.markdown === "string") {
        markdown = parsed.markdown;
        if (parsed.download) {
          autoDownloadInfo = {
            download: true,
            filename: parsed.filename || "documento.md",
          };
        }
      } else if (typeof parsed === "string") {
        markdown = parsed;
      }
    } catch {
      markdown = incomingStr;
    }
  } else {
    markdown = decodeMarkdownFromUrl() || localStorage.getItem(STORAGE_KEY) || "# MDView\n\nDigite Markdown no painel esquerdo.";
    autoDownloadInfo = checkDownloadUrlParams();
  }

  setMarkdown(markdown, true);

  if (autoDownloadInfo?.download && markdown) {
    setTimeout(() => {
      downloadMarkdownFile(markdown, autoDownloadInfo.filename);
      setStatus(I18N[currentLang]?.statusAutoDownload || "Download automático iniciado");
    }, 100);
  }
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

langSelect?.addEventListener("change", (e) => {
  setLanguage(e.target.value);
  localStorage.setItem("mdview:lang", e.target.value);
});

saveMarkdownButton?.addEventListener("click", () => {
  downloadMarkdownFile(editor.value, "documento.md");
  setStatus(I18N[currentLang]?.statusSaved || "Arquivo .MD baixado");
});

copyMarkdownButton.addEventListener("click", () => {
  copyText(editor.value, I18N[currentLang]?.statusCopied || "Markdown copiado").catch((error) => {
    console.error(error);
    setStatus(I18N[currentLang]?.statusCopyError || "Não foi possível copiar");
  });
});

importFileInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) {
    handleFileImport(file);
  }
});

copyPreviewButton.addEventListener("click", () => {
  copyPreview().catch((error) => {
    console.error(error);
    setStatus("Nao foi possivel copiar");
  });
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

processInitialData();
