const get = (id) => document.getElementById(id);
const repository = "https://github.com/wahab-2007/essays/tree/main/";
const views = ["summary", "essay", "pdf", "slides", "compare"];
const route = (entry, view = "summary") => "#draft-" + entry.code + (view === "summary" ? "" : "/" + view);
let entries = [];
const saved = new Set();
try {
  const stored = JSON.parse(localStorage.getItem("essay-library-saved") || "[]");
  if (Array.isArray(stored)) for (const code of stored) saved.add(code);
} catch {
  // Saving is still available for this visit if browser storage is unavailable.
}

function selection() {
  const [draft, view, against] = location.hash.slice(1).split("/");
  return [entries.find((entry) => draft === "draft-" + entry.code) || entries[0],
    views.includes(view) ? view : "summary", against];
}

function renderList(active) {
  const topic = get("topic").value;
  const savedOnly = get("saved-only").checked;
  const query = get("search").value.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const matches = entries.filter((entry) => {
    const target = [entry.title, entry.topic, entry.code, entry.brief.thesis,
      entry.brief.example, entry.brief.fit].join(" ").toLowerCase();
    return (!topic || entry.topic === topic) && (!savedOnly || saved.has(entry.code)) && terms.every((term) => target.includes(term));
  });
  const byDraft = get("sort").value === "draft";
  if (byDraft) matches.sort((a, b) => a.code.localeCompare(b.code));

  get("result-count").textContent = matches.length
    ? matches.length + (matches.length === 1 ? " draft" : " drafts") +
      (byDraft ? " · By topic and draft" : " · By recommendation")
    : "No drafts match these filters.";

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

function compareRoute(entry, other) {
  return route(entry, "compare") + "/" + other.code;
}

function renderComparison(entry, against) {
  const alternatives = entries.filter((other) => other !== entry);
  const other = alternatives.find((item) => item.code === against) ||
    alternatives.find((item) => item.topic === entry.topic) || alternatives[0];
  const rankedFirst = entry.rank < other.rank ? entry : other;
  const alternate = rankedFirst === entry ? other : entry;
  const select = get("comparison");
  select.replaceChildren(...alternatives.map((item) => new Option(
    item.code + " · " + item.title, item.code, false, item === other
  )));
  select.onchange = () => {
    const choice = alternatives.find((item) => item.code === select.value);
    if (choice) location.hash = compareRoute(entry, choice);
  };

  const recommendation = get("recommendation");
  recommendation.replaceChildren();
  const lead = document.createElement("strong");
  lead.textContent = "Start with " + rankedFirst.code + " (rank " + rankedFirst.rank + "). ";
  recommendation.append(lead, rankedFirst.strength + " Pick " + alternate.code + " if " +
    alternate.brief.fit.charAt(0).toLowerCase() + alternate.brief.fit.slice(1));

  get("compare-cards").replaceChildren(...[entry, other].map((draft) => {
    const card = document.createElement("section");
    card.className = "decision-card";
    const heading = document.createElement("h3");
    heading.textContent = draft.title;
    const label = document.createElement("p");
    label.className = "eyebrow";
    label.textContent = "Draft " + draft.code + " · Rank " + draft.rank;
    card.append(label, heading);
    for (const [label, value] of [
      ["Choose it if", draft.brief.fit],
      ["Worked example", draft.brief.example],
      ["Trade-off", draft.tradeoff],
    ]) {
      const term = document.createElement("h4");
      term.textContent = label;
      const description = document.createElement("p");
      description.textContent = value;
      card.append(term, description);
    }
    const link = document.createElement("a");
    link.href = route(draft, "essay");
    link.textContent = "Read full essay";
    card.append(link);
    return card;
  }));
}

function renderSaveButton(entry) {
  const button = get("save-draft");
  const isSaved = saved.has(entry.code);
  button.textContent = isSaved ? "Saved" : "Save draft";
  button.setAttribute("aria-pressed", String(isSaved));
  button.onclick = () => {
    if (saved.has(entry.code)) saved.delete(entry.code);
    else saved.add(entry.code);
    try {
      localStorage.setItem("essay-library-saved", JSON.stringify([...saved]));
    } catch {
      // Keep the selection in memory for this visit.
    }
    renderSaveButton(entry);
    renderList(entry);
  };
}

function renderEssay(entry, view, against) {
  renderSaveButton(entry);
  const files = "files/" + entry.rank + "/";
  get("draft-info").textContent = entry.topic + " · Draft " + entry.code + " · Rank " + entry.rank;
  get("essay-title").textContent = entry.title;
  document.title = entry.title + " | Essay Library";
  get("thesis").textContent = entry.brief.thesis;
  get("example").textContent = entry.brief.example;
  get("fit").textContent = entry.brief.fit;
  get("read-full").href = route(entry, "essay");
  get("quick-compare").href = route(entry, "compare");
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

  get("summary").hidden = view !== "summary";
  get("compare").hidden = view !== "compare";
  get("essay").hidden = view !== "essay";
  get("essay-navigation").hidden = view !== "essay";
  get("preview").hidden = !["pdf", "slides"].includes(view);
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
    const headings = [...get("essay").querySelectorAll("h3")];
    for (const heading of headings) heading.tabIndex = -1;
    const sections = get("essay-section");
    sections.replaceChildren(new Option("Select a section", ""),
      ...headings.map((heading, index) => new Option(heading.textContent, index)));
    sections.onchange = () => {
      if (sections.value !== "") headings[Number(sections.value)].focus();
    };
  } else if (view === "compare") {
    renderComparison(entry, against);
  } else if (view === "pdf" || view === "slides") {
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

function renderShortlist() {
  const picks = [
    ["5-5", "Visual demonstration"],
    ["3-5", "Software engineering"],
    ["4-5", "Classroom research"],
    ["6-2", "Ethics and numbers"],
  ];
  const links = picks.flatMap(([code, label]) => {
    const entry = entries.find((draft) => draft.code === code);
    if (!entry) return [];
    const link = document.createElement("a");
    link.className = "pick";
    link.href = route(entry);
    const category = document.createElement("span");
    category.className = "eyebrow";
    category.textContent = label + " · " + code;
    const title = document.createElement("strong");
    title.textContent = entry.title;
    link.append(category, title);
    return [link];
  });
  get("shortlist").replaceChildren(...links);
  get("start").hidden = !links.length;
}

function showRoute() {
  const [entry, view, against] = selection();
  renderList(entry);
  renderEssay(entry, view, against);
}

async function load() {
  const response = await fetch("catalog.json");
  if (!response.ok) throw new Error("The document catalogue is unavailable.");
  entries = await response.json();
  renderShortlist();
  const topics = [...new Set(entries.map((entry) => entry.topic))].sort((a, b) => a.localeCompare(b));
  for (const topic of topics) get("topic").append(new Option(topic, topic));

  document.querySelector(".filters").addEventListener("submit", (event) => event.preventDefault());
  get("topic").addEventListener("change", () => renderList(selection()[0]));
  get("saved-only").addEventListener("change", () => renderList(selection()[0]));
  get("sort").addEventListener("change", () => renderList(selection()[0]));
  get("search").addEventListener("input", () => renderList(selection()[0]));
  let focusReader = false;
  document.addEventListener("click", (event) => {
    const link = event.target.closest("#results a, .pick, #read-full, #quick-compare, #compare-cards a");
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
