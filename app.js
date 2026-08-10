/* =========================================================
   ZAHRAA™ Teacher Decision Lab
   Global Frontend Controller

   Decision Before Generation
========================================================= */

const CURRENT_SESSION_KEY = "zahraaDecisionSession";
const HISTORY_KEY = "zahraaDecisionSessionsHistory";

/* =========================================================
   BASIC HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSession() {
  try {
    return JSON.parse(
      localStorage.getItem(CURRENT_SESSION_KEY) || "{}"
    );
  } catch {
    return {};
  }
}

function getHistory() {
  try {
    return JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]"
    );
  } catch {
    return [];
  }
}

function saveSession(session) {
  if (!session || typeof session !== "object") return;

  localStorage.setItem(
    CURRENT_SESSION_KEY,
    JSON.stringify(session)
  );

  if (!session.sessionId) return;

  const history = getHistory();

  const updated = {
    ...session,
    updatedAt: new Date().toISOString()
  };

  const index = history.findIndex(
    (item) => item.sessionId === session.sessionId
  );

  if (index >= 0) {
    history[index] = updated;
  } else {
    history.unshift(updated);
  }

  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history.slice(0, 20))
  );
}

function setLoading(button, active, text = "جاري المعالجة...") {
  if (!button) return;

  if (active) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }
}

function safeText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function safeHTML(id, value) {
  const element = $(id);

  if (element) {
    element.innerHTML = value ?? "";
  }
}

/* =========================================================
   PAGE NAVIGATION
========================================================= */

const PAGE_ROUTES = {
  analysis: "scenario.html",
  context: "scenario.html",
  scenario: "scenario.html",

  adaptive: "scenario.html",
  adaptive_question: "scenario.html",

  summary: "scenario.html",

  alternatives: "alternatives.html",

  approval: "teacher-approval.html",
  teacherApproval: "teacher-approval.html",
  "teacher-approval": "teacher-approval.html",

  implementation: "implementation-plan.html",
  plan: "implementation-plan.html",
  "implementation-plan": "implementation-plan.html",

  datahub: "zahraa-datahub.html"
};

function navigateTo(target) {
  if (!target) return;

  if (
    target.endsWith(".html") ||
    target.startsWith("http")
  ) {
    window.location.href = target;
    return;
  }

  const cleanTarget = target
    .replace("-screen", "")
    .replace("_screen", "");

  const page =
    PAGE_ROUTES[target] ||
    PAGE_ROUTES[cleanTarget];

  if (page) {
    window.location.href = page;
  }
}

/*
   يدعم الأزرار القديمة المبنية على data-go.
*/
document.querySelectorAll("[data-go]").forEach((element) => {
  element.style.cursor = "pointer";

  element.addEventListener("click", (event) => {
    const destination = element.dataset.go;

    if (!destination) return;

    /*
      إذا كان هناك screen فعلي داخل نفس الصفحة،
      ننتقل إليه داخليًا.
    */
    const internalScreen = document.getElementById(destination);

    if (internalScreen) {
      event.preventDefault();

      document
        .querySelectorAll(".screen")
        .forEach((screen) =>
          screen.classList.remove("active")
        );

      internalScreen.classList.add("active");

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      return;
    }

    /*
      وإلا ننتقل إلى الصفحة المناسبة.
    */
    event.preventDefault();
    navigateTo(destination);
  });
});

/*
   إصلاح تلقائي لشريط الرحلة العلوي
   حتى لو لم يكن data-go موجودًا.
*/
const NAV_TEXT_ROUTES = [
  {
    words: ["تحليل", "تحليل الموقف"],
    page: "scenario.html"
  },
  {
    words: ["سؤال تكيفي", "السؤال التكيفي"],
    page: "scenario.html"
  },
  {
    words: ["ملخص", "الملخص"],
    page: "scenario.html"
  },
  {
    words: ["بدائل", "البدائل"],
    page: "alternatives.html"
  },
  {
    words: [
      "مراجعة القرار واعتماده",
      "اعتماد القرار",
      "مراجعة القرار"
    ],
    page: "teacher-approval.html"
  },
  {
    words: ["خطة التنفيذ", "التنفيذ"],
    page: "implementation-plan.html"
  }
];

function enableTopNavigation() {
  const candidates =
    document.querySelectorAll(
      "header a, header button, nav a, nav button, .workflow-nav a, .workflow-nav button, .steps a, .steps button, [role='navigation'] a, [role='navigation'] button"
    );

  candidates.forEach((element) => {
    const text =
      element.textContent
        ?.replace(/\s+/g, " ")
        .trim() || "";

    if (!text) return;

    const match = NAV_TEXT_ROUTES.find((route) =>
      route.words.some(
        (word) =>
          text === word ||
          text.includes(word)
      )
    );

    if (!match) return;

    /*
      لا نستبدل رابطًا صحيحًا موجودًا مسبقًا.
    */
    if (
      element.tagName === "A" &&
      element.getAttribute("href") &&
      element.getAttribute("href") !== "#"
    ) {
      return;
    }

    element.style.cursor = "pointer";

    element.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = match.page;
    });
  });
}

enableTopNavigation();

/* =========================================================
   DATAHUB
========================================================= */

async function callDataHub(session) {
  const response = await fetch("/api/datahub", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      session
    })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "لم يتمكن النظام من قراءة استجابة DataHub."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      "تعذر استرجاع أدلة المنهج من DataHub."
    );
  }

  console.log(
    "ZAHRAA DataHub evidence:",
    data
  );

  return data;
}

async function getEvidenceForSession(session) {
  /*
    إذا تم حفظ evidence سابقًا،
    نستخدمه بدل تنفيذ استعلام جديد.
  */
  if (
    session?.datahubEvidence &&
    Array.isArray(session.datahubEvidence.evidence)
  ) {
    return session.datahubEvidence;
  }

  const result = await callDataHub(session);

  session.datahubEvidence = result;

  session.datahubConnected =
    result?.connected === true;

  session.datahubEvidenceCount =
    Array.isArray(result?.evidence)
      ? result.evidence.length
      : 0;

  session.datahubSearchTerm =
    result?.searchTerm || "";

  session.datahubRetrievedAt =
    new Date().toISOString();

  saveSession(session);

  return result;
}

/* =========================================================
   GEMINI
========================================================= */

async function callGemini(
  task,
  session,
  datahubEvidence = null
) {
  const response = await fetch("/api/gemini", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      task,
      session,
      datahubEvidence
    })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "لم يُرجع محرك الاستدلال استجابة صالحة."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      "تعذر الاتصال بمحرك Gemini."
    );
  }

  console.log(
    "ZAHRAA Gemini response:",
    data
  );

  return data;
}

/* =========================================================
   EXAMPLE DATA
========================================================= */

const EXAMPLE = {
  subject: "الرياضيات",

  gradeLevel:
    "الصف السادس الابتدائي",

  lessonTopic:
    "مقارنة الكسور مختلفة المقامات",

  lessonDuration: "45",

  studentCount: "28",

  studentLevel: "متفاوت",

  learningGoal:
    "أن يقارن الطلاب بين كسرين مختلفي المقامات، وأن يبرروا المقارنة باستخدام تمثيل بصري أو كسور متكافئة.",

  classChallenge:
    "بعض الطلاب يخلطون بين البسط والمقام، وبعضهم يستخدم الضرب التبادلي دون فهم، بينما يستطيع بعض الطلاب الحل لكنهم لا يقدمون تبريرًا واضحًا.",

  availableResources:
    "سبورة وأوراق عمل فقط.",

  additionalConstraints:
    "تجنب عزل المتعثرين وعدم تنفيذ أكثر من انتقال تنظيمي واحد. الأولوية للفهم المفاهيمي ثم التبرير."
};

const fillExampleButton = $("fill-example");

if (fillExampleButton) {
  fillExampleButton.addEventListener("click", () => {
    Object.entries(EXAMPLE).forEach(([key, value]) => {
      const field = $(key);

      if (field) {
        field.value = value;
      }
    });

    if ($("form-message")) {
      $("form-message").className = "success";
      $("form-message").textContent =
        "تمت تعبئة المثال التجريبي.";
    }
  });
}

/* =========================================================
   CONTEXT FORM
   Teacher Context
       ↓
   DataHub
       ↓
   Gemini
========================================================= */

const contextForm = $("context-form");

if (contextForm) {
  contextForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const required = [
        "subject",
        "gradeLevel",
        "lessonTopic",
        "lessonDuration",
        "learningGoal",
        "classChallenge"
      ];

      for (const id of required) {
        const field = $(id);

        if (!field || !field.value.trim()) {
          if ($("form-message")) {
            $("form-message").className = "error";

            $("form-message").textContent =
              "يرجى إكمال الحقول الأساسية.";
          }

          return;
        }
      }

      const button = event.submitter;

      const session = {
        sessionId:
          crypto.randomUUID?.() ||
          String(Date.now()),

        sessionStatus:
          "CONTEXT_SUBMITTED",

        teacherApproval: false
      };

      [
        "subject",
        "gradeLevel",
        "lessonTopic",
        "lessonDuration",
        "studentCount",
        "studentLevel",
        "learningGoal",
        "classChallenge",
        "availableResources",
        "additionalConstraints"
      ].forEach((id) => {
        session[id] =
          $(id)?.value?.trim() || "";
      });

      saveSession(session);

      setLoading(
        button,
        true,
        "جاري تحليل الموقف وربط الأدلة..."
      );

      try {
        /*
          الخطوة 1:
          Curriculum Evidence from DataHub
        */
        const evidence =
          await getEvidenceForSession(session);

        /*
          الخطوة 2:
          Gemini reasons over:
          Teacher Context + DataHub Evidence
        */
        const result =
          await callGemini(
            "adaptive_question",
            session,
            evidence
          );

        const text =
          result?.text || "";

        if (!text) {
          throw new Error(
            "لم يُرجع محرك الاستدلال سؤالًا تكيفيًا."
          );
        }

        session.adaptiveQuestion = text;

        session.sessionStatus =
          "QUESTION_GENERATED";

        saveSession(session);

        /*
          إذا كانت الصفحة تعتمد screens
        */
        const adaptiveScreen =
          $("adaptive-screen");

        if (adaptiveScreen) {
          const extract = (label) => {
            const line = text
              .split("\n")
              .find((item) =>
                item.trim().startsWith(label)
              );

            return line
              ? line
                  .split(":")
                  .slice(1)
                  .join(":")
                  .trim()
              : "";
          };

          safeText(
            "question-type",
            extract("نوع السؤال") ||
              "سؤال تكيفي"
          );

          safeText(
            "question-text",
            extract("السؤال") ||
              text
          );

          safeHTML(
            "question-why",
            "<strong>لماذا نسأل؟</strong> " +
              esc(
                extract("لماذا نسأل") ||
                "لأن الإجابة ستؤثر في القرار التربوي."
              )
          );

          document
            .querySelectorAll(".screen")
            .forEach((screen) =>
              screen.classList.remove("active")
            );

          adaptiveScreen.classList.add("active");

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        }
      } catch (error) {
        console.error(
          "ZAHRAA context workflow:",
          error
        );

        if ($("form-message")) {
          $("form-message").className =
            "error";

          $("form-message").textContent =
            error.message;
        } else {
          alert(error.message);
        }
      } finally {
        setLoading(button, false);
      }
    }
  );
}

/* =========================================================
   ADAPTIVE QUESTION
========================================================= */

const notSureButton = $("not-sure");

if (notSureButton) {
  notSureButton.addEventListener(
    "click",
    () => {
      if ($("adaptive-answer")) {
        $("adaptive-answer").value =
          "لست متأكدًا. أحتاج إلى فحص تشخيصي قصير يساعدني على تحديد المستوى.";
      }
    }
  );
}

const saveAnswerButton = $("save-answer");

if (saveAnswerButton) {
  saveAnswerButton.addEventListener(
    "click",
    async () => {
      const answer =
        $("adaptive-answer")
          ?.value
          ?.trim();

      if (!answer) {
        alert(
          "اكتب إجابة قبل المتابعة."
        );

        return;
      }

      const session = getSession();

      session.adaptiveAnswer =
        answer;

      session.sessionStatus =
        "QUESTION_ANSWERED";

      saveSession(session);

      setLoading(
        saveAnswerButton,
        true,
        "جاري إعداد الملخص..."
      );

      try {
        const evidence =
          await getEvidenceForSession(
            session
          );

        const result =
          await callGemini(
            "context_summary",
            session,
            evidence
          );

        const text =
          result?.text || "";

        if (!text) {
          throw new Error(
            "تعذر إنشاء ملخص الموقف."
          );
        }

        session.contextSummary =
          text;

        session.sessionStatus =
          "SUMMARY_GENERATED";

        saveSession(session);

        safeHTML(
          "summary-content",
          `<div class="generated">${esc(
            text
          )}</div>`
        );

        $("summary-preview")
          ?.classList
          .remove("hidden");
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(
          saveAnswerButton,
          false
        );
      }
    }
  );
}

/* =========================================================
   SUMMARY APPROVAL → ALTERNATIVES
========================================================= */

const approveSummaryButton =
  $("approve-summary");

if (approveSummaryButton) {
  approveSummaryButton.addEventListener(
    "click",
    async () => {
      const session = getSession();

      if (!session.contextSummary) {
        alert(
          "أنشئ الملخص أولًا."
        );

        return;
      }

      setLoading(
        approveSummaryButton,
        true,
        "جاري إنشاء البدائل..."
      );

      try {
        const evidence =
          await getEvidenceForSession(
            session
          );

        const result =
          await callGemini(
            "alternatives",
            session,
            evidence
          );

        const text =
          result?.text || "";

        if (!text) {
          throw new Error(
            "لم يتم إنشاء البدائل التربوية."
          );
        }

        session.alternatives = text;

        session.sessionStatus =
          "ALTERNATIVES_GENERATED";

        saveSession(session);

        /*
          إذا كانت alternatives داخل نفس الصفحة.
        */
        if ($("alternatives-content")) {
          safeHTML(
            "alternatives-content",
            `<div class="generated">${esc(
              text
            )}</div>`
          );
        }

        /*
          المشروع الحالي يستخدم صفحة مستقلة.
        */
        window.location.href =
          "alternatives.html";
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(
          approveSummaryButton,
          false
        );
      }
    }
  );
}

/* =========================================================
   RENDER ALTERNATIVES PAGE
========================================================= */

function renderSavedAlternatives() {
  const session = getSession();

  if (
    !session.alternatives ||
    !$("alternatives-content")
  ) {
    return;
  }

  safeHTML(
    "alternatives-content",
    `<div class="generated">${esc(
      session.alternatives
    )}</div>`
  );
}

renderSavedAlternatives();

/* =========================================================
   TEACHER APPROVAL
========================================================= */

const generatePlanButton =
  $("generate-plan");

if (generatePlanButton) {
  generatePlanButton.addEventListener(
    "click",
    async () => {
      const checkbox =
        $("teacher-approval");

      if (
        checkbox &&
        !checkbox.checked
      ) {
        if ($("approval-message")) {
          $("approval-message").className =
            "error";

          $("approval-message").textContent =
            "لا يمكن إنشاء الخطة قبل موافقة المعلم الصريحة.";
        }

        return;
      }

      const session = getSession();

      session.teacherApproval =
        true;

      session.approvedDecision =
        $("approved-decision")
          ?.value
          ?.trim() ||
        session.approvedDecision ||
        "قرار المعلم";

      session.sessionStatus =
        "DECISION_APPROVED";

      session.teacherApprovedAt =
        new Date().toISOString();

      saveSession(session);

      setLoading(
        generatePlanButton,
        true,
        "جاري إنشاء خطة التنفيذ..."
      );

      try {
        const evidence =
          await getEvidenceForSession(
            session
          );

        const result =
          await callGemini(
            "implementation_plan",
            session,
            evidence
          );

        const text =
          result?.text || "";

        if (!text) {
          throw new Error(
            "تعذر إنشاء خطة التنفيذ."
          );
        }

        session.implementationPlan =
          text;

        session.sessionStatus =
          "PLAN_GENERATED";

        saveSession(session);

        /*
          ننتقل للصفحة النهائية.
        */
        window.location.href =
          "implementation-plan.html";
      } catch (error) {
        if ($("approval-message")) {
          $("approval-message").className =
            "error";

          $("approval-message").textContent =
            error.message;
        } else {
          alert(error.message);
        }
      } finally {
        setLoading(
          generatePlanButton,
          false
        );
      }
    }
  );
}

/* =========================================================
   IMPLEMENTATION PLAN PAGE
========================================================= */

function renderImplementationPlan() {
  const session = getSession();

  if (
    !session.implementationPlan ||
    !$("plan-content")
  ) {
    return;
  }

  safeHTML(
    "plan-content",
    `<div class="generated">${esc(
      session.implementationPlan
    )}</div>`
  );

  $("plan-preview")
    ?.classList
    .remove("hidden");
}

renderImplementationPlan();

/* =========================================================
   PREVENT IMPLEMENTATION WITHOUT APPROVAL
========================================================= */

if (
  window.location.pathname.endsWith(
    "implementation-plan.html"
  )
) {
  const session = getSession();

  if (!session.teacherApproval) {
    console.warn(
      "Implementation blocked: teacher approval missing."
    );
  }
}

/* =========================================================
   PREVIOUS SESSIONS
========================================================= */

const showSessionsButton =
  $("show-sessions");

if (showSessionsButton) {
  showSessionsButton.addEventListener(
    "click",
    showSessions
  );
}

function showSessions() {
  let modal =
    $("sessions-modal");

  if (!modal) {
    modal =
      document.createElement("div");

    modal.id =
      "sessions-modal";

    modal.className =
      "sessions-modal hidden";

    modal.innerHTML = `
      <div class="sessions-overlay"></div>

      <div class="card sessions-box">

        <div class="heading">

          <h2>
            جلساتي السابقة
          </h2>

          <button id="close-sessions">
            إغلاق
          </button>

        </div>

        <div id="sessions-list"></div>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    modal
      .querySelector(
        ".sessions-overlay"
      )
      ?.addEventListener(
        "click",
        () =>
          modal.classList.add(
            "hidden"
          )
      );

    $("close-sessions")
      ?.addEventListener(
        "click",
        () =>
          modal.classList.add(
            "hidden"
          )
      );
  }

  const history = getHistory();

  const list =
    $("sessions-list");

  if (!list) return;

  if (!history.length) {
    list.innerHTML =
      "<p>لا توجد جلسات محفوظة حتى الآن.</p>";
  } else {
    list.innerHTML =
      history
        .map(
          (session) => `
        <div class="session-card">

          <h3>
            ${esc(
              session.lessonTopic ||
              "جلسة تربوية"
            )}
          </h3>

          <p>
            ${esc(
              session.subject || ""
            )}
            —
            ${esc(
              session.gradeLevel || ""
            )}
          </p>

          <div class="actions">

            <button
              class="primary open-session"
              data-id="${esc(
                session.sessionId
              )}">
              فتح
            </button>

            <button
              class="secondary delete-session"
              data-id="${esc(
                session.sessionId
              )}">
              حذف
            </button>

          </div>

        </div>
      `
        )
        .join("");
  }

  list
    .querySelectorAll(
      ".open-session"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const selected =
            history.find(
              (session) =>
                session.sessionId ===
                button.dataset.id
            );

          if (!selected) return;

          localStorage.setItem(
            CURRENT_SESSION_KEY,
            JSON.stringify(selected)
          );

          modal.classList.add(
            "hidden"
          );

          window.location.href =
            "scenario.html";
        }
      );
    });

  list
    .querySelectorAll(
      ".delete-session"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const updated =
            getHistory().filter(
              (session) =>
                session.sessionId !==
                button.dataset.id
            );

          localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(updated)
          );

          showSessions();
        }
      );
    });

  modal.classList.remove(
    "hidden"
  );
}

/* =========================================================
   DEBUG TRACE
========================================================= */

const currentSession = getSession();

console.log(
  "ZAHRAA™ Teacher Decision Lab ready.",
  {
    page: window.location.pathname,
    sessionStatus:
      currentSession.sessionStatus ||
      "NO_SESSION",
    datahubConnected:
      currentSession.datahubConnected ||
      false,
    evidenceCount:
      currentSession.datahubEvidenceCount ||
      0,
    teacherApproval:
      currentSession.teacherApproval ||
      false
  }
);
* =========================================================
   FORCE TOP WORKFLOW NAVIGATION
   Makes the visible workflow labels clickable
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const routes = [
    {
      labels: ["تحليل", "تحليل الموقف"],
      url: "scenario.html"
    },
    {
      labels: ["سؤال تكيفي", "السؤال التكيفي"],
      url: "scenario.html"
    },
    {
      labels: ["ملخص", "الملخص"],
      url: "scenario.html"
    },
    {
      labels: ["بدائل", "البدائل"],
      url: "alternatives.html"
    },
    {
      labels: [
        "مراجعة القرار واعتماده",
        "مراجعة القرار",
        "اعتماد القرار"
      ],
      url: "teacher-approval.html"
    },
    {
      labels: ["خطة التنفيذ", "التنفيذ"],
      url: "implementation-plan.html"
    }
  ];

  const elements = document.querySelectorAll(
    "a, button, span, div, li"
  );

  elements.forEach((element) => {
    const text = (element.textContent || "")
      .replace(/✓/g, "")
      .replace(/●/g, "")
      .replace(/○/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length > 40) return;

    const route = routes.find((item) =>
      item.labels.some(
        (label) =>
          text === label ||
          text === label + "/" ||
          text === "/" + label
      )
    );

    if (!route) return;

    element.style.cursor = "pointer";

    element.setAttribute(
      "title",
      "انتقل إلى " + route.labels[0]
    );

    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      window.location.href = route.url;
    });
  });

  console.log(
    "ZAHRAA workflow navigation activated."
  );
});
