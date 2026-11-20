const get = (id) => document.getElementById(id);
const repository = "https://github.com/wahab-2007/essays/tree/main/";
const views = ["essay", "pdf", "slides"];
const route = (entry, view = "essay") => "#draft-" + entry.code + (view === "essay" ? "" : "/" + view);
let entries = [];

function selection() {
  const [draft, view] = location.hash.slice(1).split("/");
  return [entries.find((entry) => draft === "draft-" + entry.code) || entries[0],
    views.includes(view) ? view : "essay"];
}

function renderList(active) {
  const topic = get("topic").value;
  const query = get("search").value.trim().toLowerCase();
  const matches = entries.filter((entry) => (!topic || entry.topic === topic) &&
    (entry.title + " " + entry.topic + " " + entry.code).toLowerCase().includes(query));

  get("result-count").textContent = matches.length
    ? matches.length + (matches.length === 1 ? " draft" : " drafts") + " · Ranked by recommendation"
    : "No drafts match this search.";

  get("results").replaceChildren(...matches.map((entry) => {
    const link = document.createElement("a");
    link.className = "result";
    link.href = route(entry);
    if (entry === active) link.setAttribute("aria-current", "page");
    const rank = document.createElement("span");
    rank.className = "result-rank";
    rank.textContent = entry.rank;
    const title = document.createElement("span");
    title.textContent = entry.title;
    link.append(rank, title);
    return link;
  }));
}

function renderEssay(entry, view) {
  const files = "files/" + entry.rank + "/";
  get("draft-info").textContent = entry.topic + " · Draft " + entry.code + " · Rank " + entry.rank;
  get("essay-title").textContent = entry.title;
  get("strength").textContent = entry.strength;
  get("tradeoff").textContent = entry.tradeoff;
  get("original").href = repository + entry.original;
  get("word-download").href = files + "essay.docx";
  get("word-download").download = entry.code + ".docx";

  for (const name of views) {
    const link = get(name + "-view");
    link.href = route(entry, name);
    if (name === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  get("essay").hidden = view !== "essay";
  get("preview").hidden = view === "essay";
  get("viewer")?.remove();
  if (view === "essay") {
    get("essay").replaceChildren(...entry.paragraphs.map(({ heading, parts }) => {
      const paragraph = document.createElement(heading ? "h3" : "p");
      for (const { text, href } of parts) {
        if (href) {
          const link = document.createElement("a");
          link.href = href;
          link.textContent = text;
          paragraph.append(link);
        } else {
          paragraph.append(text);
        }
      }
      return paragraph;
    }));
  } else {
    const preview = files + (view === "slides" ? "slides.pdf" : "essay.pdf");
    const frame = document.createElement("iframe");
    frame.id = "viewer";
    frame.src = preview;
    frame.title = (view === "slides" ? "Slides for " : "PDF of ") + entry.title;
    get("preview").append(frame);
    get("open-pdf").href = preview;
    get("original-slides").hidden = view !== "slides";
    get("original-slides").href = files + "slides.pptx";
    get("original-slides").download = entry.code + ".pptx";
  }
  get("reader").hidden = false;
}

function showRoute() {
  const [entry, view] = selection();
  renderList(entry);
  renderEssay(entry, view);
}

async function load() {
  const response = await fetch("catalog.json");
  if (!response.ok) throw new Error("The document catalogue is unavailable.");
  entries = await response.json();
  const topics = [...new Set(entries.map((entry) => entry.topic))].sort((a, b) => a.localeCompare(b));
  for (const topic of topics) get("topic").append(new Option(topic, topic));

  document.querySelector(".filters").addEventListener("submit", (event) => event.preventDefault());
  get("topic").addEventListener("change", () => renderList(selection()[0]));
  get("search").addEventListener("input", () => renderList(selection()[0]));
  let focusReader = false;
  get("results").addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hash === location.hash) get("essay-title").focus();
    else focusReader = true;
  });
  window.addEventListener("hashchange", () => {
    showRoute();
    if (focusReader) get("essay-title").focus();
    focusReader = false;
  });
  showRoute();
}

load().catch(() => {
  get("result-count").textContent = "The library couldn’t load. Try refreshing or open the repository.";
});
