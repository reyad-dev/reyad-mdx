# ReyadMDX - Project Tasks & Roadmap (قائمة المهام وخريطة العمل)

## 📌 Active Task (المهمة الحالية)
- [ ] **Fix RTL price preview & deliver saved colored highlights (إصلاح معاينة أسعار RTL وحفظ التظليل الملون)**
  - [ ] **RTL Price Formatting:** ضمان بقاء علامة الدولار `$` بجانب المبالغ مع عزل اتجاه النص (Bidi isolation) دون أن تتداخل مع معادلات LaTeX/TeX.
  - [ ] **Colored Highlighting:** إمكانية تحديد النصوص في وضع المعاينة (Preview) أو التقسيم (Split) وتطبيق تظليل بالألوان (أصفر، أخضر، وردي).
  - [ ] **Persistence:** حفظ التظليل داخل الملف بتنسيق تعليق Markdown مُصدر (versioned comment) ليبقى مع المستند عند نقله.
  - [ ] **History & Undo:** ربط إضافة وإزالة التظليل مع سجل التراجع (Undo/Redo) المعتاد للمستند.
  - [ ] **Export:** تضمين التظليلات الملونة في تصدير HTML النهائي.

---

## 🚀 Upcoming Improvements & Backlog (المهام القادمة)
- [ ] **Windows Packaging & Code Signing:**
  - [ ] تجهيز شهادة توقيع رقمية (Trusted Authenticode Signing) لنسخ الويندوز لتفادي تحذيرات Windows SmartScreen.
  - [ ] التأكد من استبعاد أي ملفات زائدة أو أرشيفية من حزمة التوزيع في `app/**/*`.
- [ ] **Windows In-App Updater Testing:**
  - [ ] اختبار التحديث التلقائي الصامت والتأكد من الاحتفاظ بمسار التثبيت المخصص وحفظ المستندات المفتوحة قبل إعادة التشغيل.
- [ ] **Android Build & Testing:**
  - [ ] فحص حزمة Android والتأكد من استقرار التشغيل على الأجهزة المحمولة.

---

## ✅ Completed Milestones (أهم الإنجازات المكتملة مؤخراً)
- [x] إطلاق الإصدار **v1.3.2** ودعم التحديثات الموجهة لمتصفح الويب ونظام Windows.
- [x] دعم اللغة العربية بالكامل واتجاه من اليمين لليسار (RTL) مع الخطوط المناسبة.
- [x] النسخة المستقلة أحادية الملف `MDX-Reader-Standalone.html`.
- [x] دعم تصدير ملفات Markdown إلى HTML مع التنسيقات الكاملة ومعادلات الرياضيات والرسوم البيانية.
*(راجع [CHANGELOG.md](file:///c:/Users/I-SEVEN/Downloads/Vibe%20Coding/MDX%20Reader%20-%201ce34f1/CHANGELOG.md) للتفاصيل التاريخية الكاملة لكل إصدار).*
