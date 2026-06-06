import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Article from '../models/Article';

dotenv.config();

const initialArticles = [
    // === PAYMENTS (25 Articles) ===
    {
        title: "How to contact Buildora Support?",
        summary: "Detailed guide on how to reach our team via tickets, email, or WhatsApp.",
        content: "We are here to help you 24/7. You can reach us through:\n\n1. **Support Tickets**: Open a ticket directly from the Chatbot or the Support page in your dashboard.\n2. **Email**: Send us an email at **support@buildora.com**.\n3. **WhatsApp**: Use the floating WhatsApp button found in the bottom corner of your merchant dashboard for instant messaging.\n4. **Phone**: Call us at +20 123 456 789 during business hours (9 AM - 6 PM CLT).",
        titleAr: "كيفية التواصل مع دعم بيلدورا؟",
        summaryAr: "دليل مفصل حول كيفية الوصول إلى فريقنا عبر التذاكر أو البريد الإلكتروني أو واتساب.",
        contentAr: "نحن هنا لمساعدتك على مدار الساعة. يمكنك التواصل معنا من خلال:\n\n1. **تذاكر الدعم**: افتح تذكرة مباشرة من الشات بوت أو صفحة الدعم في لوحة التحكم الخاصة بك.\n2. **البريد الإلكتروني**: أرسل لنا بريداً إلكترونياً على **support@buildora.com**.\n3. **واتساب**: استخدم زر واتساب العائم الموجود في الزاوية السفلية من لوحة تحكم التاجر للمراسلة الفورية.\n4. **الهاتف**: اتصل بنا على +20 123 456 789 خلال ساعات العمل (9 صباحاً - 6 مساءً بتوقيت القاهرة).",
        tags: ["support", "contact", "help", "agent", "phone", "email"],
        isActive: true
    },
    {
        title: "How to accept Instapay payments?",
        summary: "Enable Instapay in Payments settings and provide your IPA address. Customers upload receipts for verification.",
        content: "Instapay is a popular payment method in Egypt. To accept it:\n1. Go to Store Dashboard > Payments.\n2. Enable 'Manual Payment'.\n3. Set Title to 'Instapay'.\n4. In Instructions, provide your IPA (e.g., name@instapay).\n5. Instruct customers to upload a screenshot of the transaction.\n6. Once verified, manually mark the order as paid.",
        titleAr: "كيفية قبول مدفوعات إنستاباي؟",
        summaryAr: "قم بتفعيل إنستاباي في إعدادات الدفع وأضف عنوان IPA الخاص بك. يقوم العملاء برفع إيصال التحويل للتحقق.",
        contentAr: "إنستاباي هي وسيلة دفع شهيرة في مصر. لقبولها:\n1. اذهب إلى لوحة تحكم المتجر > المدفوعات.\n2. فعل 'الدفع اليدوي'.\n3. اجعل العنوان 'Instapay'.\n4. في التعليمات، أضف عنوان IPA الخاص بك (مثلاً: name@instapay).\n5. اطلب من العملاء رفع صورة لمعاملة التحويل.\n6. بمجرد التحقق من وصول المبلغ، قم بتغيير حالة الطلب إلى 'مدفوع' يدوياً.",
        tags: ["payments", "instapay", "egypt"],
        isActive: true
    },
    {
        title: "Setting up Vodafone Cash",
        summary: "Add your Vodafone Cash number to the Mobile Wallets section to accept instant wallet transfers.",
        content: "Vodafone Cash is the leading e-wallet in Egypt. To set it up:\n1. Navigate to Payments > Mobile Wallets.\n2. Enter your 11-digit wallet number.\n3. Add clear instructions for the customer to include their phone number in the transfer description.\n4. Verify every incoming SMS from Vodafone before confirming the order in Buildora.",
        titleAr: "إعداد فودافون كاش",
        summaryAr: "أضف رقم فودافون كاش الخاص بك في قسم المحافظ الإلكترونية لقبول التحويلات الفورية.",
        contentAr: "فودافون كاش هي المحفظة الإلكترونية الرائدة في مصر. لإعدادها:\n1. انتقل إلى المدفوعات > المحافظ الإلكترونية.\n2. أدخل رقم المحفظة المكون من 11 رقماً.\n3. أضف تعليمات واضحة للعميل لتضمين رقم هاتفه في وصف التحويل.\n4. تأكد من كل رسالة نصية واردة من فودافون قبل تأكيد الطلب في بيلدورا.",
        tags: ["payments", "vodafone-cash", "wallet"],
        isActive: true
    },
    {
        title: "How to integrate Paymob?",
        summary: "Connect your Paymob account using API Secret, HMAC, and Integration IDs to accept Credit Cards and ValU.",
        content: "Paymob allows automatic settlement. You need:\n1. API Secret Key from Paymob Dashboard.\n2. HMAC Secret.\n3. Card Integration ID.\n4. Wallet Integration ID.\nEnter these in the Paymob section of your Buildora settings to enable seamless checkouts.",
        titleAr: "كيفية ربط بي موب (Paymob)؟",
        summaryAr: "اربط حساب بي موب الخاص بك باستخدام مفاتيح API و HMAC لقبول الكروت البنكية وفاليو.",
        contentAr: "تسمح بي موب بالتحصيل التلقائي. تحتاج إلى:\n1. مفتاح API السري من لوحة تحكم بي موب.\n2. سر HMAC.\n3. معرف تكامل الكروت (Card Integration ID).\n4. معرف تكامل المحافظ.\nأدخل هذه البيانات في قسم بي موب في إعدادات بيلدورا لتفعيل الدفع التلقائي.",
        tags: ["payments", "paymob", "cards", "valu"],
        isActive: true
    },
    {
        title: "Accepting Cash on Delivery (COD)",
        summary: "COD is enabled by default. You can add a handling fee to cover shipping risks.",
        content: "Cash on Delivery is essential for the Egyptian market. You can:\n1. Set a 'Processing Fee' for COD orders.\n2. Set a maximum order limit for COD to minimize risk.\n3. Customize the confirmation message customers see at checkout.",
        titleAr: "قبول الدفع عند الاستلام (COD)",
        summaryAr: "الدفع عند الاستلام مفعل افتراضياً. يمكنك إضافة رسوم إضافية لتغطية مخاطر الشحن.",
        contentAr: "الدفع عند الاستلام ضروري للسوق المصري. يمكنك:\n1. تحديد 'رسوم معالجة' لطلبات الدفع عند الاستلام.\n2. تحديد حد أقصى للطلب لتقليل المخاطر.\n3. تخصيص رسالة التأكيد التي يراها العملاء عند إتمام الطلب.",
        tags: ["payments", "cod", "shipping"],
        isActive: true
    },
    {
        title: "How to use Fawry for payments?",
        summary: "Fawry allows customers to pay via reference codes at any retail point or kiosk across Egypt.",
        content: "Fawry is a ubiquitous payment network. To enable it through Paymob:\n1. Ensure 'Fawry' is enabled in your Paymob integration dashboard.\n2. Customers choose Fawry at checkout and get a reference code.\n3. They pay at any Fawry point within the specified expiry time (usually 48 hours).\n4. Once paid, the order status updates automatically in Buildora.",
        titleAr: "كيفية استخدام فوري للمدفوعات؟",
        summaryAr: "تسمح فوري للعملاء بالدفع عبر أكواد مرجعية في أي نقطة بيع أو كشك في جميع أنحاء مصر.",
        contentAr: "فوري هي شبكة مدفوعات منتشرة جداً. لتفعيلها عبر بي موب:\n1. تأكد من تفعيل 'Fawry' في لوحة تحكم تكامل بي موب.\n2. يختار العملاء فوري عند الدفع ويحصلون على كود مرجعي.\n3. يقومون بالدفع في أي نقطة فوري خلال وقت الصلاحية المحدد.\n4. بمجرد الدفع، يتم تحديث حالة الطلب تلقائياً في بيلدورا.",
        tags: ["payments", "fawry", "egypt"],
        isActive: true
    },
    {
        title: "Accepting Etisalat Cash",
        summary: "Add your Etisalat Cash number to mobile wallet settings. Customers transfer and upload screenshots.",
        content: "Etisalat Cash is a major mobile wallet. Setup:\n1. Go to Payments > Mobile Wallets.\n2. Add your 11-digit Etisalat number.\n3. Provide instructions for customers to include their name in the transfer notes.\n4. Always verify the incoming money in the Etisalat Cash app before fulfilling the order.",
        titleAr: "قبول اتصالات كاش",
        summaryAr: "أضف رقم اتصالات كاش الخاص بك في إعدادات المحفظة الإلكترونية. يقوم العملاء بالتحويل ورفع صورة الإيصال.",
        contentAr: "اتصالات كاش هي محفظة رئيسية. الإعداد:\n1. اذهب إلى المدفوعات > المحافظ الإلكترونية.\n2. أضف رقم اتصالات المكون من 11 رقماً.\n3. قدم تعليمات للعملاء لتضمين أسمائهم في ملاحظات التحويل.\n4. تأكد دائماً من وصول المبلغ في تطبيق اتصالات كاش قبل تنفيذ الطلب.",
        tags: ["payments", "etisalat-cash", "wallet"],
        isActive: true
    },
    {
        title: "Orange Cash Integration",
        summary: "Accept payments from Orange Cash users by providing your wallet number in the manual payment section.",
        content: "Orange Cash users can pay you directly. Setup:\n1. Navigate to Payments > Mobile Wallets.\n2. Register your Orange wallet number.\n3. Customers will see this number at checkout with instructions to transfer.\n4. Manual verification is required by checking your wallet balance or SMS alerts.",
        titleAr: "تكامل أورانج كاش",
        summaryAr: "اقبل المدفوعات من مستخدمي أورانج كاش عن طريق إضافة رقم محفظتك في قسم الدفع اليدوي.",
        contentAr: "يمكن لمستخدمي أورانج كاش الدفع لك مباشرة. الإعداد:\n1. انتقل إلى المدفوعات > المحافظ الإلكترونية.\n2. سجل رقم محفظة أورانج الخاص بك.\n3. سيرى العملاء هذا الرقم عند الدفع مع تعليمات التحويل.\n4. التحقق اليدوي مطلوب عن طريق التأكد من رصيد محفظتك أو رسائل التنبيه.",
        tags: ["payments", "orange-cash", "wallet"],
        isActive: true
    },
    {
        title: "Bank Transfer Instructions",
        summary: "Enable bank transfers by providing your IBAN and Swift code for manual wire transfers.",
        content: "Bank transfers are common for large orders. To set up:\n1. Enable 'Bank Transfer' in Payment Settings.\n2. Enter Bank Name, Account Holder Name, IBAN, and Swift Code.\n3. Advise customers to upload a scan or photo of the bank wire confirmation.\n4. Wait for the funds to reflect in your bank account before shipping.",
        titleAr: "تعليمات التحويل البنكي",
        summaryAr: "فعل التحويلات البنكية عن طريق تزويد رقم IBAN وكود Swift للتحويلات اليدوية.",
        contentAr: "التحويلات البنكية شائعة للطلبات الكبيرة. للإعداد:\n1. فعل 'التحويل البنكي' في إعدادات الدفع.\n2. أدخل اسم البنك، اسم صاحب الحساب، رقم IBAN، وكود Swift.\n3. انصح العملاء برفع صورة لإيصال التحويل البنكي.\n4. انتظر حتى تظهر الأموال في حسابك البنكي قبل الشحن.",
        tags: ["payments", "bank-transfer", "iban"],
        isActive: true
    },
    {
        title: "Setting up Partial Payments",
        summary: "Request a percentage of the order total upfront for high-value items or custom designs.",
        content: "For custom or expensive products, you might want a deposit. Currently, this is handled by:\n1. Setting a clear notice in the product description.\n2. Using a manual payment method where the customer pays X% and the rest on delivery.\n3. Manually adjusting order notes to track the remaining balance.",
        titleAr: "إعداد الدفعات الجزئية",
        summaryAr: "اطلب نسبة مئوية من إجمالي الطلب مقدماً للمنتجات عالية القيمة أو التصاميم الخاصة.",
        contentAr: "للمنتجات الخاصة أو الباهظة، قد ترغب في عربون. حالياً، يتم ذلك عن طريق:\n1. وضع تنبيه واضح في وصف المنتج.\n2. استخدام وسيلة دفع يدوية حيث يدفع العميل نسبة X٪ والباقي عند الاستلام.\n3. تعديل ملاحظات الطلب يدوياً لتتبع الرصيد المتبقي.",
        tags: ["payments", "partial", "deposit"],
        isActive: true
    },
    {
        title: "How to handle payment refunds?",
        summary: "Refund customers through your payment gateway or manually for wallet transfers.",
        content: "Refunds depend on the method:\n- Paymob: Initiate the refund from your Paymob dashboard; it returns to the customer's card within 5-10 days.\n- Wallets (VCash/Instapay): You must manually send the money back from your personal wallet app.\n- Update the order status in Buildora to 'Refunded' for accounting.",
        titleAr: "كيفية التعامل مع استرداد الأموال؟",
        summaryAr: "قم برد الأموال للعملاء عبر بوابة الدفع أو يدوياً لتحويلات المحافظ.",
        contentAr: "تعتمد المرتجعات على الوسيلة:\n- بي موب: ابدأ الاسترداد من لوحة تحكم بي موب؛ ستعود الأموال لبطاقة العميل خلال 5-10 أيام.\n- المحافظ (فودافون كاش/إنستاباي): يجب عليك إرسال الأموال يدوياً من تطبيق محفظتك الشخصي.\n- حدث حالة الطلب في بيلدورا إلى 'مسترد' للحسابات.",
        tags: ["payments", "refund", "returns"],
        isActive: true
    },
    {
        title: "Transaction Fees FAQ",
        summary: "Buildora charges zero commission. You only pay the processing fees of your payment gateway.",
        content: "Understanding costs:\n- Buildora: 0% per transaction.\n- Paymob: Usually ~2.75% + 3 EGP (varies by contract).\n- Wallets: Often 0% or a small flat fee for P2P transfers.\nAlways check your gateway's latest rates to price your products accurately.",
        titleAr: "الأسئلة الشائعة حول رسوم المعاملات",
        summaryAr: "بيلدورا لا تفرض أي عمولة. أنت تدفع فقط رسوم المعالجة الخاصة ببوابة الدفع.",
        contentAr: "فهم التكاليف:\n- بيلدورا: 0٪ لكل معاملة.\n- بي موب: عادةً ~2.75٪ + 3 جنيه (تختلف حسب العقد).\n- المحافظ: غالباً 0٪ أو رسوم ثابتة صغيرة للتحويلات.\nتأكد دائماً من أحدث أسعار بوابتك لتسعير منتجاتك بدقة.",
        tags: ["payments", "fees", "costs"],
        isActive: true
    },
    {
        title: "Minimum Order Total for Specific Payments",
        summary: "Restrict certain payment methods (like Credit Card) to orders above a specific amount.",
        content: "To save on transaction fees:\n1. Go to Payment Settings.\n2. Edit the desired method (e.g., Paymob Card).\n3. Set 'Minimum Order Amount' (e.g., 200 EGP).\n4. This method will only appear at checkout if the cart total exceeds this limit.",
        titleAr: "الحد الأدنى للطلب لوسائل دفع محددة",
        summaryAr: "قصر بعض وسائل الدفع (مثل بطاقة الائتمان) على الطلبات التي تزيد عن مبلغ معين.",
        contentAr: "للتوفير في رسوم المعاملات:\n1. اذهب إلى إعدادات الدفع.\n2. عدل الوسيلة المطلوبة (مثل كارت بي موب).\n3. حدد 'الحد الأدنى لمبلغ الطلب' (مثل 200 جنيه).\n4. ستظهر هذه الوسيلة فقط عند الدفع إذا تجاوز إجمالي السلة هذا الحد.",
        tags: ["payments", "minimum", "limits"],
        isActive: true
    },
    {
        title: "What is a Payment Surcharge?",
        summary: "Add an extra fee for specific payment methods like COD to cover shipping risks.",
        content: "You can add a surcharge in payment settings. For example:\n- COD Surcharge: 20 EGP to cover return shipping risks.\n- Credit Card Surcharge: 3% to cover gateway fees (ensure this complies with local regulations).\nThis fee is added automatically to the total at checkout.",
        titleAr: "ما هي إضافة رسوم الدفع؟",
        summaryAr: "أضف رسوماً إضافية لوسائل دفع محددة مثل الدفع عند الاستلام لتغطية مخاطر الشحن.",
        contentAr: "يمكنك إضافة رسوم إضافية في إعدادات الدفع. مثلاً:\n- رسوم دفع عند الاستلام: 20 جنيه لتغطية مخاطر شحن المرتجعات.\n- رسوم بطاقة الائتمان: 3٪ لتغطية رسوم البوابة.\nتضاف هذه الرسوم تلقائياً إلى الإجمالي عند الدفع.",
        tags: ["payments", "surcharge", "fees"],
        isActive: true
    },
    {
        title: "Accepting International Payments",
        summary: "Use PayPal or Stripe (if you have an entity abroad) to accept USD/EUR from foreign customers.",
        content: "To sell globally:\n1. Enable PayPal in Settings.\n2. Set up a business account that accepts multiple currencies.\n3. Buildora handles currency conversion for display purposes, but the gateway settles in the supported currency.\n4. Ensure your shipping rates cover international delivery costs.",
        titleAr: "قبول المدفوعات الدولية",
        summaryAr: "استخدم بايبال أو سترايب لقبول الدولار/اليورو من العملاء الأجانب.",
        contentAr: "للبيع عالمياً:\n1. فعل بايبال في الإعدادات.\n2. قم بإعداد حساب تجاري يقبل عملات متعددة.\n3. تتعامل بيلدورا مع تحويل العملات لأغراض العرض، لكن البوابة تحصل بالعملة المدعومة.\n4. تأكد من أن أسعار الشحن تغطي تكاليف التوصيل الدولي.",
        tags: ["payments", "international", "paypal"],
        isActive: true
    },
    {
        title: "How to verify manual receipts?",
        summary: "Carefully check the uploaded image in the order dashboard against your wallet app alerts.",
        content: "Manual verification steps:\n1. Open the Order details.\n2. Click the 'View Receipt' button to see the uploaded image.\n3. Compare the transaction reference ID shown in the image with your wallet app history (Instapay/Vodafone).\n4. Only click 'Mark as Paid' after confirming the balance has increased in your actual account.",
        titleAr: "كيفية التحقق من الإيصالات اليدوية؟",
        summaryAr: "تحقق بعناية من الصورة المرفوعة في لوحة تحكم الطلبات مقابل تنبيهات تطبيق محفظتك.",
        contentAr: "خطوات التحقق اليدوي:\n1. افتح تفاصيل الطلب.\n2. اضغط على زر 'عرض الإيصال' لرؤية الصورة المرفوعة.\n3. قارن معرف المعاملة الموضح في الصورة مع سجل تطبيق محفظتك (إنستاباي/فودافون).\n4. لا تضغط على 'تحديد كمدفوع' إلا بعد التأكد من زيادة الرصيد في حسابك الحقيقي.",
        tags: ["payments", "verification", "receipts"],
        isActive: true
    },
    {
        title: "Integration IDs for Paymob",
        summary: "Find your specific Card and Wallet integration IDs in the Paymob settings to connect correctly.",
        content: "Integration IDs are unique per payment channel:\n1. Log in to Paymob > Settings > Payment Integrations.\n2. Locate the ID for 'Credit Cards' and 'Mobile Wallets'.\n3. Copy these long numbers into Buildora > Payments > Paymob.\n4. Test with a live small transaction to ensure everything is wired correctly.",
        titleAr: "أكواد التكامل لـ بي موب (Integration IDs)",
        summaryAr: "ابحث عن أكواد تكامل الكروت والمحافظ الخاصة بك في إعدادات بي موب للربط بشكل صحيح.",
        contentAr: "أكواد التكامل فريدة لكل قناة دفع:\n1. سجل الدخول إلى بي موب > Settings > Payment Integrations.\n2. حدد الكود الخاص بـ 'Credit Cards' و 'Mobile Wallets'.\n3. انسخ هذه الأرقام الطويلة في بيلدورا > المدفوعات > بي موب.\n4. اختبر بمعاملة صغيرة حقيقية للتأكد من أن كل شيء يعمل بشكل صحيح.",
        tags: ["payments", "paymob", "technical"],
        isActive: true
    },
    {
        title: "What is an HMAC Secret?",
        summary: "The HMAC secret is a secondary security key from Paymob required to verify transaction authenticity.",
        content: "Security is paramount. The HMAC secret:\n1. Reassures your store that the payment success message actually came from Paymob.\n2. You find it in the 'Security' or 'Transaction Webhook' section of Paymob.\n3. Paste it into Buildora to enable automatic order status updates upon successful payment.",
        titleAr: "ما هو سر HMAC؟",
        summaryAr: "سر HMAC هو مفتاح أمان ثانوي من بي موب مطلوب للتحقق من صحة المعاملات.",
        contentAr: "الأمان هو الأهم. سر HMAC:\n1. يطمئن متجرك بأن رسالة نجاح الدفع جاءت فعلياً من بي موب.\n2. تجده في قسم 'Security' أو 'Transaction Webhook' في بي موب.\n3. الصقه في بيلدورا لتفعيل تحديثات حالة الطلب التلقائية عند الدفع الناجح.",
        tags: ["payments", "paymob", "security"],
        isActive: true
    },
    {
        title: "Currency Settings (EGP)",
        summary: "Ensure your store is set to Egyptian Pounds (EGP) for correct price display and gateway integration.",
        content: "EGP is the primary currency. To verify:\n1. Go to Store Settings > General.\n2. Ensure 'Currency' is set to EGP.\n3. This ensures that Paymob and other local gateways process the numbers correctly without failed currency mismatches at checkout.",
        titleAr: "إعدادات العملة (EGP)",
        summaryAr: "تأكد من ضبط متجرك على الجنيه المصري (EGP) لعرض الأسعار والتكامل مع البوابات بشكل صحيح.",
        contentAr: "الجنيه المصري هو العملة الأساسية. للتحقق:\n1. اذهب إلى إعدادات المتجر > عام.\n2. تأكد من ضبط 'العملة' على EGP.\n3. يضمن ذلك أن بي موب والبوابات المحلية الأخرى تعالج الأرقام بشكل صحيح دون أخطاء في توافق العملات.",
        tags: ["payments", "currency", "egp"],
        isActive: true
    },
    {
        title: "Handling Payment Timeouts",
        summary: "What to do if a guest gets disconnected during payment but money is deducted.",
        content: "If a customer claims they paid but the order is still 'Pending':\n1. Check your gateway dashboard (Paymob/Wallet).\n2. If the transaction was successful, manually mark the order as 'Paid' in Buildora.\n3. This happens rarely due to unstable internet connections on the customer side.",
        titleAr: "التعامل مع انتهاء مهلة الدفع",
        summaryAr: "ماذا تفعل إذا انقطع اتصال العميل أثناء الدفع ولكن تم خصم المبلغ.",
        contentAr: "إذا ادعى العميل أنه دفع ولكن الطلب لا يزال 'قيد الانتظار':\n1. تحقق من لوحة تحكم بوابتك (بي موب/المحفظة).\n2. إذا كانت المعاملة ناجحة، حدد الطلب يدوياً كـ 'مدفوع' في بيلدورا.\n3. يحدث هذا نادراً بسبب عدم استقرار اتصال الإنترنت لدى العميل.",
        tags: ["payments", "troubleshooting", "errors"],
        isActive: true
    },
    {
        title: "Accepting ValU Installments",
        summary: "Enable ValU through your Paymob integration to allow customers to pay in monthly installments.",
        content: "ValU can boost high-ticket sales. Requirements:\n1. You must have ValU enabled on your Paymob merchant account.\n2. Enter the ValU Integration ID in the Buildora Paymob settings.\n3. Customers will see ValU as an option at checkout and can choose their installment plan.",
        titleAr: "قبول تقسيط فاليو (ValU)",
        summaryAr: "فعل فاليو من خلال تكامل بي موب للسماح للعملاء بالدفع بالتقسيط الشهري.",
        contentAr: "فاليو يمكن أن تزيد مبيعات المنتجات الغالية. المتطلبات:\n1. يجب تفعيل فاليو في حساب التاجر الخاص بك في بي موب.\n2. أدخل كود تكامل فاليو في إعدادات بي موب في بيلدورا.\n3. سيرى العملاء فاليو كخيار عند الدفع ويمكنهم اختيار خطة التقسيط.",
        tags: ["payments", "valu", "installments"],
        isActive: true
    },
    {
        title: "Secure Checkout with SSL",
        summary: "Buildora provides free SSL for all stores, ensuring customer payment data is always encrypted.",
        content: "Trust and security:\n1. All 'mystore.buildora.com' subdomains have built-in SSL.\n2. When you connect a custom domain, we auto-generate an SSL certificate within 24 hours.\n3. This adds the 'Padlock' icon in the browser, signaling to customers that their transaction is safe.",
        titleAr: "تأمين الدفع عبر SSL",
        summaryAr: "توفر بيلدورا شهادة SSL مجانية لجميع المتاجر، مما يضمن تشفير بيانات دفع العملاء دائماً.",
        contentAr: "الثقة والأمان:\n1. جميع النطاقات الفرعية لبيلدورا لديها SSL مدمج.\n2. عند ربط دومين خاص، نصدر شهادة SSL تلقائياً خلال 24 ساعة.\n3. يضيف هذا أيقونة 'القفل' في المتصفح، مما يشير للعملاء أن معاملاتهم آمنة.",
        tags: ["payments", "security", "ssl"],
        isActive: true
    },
    {
        title: "PayPal Business Verification",
        summary: "To use PayPal in Egypt for USD, you need to verify your account with an Egyptian Kredit or Prepaid card.",
        content: "PayPal requirements:\n1. Create a PayPal Business account.\n2. Link a card like 'EasyPay' from Egypt Post or banks that support PayPal withdrawals.\n3. Enter your PayPal email in Buildora settings to accept global payments instantly.",
        titleAr: "توثيق حساب بايبال بيزنس",
        summaryAr: "لاستخدام بايبال في مصر للدولار، تحتاج لتوثيق حسابك ببطاقة ائتمان مصرية أو مسبقة الدفع.",
        contentAr: "متطلبات بايبال:\n1. أنشئ حساب بايبال بيزنس.\n2. اربط بطاقة مثل 'إيزي باي' من البريد المصري أو بنوك تدعم سحب بايبال.\n3. أدخل بريدك الإلكتروني في بايبال في إعدادات بيلدورا لقبول المدفوعات العالمية فوراً.",
        tags: ["payments", "paypal", "egypt"],
        isActive: true
    },
    {
        title: "Common Paymob Integration Errors",
        summary: "Fixing 401 Unauthorized or 404 Not Found errors during Paymob setup.",
        content: "Troubleshooting Paymob:\n- 401 Unauthorized: Your API Key or HMAC is incorrect. Refresh and re-copy them.\n- 404: The Integration ID is wrong or belongs to a different currency.\n- Payment Failed: Usually caused by incorrect HMAC secret preventing the webhook from firing.",
        titleAr: "أخطاء تكامل بي موب الشائعة",
        summaryAr: "إصلاح أخطاء 401 Unauthorized أو 404 Not Found أثناء إعداد بي موب.",
        contentAr: "استكشاف أخطاء بي موب:\n- 401 Unauthorized: مفتاح API أو HMAC غير صحيح. قم بتحديثهم وإعادة نسخهم.\n- 404: كود التكامل خاطئ أو ينتمي لعملة مختلفة.\n- فشل الدفع: عادةً ما يكون بسبب سر HMAC غير الصحيح الذي يمنع تحديث حالة الطلب.",
        tags: ["payments", "paymob", "errors"],
        isActive: true
    },
    {
        title: "How to withdraw Paymob funds?",
        summary: "Funds from automatic payments are held by Paymob and settled to your bank account weekly.",
        content: "Payout schedule:\n1. Paymob collects your successful credit card and wallet payments.\n2. They subtract their commission fees.\n3. The net amount is transferred automatically to your registered bank account every Tuesday (typical schedule).\n4. View 'Payouts' in your Paymob dashboard for detailed logs.",
        titleAr: "كيفية سحب أموال بي موب؟",
        summaryAr: "يتم الاحتفاظ بالأموال من المدفوعات التلقائية في بي موب وتسويتها في حسابك البنكي أسبوعياً.",
        contentAr: "جدول الصرف:\n1. تقوم بي موب بجمع مدفوعاتك الناجحة بالبطاقات والمحافظ.\n2. يخصمون رسوم عمولتهم.\n3. يتم تحويل المبلغ الصافي تلقائياً إلى حسابك البنكي المسجل كل ثلاثاء (الجدول المعتاد).\n4. عرض 'Payouts' في لوحة تحكم بي موب لمعرفة التفاصيل.",
        tags: ["payments", "paymob", "payouts"],
        isActive: true
    },
    {
        title: "Connecting a Custom Domain",
        summary: "Upgrade to Pro to use your own domain (e.g., .com). Link it via A and CNAME records.",
        content: "To use a custom domain:\n1. Buy a domain from a provider (GoDaddy, Namecheap).\n2. In Buildora, go to Store Settings > Domain.\n3. Add your domain name.\n4. Update your DNS settings: Point 'A' record to our IP and 'CNAME' for 'www' to our domain. SSL will be auto-generated.",
        titleAr: "ربط دومين خاص (نطاق)",
        summaryAr: "قم بالترقية للباقة الاحترافية لاستخدام نطاقك الخاص. اربطه عبر سجلات A و CNAME.",
        contentAr: "لاستخدام دومين خاص:\n1. قم بشراء دومين من مزود (مثل GoDaddy).\n2. في بيلدورا، اذهب إلى إعدادات المتجر > الدومين.\n3. أضف اسم الدومين الخاص بك.\n4. قم بتحديث إعدادات DNS: وجه سجل 'A' إلى عنوان IP الخاص بنا و 'CNAME' لـ 'www' إلى الدومين الخاص بنا. سيتم إصدار شهادة SSL تلقائياً.",
        tags: ["store", "domain", "settings"],
        isActive: true
    },
    {
        title: "How to change store theme?",
        summary: "Visit the Theme Gallery, preview designs, and click Apply. All content stays safe.",
        content: "Buildora offers professional themes. To change:\n1. Go to Appearance > Themes.\n2. Browse templates (Fashion, Electronics, etc.).\n3. Click 'Preview' to see it with your data.\n4. Click 'Publish' to make it live. You can customize colors and fonts later.",
        titleAr: "كيفية تغيير ثيم المتجر؟",
        summaryAr: "قم بزيارة معرض الثيمات، عاين التصاميم، واضغط تطبيق. كل محتواك سيبقى آمناً.",
        contentAr: "تقدم بيلدورا ثيمات احترافية. للتغيير:\n1. اذهب إلى المظهر > الثيمات.\n2. تصفح القوالب (ملابس، إلكترونيات، إلخ).\n3. اضغط 'معاينة' لرؤيته ببياناتك.\n4. اضغط 'نشر' لتفعيله. يمكنك تخصيص الألوان والخطوط لاحقاً.",
        tags: ["store", "design", "themes"],
        isActive: true
    },

    // === OPERATIONS (25 Articles) ===
    {
        title: "Managing Order Status",
        summary: "Track orders from Pending to Delivered. Updating status notifies the customer via email.",
        content: "Efficient order management is key. Statuses include:\n- Pending: New order.\n- Processing: Being prepared.\n- Shipped: With the courier.\n- Delivered: Completed.\nAlways add a tracking number when shipping to reduce customer inquiries.",
        titleAr: "إدارة حالة الطلب",
        summaryAr: "تتبع الطلبات من قيد الانتظار إلى تم التوصيل. تحديث الحالة يرسل إشعاراً للعميل.",
        contentAr: "الإدارة الفعالة للطلبات هي المفتاح. الحالات تشمل:\n- قيد الانتظار: طلب جديد.\n- قيد التنفيذ: جاري التجهيز.\n- تم الشحن: مع شركة الشحن.\n- تم التوصيل: مكتمل.\nأضف دائماً رقم تتبع عند الشحن لتقليل استفسارات العملاء.",
        tags: ["operations", "inventory", "alerts"],
        isActive: true
    },
    {
        title: "Product SKUs and Barcodes",
        summary: "Use unique SKU identifiers and barcodes to scan and track products in your warehouse.",
        content: "Organize your inventory:\n1. Assign a unique SKU (Stock Keeping Unit) to every product and variant.\n2. Add the barcode number if you use a scanner.\n3. This allows you to find products instantly in your dashboard and ensures accurate order fulfillment.",
        titleAr: "أكواد SKU والباركود للمنتجات",
        summaryAr: "استخدم معرفات SKU فريدة وباركود لمسح وتتبع المنتجات في مستودعك.",
        contentAr: "نظم مخزونك:\n1. حدد SKU (وحدة تتبع المخزون) فريد لكل منتج وفئة.\n2. أضف رقم الباركود إذا كنت تستخدم ماسحاً ضوئياً.\n3. يتيح لك ذلك العثور على المنتجات فوراً في لوحة التحكم ويضمن تنفيذ الطلبات بدقة.",
        tags: ["operations", "inventory", "technical"],
        isActive: true
    },
    {
        title: "Setting up Shipping Zones",
        summary: "Define different shipping costs for Cairo, Alexandria, and other governorates in Egypt.",
        content: "Custom shipping rates:\n1. Go to Store Settings > Shipping.\n2. Create a zone (e.g., 'Greater Cairo').\n3. Add governorates like Cairo, Giza, and Qalyubia.\n4. Set a flat fee or weight-based rate for this specific zone.",
        titleAr: "إعداد مناطق الشحن",
        summaryAr: "حدد تكاليف شحن مختلفة للقاهرة والإسكندرية والمحافظات الأخرى في مصر.",
        contentAr: "أسعار شحن مخصصة:\n1. اذهب إلى إعدادات المتجر > الشحن.\n2. أنشئ منطقة (مثل 'القاهرة الكبرى').\n3. أضف محافظات مثل القاهرة، الجيزة، والقليوبية.\n4. حدد سعراً ثابتاً أو سعراً يعتمد على الوزن لهذه المنطقة المحددة.",
        tags: ["operations", "shipping", "egypt"],
        isActive: true
    },
    {
        title: "Free Shipping Rules",
        summary: "Increase your sales by offering free delivery on orders above a certain amount.",
        content: "Boost your average order value:\n1. In Shipping settings, add a new rate.\n2. Set 'Minimum Order Amount' (e.g., 1000 EGP).\n3. Set the price to 0 EGP.\n4. Buildora will automatically apply 'Free Shipping' at checkout when the cart total is met.",
        titleAr: "قواعد الشحن المجاني",
        summaryAr: "زد مبيعاتك من خلال تقديم توصيل مجاني للطلبات التي تزيد عن مبلغ معين.",
        contentAr: "زد من متوسط قيمة طلباتك:\n1. في إعدادات الشحن، أضف سعراً جديداً.\n2. حدد 'الحد الأدنى لمبلغ الطلب' (مثل 1000 جنيه).\n3. اجعل السعر 0 جنيه.\n4. ستقوم بيلدورا تلقائياً بتطبيق 'الشحن المجاني' عند الدفع عند استيفاء إجمالي السلة.",
        tags: ["operations", "shipping", "promo"],
        isActive: true
    },
    {
        title: "How to Weight-based Shipping works?",
        summary: "Charge more for heavy products automatically by setting weight tiers in your shipping rates.",
        content: "Accurate shipping costs:\n1. Assign weights to your products (e.g., 0.5kg, 2kg).\n2. Create a rate like '0-5kg = 50 EGP' and '5-10kg = 90 EGP'.\n3. Buildora sums the weight of all items in the cart and selects the correct rate for the customer.",
        titleAr: "كيف يعمل الشحن القائم على الوزن؟",
        summaryAr: "احسب تكلفة إضافية للمنتجات الثقيلة تلقائياً من خلال تحديد شرائح الوزن في أسعار الشحن.",
        contentAr: "تكاليف شحن دقيقة:\n1. حدد أوزاناً لمنتجاتك (مثل 0.5 كجم، 2 كجم).\n2. أنشئ سعراً مثل '0-5 كجم = 50 جنيه' و '5-10 كجم = 90 جنيه'.\n3. تقوم بيلدورا بجمع وزن جميع العناصر في السلة واختيار السعر الصحيح للعميل.",
        tags: ["operations", "shipping", "logic"],
        isActive: true
    },
    {
        title: "Bulk Import Products with CSV",
        summary: "Save hours of work by uploading a single CSV file to add hundreds of products to your store.",
        content: "Efficiency for large stores:\n1. Go to Products > Import.\n2. Download our template CSV file.\n3. Fill in product names, prices, and descriptions.\n4. Upload the file. Buildora will process the list and notify you once completed.",
        titleAr: "استيراد المنتجات بالجملة (CSV)",
        summaryAr: "وفر ساعات من العمل عن طريق رفع ملف CSV واحد لإضافة مئات المنتجات إلى متجرك.",
        contentAr: "كفاءة المتاجر الكبيرة:\n1. اذهب إلى المنتجات > استيراد.\n2. حمل ملف CSV النموذجي الخاص بنا.\n3. املأ أسماء المنتجات، الأسعار، والأوصاف.\n4. ارفع الملف. ستقوم بيلدورا بمعالجة القائمة وإخطارك بمجرد الانتهاء.",
        tags: ["operations", "products", "import"],
        isActive: true
    },
    {
        title: "Managing Product Variants",
        summary: "Add different sizes, colors, or materials to a single product listing with unique stock levels.",
        content: "Versatile listings:\n1. In the product editor, click 'Add Variants'.\n2. Define options like 'Size' (S, M, L, XL).\n3. Assign unique prices and stock for each combination.\n4. Customers can choose their specific version directly on the product page.",
        titleAr: "إدارة أنواع المنتجات (Variants)",
        summaryAr: "أضف أحجاماً أو ألواناً أو خامات مختلفة لمنتج واحد مع مستويات مخزون فريدة.",
        contentAr: "قوائم متنوعة:\n1. في محرر المنتج، اضغط على 'إضافة فئات'.\n2. حدد الخيارات مثل 'الحجم' (S, M, L, XL).\n3. حدد أسعاراً ومخزوناً فريداً لكل فئة.\n4. يمكن للعملاء اختيار النسخة المحددة لهم مباشرة من صفحة المنتج.",
        tags: ["operations", "products", "inventory"],
        isActive: true
    },
    {
        title: "How to Print Invoices?",
        summary: "Generate and print professional PDF invoices for every order to include in your shipments.",
        content: "Professional fulfillment:\n1. Open an order details page.\n2. Click 'Download Invoice' or 'Print Invoice'.\n3. The PDF includes your logo, customer details, product list, and any taxes or fees.\n4. Use this as a packing slip for the shipping courier.",
        titleAr: "كيفية طباعة الفواتير؟",
        summaryAr: "أصدر واطبع فواتير PDF احترافية لكل طلب لتضمينها في شحناتك.",
        contentAr: "تنفيذ احترافي:\n1. افتح صفحة تفاصيل الطلب.\n2. اضغط على 'تحميل الفاتورة' أو 'طباعة الفاتورة'.\n3. تتضمن الفاتورة شعارك، بيانات العميل، قائمة المنتجات، وأي ضرائب أو رسوم.\n4. استخدم هذا ككشف تعبئة لشركة الشحن.",
        tags: ["operations", "orders", "pdf"],
        isActive: true
    },
    {
        title: "Adding Tracking Numbers to Orders",
        summary: "Provide customers with their courier tracking links so they can follow their delivery status.",
        content: "Transparency for customers:\n1. Go to an order that has been shipped.\n2. Enter the Tracking Number and choose the Courier (Aramex, Bosta, etc.).\n3. The customer will receive an automatic email with a link to track their package in real-time.",
        titleAr: "إضافة أرقام التتبع للطلبات",
        summaryAr: "زود العملاء بروابط تتبع شركة الشحن ليتمكنوا من متابعة حالة التوصيل.",
        contentAr: "الشفافية للعملاء:\n1. اذهب لطلب تم شحنه.\n2. أدخل رقم التتبع واختر شركة الشحن (أرامكس، بوسطة، إلخ).\n3. سيتلقى العميل بريداً إلكترونياً تلقائياً مع رابط لتتبع طردهم في الوقت الفعلي.",
        tags: ["operations", "shipping", "tracking"],
        isActive: true
    },
    {
        title: "Handling Order Cancelling",
        summary: "Cancel orders that were made by accident or out of stock. Inventory is auto-restocked.",
        content: "Order cleanup:\n1. Find the order and click 'Cancel Order'.\n2. Choose a reason (e.g., Customer Choice or Out of Stock).\n3. If 'Auto-restock' is enabled, the items will immediately go back into your available inventory.\n4. Notify the customer via the automatic cancellation email.",
        titleAr: "التعامل مع إلغاء الطلبات",
        summaryAr: "إلغاء الطلبات التي تمت بالخطأ أو بسبب نفاد المخزون. يتم إرجاع المخزون تلقائياً.",
        contentAr: "تنظيف الطلبات:\n1. ابحث عن الطلب واضغط 'إلغاء الطلب'.\n2. اختر سبباً (مثل اختيار العميل أو نفاد المخزون).\n3. إذا تم تفعيل 'إرجاع المخزون التلقائي'، فستعود العناصر فوراً إلى مخزونك المتاح.\n4. سيتم إخطار العميل عبر بريد الإلغاء التلقائي.",
        tags: ["operations", "orders", "inventory"],
        isActive: true
    },
    {
        title: "Customer Profiles and History",
        summary: "View a detailed history of all orders made by a specific customer to understand their value.",
        content: "Know your buyers:\n1. Go to the 'Customers' tab.\n2. Search for a name or email and click on the profile.\n3. View their lifetime spent, total orders, and average order value.\n4. Add internal notes about specific customer preferences or issues.",
        titleAr: "ملفات العملاء وتاريخهم",
        summaryAr: "اعرض تاريخاً مفصلاً لجميع الطلبات التي قدمها عميل معين لفهم قيمتهم.",
        contentAr: "اعرف المشترين لديك:\n1. اذهب إلى تبويب 'العملاء'.\n2. ابحث عن اسم أو بريد واضغط على الملف الشخصي.\n3. اعرض إجمالي ما أنفقوه، وعدد الطلبات، ومتوسط قيمة الطلب.\n4. أضف ملاحظات داخلية حول تفضيلات عميل معين أو مشاكله.",
        tags: ["operations", "customers", "data"],
        isActive: true
    },
    {
        title: "What are Staff Permissions?",
        summary: "Invite team members to help manage your store while limiting what they can access.",
        content: "Delegate securely:\n1. Go to Settings > Staff.\n2. Invite a user via email.\n3. Assign a role like 'Store Manager' (Full access) or 'Fulfillment Staff' (Orders only).\n4. This ensures your financial data and settings are protected from accidental changes.",
        titleAr: "ما هي صلاحيات فريق العمل؟",
        summaryAr: "ادعُ أعضاء فريقك للمساعدة في إدارة متجرك مع الحد مما يمكنهم الوصول إليه.",
        contentAr: "فوض المهام بأمان:\n1. اذهب إلى الإعدادات > فريق العمل.\n2. ادعُ مستخدماً عبر البريد الإلكتروني.\n3. حدد دوراً مثل 'مدير المتجر' (وصول كامل) أو 'موظف تنفيذ' (الطلبات فقط).\n4. يضمن ذلك حماية بياناتك المالية وإعداداتك من التغييرات غير المقصودة.",
        tags: ["operations", "staff", "security"],
        isActive: true
    },
    {
        title: "Dashboard Analytics overview",
        summary: "Track your sales, visitors, and conversion rates in the real-time analytics dashboard.",
        content: "Data-driven growth:\n1. The home screen displays your Revenue, Active Carts, and Top Products.\n2. Filter by date range (Today, Week, Month).\n3. Compare performance against the previous period to track your store's growth trend.\n4. Use this data to decide which products to stock more of.",
        titleAr: "نظرة عامة على تحليلات لوحة التحكم",
        summaryAr: "تتبع مبيعاتك، زوارك، ومعدلات التحويل في لوحة تحليلات فورية.",
        contentAr: "نمو قائم على البيانات:\n1. تعرض الشاشة الرئيسية أرباحك، السلال النشطة، وأفضل المنتجات.\n2. فلتر حسب النطاق الزمني (اليوم، الأسبوع، الشهر).\n3. قارن الأداء بالفترة السابقة لتتبع اتجاه نمو متجرك.\n4. استخدم هذه البيانات لتحديد المنتجات التي يجب زيادة مخزونها.",
        tags: ["operations", "analytics", "reports"],
        isActive: true
    },
    {
        title: "Top-Selling Products Report",
        summary: "Identify which items bring in the most revenue and plan your marketing accordingly.",
        content: "Focus on what works:\n1. Navigate to Analytics > Product Reports.\n2. View a sorted list of products by units sold and total revenue.\n3. Export this report as a PDF or Excel file to share with your team or suppliers.",
        titleAr: "تقرير المنتجات الأكثر مبيعاً",
        summaryAr: "حدد العناصر التي تحقق أعلى دخل وخطط لتسويقك بناءً على ذلك.",
        contentAr: "ركز على ما ينجح:\n1. انتقل إلى التحليلات > تقارير المنتجات.\n2. اعرض قائمة مرتبة للمنتجات حسب الوحدات المباعة وإجمالي الدخل.\n3. قم بتصدير هذا التقرير كملف PDF أو Excel لمشاركته مع فريقك أو الموردين.",
        tags: ["operations", "analytics", "inventory"],
        isActive: true
    },
    {
        title: "Creating Discount Coupons",
        summary: "Offer percentage or fixed amount discounts to boost your sales during holiday seasons.",
        content: "Incentivize buyers:\n1. Go to Marketing > Coupons.\n2. Create a code (e.g., 'EID2026').\n3. Choose discount type: % Percentage or Fixed EGP amount.\n4. Set usage limits (e.g., once per customer) and expiry date.",
        titleAr: "إنشاء كوبونات الخصم",
        summaryAr: "قدم خصومات بنسبة مئوية أو بمبلغ ثابت لزيادة مبيعاتك خلال مواسم الأعياد.",
        contentAr: "حفز المشترين:\n1. اذهب إلى التسويق > الكوبونات.\n2. أنشئ كوداً (مثل 'EID2026').\n3. اختر نوع الخصم: نسبة ٪ أو مبلغ ثابت بالجنيه.\n4. حدد حدود الاستخدام (مثل مرة لكل عميل) وتاريخ الانتهاء.",
        tags: ["operations", "marketing", "discounts"],
        isActive: true
    },
    {
        title: "Generating Gift Cards",
        summary: "Create pre-paid digital cards that customers can use to purchase items from your store.",
        content: "Versatile gifting:\n1. Go to Products > Gift Cards.\n2. Create different value cards (e.g., 500 EGP, 1000 EGP).\n3. When purchased, the customer receives a unique secure code via email.\n4. At checkout, they enter the code to apply the balance to their order.",
        titleAr: "إصدار بطاقات الهدايا",
        summaryAr: "أنشئ بطاقات رقمية مسبقة الدفع يمكن للعملاء استخدامها لشراء عناصر من متجرك.",
        contentAr: "هدايا متنوعة:\n1. اذهب إلى المنتجات > بطاقات الهدايا.\n2. أنشئ بطاقات بقيم مختلفة (مثل 500 جنيه، 1000 جنيه).\n3. عند الشراء، يتلقى العميل كوداً فريداً وآمناً عبر البريد.\n4. عند الدفع، يدخلون الكود لتطبيق الرصيد على طلبهم.",
        tags: ["operations", "giftcards", "sales"],
        isActive: true
    },
    {
        title: "Tracking Abandoned Carts",
        summary: "See which potential customers added items to their cart but left before paying.",
        content: "Recover lost sales:\n1. Navigate to Marketing > Abandoned Carts.\n2. View a list of incomplete checkouts and their contents.\n3. Send a manual or automated email reminder with a small coupon to encourage them to finish their purchase.",
        titleAr: "تتبع السلال المتروكة",
        summaryAr: "اعرف العملاء المحتملين الذين أضافوا منتجات لسلتهم ولكن غادروا قبل الدفع.",
        contentAr: "استرجع المبيعات المفقودة:\n1. انتقل إلى التسويق > السلال المتروكة.\n2. اعرض قائمة بالطلبات غير المكتملة ومحتوياتها.\n3. أرسل تذكيراً يدوياً أو آلياً بالبريد مع كوبون صغير لتشجيعهم على إكمال الشراء.",
        tags: ["operations", "marketing", "recovery"],
        isActive: true
    },
    {
        title: "What is the Support Ticket system?",
        summary: "Manage customer inquiries and issues through a structured internal ticketing system.",
        content: "Better customer service:\n1. When a customer uses your contact form or chatbot, a new ticket is created.\n2. You can respond directly from the dashboard.\n3. Change ticket status (Open, In Progress, Resolved).\n4. Keep all customer communication history in one place to avoid confusion.",
        titleAr: "ما هو نظام تذاكر الدعم؟",
        summaryAr: "أدر استفسارات ومشاكل العملاء من خلال نظام تذاكر داخلي منظم.",
        contentAr: "خدمة عملاء أفضل:\n1. عندما يستخدم العميل نموذج الاتصال أو الشات بوت، يتم إنشاء تذكرة جديدة.\n2. يمكنك الرد مباشرة من لوحة التحكم.\n3. غير حالة التذكرة (مفتوحة، قيد التنفيذ، تم الحل).\n4. حافظ على تاريخ تواصل العملاء في مكان واحد لتجنب الارتباك.",
        tags: ["operations", "support", "tickets"],
        isActive: true
    },
    {
        title: "Email Notification options",
        summary: "Customize which internal and customer events trigger an automatic email notification.",
        content: "Stay updated:\n1. Go to Settings > Notifications.\n2. Toggle email triggers for 'New Order', 'Low Stock', and 'Return Request'.\n3. You can also customize the template wording to match your brand's voice.",
        titleAr: "خيارات إشعارات البريد الإلكتروني",
        summaryAr: "خصص الأحداث الداخلية وأحداث العملاء التي تطلق إشعاراً آلياً بالبريد الإلكتروني.",
        contentAr: "ابقَ على اطلاع:\n1. اذهب إلى الإعدادات > الإشعارات.\n2. فعل إشعارات 'طلب جديد'، 'مخزون منخفض'، و 'طلب إرجاع'.\n3. يمكنك أيضاً تخصيص نصوص القوالب لتناسب أسلوب علامتك التجارية.",
        tags: ["operations", "notifications", "email"],
        isActive: true
    },
    {
        title: "Revenue vs Profit reporting",
        summary: "Calculate your actual earnings by adding 'Cost per item' to your products in Buildora.",
        content: "Understand your margins:\n1. For every product, enter the 'Cost per Item' (what you paid the supplier).\n2. Our reporting engine will subtract this from your sales revenue.\n3. View your 'Gross Profit' and 'Net Margin' in the financial reports to ensure your pricing is sustainable.",
        titleAr: "تقارير الإيرادات مقابل الأرباح",
        summaryAr: "احسب أرباحك الحقيقية عن طريق إضافة 'تكلفة القطعة' لمنتجاتك في بيلدورا.",
        contentAr: "افهم هوامش ربحك:\n1. لكل منتج، أدخل 'تكلفة القطعة' (ما دفعته للمورد).\n2. سيقوم محرك التقارير لدينا بخصم ذلك من إيرادات مبيعاتك.\n3. اعرض 'إجمالي الربح' و 'هامش الربح الصافي' في التقارير المالية.",
        tags: ["operations", "analytics", "finance"],
        isActive: true
    },
    {
        title: "How to export Order list to Excel?",
        summary: "Download your order data for external accounting or to send to a delivery partner.",
        content: "Portable data:\n1. Go to the Orders page.\n2. Use filters to select the date range or status.\n3. Click the 'Export CSV' or 'Export Excel' button.\n4. The file includes all customer names, addresses, products, and totals.",
        titleAr: "كيفية تصدير قائمة الطلبات لملف اكسل؟",
        summaryAr: "حمل بيانات طلباتك للمحاسبة الخارجية أو لإرسالها لشريك توصيل.",
        contentAr: "بيانات محمولة:\n1. اذهب لصفحة الطلبات.\n2. استخدم الفلاتر لاختيار النطاق الزمني أو الحالة.\n3. اضغط زر 'تصدير CSV' أو 'تصدير Excel'.\n4. يتضمن الملف كافة أسماء العملاء، العناوين، المنتجات، والإجماليات.",
        tags: ["operations", "data", "excel"],
        isActive: true
    },
    {
        title: "Stock Movement Logs",
        summary: "Audit every stock change to track exactly when and why inventory increased or decreased.",
        content: "Inventory transparency:\n1. Open a Product > Inventory tab.\n2. View the 'Stock Log'.\n3. See history labels like 'Order #102 Sold', 'Manual adjustment by Admin', or 'Restocked from Cancellation'.\n4. This helps you find discrepancies and prevent stock leakage.",
        titleAr: "سجلات حركة المخزون",
        summaryAr: "راقب كل تغيير في المخزون لتتبع متى ولماذا زاد أو نقص المخزون بالضبط.",
        contentAr: "شفافية المخزون:\n1. افتح المنتج > تبويب المخزون.\n2. اعرض 'سجل المخزون'.\n3. سترى تسميات تاريخية مثل 'تم بيع طلب #102'، 'تعديل يدوياً'، أو 'إعادة تخزين بسبب إلغاء'.\n4. يساعدك هذا في اكتشاف الأخطاء ومنع تسرب المخزون.",
        tags: ["operations", "inventory", "audit"],
        isActive: true
    },
    {
        title: "Printing Delivery Manifests",
        summary: "Generate a list of all packages ready for pickup to hand over to your courier driver.",
        content: "Courier coordination:\n1. Select multiple orders in the 'Shipped' or 'Processing' status.\n2. Click 'Bulk Actions' > 'Generate Manifest'.\n3. Print the document which summarizes all packages, weights, and destinations for the driver to sign upon pickup.",
        titleAr: "طباعة بيان الشحنات (Manifest)",
        summaryAr: "أصدر قائمة بجميع الطرود الجاهزة للاستلام لتسليمها لعمال شركة الشحن.",
        contentAr: "تنسيق الشحن:\n1. حدد عدة طلبات في حالة 'تم الشحن' أو 'قيد التنفيذ'.\n2. اضغط 'إجراءات جماعية' > 'إنشاء بيان شحنات'.\n3. اطبع المستند الذي يلخص كافة الطرود، الأوزان، والوجهات ليوقعه السائق عند الاستلام.",
        tags: ["operations", "shipping", "logistics"],
        isActive: true
    },
    {
        title: "Adding Custom Order attributes",
        summary: "Collect extra info at checkout like 'Gift Wrap choice' or 'Preferred Delivery Time'.",
        content: "Tailored checkouts:\n1. Go to Checkout Settings > Custom Fields.\n2. Add a new field (Text, Dropdown, or Checkbox).\n3. Define when it appears.\n4. The customer's response is attached to the order and visible in your dashboard.",
        titleAr: "إضافة سمات مخصصة للطلبات",
        summaryAr: "اجمع معلومات إضافية عند الدفع مثل 'طلب تغليف هدايا' أو 'وقت التوصيل المفضل'.",
        contentAr: "دفع مخصص:\n1. اذهب إلى إعدادات الدفع > الحقول المخصصة.\n2. أضف حقلاً جديداً (نص، قائمة، أو صندوق اختيار).\n3. حدد متى يظهر.\n4. يرفق رد العميل مع الطلب ويظهر في لوحة تحكمك.",
        tags: ["operations", "checkout", "custom"],
        isActive: true
    },

    // === GROWTH (25 Articles) ===
    {
        title: "Setting up Facebook Pixel",
        summary: "Track conversions and optimize meta ads by adding your Pixel ID in Marketing settings.",
        content: "To track your ads:\n1. Get your Pixel ID from Events Manager.\n2. Go to Buildora > Marketing > Pixels.\n3. Paste the ID in the Facebook field.\n4. Our system automatically tracks PageViews, ViewContent, AddToCart, and Purchase events.",
        titleAr: "إعداد بكسل فيسبوك (Facebook Pixel)",
        summaryAr: "تتبع التحويلات وحسن إعلانات ميتا بإضافة معرف البكسل في إعدادات التسويق.",
        contentAr: "لتتبع إعلاناتك:\n1. احصل على معرف البكسل من Events Manager.\n2. اذهب إلى بيلدورا > التسويق > البكسل.\n3. الصق المعرف في حقل فيسبوك.\n4. نظامنا يتتبع تلقائياً أحداث مشاهدة الصفحة، مشاهدة المنتج، الإضافة للسلة، والشراء.",
        tags: ["growth", "pixels", "facebook", "marketing"],
        isActive: true
    },
    {
        title: "Setting up Google Analytics (GA4)",
        summary: "Track visitor behavior and traffic sources by connecting your GA4 Measurement ID.",
        content: "Detailed traffic insights:\n1. Create a GA4 property in Google Analytics.\n2. Copy your 'Measurement ID' (format: G-XXXXXXX).\n3. In Buildora, go to Marketing > Analytics.\n4. Paste the ID. We automatically track page views and ecommerce events.",
        titleAr: "إعداد تحليلات جوجل (GA4)",
        summaryAr: "تتبع سلوك الزوار ومصادر الزيارات بربط معرف القياس الخاص بـ GA4.",
        contentAr: "رؤية مفصلة للزيارات:\n1. أنشئ خاصية GA4 في تحليلات جوجل.\n2. انسخ 'معرف القياس' (G-XXXXXXX).\n3. في بيلدورا، اذهب إلى التسويق > التحليلات.\n4. الصق المعرف. نتتبع تلقائياً مشاهدات الصفحات وأحداث التجارة الإلكترونية.",
        tags: ["growth", "analytics", "google"],
        isActive: true
    },
    {
        title: "TikTok Pixel Integration",
        summary: "Optimize your TikTok ads by tracking user actions on your store storefront.",
        content: "Track TikTok ad performance:\n1. Get your Pixel ID from TikTok Ads Manager.\n2. Submit it in the Buildora Pixels section.\n3. We send events like 'Complete Payment' and 'Add to Cart' back to TikTok to help you find more buyers.",
        titleAr: "تكامل بكسل تيك توك",
        summaryAr: "حسن إعلانات تيك توك بتتبع أفعال المستخدمين في واجهة متجرك.",
        contentAr: "تتبع أداء إعلانات تيك توك:\n1. احصل على معرف البكسل من مدير إعلانات تيك توك.\n2. أرسله في قسم البكسل في بيلدورا.\n3. نرسل أحداثاً مثل 'إكمال الدفع' و 'الإضافة للسلة' إلى تيك توك لمساعدتك في إيجاد مشترين أكثر.",
        tags: ["growth", "pixels", "tiktok"],
        isActive: true
    },
    {
        title: "Snapchat Pixel Setup",
        summary: "Reach a younger audience by tracking Snapchat ad conversions on your website.",
        content: "Snapchat marketing:\n1. Create a Pixel in Snapchat Business Manager.\n2. Paste the ID into Buildora Marketing settings.\n3. Start running 'Swipe Up' ads that lead directly to your products with high-quality tracking.",
        titleAr: "إعداد بكسل سناب شات",
        summaryAr: "وصل لجمهور أصغر سناً بتتبع تحويلات إعلانات سناب شات على موقعك.",
        contentAr: "تسويق سناب شات:\n1. أنشئ بكسل في مدير أعمال سناب شات.\n2. الصق المعرف في إعدادات التسويق ببيلدورا.\n3. ابدأ تشغيل إعلانات 'اسحب للأعلى' التي تؤدي لمنتجاتك مع تتبع عالي الجودة.",
        tags: ["growth", "pixels", "snapchat"],
        isActive: true
    },
    {
        title: "Google Search Console Verification",
        summary: "Verify your store with Google to track search rankings and fix indexing issues.",
        content: "SEO Essentials:\n1. Add your store URL to Google Search Console.\n2. Choose 'HTML Tag' verification method.\n3. Copy the meta tag code and paste it in Buildora > Store Settings > SEO > Header Scripts.\n4. Click 'Verify' in Search Console.",
        titleAr: "توثيق جوجل سيرش كونسول (Search Console)",
        summaryAr: "وثق متجرك مع جوجل لتتبع ترتيبك في البحث وإصلاح مشاكل الأرشفة.",
        contentAr: "أساسيات السيو:\n1. أضف رابط متجرك في Google Search Console.\n2. اختر طريقة التوثيق عبر 'HTML Tag'.\n3. انسخ كود الميتا تاق والصقه في بيلدورا > إعدادات المتجر > SEO > سكربتات الترويسة.\n4. اضغط 'Verifiy' في سيرش كونسول.",
        tags: ["growth", "seo", "google"],
        isActive: true
    },
    {
        title: "Submitting your Sitemap to Google",
        summary: "Help Google index all your product pages faster by submitting your dynamic sitemap.",
        content: "Faster indexing:\n1. Your sitemap is always at 'yourstore.com/sitemap.xml'.\n2. Copy this link.\n3. In Google Search Console, go to 'Sitemaps'.\n4. Paste the URL and click submit. Google will now crawl your products regularly.",
        titleAr: "إرسال خريطة الموقع (Sitemap) لجوجل",
        summaryAr: "ساعد جوجل في أرشفة صفحات منتجاتك بشكل أسرع عن طريق إرسال خريطة الموقع الديناميكية.",
        contentAr: "أرشفة أسرع:\n1. خريطة موقعك دائماً في 'yourstore.com/sitemap.xml'.\n2. انسخ هذا الرابط.\n3. في Google Search Console، اذهب لـ 'Sitemaps'.\n4. الصق الرابط واضغط Submit. سيقوم جوجل الآن بجدولة منتجاتك بانتظام.",
        tags: ["growth", "seo", "google"],
        isActive: true
    },
    {
        title: "Instagram Shopping (Product Catalog)",
        summary: "Tag your products in Instagram posts and stories by syncing your Buildora catalog.",
        content: "Social Selling:\n1. Set up a Meta Commerce Manager account.\n2. Choose 'Add Catalog' > 'Data Feed'.\n3. Use your Buildora Catalog XML link (found in Marketing > Social Selling).\n4. Instagram will sync your products daily so you can tag them in photos.",
        titleAr: "شوبنج إنستقرام (كاتالوج المنتجات)",
        summaryAr: "ضع علامة (Tag) على منتجاتك في بوستات وقصص إنستقرام عن طريق ربط كاتالوج بيلدورا.",
        contentAr: "البيع الاجتماعي:\n1. أنشئ حساباً في Meta Commerce Manager.\n2. اختر 'إضافة كاتالوج' > 'Data Feed'.\n3. استخدم رابط XML لكاتالوج بيلدورا (موجود في التسويق > البيع الاجتماعي).\n4. سيزامن إنستقرام منتجاتك يومياً لتتمكن من الإشارة إليها في الصور.",
        tags: ["growth", "social", "instagram"],
        isActive: true
    },
    {
        title: "Abandoned Cart Email Automations",
        summary: "Automatically send emails to customers who left items in their cart to recover sales.",
        content: "Recover revenue while you sleep:\n1. Go to Marketing > Automations.\n2. Enable 'Abandoned Cart Recovery'.\n3. Set the delay (e.g., 1 hour or 24 hours later).\n4. Customize the email content to include a 'Finish Purchase' button.",
        titleAr: "أتمتة رسائل السلال المتروكة",
        summaryAr: "أرسل رسائل بريد إلكتروني تلقائياً للعملاء الذين تركوا منتجات في سلتهم لاستعادة المبيعات.",
        contentAr: "استعد أرباحك وأنت نائم:\n1. اذهب إلى التسويق > الأتمتة.\n2. فعل 'استعادة السلال المتروكة'.\n3. حدد وقت التأخير (مثلاً ساعة واحدة أو 24 ساعة لاحقاً).\n4. خصص محتوى البريد ليتضمن زر 'إكمال الشراء'.",
        tags: ["growth", "marketing", "automation"],
        isActive: true
    },
    {
        title: "Pinterest Pixel for Visual Brands",
        summary: "If you sell decor or fashion, track Pinterest ad performance with our built-in integration.",
        content: "Visual search marketing:\n1. Copy your Pinterest Tag ID from Pinterest Ads Manager.\n2. Add it to Buildora's Pixels settings.\n3. This tracks when Pinterest users click through to your store and make a buy.",
        titleAr: "بكسل بنترست للبراندات البصرية",
        summaryAr: "إذا كنت تبيع الديكور أو الموضة، فتتبع أداء إعلانات بنترست من خلال التكامل المدمج لدينا.",
        contentAr: "تسويق البحث البصري:\n1. انسخ معرف تاق بنترست من مدير إعلانات بنترست.\n2. أضفه في إعدادات البكسل في بيلدورا.\n3. يتتبع هذا متى يضغط مستخدمو بنترست على متجرك ويقومون بالشراء.",
        tags: ["growth", "pixels", "pinterest"],
        isActive: true
    },
    {
        title: "What is Google Merchant Center?",
        summary: "Show your products in Google Shopping results (the product list at the top of Google search).",
        content: "Get visual in search results:\n1. Create a Google Merchant Center account.\n2. Upload your Buildora product feed URL.\n3. Once approved, your products will appear in the 'Shopping' tab of Google.\n4. Combine this with Google Ads for high-intent traffic.",
        titleAr: "ما هو جوجل ميرشانت سنتر (Merchant Center)؟",
        summaryAr: "اعرض منتجاتك في نتائج جوجل شوبينج (قائمة المنتجات في أعلى بحث جوجل).",
        contentAr: "اظهر بشكل مرئي في نتائج البحث:\n1. أنشئ حساباً في Google Merchant Center.\n2. ارفع رابط منتجات بيلدورا الخاص بك.\n3. بمجرد الموافقة، ستظهر منتجاتك في تبويب 'Shopping' في جوجل.\n4. اربط هذا مع إعلانات جوجل لزيارات عالية الجودة.",
        tags: ["growth", "google", "marketing"],
        isActive: true
    },
    {
        title: "Creating 'Limited Time' Offers",
        summary: "Add a countdown timer to your products to create urgency and increase conversions.",
        content: "Fear of missing out (FOMO):\n1. In the product editor, set a 'Sale Price' and an 'Old Price'.\n2. Add a 'Countdown Timer' section in the Theme Builder.\n3. Set the expiry date. \n4. Once the time is up, the product price reverts to normal or goes out of stock automatically.",
        titleAr: "إنشاء عروض 'لفترة محدودة'",
        summaryAr: "أضف عداداً تنازلياً لمنتجاتك لخلق نوع من الاستعجال وزيادة التحويلات.",
        contentAr: "خلق دافع الشراء (FOMO):\n1. في محرر المنتج، ضع 'سعر خصم' و 'سعر قديم'.\n2. أضف قسم 'عداد تنازلي' في محرر الثيم.\n3. حدد تاريخ الانتهاء.\n4. بمجرد انتهاء الوقت، يعود سعر المنتج للطبيعي أو ينفد المخزون تلقائياً.",
        tags: ["growth", "marketing", "psychology"],
        isActive: true
    },
    {
        title: "Upselling at Checkout",
        summary: "Suggest related products at the checkout page to increase the average order value.",
        content: "Increase cart size:\n1. Go to Marketing > Upsells.\n2. Select a trigger product (e.g., a Phone).\n3. Select recommended products (e.g., Phone Case, screen protector).\n4. These will appear as 'You might also like' suggestions just before the customer pays.",
        titleAr: "البيع الإضافي عند الدفع (Upselling)",
        summaryAr: "اقترح منتجات ذات صلة في صفحة الدفع لزيادة متوسط قيمة الطلب.",
        contentAr: "زد حجم السلة:\n1. اذهب إلى التسويق > Upsells.\n2. اختر منتجاً (مثل موبايل).\n3. اختر المنتجات الموصى بها (مثل جراب موبايل، لاصقة حماية).\n4. ستظهر هذه كمقترحات 'قد يعجبك أيضاً' قبل أن يدفع العميل مباشرة.",
        tags: ["growth", "sales", "upsell"],
        isActive: true
    },
    {
        title: "Collecting Product Reviews",
        summary: "Enable reviews to allow customers to upload photos and ratings for products they bought.",
        content: "Build trust with social proof:\n1. Go to Settings > Product Reviews.\n2. Enable the feature.\n3. Customers will receive an email after delivery asking for their feedback.\n4. You can moderate and approve reviews before they appear live on the product page.",
        titleAr: "جمع مراجعات المنتجات",
        summaryAr: "فعل المراجعات للسماح للعملاء برفع صور وتقييمات للمنتجات التي اشتروها.",
        contentAr: "ابنِ الثقة بالدليل الاجتماعي:\n1. اذهب إلى الإعدادات > مراجعات المنتجات.\n2. فعل الميزة.\n3. سيتلقى العملاء بريداً بعد التوصيل يطلب رأيهم.\n4. يمكنك مراجعة والموافقة على التقييمات قبل ظهورها على صفحة المنتج.",
        tags: ["growth", "trust", "reviews"],
        isActive: true
    },
    {
        title: "Wholesale & Bulk Pricing",
        summary: "Offer discounts for customers who buy larger quantities of the same item.",
        content: "Attract B2B buyers:\n1. Edit a Product.\n2. Go to 'Bulk Pricing' section.\n3. Add tiers (e.g., Buy 10 for 500 EGP each, Buy 50 for 450 EGP each).\n4. The price updates automatically in the cart based on the quantity added.",
        titleAr: "أسعار الجملة والكميات",
        summaryAr: "قدم خصومات للعملاء الذين يشترون كميات أكبر من نفس الصنف.",
        contentAr: "اجذب مشتري الجملة:\n1. عدل المنتج.\n2. اذهب لقسم 'أسعار الجملة'.\n3. أضف شرائح (مثلاً: اشترِ 10 بسعر 500 للقطعة، اشترِ 50 بسعر 450 للقطعة).\n4. يتم تحديث السعر تلقائياً في السلة بناءً على الكمية المضافة.",
        tags: ["growth", "b2b", "wholesale"],
        isActive: true
    },
    {
        title: "How to use 'WhatsApp Floating Button'?",
        summary: "Add a WhatsApp icon that follows users as they scroll, making it easy to ask questions.",
        content: "Instant support leads to sales:\n1. Go to Marketing > WhatsApp Support.\n2. Add your phone number and a custom 'Welcome Message'.\n3. The button appears on all store pages.\n4. When clicked, it opens WhatsApp directly with a link to the product the customer is viewing.",
        titleAr: "كيفية استخدام 'زر الواتساب العائم'؟",
        summaryAr: "أضف أيقونة واتساب تتبع المستخدمين أثناء التمرير، مما يسهل عليهم طرح الأسئلة.",
        contentAr: "الدعم الفوري يؤدي لمبيعات:\n1. اذهب إلى التسويق > دعم واتساب.\n2. أضف رقم هاتفك ورسالة ترحيبية.\n3. يظهر الزر في جميع صفحات المتجر.\n4. عند الضغط، يفتح واتساب مباشرة مع رابط المنتج الذي يشاهده العميل.",
        tags: ["growth", "support", "whatsapp"],
        isActive: true
    },
    {
        title: "Cross-selling in the Cart",
        summary: "Display small 'Add-ons' in the shopping cart drawer to encourage one last item.",
        content: "Impulse buying:\n1. Go to Appearance > Cart Settings.\n2. Enable 'Cross-selling items'.\n3. Choose 2-3 small items (accessories, batteries, etc.).\n4. These appear as small cards inside the side-cart drawer before checkout starts.",
        titleAr: "البيع المتبادل في السلة (Cross-selling)",
        summaryAr: "اعرض 'إضافات' صغيرة في درج سلة التسوق لتشجيع العميل على شراء قطعة أخيرة.",
        contentAr: "الشراء اللحظي:\n1. اذهب إلى المظهر > إعدادات السلة.\n2. فعل 'عناصر البيع التبادلي'.\n3. اختر 2-3 أصناف صغيرة (إكسسوارات، بطاريات، إلخ).\n4. تظهر هذه كبطاقات داخل درج السلة الجانبي قبل بدء الدفع.",
        tags: ["growth", "sales", "cart"],
        isActive: true
    },
    {
        title: "Creating Landing Pages for Ads",
        summary: "Build focused, high-conversion pages to use as the destination for your Facebook or TikTok ads.",
        content: "Don't waste ad spend:\n1. Go to Pages > Landing Pages.\n2. Use a template designed for high conversion (minimal navigation, big CTA buttons).\n3. Focus the entire page on a single product or offer.\n4. Link your ad directly to this page instead of the homepage for better ROI.",
        titleAr: "إنشاء صفحات هبوط للإعلانات (Landing Pages)",
        summaryAr: "أنشئ صفحات مركزة وعالية التحويل لتكون وجهة لإعلانات فيسبوك أو تيك توك.",
        contentAr: "لا تضيع ميزانية الإعلانات:\n1. اذهب إلى الصفحات > صفحات الهبوط.\n2. استخدم قالباً مصمماً للتحويل العالي (منيو بسيط، أزرار واضحة).\n3. ركز الصفحة بالكامل على منتج واحد أو عرض واحد.\n4. اربط إعلانك مباشرة بهذه الصفحة بدلاً من الرئيسية لنتائج أفضل.",
        tags: ["growth", "marketing", "ads"],
        isActive: true
    },
    {
        title: "Affiliate Marketing (Referrals)",
        summary: "Let your loyal customers earn money or store credit by inviting their friends to buy.",
        content: "Word of mouth growth:\n1. Enable the Affiliate program in Settings.\n2. Customers get a unique referral link in their account dashboard.\n3. Define the reward: e.g., 'Give 50 EGP, Get 50 EGP'.\n4. Rewards are auto-applied as discount codes once the referred order is delivered.",
        titleAr: "التسويق بالعمولة (Referrals)",
        summaryAr: "اجعل عملاءك الأوفياء يكسبون المال أو رصيد المتجر بدعوة أصدقائهم للشراء.",
        contentAr: "النمو بالتوصية:\n1. فعل نظام الأفلييت في الإعدادات.\n2. يحصل العملاء على رابط إحالة فريد في لوحة تحكم حساباتهم.\n3. حدد الجائزة: مثلاً 'أعطِ 50 جنيهاً، واكسب 50 جنيهاً'.\n4. تطبق الجوائز تلقائياً كأكواد خصم بمجرد توصيل طلب الصديق.",
        tags: ["growth", "marketing", "referral"],
        isActive: true
    },
    {
        title: "Email Marketing with Mailchimp",
        summary: "Sync your customer list with Mailchimp to run professional newslette campaigns.",
        content: "Keep customers engaged:\n1. Go to Marketing > Integrations > Mailchimp.\n2. Enter your Mailchimp API Key.\n3. Every time a new customer buys or signs up for your newsletter, they are added to your Mailchimp list automatically.",
        titleAr: "التسويق بالبريد عبر ميل تشيمب (Mailchimp)",
        summaryAr: "زامن قائمة عملائك مع ميل تشيمب لتشغيل حملات بريدية احترافية.",
        contentAr: "ابقَ على تواصل مع عملائك:\n1. اذهب إلى التسويق > التكامل > ميل تشيمب.\n2. أدخل مفتاح API الخاص بميل تشيمب.\n3. في كل مرة يشتري عميل جديد أو يشترك في النشرة، يضاف لقائمتك هناك تلقائياً.",
        tags: ["growth", "marketing", "email"],
        isActive: true
    },
    {
        title: "What are Webhooks?",
        summary: "Send real-time order data to 3rd party apps like Google Sheets or your CRM using webhooks.",
        content: "Advanced automation:\n1. Go to Settings > Webhooks.\n2. Add a URL from Zapier or your custom internal tool.\n3. Select triggers like 'Order Created'.\n4. Every time it happens, Buildora sends a JSON payload with all the data to your URL instantly.",
        titleAr: "ما هو الويبهوكس (Webhooks)؟",
        summaryAr: "أرسل بيانات الطلبات فوراً لتطبيقات خارجية مثل جوجل شيتس أو الـ CRM الخاص بك.",
        contentAr: "أتمتة متقدمة:\n1. اذهب إلى الإعدادات > Webhooks.\n2. أضف رابطاً من Zapier أو أداتك الخاصة.\n3. اختر المحفزات مثل 'إنشاء طلب'.\n4. في كل مرة يحدث فيها ذلك، ترسل بيلدورا البيانات فوراً لهذا الرابط.",
        tags: ["growth", "api", "automation"],
        isActive: true
    },
    {
        title: "Dynamic Remarketing Ads",
        summary: "Show customers the exact products they viewed on your store through Facebook and Google ads.",
        content: "Stay in front of your customers:\n1. Ensure your Facebook Catalog and Pixel are correctly integrated.\n2. In Facebook Ads Manager, choose 'Dynamic Ads'.\n3. Meta will automatically show users the product they looked at but didn't buy, reminding them to finish checkout.",
        titleAr: "إإعلانات إعادة الاستهداف الديناميكية",
        summaryAr: "اعرض للعملاء نفس المنتجات التي شاهدوها في متجرك عبر إعلانات فيسبوك وجوجل.",
        contentAr: "ابقَ أمام عملائك:\n1. تأكد من ربط كاتالوج وبكسل فيسبوك بشكل صحيح.\n2. في مدير إعلانات فيسبوك، اختر 'Dynamic Ads'.\n3. سيقوم ميتا تلقائياً بعرض المنتج الذي شاهده المستخدم ولم يشترِه، لتذكيره بالعودة للشراء.",
        tags: ["growth", "ads", "remarketing"],
        isActive: true
    },
    {
        title: "Google Analytics Enhanced Ecommerce",
        summary: "Understand exactly where customers drop off in the buying process with detailed event tracking.",
        content: "Granular funnel analysis:\n1. When GA4 is enabled, Buildora automatically sends 'Add to Cart', 'Begin Checkout', and 'Purchase' events.\n2. View the 'Monetization' report in Google Analytics.\n3. Identify if customers are leaving at the shipping step or payment step to fix checkout frictions.",
        titleAr: "تحليلات جوجل للتجارة الإلكترونية المعززة",
        summaryAr: "افهم بالضبط من أين يغادر العملاء عملية الشراء من خلال تتبع أحداث مفصل.",
        contentAr: "تحليل خطوات الشراء:\n1. عند تفعيل GA4، ترسل بيلدورا تلقائياً أحداث الإضافة للسلة، وبدء الدفع، والشراء.\n2. اعرض تقرير 'Monetization' في تحليلات جوجل.\n3. حدد ما إذا كان العملاء يغادرون عند خطوة الشحن أو الدفع لإصلاح المشكلة.",
        tags: ["growth", "analytics", "ecommerce"],
        isActive: true
    },
    {
        title: "Facebook 'Shop' tab Integration",
        summary: "Show your Buildora products directly on your Facebook Business Page shop tab.",
        content: "Sell where they scroll:\n1. Connect your Facebook Page to Meta Commerce Manager.\n2. Sync your Catalog.\n3. Enable the 'Shop' tab on your page.\n4. Customers can browse products on Facebook and click to pay on your Buildora store.",
        titleAr: "تكامل تبويب 'المتجر' في فيسبوك",
        summaryAr: "اعرض منتجات بيلدورا مباشرة في تبويب المتجر بصفحتك التجارية على فيسبوك.",
        contentAr: "بع أينما يتواجدون:\n1. اربط صفحتك في فيسبوك بـ Meta Commerce Manager.\n2. زامن الكاتالوج الخاص بك.\n3. فعل تبويب 'Shop' في صفحتك.\n4. يمكن للعملاء تصفح المنتجات على فيسبوك والضغط للدفع في متجرك على بيلدورا.",
        tags: ["growth", "social", "facebook"],
        isActive: true
    },
    {
        title: "Influencer Tracking Codes",
        summary: "Create unique discount codes for influencers to track which one brings you the most sales.",
        content: "Measure influencer ROI:\n1. Go to Marketing > Coupons.\n2. Create a code like 'SARAH20'.\n3. Set a specific discount for that code.\n4. In Analytics, you can see exactly how many orders were made using each influencer's code.",
        titleAr: "أكواد تتبع المؤثرين (Influencers)",
        summaryAr: "أنشئ أكواد خصم فريدة للمؤثرين لتتبع أيهم يحقق لك أكبر قدر من المبيعات.",
        contentAr: "قس عائد استثمار المؤثرين:\n1. اذهب للتسويق > الكوبونات.\n2. أنشئ كوداً مثل 'SARAH20'.\n3. حدد خصماً خاصاً لهذا الكود.\n4. في التحليلات، يمكنك رؤية عدد الطلبات التي تمت باستخدام كود كل مؤثر بدقة.",
        tags: ["growth", "marketing", "influencers"],
        isActive: true
    },
    {
        title: "Loyalty Points Program",
        summary: "Reward customers with points for every EGP they spend, which they can later redeem for discounts.",
        content: "Retention strategy:\n1. Go to Marketing > Loyalty Program.\n2. Define the ratio (e.g., 100 points = 10 EGP).\n3. Customers see their available points in their account dashboard.\n4. They can slide a bar at checkout to use their points and reduce the total order price.",
        titleAr: "نظام نقاط الولاء",
        summaryAr: "كافئ العملاء بنقاط مقابل كل جنيه ينفقونه، ويمكنهم استبدالها لاحقاً بخصومات.",
        contentAr: "استراتيجية الحفاظ على العملاء:\n1. اذهب إلى التسويق > برنامج الولاء.\n2. حدد النسبة (مثلاً 100 نقطة = 10 جنيهات).\n3. يرى العملاء نقاطهم المتاحة في لوحة تحكم حسابهم.\n4. يمكنهم استخدام شريط التمرير عند الدفع لاستخدام نقاطهم وتقليل سعر الطلب الإجمالي.",
        tags: ["growth", "loyalty", "marketing"],
        isActive: true
    },
];

const seedArticles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB. Wiping existing articles...');

        await Article.deleteMany({});
        console.log('Inserting initial articles...');

        await Article.insertMany(initialArticles);
        console.log('Articles seeded successfully!');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding articles:', error);
        process.exit(1);
    }
};

seedArticles();
