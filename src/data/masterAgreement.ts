// DVT Master Service Agreement + SLA (integrated: cloud storage, website
// development and managed digital services) — version 2.0, in English and
// Marathi. The text of sections 1-14 is taken from the two PDFs supplied by DVT
// (public/legal/*.pdf); the Marathi is the "meaning-consistent translation" of
// the English, section for section.
//
// What is NOT here on purpose:
//  * Section 15 (contact + publication fields): it is rendered from
//    masterAgreementDetails.ts and the admin-edited support contact, so nothing
//    is typed in twice.
//  * The notes the PDFs address to the publisher (publish a Privacy Notice,
//    "legal review note", how the checkbox must behave): they are not terms of
//    the agreement. The checkbox behaviour is implemented in the sign-up form.
//
// Placeholders in the text — {{PARTY}} and {{CORRECTION_DAYS}} — are filled from
// masterAgreementDetails.ts; until they are filled the original bracketed
// placeholder from the PDF is shown.
//
// Whenever the TEXT changes, bump MASTER_AGREEMENT_VERSION here AND
// CURRENT_AGREEMENT_VERSION in backend/src/config/agreement.ts. Sign-up
// records the version a user accepted, and the backend rejects a mismatch.

export const MASTER_AGREEMENT_VERSION = '2.0'

export type AgreementLang = 'en' | 'mr'

export interface AgreementSection {
  number: number
  title: string
  paragraphs: string[]
}

export interface AgreementDoc {
  lang: AgreementLang
  htmlLang: string
  path: string
  pdfPath: string
  title: string
  subtitle: string
  tagline: string
  sections: AgreementSection[]
  ui: {
    sections: string
    print: string
    downloadPdf: string
    signUp: string
    version: string
    effectiveDate: string
    otherLanguageLabel: string
    contactHeading: string
    placeholder: string
    partyPlaceholder: string
    fields: {
      legalName: string
      address: string
      supportEmail: string
      privacyContact: string
      billingContact: string
      website: string
      gstin: string
    }
  }
}

export const masterAgreement: Record<AgreementLang, AgreementDoc> = {
  en: {
    lang: 'en',
    htmlLang: 'en',
    path: '/master-agreement/en',
    pdfPath: '/legal/DVT_Master_Service_Agreement_English.pdf',
    title: 'DVT Master Service Agreement + SLA',
    subtitle: 'Integrated Cloud Storage, Website Development & Managed Digital Services',
    tagline: 'Website Acceptance Version',
    ui: {
      sections: 'Sections',
      print: 'Print / save as PDF',
      downloadPdf: 'Download PDF',
      signUp: 'Continue to sign up',
      version: 'Version',
      effectiveDate: 'Effective Date',
      otherLanguageLabel: 'मराठीत वाचा',
      contactHeading: 'Contact Details',
      placeholder: '[INSERT]',
      partyPlaceholder: '[LEGAL ENTITY / PROPRIETOR NAME, ADDRESS]',
      fields: {
        legalName: 'DVT legal name',
        address: 'Registered/business address',
        supportEmail: 'Support email',
        privacyContact: 'Privacy/grievance contact',
        billingContact: 'Billing contact',
        website: 'Website',
        gstin: 'GSTIN (if applicable)',
      },
    },
    sections: [
      { number: 1, title: "Parties, Acceptance and Priority", paragraphs: ["This Master Service Agreement and Service Level Agreement (Agreement) governs services supplied under the DVT brand by {{PARTY}} (DVT) to the accepting customer (Customer). By signing an order or actively ticking an unticked acceptance checkbox before purchase/activation, Customer accepts the version presented. DVT will retain the version, timestamp, account ID and reasonable acceptance evidence. A mutually signed statement of work (SOW)/order prevails for its specific scope, followed by this Agreement and applicable service schedules. A separate Privacy Notice applies."] },
      { number: 2, title: "Services and Scope", paragraphs: ["Services may include cloud/file backup, NAS and off-site storage, CCTV archive, recovery, website design/development, web or mobile applications, hosting, domain and professional email administration, maintenance, SEO, social-media management, content creation, advertising, digital campaigns, integrations, grievance portals and related IT support. Only items, milestones, capacities, accounts, channels and deliverables expressly listed in the accepted SOW/plan are included. All other work requires a written change order."] },
      { number: 3, title: "Project Delivery and Customer Cooperation", paragraphs: ["The SOW shall specify deliverables, dependencies, timeline, acceptance tests, revision rounds, fees and support period. Customer must provide timely lawful content, credentials, brand assets, approvals and feedback. Timelines extend reasonably for Customer delays or third-party approvals. DVT will offer a reasonable correction period for material nonconformity reported within {{CORRECTION_DAYS}} days of delivery; silence alone does not automatically waive statutory rights. Extra revisions and new features are separately quoted."] },
      { number: 4, title: "Websites, Apps and Intellectual Property", paragraphs: ["Customer owns its pre-existing materials and content. Upon full payment, Customer receives ownership of specifically identified bespoke final deliverables to the extent DVT is legally entitled to transfer them; DVT retains pre-existing code, reusable libraries, methods, templates and tools, licensed to Customer as needed to operate the delivered solution. Open-source and third-party components remain under their own licences. Source-code repository access, editable design files, deployment documentation and transfer of domain/cloud accounts must be specified in the SOW; otherwise no implied transfer of third-party licences. Customer warrants it has rights to supplied logos, photos, text and media."] },
      { number: 5, title: "Social Media, Advertising and Content Approval", paragraphs: ["Customer retains ownership/control of its social pages, ad accounts, pixels and business profiles and should grant DVT role-based access rather than passwords. Customer is responsible for truthful claims, lawful promotions, consent to use images/testimonials, political/election advertising permissions where applicable, and final approval of posts/ads. DVT may use approved freelancers and tools under confidentiality and security obligations. Ad spend, boosts, creator fees, stock media, subscriptions and platform charges are separate unless expressly included. Reach, leads, sales, ranking, verification and account approval are not guaranteed. Platform moderation, API limits, suspensions and policy changes may affect delivery; DVT will assist reasonably but cannot override platform decisions."] },
      { number: 6, title: "Hosting, Domain, Email and Third Parties", paragraphs: ["Domain, VPS/private cloud, Vercel, databases, storage, DNS, Google Workspace, transactional email, SMS/WhatsApp, payment gateways and platform APIs may be supplied by third parties under their terms. The SOW must state who owns each account, who pays renewals, usage caps, data location and handover access. “First year included” means only the documented resource allowance and term; scaling, overages, renewals, premium APIs and taxes may be charged separately after notice/approval as specified in the order. No unlimited traffic or absolute security is promised."] },
      { number: 7, title: "Storage, Backup and CCTV Schedule", paragraphs: ["Customer retains ownership of uploaded data and authorises DVT and approved providers to process it solely to deliver and secure purchased services. Capacity, users/devices, backup frequency, retention, snapshots, immutability and restore assistance are plan-limited. Customer must identify correct sources, maintain access and periodically test recovery; independent backup is recommended for critical data. CCTV sizing depends on camera count, bitrate, hours and retention; equipment, electricity or local connectivity failures may interrupt capture. Exceeding quotas may result in notified additional charges or upload restrictions. Lost customer-controlled encryption keys may make recovery impossible. Page 1"] },
      { number: 8, title: "Privacy, Security and Incident Response", paragraphs: ["Each party shall comply with applicable Indian law, including the IT Act and DPDP Act/Rules as provisions become applicable. The Customer is responsible for lawful collection, notices/consents and citizen-facing privacy information for its portal; DVT will follow documented processing instructions where acting as a processor. Parties will agree any necessary data-processing addendum, breach notification contacts and lawful retention/deletion schedule. DVT applies reasonable plan-appropriate controls such as TLS, least privilege, MFA, logging, backups and vulnerability management; no service is completely secure. Security incidents will be escalated without undue delay, with statutory reporting responsibilities allocated by law and the SOW."] },
      { number: 9, title: "Service Levels and Support", paragraphs: ["For paid storage plans expressly carrying the SLA, DVT targets 99.5% monthly availability of the DVT-controlled access layer, excluding planned maintenance and events outside reasonable control. Unless otherwise agreed, acknowledgement targets are: critical 4 business hours; high 8 business hours; normal 1 business day. These are response targets, not fixed repair deadlines. Website/app bug support lasts one year where included, covering reproducible defects in agreed deliverables, not enhancements, user-caused issues, unsupported changes or third-party outages. No RPO/RTO, search ranking, ad results or service credits apply unless expressly stated in the SOW."] },
      { number: 10, title: "Fees, Changes, Suspension and Refunds", paragraphs: ["Setup, development, milestone, subscription, hosting, advertising, API, storage, overage and support charges are governed by the order; GST and statutory charges apply where required. Approved milestone work and consumed third-party charges are ordinarily non-refundable to the extent lawful; unperformed prepaid work is reconciled on cancellation under the SOW and applicable law. DVT may pause affected services after reasonable notice for overdue undisputed fees, unlawful use or material security risk. Scope changes require written approval of price and timeline. Pricing changes affect future periods with reasonable notice."] },
      { number: 11, title: "Acceptable Use and Confidentiality", paragraphs: ["Customer must not upload unlawful, infringing, abusive or malicious material or misuse systems, data or messaging channels. Each party will protect the other party’s confidential non-public information with reasonable care and disclose it only to authorised personnel/providers or where legally required. DVT may restrict affected services where necessary to prevent material harm, subject to notice where feasible."] },
      { number: 12, title: "Termination, Data Export and Handover", paragraphs: ["Either party may terminate as provided in the SOW or for uncured material breach following reasonable notice, except urgent legal/security cases. Customer should export data before expiry. For storage services, unless the order or law states otherwise, recoverable data may remain for up to 30 days after termination and then be deleted from active systems, with backups expiring on normal cycles. Website/domain/source-code handover depends on the ownership and paid deliverables defined above; reasonable migration work may be separately charged. DVT shall not deliberately withhold legally owned Customer Data solely to coerce payment."] },
      { number: 13, title: "Warranties, Liability and Indemnity", paragraphs: ["DVT will perform with reasonable skill and care, but does not warrant uninterrupted service, perfect cyber protection, particular business outcomes or permanent availability of third-party platforms. To the extent permitted by law, neither party is liable for indirect/consequential loss. DVT’s aggregate contractual liability for the affected service is limited to fees paid or payable for that service in the preceding six months, except liabilities that cannot legally be limited and any additional exceptions agreed in a signed SOW. Customer is responsible for claims caused by its unlawful content, instructions or rights violations; DVT remains responsible for its own unlawful conduct or contractual breach."] },
      { number: 14, title: "Law, Notices and Updates", paragraphs: ["Indian law governs. Parties will first attempt written resolution in good faith; subject to mandatory consumer and other jurisdiction rules, competent courts in Mumbai, Maharashtra shall have jurisdiction. Notices may be delivered to registered account emails or the customer portal. Material changes to these terms will be notified reasonably and renewed acceptance obtained when legally or contractually necessary."] },
    ],
  },
  mr: {
    lang: 'mr',
    htmlLang: 'mr',
    path: '/master-agreement/mr',
    pdfPath: '/legal/DVT_Master_Service_Agreement_Marathi.pdf',
    title: 'DVT मास्टर सेवा करार व सेवा-स्तर करार (MSA + SLA)',
    subtitle: 'एकत्रित क्लाउड स्टोरेज, वेबसाइट विकास व व्यवस्थापित डिजिटल सेवा',
    tagline: 'वेबसाइटवरील स्वीकृतीसाठी आवृत्ती',
    ui: {
      sections: 'विभाग',
      print: 'प्रिंट / PDF म्हणून जतन करा',
      downloadPdf: 'PDF डाउनलोड करा',
      signUp: 'साइन अप करण्यास पुढे जा',
      version: 'आवृत्ती',
      effectiveDate: 'प्रभावी तारीख',
      otherLanguageLabel: 'Read in English',
      contactHeading: 'संपर्क तपशील',
      placeholder: '[भरा]',
      partyPlaceholder: '[कायदेशीर संस्था/मालकाचे नाव, पत्ता]',
      fields: {
        legalName: 'DVT कायदेशीर नाव',
        address: 'नोंदणीकृत/व्यवसाय पत्ता',
        supportEmail: 'सहाय्य ईमेल',
        privacyContact: 'गोपनीयता/तक्रार संपर्क',
        billingContact: 'बिलिंग संपर्क',
        website: 'वेबसाइट',
        gstin: 'GSTIN (लागू असल्यास)',
      },
    },
    sections: [
      { number: 1, title: "पक्षकार, स्वीकृती आणि प्राधान्यक्रम", paragraphs: ["हा करार DVT ब्रँडअंतर्गत {{PARTY}} (“DVT”) आणि सेवा स्वीकारणारा ग्राहक यांच्यात लागू होतो. ग्राहकाने ऑर्डरवर सही केल्यास किंवा खरेदी/सेवा सुरू करण्यापूर्वी स्वतः निवडलेला स्वीकृती चेकबॉक्स टिक केल्यास त्या वेळी दाखवलेली आवृत्ती स्वीकारली असे मानले जाईल. DVT आवृत्ती, वेळ, खाते ओळख आणि योग्य स्वीकृती पुरावा जतन करेल. विशिष्ट कामासाठी दोन्ही पक्षांनी मान्य केलेल्या कामाच्या व्याप्तीपत्रकाला (SOW)/ऑर्डरला प्रथम प्राधान्य; त्यानंतर हा करार व लागू सेवा परिशिष्टे. स्वतंत्र गोपनीयता सूचना लागू राहील."] },
      { number: 2, title: "सेवा व कामाची व्याप्ती", paragraphs: ["सेवांमध्ये क्लाउड/फाइल बॅकअप, NAS व ऑफ-साइट स्टोरेज, CCTV संग्रहण, डेटा पुनर्प्राप्ती, वेबसाइट डिझाइन/विकास, वेब किंवा मोबाइल ॲप्स, होस्टिंग, डोमेन व व्यावसायिक ईमेल व्यवस्थापन, देखभाल, SEO, सोशल मीडिया व्यवस्थापन, कंटेंट निर्मिती, जाहिराती, डिजिटल मोहिमा, इंटिग्रेशन्स, तक्रार पोर्टल व IT सहाय्य असू शकते. मान्य SOW/प्लॅनमध्ये स्पष्ट नमूद केलेल्या सेवा, टप्पे, क्षमता, खाती, चॅनेल व डिलिव्हरेबल्सच समाविष्ट असतील. इतर कामासाठी लेखी बदल-ऑर्डर आवश्यक आहे."] },
      { number: 3, title: "प्रकल्प वितरण व ग्राहकाचे सहकार्य", paragraphs: ["SOW मध्ये डिलिव्हरेबल्स, आवश्यक अवलंबित्वे, वेळापत्रक, स्वीकृती चाचण्या, सुधारणा फेऱ्या, शुल्क व सहाय्यकाल नमूद केला जाईल. ग्राहकाने कायदेशीर मजकूर, लॉगिन-अधिकार, ब्रँड सामग्री, मंजुरी व अभिप्राय वेळेवर द्यावेत. ग्राहक किंवा तृतीय पक्षामुळे उशीर झाल्यास वेळापत्रक वाजवी प्रमाणात वाढेल. वितरणानंतर {{CORRECTION_DAYS}} दिवसांत कळवलेल्या महत्त्वाच्या त्रुटी सुधारण्यासाठी DVT वाजवी संधी देईल; ग्राहकाचे मौन म्हणजे कायदेशीर हक्कांचा त्याग नव्हे. अतिरिक्त सुधारणा व नवीन वैशिष्ट्यांना वेगळे शुल्क लागू शकते."] },
      { number: 4, title: "वेबसाइट, ॲप्स व बौद्धिक संपदा", paragraphs: ["ग्राहकाच्या आधीपासूनच्या सामग्रीचे व मजकुराचे हक्क ग्राहकाकडे राहतील. संपूर्ण पैसे मिळाल्यानंतर SOW मध्ये स्पष्ट ओळख दिलेल्या विशेषतः ग्राहकासाठी तयार केलेल्या अंतिम कामाचे हक्क DVT कायदेशीररीत्या हस्तांतरित करू शकते त्या मर्यादेत ग्राहकाला मिळतील. DVT चे आधीचे कोड, पुनर्वापरयोग्य लायब्ररी, पद्धती, टेम्पलेट्स व साधने DVT कडेच राहतील; दिलेले समाधान वापरण्यास आवश्यक परवाना ग्राहकाला मिळेल. ओपन-सोर्स/तृतीय-पक्ष घटक त्यांच्या परवान्यांनुसार असतील. सोर्स-कोड रिपॉझिटरी, संपादनयोग्य डिझाइन, डिप्लॉयमेंट कागदपत्रे व डोमेन/क्लाउड खात्यांचे हस्तांतरण SOW मध्ये स्पष्ट असावे. ग्राहकाने दिलेले लोगो, फोटो, मजकूर व मीडिया वापरण्याचा अधिकार असल्याची जबाबदारी ग्राहकाची आहे."] },
      { number: 5, title: "सोशल मीडिया, जाहिराती व कंटेंट मंजुरी", paragraphs: ["सोशल पेजेस, जाहिरात खाती, पिक्सेल व बिझनेस प्रोफाइल यांचे नियंत्रण ग्राहकाकडे राहील. पासवर्ड शेअर करण्याऐवजी भूमिका-आधारित प्रवेश द्यावा. जाहिरातीतील दावे खरे असणे, प्रचार कायदेशीर असणे, फोटो/प्रशंसापत्रांसाठी संमती आणि लागू असल्यास राजकीय/निवडणूक जाहिरात परवानग्या घेणे व पोस्ट/जाहिरातींची अंतिम मंजुरी देणे ग्राहकाची जबाबदारी आहे. DVT गोपनीयता व सुरक्षा अटींवर फ्रीलान्सर्स/साधने वापरू शकते. जाहिरात बजेट, बूस्ट, क्रिएटर फी, स्टॉक मीडिया, सदस्यता व प्लॅटफॉर्म शुल्क स्पष्टपणे समाविष्ट नसल्यास वेगळे असेल. पोहोच, लीड्स, विक्री, रँकिंग, व्हेरिफिकेशन किंवा खाते मंजुरीची हमी नाही. प्लॅटफॉर्म धोरणे, API मर्यादा किंवा निलंबनाचा परिणाम होऊ शकतो; DVT वाजवी मदत करेल, पण प्लॅटफॉर्मचा निर्णय बदलू शकत नाही."] },
      { number: 6, title: "होस्टिंग, डोमेन, ईमेल व तृतीय-पक्ष सेवा", paragraphs: ["डोमेन, VPS/प्रायव्हेट क्लाउड, Vercel, डेटाबेस, स्टोरेज, DNS, Google Workspace, व्यवहारिक ईमेल, SMS/WhatsApp, पेमेंट गेटवे व API या तृतीय-पक्ष सेवांच्या अटी लागू होऊ शकतात. प्रत्येक खात्याचा मालक, नूतनीकरणाचे पैसे कोण देईल, वापरमर्यादा, डेटाचे स्थान आणि हस्तांतरण प्रवेश SOW मध्ये नमूद असावा. “पहिले वर्ष समाविष्ट” म्हणजे दस्तऐवजात नमूद संसाधनमर्यादा व कालावधीपुरतेच; वाढीव क्षमता, मर्यादेपेक्षा जास्त वापर, नूतनीकरण, प्रीमियम API व कर यांना ऑर्डरनुसार सूचना/मंजुरीनंतर अतिरिक्त शुल्क लागू शकते. अमर्याद ट्रॅफिक किंवा पूर्ण सुरक्षेची हमी नाही."] },
      { number: 7, title: "स्टोरेज, बॅकअप व CCTV सेवा", paragraphs: ["अपलोड केलेल्या डेटाचे मालकीहक्क ग्राहकाकडेच राहतील. खरेदी केलेली सेवा पुरवणे व सुरक्षित ठेवणे यापुरते DVT व मान्य पुरवठादारांना डेटा हाताळण्याची परवानगी असेल. क्षमता, वापरकर्ते/उपकरणे, बॅकअप वारंवारता, डेटा राखण्याचा कालावधी, स्नॅपशॉट्स, अपरिवर्तनीय प्रत व रिस्टोर सहाय्य हे प्लॅनपुरते मर्यादित असतील. योग्य डेटा स्रोत ओळखणे, प्रवेश सुरू ठेवणे व पुनर्प्राप्ती तपासणे ग्राहकाने करावे; महत्त्वाच्या डेटाची स्वतंत्र प्रत शिफारसीय आहे. CCTV स्टोरेज कॅमेरे, बिटरेट, तास व रिटेन्शनवर अवलंबून असते. उपकरणे, वीज किंवा स्थानिक इंटरनेट बिघाडामुळे रेकॉर्डिंग खंडित होऊ शकते. मर्यादा ओलांडल्यास पूर्वसूचनेनंतर शुल्क किंवा अपलोड निर्बंध लागू शकतात. ग्राहकाकडे असलेली एन्क्रिप्शन की हरवल्यास डेटा परत मिळणे अशक्य होऊ शकते."] },
      { number: 8, title: "गोपनीयता, सुरक्षा व घटना प्रतिसाद", paragraphs: ["दोन्ही पक्ष लागू भारतीय कायद्यांचे, IT Act आणि DPDP Act/Rules मधील लागू झालेल्या तरतुदींचे पालन करतील. नागरिकांकडून माहिती गोळा करण्याचा कायदेशीर आधार, सूचना/संमती व पोर्टलवरील गोपनीयता माहिती देण्याची जबाबदारी ग्राहकाची आहे. डेटा प्रोसेसर म्हणून काम करताना DVT दस्तऐवजीकृत सूचनांचे पालन करेल. आवश्यकतेनुसार डेटा-प्रक्रिया परिशिष्ट, डेटा-भंग सूचना संपर्क व डेटा जतन/विलोपन कालावधी ठरवला जाईल. DVT प्लॅननुसार TLS, किमान प्रवेश, MFA, लॉग्स, बॅकअप व असुरक्षा व्यवस्थापनासारखी वाजवी सुरक्षा वापरेल; कोणतीही सेवा पूर्ण सुरक्षित नसते. सुरक्षा घटना अनावश्यक विलंब न करता कळवली जाईल; वैधानिक अहवालाची जबाबदारी कायदा व SOW नुसार असेल."] },
      { number: 9, title: "सेवा स्तर व सहाय्य", paragraphs: ["SLA स्पष्टपणे समाविष्ट असलेल्या सशुल्क स्टोरेज प्लॅनसाठी DVT-नियंत्रित प्रवेशस्तरावर मासिक 99.5% उपलब्धतेचे लक्ष्य आहे; नियोजित देखभाल व वाजवी नियंत्रणाबाहेरील घटना वगळल्या जातील. अन्यथा ठरले नसल्यास प्रतिसाद स्वीकारण्याची लक्ष्यवेळ: गंभीर घटना 4 कामकाजाचे तास; उच्च परिणाम 8 कामकाजाचे तास; सामान्य विनंती 1 कामकाजाचा दिवस. ही प्रतिसादाची लक्ष्ये आहेत, दुरुस्तीची निश्चित मुदत नाही. समाविष्ट असल्यास वेबसाइट/ॲप बग सपोर्ट 1 वर्षासाठी असून मान्य कामातील पुन्हा निर्माण करता येणाऱ्या त्रुटींसाठी आहे; नवीन फीचर्स, ग्राहकामुळे समस्या, असमर्थित बदल व तृतीय-पक्ष बिघाड यात येत नाहीत. SOW मध्ये स्पष्ट नसल्यास RPO/RTO, सर्च रँकिंग, जाहिरात परिणाम किंवा सेवा क्रेडिटची हमी नाही."] },
      { number: 10, title: "शुल्क, बदल, निलंबन व परतावा", paragraphs: ["सेटअप, विकास, टप्प्यांनुसार देयके, सदस्यता, होस्टिंग, जाहिराती, API, स्टोरेज, अतिरिक्त वापर व सहाय्य शुल्क ऑर्डरनुसार असेल. लागू GST व वैधानिक शुल्क अतिरिक्त असू शकते. मंजूर टप्प्यांतील पूर्ण झालेले काम आणि वापरलेल्या तृतीय-पक्ष सेवांचे शुल्क कायद्याने अनुमत मर्यादेत साधारणतः परत न मिळणारे असेल. रद्द केल्यास न केलेल्या प्रीपेड कामाचा हिशेब SOW व लागू कायद्यानुसार केला जाईल. निर्विवाद थकीत रक्कम, बेकायदेशीर वापर किंवा महत्त्वाच्या सुरक्षा जोखमीसाठी वाजवी सूचनेनंतर संबंधित सेवा थांबवता येतील. कामाच्या व्याप्तीतील बदलांसाठी किंमत व वेळापत्रकाची लेखी मंजुरी आवश्यक. भावी दरबदल वाजवी सूचनेने लागू होतील."] },
      { number: 11, title: "स्वीकारार्ह वापर व गोपनीय माहिती", paragraphs: ["ग्राहकाने बेकायदेशीर, अधिकारभंग करणारा, अपमानकारक किंवा हानिकारक मजकूर अपलोड करू नये किंवा प्रणाली/डेटा/संदेश माध्यमांचा गैरवापर करू नये. दोन्ही पक्ष एकमेकांची सार्वजनिक नसलेली गोपनीय माहिती वाजवी काळजीने सुरक्षित ठेवतील; अधिकृत व्यक्ती/पुरवठादार किंवा कायदेशीर गरज असल्यासच उघड करतील. गंभीर हानी टाळण्यासाठी आवश्यक असल्यास DVT संबंधित सेवा मर्यादित करू शकते आणि शक्य असेल तेथे सूचना देईल."] },
      { number: 12, title: "समाप्ती, डेटा निर्यात व हस्तांतरण", paragraphs: ["SOW मधील अटींनुसार किंवा वाजवी नोटिशीनंतरही न सुधारलेल्या गंभीर करारभंगासाठी कोणताही पक्ष करार समाप्त करू शकतो; तातडीच्या कायदेशीर/सुरक्षा बाबी अपवाद आहेत. ग्राहकाने सेवा संपण्यापूर्वी डेटा निर्यात करावा. स्टोरेज सेवेसाठी ऑर्डर/कायदा वेगळे सांगत नसल्यास सेवा संपल्यानंतर पुनर्प्राप्त करता येणारा डेटा 30 दिवसांपर्यंत राहू शकतो; नंतर सक्रिय प्रणालीतून हटवला जाऊ शकतो व बॅकअप नियमानुसार कालबाह्य होईल. वेबसाइट/डोमेन/सोर्स-कोड हस्तांतरण वरील मालकी व देय कामाच्या अटींवर अवलंबून असेल; माइग्रेशनला वेगळे शुल्क असू शकते. केवळ पैसे वसूल करण्यासाठी ग्राहकाच्या कायदेशीर मालकीचा डेटा मुद्दाम रोखला जाणार नाही."] },
      { number: 13, title: "हमी, जबाबदारी मर्यादा व नुकसानभरपाई", paragraphs: ["DVT वाजवी कौशल्य व काळजीने सेवा देईल; अखंड सेवा, परिपूर्ण सायबर संरक्षण, विशिष्ट व्यावसायिक परिणाम किंवा तृतीय-पक्ष प्लॅटफॉर्मची कायम उपलब्धता यांची हमी देत नाही. कायद्याने अनुमत मर्यादेत कोणताही पक्ष अप्रत्यक्ष/परिणामी नुकसानीस जबाबदार नसेल. संबंधित सेवेबाबत DVT ची एकत्रित करारनिहाय जबाबदारी घटना घडण्यापूर्वीच्या सहा महिन्यांत त्या सेवेसाठी भरलेल्या किंवा देय शुल्कापुरती मर्यादित असेल; कायद्याने मर्यादित न करता येणारी जबाबदारी व स्वाक्षरी केलेल्या SOW मधील अपवाद यांना हे लागू नाही. ग्राहकाच्या बेकायदेशीर मजकूर/सूचना/हक्कभंगामुळे उद्भवणाऱ्या दाव्यांची जबाबदारी ग्राहकाची; DVT स्वतःच्या बेकायदेशीर कृती किंवा करारभंगासाठी जबाबदार राहील."] },
      { number: 14, title: "कायदा, सूचना व अद्यतने", paragraphs: ["भारतीय कायदा लागू राहील. पक्ष प्रथम लेखी चर्चेद्वारे वाद सोडवण्याचा प्रामाणिक प्रयत्न करतील. अनिवार्य ग्राहक संरक्षण व इतर न्यायक्षेत्र नियमांच्या अधीन राहून मुंबई, महाराष्ट्र येथील सक्षम न्यायालयांना अधिकार असेल. नोंदणीकृत ईमेल किंवा ग्राहक पोर्टलवर सूचना देता येतील. महत्त्वाचे बदल वाजवीरीत्या कळवले जातील आणि कायदेशीर/करारनिहाय आवश्यक असल्यास पुन्हा स्वीकृती घेतली जाईल."] },
    ],
  },
}
