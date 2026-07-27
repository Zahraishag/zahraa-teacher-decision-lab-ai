const screens = document.querySelectorAll(".screen");

/* ========================================
   الانتقال بين الشاشات
======================================== */

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
لأنه يحتاج أولًا إلى الاتصال بـ Gemini.
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

/* ========================================
   إدارة بيانات الجلسة
======================================== */

function getSession() {
  try {
    return JSON.parse(
      localStorage.getItem("zahraaDecisionSession") || "{}"
    );
  } catch (error) {
    console.error("تعذر قراءة بيانات الجلسة:", error);
    return {};
  }
}

function saveSession(session) {
  localStorage.setItem(
    "zahraaDecisionSession",
    JSON.stringify(session)
  );
}

/* ========================================
   حماية النص قبل عرضه داخل الصفحة
======================================== */

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

/* ========================================
   الاتصال بوظيفة Gemini في Vercel
======================================== */

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
    throw new Error("لم يُرجع Gemini محتوى نصيًا.");
  }

  return data.text;
}

/* ========================================
   حالة تحميل الأزرار
======================================== */

function setButtonLoading(button, isLoading, loadingText = "") {
  if (!button) {
    return;
  }

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.originalText || button.textContent;

    button.disabled = false;
  }
}

/* ========================================
   المثال التجريبي
======================================== */

const example = {
  subject: "الرياضيات",

  gradeLevel: "الصف السادس الابتدائي",

  lessonTopic: "مقارنة الكسور مختلفة المقامات",

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

/* زر استخدام المثال التجريبي */

const fillExampleButton =
  document.getElementById("fill-example");

if (fillExampleButton) {
  fillExampleButton.addEventListener("click", () => {
    Object.entries(example).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);

      if (field) {
        field.value = value;
      }
    });

    const message =
      document.getElementById("form-message");

    if (message) {
      message.className = "form-message success";
      message.textContent =
        "تمت تعبئة المثال التجريبي. يمكنكِ تعديله أو الضغط على «حلّل الموقف».";
    }
  });
}

/* ========================================
   إرسال نموذج إدخال الموقف
======================================== */

const contextForm =
  document.getElementById("context-form");

if (contextForm) {
  contextForm.addEventListener("submit", async (event) => {
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
        message: "صفي التحدي أو الموقف الذي يحتاج إلى قرار."
      }
    ];

    const formMessage =
      document.getElementById("form-message");

    const missingField = requiredFields.find(({ id }) => {
      const field = document.getElementById(id);

      return !field || !field.value.trim();
    });

    if (missingField) {
      if (formMessage) {
        formMessage.className = "form-message error";
        formMessage.textContent = missingField.message;
      }

      document
        .getElementById(missingField.id)
        ?.focus();

      return;
    }

    const submitButton =
      event.submitter ||
      contextForm.querySelector('button[type="submit"]');

    const session = {
      sessionId:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : String(Date.now()),

      sessionStatus: "CONTEXT_SUBMITTED",

      teacherApproval: false,

      summaryApproved: false,

      subject:
        document.getElementById("subject")?.value.trim() || "",

      gradeLevel:
        document.getElementById("gradeLevel")?.value.trim() || "",

      lessonTopic:
        document.getElementById("lessonTopic")?.value.trim() || "",

      lessonDuration:
        document.getElementById("lessonDuration")?.value.trim() || "",

      studentCount:
        document.getElementById("studentCount")?.value.trim() || "",

      studentLevel:
        document.getElementById("studentLevel")?.value.trim() || "",

      learningGoal:
        document.getElementById("learningGoal")?.value.trim() || "",

      classChallenge:
        document.getElementById("classChallenge")?.value.trim() || "",

      availableResources:
        document
          .getElementById("availableResources")
          ?.value.trim() || "",

      additionalConstraints:
        document
          .getElementById("additionalConstraints")
          ?.value.trim() || ""
    };

    saveSession(session);

    if (formMessage) {
      formMessage.className = "form-message";
      formMessage.textContent = "";
    }

    setButtonLoading(
      submitButton,
      true,
      "جاري تحليل الموقف..."
    );

    try {
      const generatedQuestion = await callGemini(
        "adaptive_question",
        session
      );

      session.adaptiveQuestion = generatedQuestion;
      session.sessionStatus = "QUESTION_GENERATED";

      saveSession(session);

      displayAdaptiveQuestion(generatedQuestion);

      showScreen("adaptive-screen");
    } catch (error) {
      console.error(error);

      if (formMessage) {
        formMessage.className = "form-message error";
        formMessage.textContent = error.message;
      }
    } finally {
      setButtonLoading(submitButton, false);
    }
  });
}

/* ========================================
   عرض السؤال التكيفي
======================================== */

function displayAdaptiveQuestion(generatedText) {
  const questionCard =
    document.querySelector(".question-card");

  if (!questionCard) {
    return;
  }

  const typeElement =
    questionCard.querySelector(".question-type");

  const titleElement =
    questionCard.querySelector("h3");

  const whyElement =
    questionCard.querySelector(".why");

  const lines = String(generatedText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const typeLine = lines.find((line) =>
    line.startsWith("نوع السؤال")
  );

  const questionLine = lines.find((line) =>
    line.startsWith("السؤال")
  );

  const whyLine = lines.find((line) =>
    line.startsWith("لماذا نسأل")
  );

  const extractAfterColon = (line) => {
    if (!line) {
      return "";
    }

    return line.split(":").slice(1).join(":").trim();
  };

  if (typeElement) {
    typeElement.textContent =
      extractAfterColon(typeLine) || "سؤال تكيفي";
  }

  if (titleElement) {
    titleElement.textContent =
      extractAfterColon(questionLine) ||
      generatedText;
  }

  if (whyElement) {
    whyElement.innerHTML = `
      <strong>لماذا نسأل؟</strong>
      ${
        escapeHtml(extractAfterColon(whyLine)) ||
        "لأن الإجابة ستؤثر في القرار التربوي."
      }
    `;
  }
}

/* ========================================
   إرسال إجابة السؤال التكيفي
======================================== */

const saveAnswerButton =
  document.getElementById("save-answer");

if (saveAnswerButton) {
  saveAnswerButton.addEventListener("click", async () => {
    const answerField =
      document.getElementById("adaptive-answer");

    const answer = answerField?.value.trim() || "";

    if (!answer) {
      alert("اكتبي إجابة موجزة قبل المتابعة.");
      answerField?.focus();
      return;
    }

    const session = getSession();

    session.adaptiveAnswer = answer;
    session.sessionStatus = "QUESTION_ANSWERED";

    saveSession(session);

    setButtonLoading(
      saveAnswerButton,
      true,
      "جاري إعداد الملخص..."
    );

    try {
      const summary = await callGemini(
        "context_summary",
        session
      );

      session.contextSummary = summary;
      session.sessionStatus = "SUMMARY_GENERATED";

      saveSession(session);

      const summaryContent =
        document.getElementById("summary-content");

      if (summaryContent) {
        summaryContent.innerHTML = `
          <div class="generated-content">
            ${textToHtml(summary)}
          </div>
        `;
      }

      const summaryPreview =
        document.getElementById("summary-preview");

      summaryPreview?.classList.remove("hidden");

      summaryPreview?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setButtonLoading(saveAnswerButton, false);
    }
  });
}

/* زر لست متأكدًا */

const notSureButton =
  document.getElementById("not-sure");

if (notSureButton) {
  notSureButton.addEventListener("click", () => {
    const answerField =
      document.getElementById("adaptive-answer");

    if (answerField) {
      answerField.value =
        "لست متأكدًا. أحتاج إلى سؤال أو فحص تشخيصي قصير يساعدني على تحديد مستوى الطلاب.";
    }
  });
}

/* ========================================
   الموافقة على الملخص وإنشاء البدائل
======================================== */

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
        alert("يجب إنشاء ملخص السياق أولًا.");
        return;
      }

      session.summaryApproved = true;
      session.sessionStatus = "SUMMARY_APPROVED";

      saveSession(session);

      setButtonLoading(
        approveSummaryButton,
        true,
        "جاري إنشاء البدائل..."
      );

      try {
        const alternatives = await callGemini(
          "alternatives",
          session
        );

        session.alternatives = alternatives;
        session.sessionStatus =
          "ALTERNATIVES_GENERATED";

        saveSession(session);

        const alternativesGrid =
          document.querySelector(".alternatives-grid");

        if (alternativesGrid) {
          alternativesGrid.innerHTML = `
            <article class="card alternative generated-alternatives">
              <span class="alternative-number">
                البدائل الناتجة من Gemini
              </span>

              <div class="generated-content">
                ${textToHtml(alternatives)}
              </div>
            </article>
          `;
        }

        const recommendationText =
          document.querySelector(".recommendation p");

        if (recommendationText) {
          recommendationText.textContent =
            "راجعي البدائل الناتجة قبل الانتقال إلى القرار. ستُضاف المقارنة التفصيلية والترشيح المشروط في المرحلة التالية.";
        }

        showScreen("alternatives-screen");
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

/* ========================================
   موافقة المعلم وإنشاء خطة التنفيذ
======================================== */

const generatePlanButton =
  document.getElementById("generate-plan");

if (generatePlanButton) {
  generatePlanButton.addEventListener(
    "click",
    async () => {
      const approvalCheckbox =
        document.getElementById("teacher-approval");

      const approvalMessage =
        document.getElementById("approval-message");

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

      session.sessionStatus = "DECISION_APPROVED";

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
        const plan = await callGemini(
          "implementation_plan",
          session
        );

        session.implementationPlan = plan;
        session.sessionStatus = "PLAN_GENERATED";

        saveSession(session);

        const planPreview =
          document.getElementById("plan-preview");

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

          planPreview.classList.remove("hidden");

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
