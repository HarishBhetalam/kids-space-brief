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

const FILTERS = [["all", "All"], ...CATEGORIES.map(([id, name]) => [id, name.replace(" and ", " & ")])];

function renderPiece(item) {
  const weight = weightFor(item.rank || 99, 99);
  const href = escapeHtml(item.url);
  return `
    <article class="piece" data-weight="${weight}">
      <p class="kicker"><span class="rank">${escapeHtml(item.rank)}</span>${escapeHtml(CATEGORY_NAME[item.category] || item.category)}</p>
      <h2><a href="${href}">${escapeHtml(item.title)}</a></h2>
      <p class="meta">${escapeHtml(item.source)} · ${escapeHtml(formatDay(item.date))}</p>
      <p class="summary">${escapeHtml(item.summary)}</p>
      <a class="read" href="${href}">Read the piece</a>
    </article>
  `;
}

function renderPieces(items) {
  if (!items.length) return `<p class="empty">No articles this week.</p>`;
  return `<div class="pieces">${items.map(renderPiece).join("")}</div>`;
}

function renderIssue(issue) {
  const items = sortedItems(issue);
  const filters = FILTERS.map(
    ([id, name], index) =>
      `<button type="button" data-filter="${escapeHtml(id)}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(name)}</button>`
  ).join("");

  return `
    <div class="issue-head">
      <p class="kicker">${escapeHtml(issue.range || formatDay(issue.id))}</p>
      <h1>${escapeHtml(issue.title || "This week")}</h1>
      ${issue.intro ? `<p class="issue-intro">${escapeHtml(issue.intro)}</p>` : ""}
    </div>
    <div class="filters" role="group" aria-label="Filter articles">${filters}</div>
    <div data-issue-body>${renderPieces(items)}</div>
  `;
}

function bindFilters(root, issue) {
  const items = sortedItems(issue);
  const body = root.querySelector("[data-issue-body]");
  const buttons = root.querySelectorAll("[data-filter]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      buttons.forEach((other) => {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
      const visible = filter === "all" ? items : items.filter((item) => item.category === filter);
      body.innerHTML = renderPieces(visible);
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
  bindFilters(root, issue);
  if (page === "week") document.title = `${issue.title} · Kids Space Brief`;
}

start();
