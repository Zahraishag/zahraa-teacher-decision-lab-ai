const screens = document.querySelectorAll(".screen");

function showScreen(id) {
  screens.forEach((screen) => screen.classList.remove("active"));

  const target = document.getElementById(id);

  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.go);
  });
});

function getSession() {
  return JSON.parse(
    localStorage.getItem("zahraaDecisionSession") || "{}"
  );
}

function saveSession(session) {
  localStorage.setItem(
    "zahraaDecisionSession",
    JSON.stringify(session)
  );
}

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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "تعذر الاتصال بمحرك Gemini."
    );
  }

  return data.text;
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;

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

const example = {
  subject: "الرياضيات",
  gradeLevel: "الصف السادس الابتدائي",
  lessonTopic: "مقارنة الكسور مختلفة المقامات",
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
    "تجنب عزل الطلاب المتعثرين أو وصمهم، وعدم تنفيذ أكثر من انتقال تنظيمي واحد داخل الحصة."
};

document
  .getElementById("fill-example")
  ?.addEventListener("click", () => {
    Object.entries(example).forEach(([id, value]) => {
      const field = document.getElementById(id);

      if (field) {
        field.value = value;
      }
    });
  });

document
  .getElementById("context-form")
  ?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const requiredIds = [
      "subject",
      "gradeLevel",
      "lessonTopic",
      "lessonDuration",
      "learningGoal",
      "classChallenge"
    ];

    const missing = requiredIds.filter((id) => {
      const field = document.getElementById(id);
      return !field || !field.value.trim();
    });

    const message = document.getElementById("form-message");
    const submitButton = event.submitter;

    if (missing.length) {
      message.className = "form-message error";
      message.textContent =
        "يرجى إكمال الحقول الأساسية قبل التحليل.";
      return;
    }

    const session = {
      sessionId:
        crypto.randomUUID?.() || String(Date.now()),
      sessionStatus: "CONTEXT_SUBMITTED",
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
      const field = document.getElementById(id);
      session[id] = field?.value.trim() || "";
    });

    saveSession(session);

    message.className = "form-message";
    message.textContent = "";

    setButtonLoading(
      submitButton,
      true,
      "جاري تحليل الموقف..."
    );

    try {
      const question = await callGemini(
        "adaptive_question",
        session
      );

      session.adaptiveQuestion = question;
      session.sessionStatus = "QUESTION_GENERATED";
      saveSession(session);

      const questionCard =
        document.querySelector(".question-card");

      if (questionCard) {
        const typeElement =
          questionCard.querySelector(".question-type");
        const titleElement =
          questionCard.querySelector("h3");
        const whyElement =
          questionCard.querySelector(".why");

        const lines = question
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

        if (typeElement) {
          typeElement.textContent =
            typeLine?.split(":").slice(1).join(":").trim() ||
            "سؤال تكيفي";
        }

        if (titleElement) {
          titleElement.textContent =
            questionLine?.split(":").slice(1).join(":").trim() ||
            question;
        }

        if (whyElement) {
          whyElement.innerHTML = `
            <strong>لماذا نسأل؟</strong>
            ${
              whyLine
                ?.split(":")
                .slice(1)
                .join(":")
                .trim() ||
              "لأن الإجابة ستؤثر في القرار التربوي."
            }
          `;
        }
      }

      showScreen("adaptive-screen");
    } catch (error) {
      message.className = "form-message error";
      message.textContent = error.message;
    } finally {
      setButtonLoading(
        submitButton,
        false,
        "جاري تحليل الموقف..."
      );
    }
  });

document
  .getElementById("save-answer")
  ?.addEventListener("click", async () => {
    const answerField =
      document.getElementById("adaptive-answer");

    const answer = answerField?.value.trim() || "";

    if (!answer) {
      alert("اكتبي إجابة موجزة قبل المتابعة.");
      return;
    }

    const button =
      document.getElementById("save-answer");

    const session = getSession();

    session.adaptiveAnswer = answer;
    session.sessionStatus = "QUESTION_ANSWERED";
    saveSession(session);

    setButtonLoading(
      button,
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

      document
        .getElementById("summary-preview")
        ?.classList.remove("hidden");
    } catch (error) {
      alert(error.message);
    } finally {
      setButtonLoading(
        button,
        false,
        "جاري إعداد الملخص..."
      );
    }
  });

document
  .getElementById("not-sure")
  ?.addEventListener("click", () => {
    const field =
      document.getElementById("adaptive-answer");

    if (field) {
      field.value =
        "لست متأكدًا. أحتاج إلى سؤال أو فحص تشخيصي قصير يساعدني على تحديد المستوى.";
    }
  });

document
  .querySelector(
    '[data-go="alternatives-screen"]'
  )
  ?.addEventListener("click", async (event) => {
    event.preventDefault();

    const button = event.currentTarget;
    const session = getSession();

    session.summaryApproved = true;
    session.sessionStatus = "SUMMARY_APPROVED";
    saveSession(session);

    setButtonLoading(
      button,
      true,
      "جاري إنشاء البدائل..."
    );

    try {
      const alternatives = await callGemini(
        "alternatives",
        session
      );

      session.alternatives = alternatives;
      session.sessionStatus = "ALTERNATIVES_GENERATED";
      saveSession(session);

      const alternativesGrid =
        document.querySelector(".alternatives-grid");

      if (alternativesGrid) {
        alternativesGrid.innerHTML = `
          <article class="card alternative">
            <span class="alternative-number">
              بدائل Gemini
            </span>
            <div class="generated-content">
              ${textToHtml(alternatives)}
            </div>
          </article>
        `;
      }

      const recommendation =
        document.querySelector(".recommendation p");

      if (recommendation) {
        recommendation.textContent =
          "راجع البدائل الناتجة. المقارنة التفصيلية والترشيح المشروط ستضاف في المرحلة التالية.";
      }

      showScreen("alternatives-screen");
    } catch (error) {
      alert(error.message);
    } finally {
      setButtonLoading(
        button,
        false,
        "جاري إنشاء البدائل..."
      );
    }
  });

document
  .getElementById("generate-plan")
  ?.addEventListener("click", async () => {
    const approvalCheckbox =
      document.getElementById("teacher-approval");

    const message =
      document.getElementById("approval-message");

    const button =
      document.getElementById("generate-plan");

    if (!approvalCheckbox?.checked) {
      message.className = "form-message error";
      message.textContent =
        "لا يمكن إنشاء الخطة قبل الموافقة الصريحة على القرار.";
      return;
    }

    const session = getSession();

    session.teacherApproval = true;
    session.approvedDecision =
      "المدخل المفاهيمي البصري";
    session.sessionStatus = "DECISION_APPROVED";
    saveSession(session);

    message.className = "form-message success";
    message.textContent =
      "تم تسجيل موافقة المعلم. جارٍ إنشاء الخطة.";

    setButtonLoading(
      button,
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
          <div class="generated-content">
            ${textToHtml(plan)}
          </div>
        `;

        planPreview.classList.remove("hidden");
      }

      message.textContent =
        "تم إنشاء خطة التنفيذ بنجاح.";
    } catch (error) {
      message.className = "form-message error";
      message.textContent = error.message;
    } finally {
      setButtonLoading(
        button,
        false,
        "جاري إنشاء الخطة..."
      );
    }
  });
