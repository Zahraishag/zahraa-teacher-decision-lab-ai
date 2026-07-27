const MODEL_NAME = "gemini-3.6-flash";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json(
        { error: "يجب استخدام طلب POST." },
        { status: 405 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "مفتاح Gemini غير مضاف إلى إعدادات Vercel." },
        { status: 500 }
      );
    }

    try {
      const { task, session } = await request.json();

      if (!task || !session) {
        return Response.json(
          { error: "بيانات المهمة والجلسة مطلوبة." },
          { status: 400 }
        );
      }

      const prompt = buildPrompt(task, session);

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
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096
            }
          })
        }
      );

      const data = await geminiResponse.json();

      if (!geminiResponse.ok) {
        console.error("Gemini API error:", data);

        return Response.json(
          {
            error:
              data?.error?.message ||
              "حدث خطأ أثناء الاتصال بخدمة Gemini."
          },
          { status: geminiResponse.status }
        );
      }

      const text = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

      if (!text) {
        return Response.json(
          { error: "لم يُرجع Gemini استجابة نصية." },
          { status: 502 }
        );
      }

      return Response.json({ text });
    } catch (error) {
      console.error("Server error:", error);

      return Response.json(
        { error: "تعذر تشغيل محرك القرار. حاولي مرة أخرى." },
        { status: 500 }
      );
    }
  }
};

function buildPrompt(task, session) {
  const rules = `
أنت محرك الاستدلال التربوي في منصة:
ZAHRAA™ Teacher Decision Lab
مختبر زهراء للقرار التربوي.

قواعد إلزامية:
- لا تنشئ خطة تنفيذ قبل موافقة المعلم الصريحة.
- القرار النهائي دائمًا بيد المعلم.
- لا تخترع أرقامًا أو نسبًا أو أزمنة غير موجودة في البيانات.
- افصل بين دليل المعلم والقيد التنفيذي والتفضيل المهني واستنتاج النظام.
- استخدم لغة عربية واضحة ومهنية.
- راجع الأخطاء اللغوية قبل إخراج النتيجة.
`;

  const context = `
بيانات الموقف:

المادة: ${session.subject || "غير محدد"}
الصف أو المرحلة: ${session.gradeLevel || "غير محدد"}
موضوع الدرس: ${session.lessonTopic || "غير محدد"}
مدة الحصة: ${session.lessonDuration || "غير محدد"}
عدد الطلاب: ${session.studentCount || "غير محدد"}
مستوى الطلاب: ${session.studentLevel || "غير محدد"}

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
`;

  if (task === "adaptive_question") {
    return `
${rules}
${context}

المطلوب:
1. حلل الموقف دون إنشاء خطة.
2. حدد معلومة واحدة ناقصة تؤثر فعلًا في القرار.
3. اطرح سؤالًا واحدًا فقط.
4. صنّف السؤال إلى:
   - سؤال تشخيصي
   - قيد تنفيذي
   - تفضيل مهني
5. اشرح في جملة قصيرة سبب تأثير الإجابة.
6. تجنب الخيارات الثنائية الكاذبة.
7. اسمح للمعلم بإجابة مفتوحة.

اكتب النتيجة بهذا الشكل:

نوع السؤال:
السؤال:
لماذا نسأل؟
`;
  }

  if (task === "context_summary") {
    return `
${rules}
${context}

أنشئ ملخصًا موجزًا وافصل بين:

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
- دور المعلم.
- دور الطالب.
- نوع التقويم.
- المخرج الأقوى.
- ما قد لا يتحقق.
- القيد الذي قد يمنع اختياره.

لا تقارن ولا ترشح قرارًا ولا تنشئ خطة تنفيذ.
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
${session.approvedDecision || "المدخل المفاهيمي البصري"}

أنشئ خطة تنفيذ تراعي مدة الحصة المدخلة، وتتضمن:

1. هدفًا قابلًا للقياس.
2. معايير نجاح.
3. توزيع زمن لا يتجاوز مدة الحصة.
4. تمهيدًا.
5. خطوات التنفيذ.
6. دور المعلم والطالب.
7. التمايز.
8. التقويم التكويني.
9. نقطة قرار أثناء التنفيذ.
10. الإغلاق وبطاقة الخروج.

وضّح أن الخطة قابلة لتعديل المعلم.
`;
  }

  throw new Error("نوع المهمة غير معروف.");
}
