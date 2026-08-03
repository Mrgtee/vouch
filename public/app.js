const state = {
  packet: null,
  result: null,
  activeTab: "overview"
};

const elements = {
  statusPill: document.querySelector("#statusPill"),
  statusText: document.querySelector("#statusText"),
  resumeText: document.querySelector("#resumeText"),
  resumeFile: document.querySelector("#resumeFile"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  generateButton: document.querySelector("#generateButton"),
  copyJsonButton: document.querySelector("#copyJsonButton"),
  downloadPdfButton: document.querySelector("#downloadPdfButton"),
  downloadDocxButton: document.querySelector("#downloadDocxButton"),
  resultPanel: document.querySelector("#resultPanel"),
  beforeScore: document.querySelector("#beforeScore"),
  afterScore: document.querySelector("#afterScore"),
  scoreFill: document.querySelector("#scoreFill"),
  tabs: [...document.querySelectorAll(".tab")]
};

const sample = {
  resumeText:
    "Jane Doe\nProduct Analyst with 5 years building SQL dashboards, product analytics, A/B testing, stakeholder reporting, and retention experiments.\nImproved activation by 18% and reduced reporting time by 40% by automating weekly KPI reports.\nLed cross functional roadmap reviews with product, sales, and customer success teams.\nBuilt cohort dashboards in SQL and BI tools to identify churn risks and improve onboarding decisions.",
  targetJobs: [
    {
      title: "Senior Product Analyst",
      company: "Acme",
      url: "https://example.com/jobs/senior-product-analyst",
      description:
        "Senior Product Analyst role requiring SQL, product analytics, experimentation, A/B testing, dashboards, stakeholder management, retention analysis, revenue reporting, customer insights, and cross functional communication. The candidate should translate data into decisions and improve product growth metrics."
    },
    {
      title: "Growth Analyst",
      company: "Northstar Labs",
      url: "https://example.com/jobs/growth-analyst",
      description:
        "Growth Analyst needed for lifecycle analytics, funnel reporting, activation metrics, retention cohorts, experimentation, SQL analysis, product dashboards, customer segmentation, and executive-ready recommendations for product and marketing stakeholders."
    }
  ],
  candidatePreferences: {
    location: "Remote",
    salaryGoal: "120000 USD",
    tone: "confident"
  }
};

checkHealth();
bindEvents();

function bindEvents() {
  elements.loadSampleButton.addEventListener("click", loadSample);
  elements.generateButton.addEventListener("click", generatePacket);
  elements.copyJsonButton.addEventListener("click", copyJson);
  elements.downloadPdfButton.addEventListener("click", () => downloadFile("pdf"));
  elements.downloadDocxButton.addEventListener("click", () => downloadFile("docx"));
  elements.resumeFile.addEventListener("change", importResumeFile);

  for (const tab of elements.tabs) {
    tab.addEventListener("click", () => {
      state.activeTab = tab.dataset.tab;
      updateTabs();
      renderPacket();
    });
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/health");
    if (!response.ok) {
      throw new Error("Health check failed");
    }

    elements.statusPill.classList.add("is-live");
    elements.statusText.textContent = "API live";
  } catch {
    elements.statusPill.classList.add("is-error");
    elements.statusText.textContent = "API offline";
  }
}

function loadSample() {
  elements.resumeText.value = sample.resumeText;
  setValue("jobTitle1", sample.targetJobs[0].title);
  setValue("jobCompany1", sample.targetJobs[0].company);
  setValue("jobUrl1", sample.targetJobs[0].url);
  setValue("jobDescription1", sample.targetJobs[0].description);
  setValue("jobTitle2", sample.targetJobs[1].title);
  setValue("jobCompany2", sample.targetJobs[1].company);
  setValue("jobUrl2", sample.targetJobs[1].url);
  setValue("jobDescription2", sample.targetJobs[1].description);
  setValue("location", sample.candidatePreferences.location);
  setValue("salaryGoal", sample.candidatePreferences.salaryGoal);
  setValue("tone", sample.candidatePreferences.tone);
}

async function importResumeFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  elements.resumeText.value = await file.text();
}

async function generatePacket() {
  const payload = collectPayload();
  setLoading(true);

  try {
    const response = await fetch("/api/v1/vouch/application-packet", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await readJsonResponse(response);

    if (response.status === 402) {
      throw {
        message: "Payment required before Vouch can generate this packet. Use an OKX.AI/x402-capable client to pay and replay the request.",
        paymentRequired: data
      };
    }

    if (!response.ok) {
      throw data;
    }

    state.result = data;
    state.packet = data.packet;
    updateOutputActions();
    renderPacket();
  } catch (error) {
    renderError(error);
  } finally {
    setLoading(false);
  }
}

function collectPayload() {
  const targetJobs = [1, 2, 3]
    .map((index) => ({
      title: getValue(`jobTitle${index}`),
      company: getValue(`jobCompany${index}`),
      url: getValue(`jobUrl${index}`),
      description: getValue(`jobDescription${index}`)
    }))
    .filter((job) => job.description.length > 0 || job.title.length > 0 || job.url.length > 0);

  return {
    resumeText: elements.resumeText.value,
    targetJobs,
    candidatePreferences: {
      location: getValue("location"),
      salaryGoal: getValue("salaryGoal"),
      tone: getValue("tone")
    }
  };
}

function renderPacket() {
  const packet = state.packet;
  if (!packet) {
    return;
  }

  elements.beforeScore.textContent = formatScore(packet.fitScoreBefore);
  elements.afterScore.textContent = formatScore(packet.fitScoreAfter);
  elements.scoreFill.style.width = Math.max(packet.fitScoreBefore, packet.fitScoreAfter) + "%";

  const renderers = {
    overview: renderOverview,
    resume: renderResume,
    interview: renderInterview,
    json: renderJson
  };

  elements.resultPanel.replaceChildren(renderers[state.activeTab](packet));
}

function renderOverview(packet) {
  const strongGaps = (packet.gapBenchmark ?? [])
    .filter((gap) => gap.status === "missing")
    .slice(0, 6);
  const matched = packet.jobBreakdown?.[0]?.matchedKeywords ?? [];

  return createStack(
    createElement("div", { className: "metric-grid" }, [
      createMetric("Before fit", packet.fitScoreBefore),
      createMetric("After fit", packet.fitScoreAfter),
      createMetric("Decision", packet.mockRecruiterScreen?.decision || "Not specified")
    ]),
    createCard("Recruiter summary", [createParagraphWithBreaks(packet.recruiterSummary)]),
    createCard("Visible strengths", [createChipRow(matched)]),
    createCard("Gaps to close", [
      createList(strongGaps, (gap) =>
        (gap.label || gap.requirement || "Requirement") + ": " + (gap.recommendation || "Add verified proof.")
      )
    ])
  );
}

function renderResume(packet) {
  return createStack(
    createCard("ATS resume", [createElement("pre", { text: packet.atsResume || "No ATS resume returned." })])
  );
}

function renderInterview(packet) {
  return createStack(
    createCard("Mock recruiter screen", [
      createList(packet.mockRecruiterScreen?.whyInterview ?? [], (item) => item)
    ]),
    createCard("Interview prep", [
      createList((packet.interviewPrep ?? []).slice(0, 8), (item) => {
        const fragment = document.createDocumentFragment();
        fragment.append(
          createElement("strong", { text: item.question || "Interview question" }),
          document.createElement("br"),
          document.createTextNode(item.answerFrame || "Use a specific, evidence-backed story.")
        );
        return fragment;
      })
    ]),
    createCard("Portfolio proof sprints", [
      createList(packet.portfolioProjects ?? [], (item) => {
        const fragment = document.createDocumentFragment();
        fragment.append(
          createElement("strong", { text: item.title || "Proof sprint" }),
          document.createElement("br"),
          document.createTextNode(item.objective || "Show role evidence.")
        );
        return fragment;
      })
    ])
  );
}

function renderJson(packet) {
  return createStack(
    createCard("Raw packet", [createElement("pre", { text: JSON.stringify(packet, null, 2) })])
  );
}

function renderError(error) {
  state.result = null;
  state.packet = null;
  updateOutputActions();

  const children = [
    createElement("strong", { text: error?.message ?? "Vouch could not generate the packet." })
  ];
  if (Array.isArray(error?.details)) {
    children.push(createList(error.details, (item) => item.field + ": " + item.message));
  }

  elements.beforeScore.textContent = "--";
  elements.afterScore.textContent = "--";
  elements.scoreFill.style.width = "0%";
  elements.resultPanel.replaceChildren(createElement("div", { className: "error-box" }, children));
}

function createStack(...children) {
  return createElement("div", { className: "section-stack" }, children);
}

function createCard(title, children) {
  return createElement("article", { className: "result-card" }, [
    createElement("h3", { text: title }),
    ...children
  ]);
}

function createMetric(label, value) {
  return createElement("div", { className: "metric" }, [
    createElement("span", { text: label }),
    createElement("strong", { text: formatScore(value) })
  ]);
}

function createChipRow(items) {
  const chips = (items.length > 0 ? items : ["No matched strengths returned"])
    .map((item) => createElement("span", { className: "chip", text: item }));
  return createElement("div", { className: "chip-row" }, chips);
}

function createList(items, renderItem) {
  const list = createElement("ul");
  if (!Array.isArray(items) || items.length === 0) {
    list.append(createElement("li", { text: "No items returned." }));
    return list;
  }

  for (const item of items) {
    const li = createElement("li");
    const rendered = renderItem(item);
    if (typeof rendered === "string") {
      li.textContent = rendered;
    } else {
      li.append(rendered);
    }
    list.append(li);
  }
  return list;
}

function createParagraphWithBreaks(value) {
  const paragraph = createElement("p");
  const lines = String(value || "No recruiter summary returned.").split("\n");
  lines.forEach((line, index) => {
    if (index > 0) {
      paragraph.append(document.createElement("br"));
    }
    paragraph.append(document.createTextNode(line));
  });
  return paragraph;
}

function createElement(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  if (options.className) {
    element.className = options.className;
  }
  if (options.text !== undefined) {
    element.textContent = String(options.text);
  }
  for (const child of children) {
    element.append(child);
  }
  return element;
}

function formatScore(value) {
  return Number.isFinite(value) ? String(value) : "--";
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function copyJson() {
  if (!state.packet) {
    return;
  }

  await navigator.clipboard.writeText(JSON.stringify(state.result ?? state.packet, null, 2));
  elements.copyJsonButton.textContent = "Copied";
  setTimeout(() => {
    elements.copyJsonButton.textContent = "Copy JSON";
  }, 1200);
}

function updateOutputActions() {
  const files = state.result?.files ?? [];
  elements.copyJsonButton.disabled = !state.result;
  elements.downloadPdfButton.disabled = !files.some((file) => file.name === "pdf");
  elements.downloadDocxButton.disabled = !files.some((file) => file.name === "docx");
}

function downloadFile(name) {
  const file = state.result?.files?.find((item) => item.name === name);
  if (!file?.data) {
    return;
  }

  const blob = base64ToBlob(file.data, safeDownloadMediaType(name));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename || "vouch-application-packet";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeDownloadMediaType(name) {
  if (name === "pdf") {
    return "application/pdf";
  }
  if (name === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

function base64ToBlob(data, mediaType) {
  const binary = atob(data);
  const chunks = [];
  for (let index = 0; index < binary.length; index += 8192) {
    const slice = binary.slice(index, index + 8192);
    const bytes = new Uint8Array(slice.length);
    for (let offset = 0; offset < slice.length; offset += 1) {
      bytes[offset] = slice.charCodeAt(offset);
    }
    chunks.push(bytes);
  }
  return new Blob(chunks, { type: mediaType });
}

function updateTabs() {
  for (const tab of elements.tabs) {
    tab.classList.toggle("is-active", tab.dataset.tab === state.activeTab);
  }
}

function setLoading(isLoading) {
  elements.generateButton.disabled = isLoading;
  elements.generateButton.textContent = isLoading ? "Generating packet..." : "Generate application packet";
}

function getValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function setValue(id, value) {
  document.querySelector(`#${id}`).value = value;
}
