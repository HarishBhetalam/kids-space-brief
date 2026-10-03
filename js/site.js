const CATEGORIES = [
  ["new-tech", "New tech"],
  ["parents-teachers", "Parents and teachers"],
  ["school", "School"],
  ["investments", "Investments"],
  ["research", "Research"],
  ["rules", "Rules and trust"],
];

const CATEGORY_NAME = Object.fromEntries(CATEGORIES);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function formatDay(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso || "";
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function weightFor(rank, total) {
  if (rank === 1) return "lead";
  if (rank <= Math.min(4, total)) return "high";
  return "rest";
}

function sortedItems(issue) {
  const items = [];
  for (const section of issue.sections || []) {
    for (const item of section.items || []) {
      items.push({ ...item, category: section.id });
    }
  }
  return items.sort((a, b) => (a.rank || 99) - (b.rank || 99));
}

function renderPiece(item, total, heading) {
  const weight = weightFor(item.rank || total, total);
  const title = escapeHtml(item.title);
  const href = escapeHtml(item.url);
  const Tag = heading;
  return `
    <article class="piece" data-weight="${weight}" id="piece-${escapeHtml(item.rank)}" data-category="${escapeHtml(item.category)}">
      <p class="rank">${escapeHtml(item.rank)}</p>
      <div>
        <p class="kicker">${escapeHtml(CATEGORY_NAME[item.category] || item.category)}</p>
        <${Tag}><a href="${href}">${title}</a></${Tag}>
        <p class="meta">${escapeHtml(item.source)} · ${escapeHtml(formatDay(item.date))}</p>
        <p class="summary">${escapeHtml(item.summary)}</p>
        <a class="read" href="${href}">Read the piece</a>
      </div>
    </article>
  `;
}

function renderImportance(issue) {
  const items = sortedItems(issue);
  const total = items.length;
  const present = new Set(items.map((item) => item.category));
  const pieces = items.map((item) => renderPiece(item, total, "h2")).join("");
  const quiet = CATEGORIES.filter(([id]) => !present.has(id))
    .map(
      ([id, name]) => `
        <section class="section-block" id="section-${id}">
          <h2>${escapeHtml(name)}</h2>
          <p class="empty">No articles this week.</p>
        </section>
      `
    )
    .join("");
  return `${pieces}${quiet}`;
}

function renderSections(issue) {
  const items = sortedItems(issue);
  const total = items.length;
  return CATEGORIES.map(([id, name]) => {
    const group = items.filter((item) => item.category === id);
    const body = group.length
      ? group.map((item) => renderPiece(item, total, "h3")).join("")
      : `<p class="empty">No articles this week.</p>`;
    return `
      <section class="section-block" id="section-${id}">
        <h2>${escapeHtml(name)}</h2>
        ${body}
      </section>
    `;
  }).join("");
}

function renderIssue(issue) {
  const items = sortedItems(issue);
  const firstByCategory = {};
  for (const item of items) {
    if (!firstByCategory[item.category]) firstByCategory[item.category] = item.rank;
  }
  const jumps = CATEGORIES.map(([id, name]) => {
    const rank = firstByCategory[id];
    const href = rank ? `#piece-${rank}` : `#section-${id}`;
    return `<a href="${href}">${escapeHtml(name)}</a>`;
  }).join("");

  return `
    <p class="kicker">${escapeHtml(issue.range || formatDay(issue.id))}</p>
    <h1>${escapeHtml(issue.title || "This week")}</h1>
    ${issue.intro ? `<p class="issue-intro">${escapeHtml(issue.intro)}</p>` : ""}
    <div class="mode" role="group" aria-label="Reading order">
      <button type="button" data-mode="importance" aria-pressed="true">Important first</button>
      <button type="button" data-mode="sections" aria-pressed="false">By section</button>
    </div>
    <nav class="jump" aria-label="Sections">${jumps}</nav>
    <p class="order-note" data-order-note>Most important first. Each summary is short enough to read in place.</p>
    <div data-issue-body>${renderImportance(issue)}</div>
  `;
}

function bindMode(root, issue) {
  const body = root.querySelector("[data-issue-body]");
  const note = root.querySelector("[data-order-note]");
  const buttons = root.querySelectorAll("[data-mode]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      buttons.forEach((other) => {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
      body.innerHTML = mode === "sections" ? renderSections(issue) : renderImportance(issue);
      note.textContent = mode === "sections"
        ? "Same pieces, grouped. A quiet section still stays on the page."
        : "Most important first. Each summary is short enough to read in place.";
    });
  });
}

async function loadIssues() {
  const response = await fetch("data/issues.json");
  if (!response.ok) throw new Error("Could not load issues");
  const data = await response.json();
  return Array.isArray(data.issues) ? data.issues : [];
}

function renderArchive(issues) {
  if (!issues.length) {
    return `<p class="empty">No issues yet.</p>`;
  }
  const items = issues
    .map(
      (issue) => `
        <li>
          <a href="week.html?d=${encodeURIComponent(issue.id)}">
            <h2>${escapeHtml(issue.title || formatDay(issue.id))}</h2>
            <small>${escapeHtml(issue.range || "")}</small>
          </a>
        </li>
      `
    )
    .join("");
  return `<ul class="archive-list">${items}</ul>`;
}

async function start() {
  const page = document.body.dataset.page;
  const root = document.querySelector("[data-issues]");
  if (!root) return;

  let issues = [];
  try {
    issues = await loadIssues();
  } catch (error) {
    root.innerHTML = `<p class="empty">The issue list could not be loaded.</p>`;
    return;
  }

  if (page === "archive") {
    root.innerHTML = renderArchive(issues);
    return;
  }

  const issue = page === "week"
    ? issues.find((entry) => entry.id === new URLSearchParams(location.search).get("d"))
    : issues[0];

  if (!issue) {
    root.innerHTML = page === "week"
      ? `<h1>Issue not found</h1><p class="lede">That week is not in the archive.</p>`
      : `<p class="kicker">This week</p><h1>No issue yet</h1><p class="lede">The first issue has not been published.</p>`;
    return;
  }

  root.innerHTML = renderIssue(issue);
  bindMode(root, issue);
  if (page === "week") document.title = `${issue.title} · Kids Space Brief`;
}

start();
