const state = { questions: [], answers: new Map(), query: "", section: "all" };
const els = {
  list: document.querySelector("#quizList"),
  empty: document.querySelector("#emptyState"),
  search: document.querySelector("#searchInput"),
  section: document.querySelector("#sectionFilter"),
  summary: document.querySelector("#resultSummary"),
  total: document.querySelector("#totalCount"),
  answered: document.querySelector("#answeredCount"),
  correct: document.querySelector("#correctCount"),
  score: document.querySelector("#scoreCount"),
};

async function init() {
  try {
    const response = await fetch(
      "Claude_Developer_Foundations_MCQ_Bank.txt?v=620",
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error("Could not load question bank");
    state.questions = parseBank(await response.text());
    populateSections();
    render();
  } catch (error) {
    els.summary.textContent =
      "Unable to load the question bank. Open this page through a local server.";
    console.error(error);
  }
}
function parseBank(text) {
  const lines = text.split(/\r?\n/),
    questions = [];
  let section = "General";
  for (let i = 0; i < lines.length; i++) {
    const sectionMatch = lines[i].match(/^SECTION \d+ — (.+)$/);
    if (sectionMatch) section = sectionMatch[1].trim();
    const qMatch = lines[i].match(/^Q(\d+)\.\s*(?:\[([^\]]+)\]\s*)?(.+)$/);
    if (!qMatch) continue;
    const questionSection = qMatch[2] ? qMatch[2].trim() : section;
    const options = [];
    let j = i + 1;
    while (j < lines.length && !/^ANSWER:/.test(lines[j])) {
      const option = lines[j].match(/^([A-D])\.\s*(.+)$/);
      if (option) options.push({ letter: option[1], text: option[2] });
      j++;
    }
    const answer =
      j < lines.length ? (lines[j].match(/^ANSWER:\s*([A-D])/) || [])[1] : null;
    if (options.length && answer)
      questions.push({
        id: Number(qMatch[1]),
        text: qMatch[3],
        options,
        answer,
        section: questionSection,
      });
    i = j;
  }
  return questions;
}
function populateSections() {
  [...new Set(state.questions.map((q) => q.section))].forEach((section) => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    els.section.append(option);
  });
}
function escapeHtml(value) {
  return value.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function highlight(value) {
  const safe = escapeHtml(value);
  if (!state.query) return safe;
  return safe.replace(
    new RegExp(`(${state.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"),
    "<mark>$1</mark>",
  );
}
function filteredQuestions() {
  const query = state.query.toLowerCase();
  return state.questions.filter(
    (q) =>
      (state.section === "all" || q.section === state.section) &&
      (!query ||
        [q.text, q.section, ...q.options.map((o) => o.text)]
          .join(" ")
          .toLowerCase()
          .includes(query)),
  );
}
function render() {
  const questions = filteredQuestions();
  els.list.innerHTML = "";
  els.empty.classList.toggle("d-none", questions.length > 0);
  els.total.textContent = state.questions.length;
  els.summary.textContent = `${questions.length} question${questions.length === 1 ? "" : "s"} shown${state.query ? ` for “${state.query}”` : ""}`;
  questions.forEach((q) =>
    els.list.insertAdjacentHTML("beforeend", cardHtml(q)),
  );
  updateStats();
}
function cardHtml(q) {
  const selected = state.answers.get(q.id);
  const answered = selected !== undefined;
  return `<article class="question-card" id="question-${q.id}"><div class="question-head"><span class="q-number">Q${q.id}</span><div class="flex-grow-1"><div class="d-flex justify-content-between gap-2 mb-2"><span class="badge rounded-pill section-badge">${escapeHtml(q.section)}</span>${answered ? `<span class="small ${selected === q.answer ? "text-success" : "text-danger"}">${selected === q.answer ? "Correct" : "Review this"}</span>` : ""}</div><p class="question-text">${highlight(q.text)}</p><div>${q.options.map((o) => optionHtml(q, o, selected)).join("")}</div>${answered ? `<div class="answer-note ${selected === q.answer ? "text-success" : "text-danger"}">Correct answer: <strong>${q.answer}</strong></div>` : ""}</div></div></article>`;
}
function optionHtml(q, option, selected) {
  let cls = "";
  if (selected) {
    if (option.letter === q.answer)
      cls = selected === q.answer ? "correct" : "reveal";
    else if (option.letter === selected) cls = "wrong";
  }
  return `<button class="option-btn ${cls}" data-q="${q.id}" data-answer="${option.letter}" ${selected ? "disabled" : ""}><span class="letter">${option.letter}</span>${highlight(option.text)}</button>`;
}
function updateStats() {
  const answered = state.answers.size,
    correct = [...state.answers].filter(
      ([id, answer]) =>
        state.questions.find((q) => q.id === id)?.answer === answer,
    ).length;
  els.answered.textContent = answered;
  els.correct.textContent = correct;
  els.score.textContent = answered
    ? `${Math.round((correct / answered) * 100)}%`
    : "0%";
}
els.search.addEventListener("input", (e) => {
  state.query = e.target.value.trim();
  render();
});
els.section.addEventListener("change", (e) => {
  state.section = e.target.value;
  render();
});
els.list.addEventListener("click", (e) => {
  const button = e.target.closest(".option-btn");
  if (!button) return;
  state.answers.set(Number(button.dataset.q), button.dataset.answer);
  render();
  document
    .querySelector(`#question-${button.dataset.q}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelector("#resetBtn").addEventListener("click", () => {
  state.answers.clear();
  render();
});
document.querySelector("#randomBtn").addEventListener("click", () => {
  const questions = filteredQuestions();
  if (!questions.length) return;
  document
    .querySelector(
      `#question-${questions[Math.floor(Math.random() * questions.length)].id}`,
    )
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
});
init();
