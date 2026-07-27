/* =========================================================
   ZAHRAA™ Teacher Decision Lab
   app.js
========================================================= */

const CURRENT_SESSION_KEY = "zahraaDecisionSession";
const SESSIONS_HISTORY_KEY = "zahraaDecisionSessionsHistory";

const screens = document.querySelectorAll(".screen");

/* =========================================================
   الانتقال بين الشاشات
========================================================= */

function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  const targetScreen = document.getElementById(screenId);

  if (targetScreen) {
    targetScreen.classList.add("active");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
}

/*
نستثني زر الانتقال إلى البدائل؛
لأنه يجب أن يولّد البدائل أولًا عبر Gemini.
*/
document.querySelectorAll("[data-go]").forEach((button) => {
  const target = button.dataset.go;

  if (target === "alternatives-screen") {
    return;
  }

  button.addEventListener("click", () => {
    showScreen(target);
  });
});

/* =========================================================
   إدارة الجلسة الحالية
========================================================= */

function getSession() {
  try {
    return JSON.parse(
      localStorage.getItem(CURRENT_SESSION_KEY) || "{}"
    );
  } catch (error) {
    console.error("تعذر قراءة الجلسة الحالية:", error);
    return {};
  }
}

function saveSession(session) {
  localStorage.setItem(
    CURRENT_SESSION_KEY,
    JSON.stringify(session)
  );

  saveSessionToHistory(session);
}

/* =========================================================
   سجل الجلسات السابقة
========================================================= */

function getSessionsHistory() {
  try {
    const savedHistory =
      localStorage.getItem(SESSIONS_HISTORY_KEY);

    return savedHistory
      ? JSON.parse(savedHistory)
      : [];
  } catch (error) {
    console.error("تعذر قراءة سجل الجلسات:", error);
    return [];
  }
}

function saveSessionToHistory(session) {
  if (!session || !session.sessionId) {
    return;
  }

  const history = getSessionsHistory();

  const existingIndex = history.findIndex(
    (item) => item.sessionId === session.sessionId
  );

  const savedSession = {
    ...session,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    history[existingIndex] = savedSession;
  } else {
    history.unshift(savedSession);
  }

  /*
  نحتفظ بآخر 20 جلسة فقط داخل المتصفح.
  */
  const limitedHistory = history.slice(0, 20);

  localStorage.setItem(
    SESSIONS_HISTORY_KEY,
    JSON.stringify(limitedHistory)
  );
}

function loadSavedSession(sessionId) {
  const history = getSessionsHistory();

  const selectedSession = history.find(
    (item) => item.sessionId === sessionId
  );

  if (!selectedSession) {
    alert("تعذر العثور على هذه الجلسة.");
    return;
  }

  localStorage.setItem(
    CURRENT_SESSION_KEY,
    JSON.stringify(selectedSession)
  );

  restoreSessionFields(selectedSession);

  showScreen("context-screen");
}

function deleteSavedSession(sessionId) {
  const confirmed = confirm(
    "هل تريدين حذف هذه الجلسة المحفوظة؟"
  );

  if (!confirmed) {
    return;
  }

  const history = getSessionsHistory().filter(
    (item) => item.sessionId !== sessionId
  );

  localStorage.setItem(
    SESSIONS_HISTORY_KEY,
    JSON.stringify(history)
  );

  showSessionsModal();
}

function restoreSessionFields(session) {
  const fieldIds = [
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
  ];

  fieldIds.forEach((fieldId) => {
    const field = document.getElementById(fieldId);

    if (field && session[fieldId] !== undefined) {
      field.value = session[fieldId] || "";
    }
  });

  const formMessage =
    document.getElementById("form-message");

  if (formMessage) {
    formMessage.className = "form-message success";
    formMessage.textContent =
      "تم فتح الجلسة السابقة. يمكنكِ تعديلها أو إعادة تحليلها.";
  }
}

/* =========================================================
   نافذة عرض الجلسات السابقة
========================================================= */

function createSessionsModal() {
  let modal = document.getElementById(
    "sessions-history-modal"
  );

  if (modal) {
    return modal;
  }

  modal = document.createElement("div");

  modal.id = "sessions-history-modal";
  modal.className = "sessions-modal hidden";

  modal.innerHTML = `
    <div class="sessions-modal-overlay"></div>

    <div class="sessions-modal-content card">
      <div class="sessions-modal-header">
        <div>
          <span class="eyebrow">السجل المحلي</span>
          <h2>جلساتي السابقة</h2>
        </div>

        <button
          type="button"
          id="close-sessions-modal"
          class="text-button"
        >
          إغلاق
        </button>
      </div>

      <div id="sessions-history-list"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector("#close-sessions-modal")
    ?.addEventListener("click", closeSessionsModal);

  modal
    .querySelector(".sessions-modal-overlay")
    ?.addEventListener("click", closeSessionsModal);

  return modal;
}

function closeSessionsModal() {
  document
    .getElementById("sessions-history-modal")
    ?.classList.add("hidden");
}

function showSessionsModal() {
  const modal = createSessionsModal();
  const list = modal.querySelector(
    "#sessions-history-list"
  );

  const history = getSessionsHistory();

  if (!history.length) {
    list.innerHTML = `
      <div class="empty-sessions">
        <h3>لا توجد جلسات محفوظة حتى الآن</h3>
        <p>
          ابدئي تحليل موقف تعليمي جديد، وسيُحفظ تلقائيًا
          في هذا المتصفح.
        </p>
      </div>
    `;
  } else {
    list.innerHTML = history
      .map((session) => {
        const updatedDate = session.updatedAt
          ? new Date(session.updatedAt).toLocaleString(
              "ar-SA"
            )
          : "غير محدد";

        return `
          <article class="saved-session-card">
            <div class="saved-session-info">
              <h3>
                ${escapeHtml(
                  session.lessonTopic || "جلسة دون عنوان"
                )}
              </h3>

              <p>
                <strong>المادة:</strong>
                ${escapeHtml(
                  session.subject || "غير محدد"
                )}
              </p>

              <p>
                <strong>الصف:</strong>
                ${escapeHtml(
                  session.gradeLevel || "غير محدد"
                )}
              </p>

              <p>
                <strong>حالة الجلسة:</strong>
                ${escapeHtml(
                  translateSessionStatus(
                    session.sessionStatus
                  )
                )}
              </p>

              <p class="session-date">
                آخر تحديث: ${escapeHtml(updatedDate)}
              </p>
            </div>

            <div class="saved-session-actions">
              <button
                type="button"
                class="primary open-saved-session"
                data-session-id="${escapeHtml(
                  session.sessionId
                )}"
              >
                فتح الجلسة
              </button>

              <button
                type="button"
                class="secondary delete-saved-session"
                data-session-id="${escapeHtml(
                  session.sessionId
                )}"
              >
                حذف
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    list
      .querySelectorAll(".open-saved-session")
      .forEach((button) => {
        button.addEventListener("click", () => {
          closeSessionsModal();

          loadSavedSession(
            button.dataset.sessionId
          );
        });
      });

    list
      .querySelectorAll(".delete-saved-session")
      .forEach((button) => {
        button.addEventListener("click", () => {
          deleteSavedSession(
            button.dataset.sessionId
          );
        });
      });
  }

  modal.classList.remove("hidden");
}

function translateSessionStatus(status) {
  const statuses = {
    CONTEXT_SUBMITTED: "تم إدخال السياق",
    QUESTION_GENERATED: "تم إنشاء سؤال تكيفي",
    QUESTION_ANSWERED: "تمت إجابة السؤال",
    SUMMARY_GENERATED: "تم إنشاء الملخص",
    SUMMARY_APPROVED: "تم اعتماد الملخص",
    ALTERNATIVES_GENERATED: "تم إنشاء البدائل",
    DECISION_APPROVED: "تمت الموافقة على القرار",
    PLAN_GENERATED: "تم إنشاء خطة التنفيذ"
  };

  return statuses[status] || status || "غير محدد";
}

/* =========================================================
   حماية النص قبل عرضه داخل الصفحة
========================================================= */

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(value = "") {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

/* =========================================================
   الاتصال بوظيفة Gemini في Vercel
========================================================= */

async function callGemini(task, session) {
  const response = await fetch("/api/gemini", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      task,
      session
    })
  });

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error(
      "لم يُرجع الخادم استجابة صحيحة. تحققي من نشر ملف api/gemini.js."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || "تعذر الاتصال بمحرك Gemini."
    );
  }

  if (!data.text) {
    throw new Error(
      "لم يُرجع Gemini محتوى نصيًا."
    );
  }

  return data.text;
}

/* =========================================================
   حالة تحميل الأزرار
========================================================= */

function setButtonLoading(
  button,
  isLoading,
  loadingText = ""
) {
  if (!button) {
    return;
  }

  if (isLoading) {
    button.dataset.originalText =
      button.textContent;

    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.originalText ||
      button.textContent;

    button.disabled = false;
  }
}

/* =========================================================
   المثال التجريبي
========================================================= */

const example = {
  subject: "الرياضيات",

  gradeLevel: "الصف السادس الابتدائي",

  lessonTopic:
    "مقارنة الكسور مختلفة المقامات",

  lessonDuration: "45",

  studentCount: "28",

  studentLevel: "متفاوت",

  learningGoal:
    "أن يقارن الطلاب بين كسرين مختلفي المقامات، وأن يبرروا المقارنة باستخدام تمثيل بصري أو كسور متكافئة، مع استخدام مفردات البسط والمقام بصورة صحيحة.",

  classChallenge:
    "بعض الطلاب يخلطون بين البسط والمقام، وبعضهم يستخدم الضرب التبادلي دون فهم، بينما يستطيع بعض الطلاب إيجاد الإجابة الصحيحة لكنهم لا يقدمون تبريرًا رياضيًا واضحًا. أحتاج إلى اختيار مدخل تدريسي يناسب تفاوت المستويات ويحقق الفهم المفاهيمي خلال زمن الحصة.",

  availableResources:
    "سبورة، وأقلام سبورة، وأوراق عمل مطبوعة فقط.",

  additionalConstraints:
    "أريد تجنب عزل الطلاب المتعثرين أو وصمهم، ولا أريد أكثر من انتقال تنظيمي واحد داخل الحصة. أفضل البدء بمناقشة جماعية قصيرة، ثم عمل فردي داخل ورقة موحدة، يعقبه تحقق ثنائي مع زميل قريب. الأولوية الأولى هي بناء الفهم المفاهيمي، ثم تحسين التبرير الرياضي، ثم التمهيد للكسور المتكافئة."
};

/* =========================================================
   زر استخدام المثال التجريبي
========================================================= */

const fillExampleButton =
  document.getElementById("fill-example");

if (fillExampleButton) {
  fillExampleButton.addEventListener(
    "click",
    () => {
      Object.entries(example).forEach(
        ([fieldId, value]) => {
          const field =
            document.getElementById(fieldId);

          if (field) {
            field.value = value;
          }
        }
      );

      const message =
        document.getElementById(
          "form-message"
        );

      if (message) {
        message.className =
          "form-message success";

        message.textContent =
          "تمت تعبئة المثال التجريبي. يمكنكِ تعديله أو الضغط على «حلّل الموقف».";
      }
    }
  );
}

/* =========================================================
   زر عرض الجلسات السابقة
========================================================= */

const showSessionsButton =
  document.getElementById("show-sessions");

if (showSessionsButton) {
  showSessionsButton.addEventListener(
    "click",
    () => {
      showSessionsModal();
    }
  );
}

/* =========================================================
   إرسال نموذج إدخال الموقف
========================================================= */

const contextForm =
  document.getElementById("context-form");

if (contextForm) {
  contextForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const requiredFields = [
        {
          id: "subject",
          message: "أدخلي المادة."
        },
        {
          id: "gradeLevel",
          message: "أدخلي الصف أو المرحلة."
        },
        {
          id: "lessonTopic",
          message: "أدخلي موضوع الدرس."
        },
        {
          id: "lessonDuration",
          message: "أدخلي مدة الحصة."
        },
        {
          id: "learningGoal",
          message: "أدخلي الهدف التعليمي."
        },
        {
          id: "classChallenge",
          message:
            "صفي التحدي أو الموقف الذي يحتاج إلى قرار."
        }
      ];

      const formMessage =
        document.getElementById(
          "form-message"
        );

      const missingField =
        requiredFields.find(({ id }) => {
          const field =
            document.getElementById(id);

          return (
            !field ||
            !field.value.trim()
          );
        });

      if (missingField) {
        if (formMessage) {
          formMessage.className =
            "form-message error";

          formMessage.textContent =
            missingField.message;
        }

        document
          .getElementById(
            missingField.id
          )
          ?.focus();

        return;
      }

      const submitButton =
        event.submitter ||
        contextForm.querySelector(
          'button[type="submit"]'
        );

      const session = {
        sessionId:
          typeof crypto.randomUUID ===
          "function"
            ? crypto.randomUUID()
            : String(Date.now()),

        sessionStatus:
          "CONTEXT_SUBMITTED",

        createdAt:
          new Date().toISOString(),

        teacherApproval: false,

        summaryApproved: false,

        subject:
          document
            .getElementById("subject")
            ?.value.trim() || "",

        gradeLevel:
          document
            .getElementById(
              "gradeLevel"
            )
            ?.value.trim() || "",

        lessonTopic:
          document
            .getElementById(
              "lessonTopic"
            )
            ?.value.trim() || "",

        lessonDuration:
          document
            .getElementById(
              "lessonDuration"
            )
            ?.value.trim() || "",

        studentCount:
          document
            .getElementById(
              "studentCount"
            )
            ?.value.trim() || "",

        studentLevel:
          document
            .getElementById(
              "studentLevel"
            )
            ?.value.trim() || "",

        learningGoal:
          document
            .getElementById(
              "learningGoal"
            )
            ?.value.trim() || "",

        classChallenge:
          document
            .getElementById(
              "classChallenge"
            )
            ?.value.trim() || "",

        availableResources:
          document
            .getElementById(
              "availableResources"
            )
            ?.value.trim() || "",

        additionalConstraints:
          document
            .getElementById(
              "additionalConstraints"
            )
            ?.value.trim() || ""
      };

      saveSession(session);

      if (formMessage) {
        formMessage.className =
          "form-message";

        formMessage.textContent = "";
      }

      setButtonLoading(
        submitButton,
        true,
        "جاري تحليل الموقف..."
      );

      try {
        const generatedQuestion =
          await callGemini(
            "adaptive_question",
            session
          );

        session.adaptiveQuestion =
          generatedQuestion;

        session.sessionStatus =
          "QUESTION_GENERATED";

        saveSession(session);

        displayAdaptiveQuestion(
          generatedQuestion
        );

        showScreen("adaptive-screen");
      } catch (error) {
        console.error(error);

        if (formMessage) {
          formMessage.className =
            "form-message error";

          formMessage.textContent =
            error.message;
        }
      } finally {
        setButtonLoading(
          submitButton,
          false
        );
      }
    }
  );
}

/* =========================================================
   عرض السؤال التكيفي
========================================================= */

function displayAdaptiveQuestion(
  generatedText
) {
  const questionCard =
    document.querySelector(
      ".question-card"
    );

  if (!questionCard) {
    return;
  }

  const typeElement =
    questionCard.querySelector(
      ".question-type"
    );

  const titleElement =
    questionCard.querySelector("h3");

  const whyElement =
    questionCard.querySelector(".why");

  const lines = String(generatedText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const typeLine = lines.find(
    (line) =>
      line.startsWith("نوع السؤال")
  );

  const questionLine = lines.find(
    (line) =>
      line.startsWith("السؤال")
  );

  const whyLine = lines.find(
    (line) =>
      line.startsWith("لماذا نسأل")
  );

  const extractAfterColon = (line) => {
    if (!line) {
      return "";
    }

    return line
      .split(":")
      .slice(1)
      .join(":")
      .trim();
  };

  if (typeElement) {
    typeElement.textContent =
      extractAfterColon(typeLine) ||
      "سؤال تكيفي";
  }

  if (titleElement) {
    titleElement.textContent =
      extractAfterColon(
        questionLine
      ) || generatedText;
  }

  if (whyElement) {
    whyElement.innerHTML = `
      <strong>لماذا نسأل؟</strong>
      ${
        escapeHtml(
          extractAfterColon(whyLine)
        ) ||
        "لأن الإجابة ستؤثر في القرار التربوي."
      }
    `;
  }
}

/* =========================================================
   إرسال إجابة السؤال التكيفي
========================================================= */

const saveAnswerButton =
  document.getElementById(
    "save-answer"
  );

if (saveAnswerButton) {
  saveAnswerButton.addEventListener(
    "click",
    async () => {
      const answerField =
        document.getElementById(
          "adaptive-answer"
        );

      const answer =
        answerField?.value.trim() || "";

      if (!answer) {
        alert(
          "اكتبي إجابة موجزة قبل المتابعة."
        );

        answerField?.focus();
        return;
      }

      const session = getSession();

      session.adaptiveAnswer =
        answer;

      session.sessionStatus =
        "QUESTION_ANSWERED";

      saveSession(session);

      setButtonLoading(
        saveAnswerButton,
        true,
        "جاري إعداد الملخص..."
      );

      try {
        const summary =
          await callGemini(
            "context_summary",
            session
          );

        session.contextSummary =
          summary;

        session.sessionStatus =
          "SUMMARY_GENERATED";

        saveSession(session);

        const summaryContent =
          document.getElementById(
            "summary-content"
          );

        if (summaryContent) {
          summaryContent.innerHTML = `
            <div class="generated-content">
              ${textToHtml(summary)}
            </div>
          `;
        }

        const summaryPreview =
          document.getElementById(
            "summary-preview"
          );

        summaryPreview?.classList.remove(
          "hidden"
        );

        summaryPreview?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      } catch (error) {
        console.error(error);
        alert(error.message);
      } finally {
        setButtonLoading(
          saveAnswerButton,
          false
        );
      }
    }
  );
}

/* =========================================================
   زر لست متأكدًا
========================================================= */

const notSureButton =
  document.getElementById("not-sure");

if (notSureButton) {
  notSureButton.addEventListener(
    "click",
    () => {
      const answerField =
        document.getElementById(
          "adaptive-answer"
        );

      if (answerField) {
        answerField.value =
          "لست متأكدًا. أحتاج إلى سؤال أو فحص تشخيصي قصير يساعدني على تحديد مستوى الطلاب.";
      }
    }
  );
}

/* =========================================================
   الموافقة على الملخص وإنشاء البدائل
========================================================= */

const approveSummaryButton =
  document.querySelector(
    '#summary-preview [data-go="alternatives-screen"]'
  );

if (approveSummaryButton) {
  approveSummaryButton.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();

      const session = getSession();

      if (!session.contextSummary) {
        alert(
          "يجب إنشاء ملخص السياق أولًا."
        );

        return;
      }

      session.summaryApproved = true;

      session.sessionStatus =
        "SUMMARY_APPROVED";

      saveSession(session);

      setButtonLoading(
        approveSummaryButton,
        true,
        "جاري إنشاء البدائل..."
      );

      try {
        const alternatives =
          await callGemini(
            "alternatives",
            session
          );

        session.alternatives =
          alternatives;

        session.sessionStatus =
          "ALTERNATIVES_GENERATED";

        saveSession(session);

        const alternativesGrid =
          document.querySelector(
            ".alternatives-grid"
          );

        if (alternativesGrid) {
          alternativesGrid.innerHTML = `
            <article class="card alternative generated-alternatives">
              <span class="alternative-number">
                البدائل الناتجة من Gemini
              </span>

              <div class="generated-content">
                ${textToHtml(
                  alternatives
                )}
              </div>
            </article>
          `;
        }

        const recommendationText =
          document.querySelector(
            ".recommendation p"
          );

        if (recommendationText) {
          recommendationText.textContent =
            "راجعي البدائل الناتجة قبل الانتقال إلى القرار. ستُضاف المقارنة التفصيلية والترشيح المشروط في المرحلة التالية.";
        }

        showScreen(
          "alternatives-screen"
        );
      } catch (error) {
        console.error(error);
        alert(error.message);
      } finally {
        setButtonLoading(
          approveSummaryButton,
          false
        );
      }
    }
  );
}

/* =========================================================
   موافقة المعلم وإنشاء خطة التنفيذ
========================================================= */

const generatePlanButton =
  document.getElementById(
    "generate-plan"
  );

if (generatePlanButton) {
  generatePlanButton.addEventListener(
    "click",
    async () => {
      const approvalCheckbox =
        document.getElementById(
          "teacher-approval"
        );

      const approvalMessage =
        document.getElementById(
          "approval-message"
        );

      if (!approvalCheckbox?.checked) {
        if (approvalMessage) {
          approvalMessage.className =
            "form-message error";

          approvalMessage.textContent =
            "لا يمكن إنشاء الخطة قبل الموافقة الصريحة على القرار.";
        }

        return;
      }

      const session = getSession();

      session.teacherApproval = true;

      session.approvedDecision =
        session.approvedDecision ||
        "المدخل المفاهيمي البصري";

      session.sessionStatus =
        "DECISION_APPROVED";

      saveSession(session);

      if (approvalMessage) {
        approvalMessage.className =
          "form-message success";

        approvalMessage.textContent =
          "تم تسجيل موافقة المعلم. جارٍ إنشاء خطة التنفيذ.";
      }

      setButtonLoading(
        generatePlanButton,
        true,
        "جاري إنشاء الخطة..."
      );

      try {
        const plan =
          await callGemini(
            "implementation_plan",
            session
          );

        session.implementationPlan =
          plan;

        session.sessionStatus =
          "PLAN_GENERATED";

        saveSession(session);

        const planPreview =
          document.getElementById(
            "plan-preview"
          );

        if (planPreview) {
          planPreview.innerHTML = `
            <span class="eyebrow">
              خطة التنفيذ
            </span>

            <h3>
              خطة مبنية على القرار الذي وافق عليه المعلم
            </h3>

            <div class="generated-content">
              ${textToHtml(plan)}
            </div>
          `;

          planPreview.classList.remove(
            "hidden"
          );

          planPreview.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }

        if (approvalMessage) {
          approvalMessage.className =
            "form-message success";

          approvalMessage.textContent =
            "تم إنشاء خطة التنفيذ بنجاح.";
        }
      } catch (error) {
        console.error(error);

        if (approvalMessage) {
          approvalMessage.className =
            "form-message error";

          approvalMessage.textContent =
            error.message;
        }
      } finally {
        setButtonLoading(
          generatePlanButton,
          false
        );
      }
    }
  );
}
