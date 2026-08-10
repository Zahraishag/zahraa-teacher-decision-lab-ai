const MODEL_NAME = "gemini-3.6-flash";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      error: "يجب استخدام طلب POST."
    });
  }

  /*
   * تنظيف مفتاح Gemini:
   * - حذف GEMINI_API_KEY= إن لُصقت مع المفتاح.
   * - حذف علامات الاقتباس.
   * - حذف المسافات والأسطر والرموز الخفية.
   */
  const rawApiKey = String(
    process.env.GEMINI_API_KEY || ""
  );

  const apiKey = rawApiKey
    .replace(/^GEMINI_API_KEY\s*=\s*/i, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F\s]/g, "")
    .trim();

  if (!apiKey) {
    return response.status(500).json({
      error:
        "مفتاح Gemini غير موجود. أضيفي GEMINI_API_KEY في إعدادات Vercel ثم أعيدي النشر."
    });
  }

  /*/*
 * التحقق الأساسي فقط:
 * عملية التنظيف السابقة حذفت المسافات والأسطر وعلامات الاقتباس.
 * لا نفترض صيغة ثابتة لبداية مفتاح Gemini.
 */
if (!apiKey || apiKey.length < 20) {
  return response.status(500).json({
    error:
      "قيمة GEMINI_API_KEY غير موجودة أو غير مكتملة."
  });
}
  try {
    const body =
      typeof request.body === "string"
        ? JSON.parse(request.body)
        : request.body;

    const { task, session, datahubEvidence } = body || {};


    if (!task || !session) {
      return response.status(400).json({
        error: "بيانات المهمة والجلسة مطلوبة."
      });
    }

let evidence = [];

try {
  const protocol =
    request.headers["x-forwarded-proto"] || "https";

  const host =
    request.headers["x-forwarded-host"] ||
    request.headers.host;

  const datahubResponse = await fetch(
    `${protocol}://${host}/api/datahub`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session
      })
    }
  );

  const datahubData = await datahubResponse.json();

  if (
    datahubResponse.ok &&
    datahubData.connected === true &&
    Array.isArray(datahubData.evidence)
  ) {
    evidence = datahubData.evidence;
  }

  console.log(
    "DataHub evidence passed to Gemini:",
    evidence.length
  );
} catch (error) {
  console.error(
    "Unable to retrieve DataHub evidence for Gemini:",
    error
  );
}

const prompt = buildPrompt(task, session, evidence);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],

          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 5000
          }
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error(
        "Gemini API error:",
        JSON.stringify(data)
      );

      return response.status(geminiResponse.status).json({
        error:
          data?.error?.message ||
          "حدث خطأ أثناء الاتصال بخدمة Gemini."
      });
    }

    let text = data?.candidates?.[0]?.content?.parts
  ?.map((part) => part.text || "")
  .join("")
  .trim();

text = text
  .replace(/#{1,6}\s*/g, "")          // إزالة ###
  .replace(/\*\*/g, "")               // إزالة **
  .replace(/\*/g, "")                 // إزالة *
  .replace(/\$.*?\$/g, "")            // إزالة LaTeX
  .replace(/\\rightarrow/g, "→")      // سهم عادي
  .replace(/\\Rightarrow/g, "⇒")
  .replace(/\\[a-zA-Z]+/g, "")
  .trim();
  return response.status(200).json({
  text
});

    if (!text) {
      return response.status(502).json({
        error: "لم يُرجع Gemini استجابة نصية."
      });
    }

    return response.status(200).json({
      text
    });
  } catch (error) {
    console.error("Server error:", error);

    return response.status(500).json({
      error:
        error?.message ||
        "تعذر تشغيل محرك القرار. حاولي مرة أخرى."
    });
  }
}

function buildPrompt(task, session, evidence = []) {
  const rules = `
أنت محرك الاستدلال التربوي داخل منصة:
ZAHRAA™ Teacher Decision Lab
مختبر زهراء للقرار التربوي.

قواعد إلزامية:
- لا تنشئ خطة تنفيذ قبل موافقة المعلم الصريحة.
- القرار النهائي دائمًا بيد المعلم.
- لا تخترع أرقامًا أو نسبًا أو أزمنة غير موجودة في البيانات.
- افصل بين دليل المعلم والقيد التنفيذي والتفضيل المهني واستنتاج النظام.
- لا تستخدم خيارات ثنائية كاذبة.
- استخدم لغة عربية واضحة ومهنية.
- راجع الأخطاء اللغوية قبل إخراج النتيجة.
أنت محرك الاستدلال التربوي داخل منصة:
- راجع الأخطاء اللغوية قبل إخراج النتيجة.
`;

const evidenceContext =
  Array.isArray(evidence) && evidence.length > 0
    ? evidence
        .slice(0, 5)
        .map((item, index) => `
دليل DataHub ${index + 1}:
- الاسم: ${item.name || "غير محدد"}
- الوصف: ${item.description || "لا يوجد وصف"}
- المنصة: ${item.platform || "zahraa_curriculum"}
- URN: ${item.urn || "غير متاح"}
        `)
        .join("\n")
    : "لا توجد أدلة DataHub متاحة لهذه الجلسة.";

  const context = `
المادة: ${session.subject || "غير محدد"}

الصف أو المرحلة:
${session.gradeLevel || "غير محدد"}

موضوع الدرس:
${session.lessonTopic || "غير محدد"}

مدة الحصة:
${session.lessonDuration || "غير محدد"}

عدد الطلاب:
${session.studentCount || "غير محدد"}

مستوى الطلاب:
${session.studentLevel || "غير محدد"}

الهدف التعليمي:
${session.learningGoal || "غير محدد"}

التحدي:
${session.classChallenge || "غير محدد"}

الموارد:
${session.availableResources || "غير محدد"}

القيود والتفضيلات:
${session.additionalConstraints || "غير محدد"}

إجابة المعلم عن السؤال التكيفي:
${session.adaptiveAnswer || "لا توجد إجابة بعد"}

أدلة المنهج الحية المسترجعة من DataHub:
${evidenceContext}
`;

  if (task === "adaptive_question") {
    return `
${rules}

${context}

المطلوب:
1. حلل الموقف دون إنشاء خطة.
2. حدد معلومة واحدة ناقصة تؤثر فعلًا في القرار.
3. اطرح سؤالًا واحدًا فقط.
4. صنف السؤال إلى:
   - سؤال تشخيصي.
   - قيد تنفيذي.
   - تفضيل مهني.
5. اشرح باختصار سبب تأثير الإجابة.
6. اسمح بإجابة مفتوحة.

اكتب النتيجة بهذه الصيغة بالضبط:

نوع السؤال: ...
السؤال: ...
لماذا نسأل؟: ...
`;
  }

  if (task === "context_summary") {
    return `
${rules}

${context}

أنشئ ملخصًا موجزًا تحت العناوين التالية:

1. الأدلة التي قدمها المعلم.
2. القيود التنفيذية.
3. التفضيلات المهنية.
4. استنتاجات النظام.
5. المعلومات غير المؤكدة.

لا تنشئ بدائل أو خطة تنفيذ.

اختم بعبارة:
الملخص بانتظار موافقة المعلم.
`;
  }

  if (task === "alternatives") {
    return `
${rules}

${context}

أنشئ ثلاثة بدائل تربوية مختلفة جوهريًا.

يجب أن يختلف كل بديل عن الآخرين في متغيرين تربويين على الأقل من:

- نقطة بداية التعلم.
- تسلسل بناء المفهوم.
- دور المعلم.
- دور الطالب.
- نوع التمثيل.
- نوع التقويم.
- نوع التمايز.
- المخرج الأساسي.

لكل بديل اكتب:

- اسم القرار.
- الفجوة التي يعالجها.
- منطق التدريس.
- نقطة البداية.
- تسلسل بناء المفهوم.
- دور المعلم.
- دور الطالب.
- نوع التقويم.
- نوع التمايز.
- المخرج الأقوى.
- ما قد لا يتحقق بصورة كافية.
- القيد الذي قد يمنع اختياره.

لا تقارن، ولا ترشح، ولا تنشئ خطة تنفيذ.
`;
  }

  if (task === "implementation_plan") {
    if (!session.teacherApproval) {
      throw new Error(
        "لا يمكن إنشاء الخطة قبل موافقة المعلم."
      );
    }

    return `
${rules}

${context}

القرار الذي وافق عليه المعلم:
${session.approvedDecision || "غير محدد"}

أنشئ خطة تنفيذ تراعي مدة الحصة التي أدخلها المعلم.

يجب أن تتضمن:

1. هدفًا تعليميًا قابلًا للقياس.
2. معايير نجاح.
3. توزيع زمن لا يتجاوز مدة الحصة.
4. تمهيدًا.
5. خطوات التنفيذ.
6. دور المعلم.
7. دور الطالب.
8. التمايز.
9. التقويم التكويني.
10. نقطة قرار أثناء التنفيذ.
11. الإغلاق وبطاقة الخروج.

لا تضف زمنًا يتجاوز مدة الحصة.
وضح أن الخطة قابلة لتعديل المعلم.
`;
  }

  throw new Error("نوع المهمة غير معروف.");
}
