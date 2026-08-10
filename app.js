const CURRENT = "zahraaDecisionSession";
const HISTORY = "zahraaDecisionSessionsHistory";

const $ = (id) => document.getElementById(id);

function show(id) {
  document
    .querySelectorAll(".screen")
    .forEach((screen) =>
      screen.classList.remove("active")
    );

  $(id)?.classList.add("active");

  scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   التنقل
========================================================= */

document
  .querySelectorAll("[data-go]")
  .forEach((button) => {
    button.onclick = () => {
      if (
        button.dataset.go ===
        "approval-screen"
      ) {
        const decision =
          $("approved-decision")?.value ||
          "غير محدد";

        if ($("decision-heading")) {
          $("decision-heading").textContent =
            "القرار المقترح: " + decision;
        }
      }

      show(button.dataset.go);
    };
  });


/* =========================================================
   التخزين
========================================================= */

function getSession() {
  try {
    return JSON.parse(
      localStorage.getItem(CURRENT) ||
        "{}"
    );
  } catch {
    return {};
  }
}


function getHistory() {
  try {
    return JSON.parse(
      localStorage.getItem(HISTORY) ||
        "[]"
    );
  } catch {
    return [];
  }
}


function saveSession(session) {
  localStorage.setItem(
    CURRENT,
    JSON.stringify(session)
  );

  if (!session.sessionId) return;

  const history = getHistory();

  const index = history.findIndex(
    (item) =>
      item.sessionId ===
      session.sessionId
  );

  const value = {
    ...session,
    updatedAt:
      new Date().toISOString()
  };

  if (index >= 0) {
    history[index] = value;
  } else {
    history.unshift(value);
  }

  localStorage.setItem(
    HISTORY,
    JSON.stringify(
      history.slice(0, 20)
    )
  );
}


/* =========================================================
   أدوات مساعدة
========================================================= */

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function loading(
  button,
  on,
  text
) {
  if (!button) return;

  if (on) {
    button.dataset.old =
      button.textContent;

    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.old ||
      button.textContent;

    button.disabled = false;
  }
}


/* =========================================================
   DataHub
========================================================= */

async function callDataHub(session) {
  const response = await fetch(
    "/api/datahub",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        session
      })
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "لم يُرجع DataHub استجابة صحيحة."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "تعذر استرجاع أدلة المنهج من DataHub."
    );
  }

  console.log(
    "DataHub response:",
    data
  );

  return data;
}


/* =========================================================
   Gemini
========================================================= */

async function callGemini(
  task,
  session,
  datahubEvidence = null
) {
  const response = await fetch(
    "/api/gemini",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        task,
        session,
        datahubEvidence
      })
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "لم يُرجع الخادم استجابة صحيحة."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "تعذر الاتصال بمحرك Gemini."
    );
  }

  console.log(
    "Gemini response:",
    data
  );

  if (data?.grounding) {
    console.log(
      "Gemini grounding:",
      data.grounding
    );
  }

  return data.text;
}


/* =========================================================
   الحصول على Evidence للجلسة
========================================================= */

async function getEvidenceForSession(
  session
) {
  /*
   * إذا كانت الأدلة محفوظة مسبقًا
   * في نفس الجلسة نعيد استخدامها.
   */

  if (
    session.datahubEvidence &&
    Array.isArray(
      session.datahubEvidence.evidence
    )
  ) {
    return session.datahubEvidence;
  }

  /*
   * وإلا نسترجع الأدلة من DataHub.
   */

  const datahubResult =
    await callDataHub(session);

  session.datahubEvidence =
    datahubResult;

  session.datahubEvidenceCount =
    Array.isArray(
      datahubResult?.evidence
    )
      ? datahubResult.evidence.length
      : 0;

  session.datahubSearchTerm =
    datahubResult?.searchTerm || "";

  session.datahubConnected =
    datahubResult?.connected === true;

  saveSession(session);

  return datahubResult;
}


/* =========================================================
   المثال التجريبي
========================================================= */

const example = {
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


$("fill-example").onclick = () => {
  Object.entries(example)
    .forEach(([key, value]) => {
      if ($(key)) {
        $(key).value = value;
      }
    });

  $("form-message").className =
    "success";

  $("form-message").textContent =
    "تمت تعبئة المثال التجريبي.";
};


/* =========================================================
   المرحلة 1
   Context → DataHub → Gemini Adaptive Question
========================================================= */

$("context-form").onsubmit =
  async (event) => {
    event.preventDefault();

    const requiredFields = [
      "subject",
      "gradeLevel",
      "lessonTopic",
      "lessonDuration",
      "learningGoal",
      "classChallenge"
    ];

    for (
      const id of requiredFields
    ) {
      if (!$(id).value.trim()) {
        $("form-message").className =
          "error";

        $("form-message").textContent =
          "يرجى إكمال الحقول الأساسية.";

        return;
      }
    }

    const button =
      event.submitter;

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
        $(id)?.value.trim() || "";
    });

    saveSession(session);

    loading(
      button,
      true,
      "جاري استرجاع الأدلة وتحليل الموقف..."
    );

    try {
      /*
       * الخطوة الأساسية:
       *
       * Teacher Context
       * ↓
       * DataHub
       * ↓
       * Curriculum Evidence
       */

      const datahubEvidence =
        await getEvidenceForSession(
          session
        );

      console.log(
        "Evidence retrieved before Gemini:",
        datahubEvidence
      );

      /*
       * DataHub Evidence
       * ↓
       * Gemini reasoning
       */

      const text =
        await callGemini(
          "adaptive_question",
          session,
          datahubEvidence
        );

      session.adaptiveQuestion =
        text;

      session.sessionStatus =
        "QUESTION_GENERATED";

      saveSession(session);

      const getLine = (label) => {
        const line = text
          .split("\n")
          .find((item) =>
            item
              .trim()
              .startsWith(label)
          );

        return line
          ? line
              .split(":")
              .slice(1)
              .join(":")
              .trim()
          : "";
      };

      $("question-type").textContent =
        getLine("نوع السؤال") ||
        "سؤال تكيفي";

      $("question-text").textContent =
        getLine("السؤال") ||
        text;

      $("question-why").innerHTML =
        "<strong>لماذا نسأل؟</strong> " +
        esc(
          getLine("لماذا نسأل") ||
            "لأن الإجابة ستؤثر في القرار."
        );

      show("adaptive-screen");
    } catch (error) {
      console.error(
        "Context analysis error:",
        error
      );

      $("form-message").className =
        "error";

      $("form-message").textContent =
        error.message;
    } finally {
      loading(
        button,
        false
      );
    }
  };


/* =========================================================
   المرحلة 2
   السؤال التكيفي
========================================================= */

$("not-sure").onclick = () => {
  $("adaptive-answer").value =
    "لست متأكدًا. أحتاج إلى فحص تشخيصي قصير يساعدني على تحديد المستوى.";
};


$("save-answer").onclick =
  async () => {
    const answer =
      $("adaptive-answer")
        .value.trim();

    if (!answer) {
      return alert(
        "اكتب إجابة قبل المتابعة."
      );
    }

    const button =
      $("save-answer");

    const session =
      getSession();

    session.adaptiveAnswer =
      answer;

    session.sessionStatus =
      "QUESTION_ANSWERED";

    saveSession(session);

    loading(
      button,
      true,
      "جاري إعداد الملخص..."
    );

    try {
      const evidence =
        await getEvidenceForSession(
          session
        );

      const text =
        await callGemini(
          "context_summary",
          session,
          evidence
        );

      session.contextSummary =
        text;

      session.sessionStatus =
        "SUMMARY_GENERATED";

      saveSession(session);

      $("summary-content").innerHTML =
        '<div class="generated">' +
        esc(text) +
        "</div>";

      $("summary-preview")
        .classList.remove("hidden");

    } catch (error) {
      alert(error.message);
    } finally {
      loading(
        button,
        false
      );
    }
  };


/* =========================================================
   المرحلة 3
   DataHub Evidence → Alternatives
========================================================= */

$("approve-summary").onclick =
  async () => {
    const button =
      $("approve-summary");

    const session =
      getSession();

    if (!session.contextSummary) {
      return alert(
        "أنشئ الملخص أولًا."
      );
    }

    loading(
      button,
      true,
      "جاري إنشاء البدائل..."
    );

    try {
      const evidence =
        await getEvidenceForSession(
          session
        );

      const text =
        await callGemini(
          "alternatives",
          session,
          evidence
        );

      session.alternatives =
        text;

      session.sessionStatus =
        "ALTERNATIVES_GENERATED";

      saveSession(session);

      $("alternatives-content")
        .innerHTML =
          '<div class="generated">' +
          esc(text) +
          "</div>";

      show(
        "alternatives-screen"
      );

    } catch (error) {
      alert(error.message);
    } finally {
      loading(
        button,
        false
      );
    }
  };


/* =========================================================
   المرحلة 4
   Teacher Approval → Implementation
========================================================= */

$("generate-plan").onclick =
  async () => {
    if (
      !$("teacher-approval").checked
    ) {
      $("approval-message")
        .className = "error";

      $("approval-message")
        .textContent =
          "لا يمكن إنشاء الخطة قبل الموافقة.";

      return;
    }

    const button =
      $("generate-plan");

    const session =
      getSession();

    session.teacherApproval =
      true;

    session.approvedDecision =
      $("approved-decision")
        .value.trim() ||
      "قرار المعلم";

    session.sessionStatus =
      "DECISION_APPROVED";

    saveSession(session);

    loading(
      button,
      true,
      "جاري إنشاء الخطة..."
    );

    try {
      const evidence =
        await getEvidenceForSession(
          session
        );

      const text =
        await callGemini(
          "implementation_plan",
          session,
          evidence
        );

      session.implementationPlan =
        text;

      session.sessionStatus =
        "PLAN_GENERATED";

      saveSession(session);

      $("plan-content").innerHTML =
        '<div class="generated">' +
        esc(text) +
        "</div>";

      $("plan-preview")
        .classList.remove("hidden");

      $("approval-message")
        .className = "success";

      $("approval-message")
        .textContent =
          "تم إنشاء الخطة بنجاح.";

    } catch (error) {
      $("approval-message")
        .className = "error";

      $("approval-message")
        .textContent =
          error.message;
    } finally {
      loading(
        button,
        false
      );
    }
  };


/* =========================================================
   الجلسات السابقة
========================================================= */

$("show-sessions").onclick =
  () => showSessions();


function showSessions() {
  let modal =
    $("sessions-modal");

  if (!modal) {
    modal =
      document.createElement(
        "div"
      );

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
      .onclick = () =>
        modal.classList.add(
          "hidden"
        );

    $("close-sessions")
      .onclick = () =>
        modal.classList.add(
          "hidden"
        );
  }

  const history =
    getHistory();

  const list =
    $("sessions-list");

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
                  "جلسة"
              )}
            </h3>

            <p>
              ${esc(
                session.subject ||
                  ""
              )}

              —

              ${esc(
                session.gradeLevel ||
                  ""
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
      button.onclick = () => {
        const session =
          history.find(
            (item) =>
              item.sessionId ===
              button.dataset.id
          );

        if (!session) return;

        localStorage.setItem(
          CURRENT,
          JSON.stringify(session)
        );

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
          if ($(id)) {
            $(id).value =
              session[id] || "";
          }
        });

        modal.classList.add(
          "hidden"
        );

        show("context-screen");
      };
    });

  list
    .querySelectorAll(
      ".delete-session"
    )
    .forEach((button) => {
      button.onclick = () => {
        const updated =
          getHistory().filter(
            (item) =>
              item.sessionId !==
              button.dataset.id
          );

        localStorage.setItem(
          HISTORY,
          JSON.stringify(updated)
        );

        showSessions();
      };
    });

  modal.classList.remove(
    "hidden"
  );
}
