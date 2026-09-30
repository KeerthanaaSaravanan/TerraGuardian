/**
 * Reusable Internationalization (i18n) Foundation for TerraGuardian Safe.
 *
 * Supports the 8 primary languages of the North Eastern Region of India (MDoNER):
 * - English (en)
 * - Hindi (hi)
 * - Assamese (as)
 * - Bengali (bn)
 * - Nepali (ne)
 * - Manipuri / Meitei (mni)
 * - Mizo (lus)
 * - Bodo (brx)
 */

export type SupportedLanguage = "en" | "hi" | "as" | "bn" | "ne" | "mni" | "lus" | "brx";

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", nativeName: "English", region: "All NER" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", region: "National / NER" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", region: "Assam & Western Corridor" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", region: "Tripura & Barak Valley" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", region: "Sikkim & Foothills" },
  { code: "mni", name: "Manipuri", nativeName: "মৈতৈলোন্", region: "Manipur" },
  { code: "lus", name: "Mizo", nativeName: "Mizo ṭawng", region: "Mizoram" },
  { code: "brx", name: "Bodo", nativeName: "बर'", region: "Bodoland Territorial Region" },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    app_title: "TerraGuardian Safe",
    app_tagline: "Your Landslide Safety Companion",
    network_tag: "NER Citizen Network",
    active_monsoon_advisory: "ACTIVE MONSOON ADVISORY",
    advisory_body: "Heavy precipitation active along West Kameng, NH-13 Trans-Arunachal Highway. Exercise caution near steep cut slopes.",
    stay_safe_title: "Stay Safe on the Road",
    stay_safe_subtitle: "Report observations · Get alerts · Stay informed",
    btn_report_hazard: "Report Observation",
    btn_safety_guide: "Landslide Safety & Emergency Hotlines",
    step_photo_title: "1. Take a Photo",
    step_photo_desc: "Capture roadside mud, rockfall, or slope cracks.",
    step_gps_title: "2. GPS Auto-Locate",
    step_gps_desc: "Coordinates recorded for emergency responder patrol.",
    step_dispatch_title: "3. Verified Dispatch",
    step_dispatch_desc: "Authorities review and dispatch clearance teams.",
    road_status_title: "Corridor Road Status",
    road_status_bct: "NH-13 BCT Road: Precautionary Warning at KM-42 (One-way traffic only)",
    emergency_contacts: "Emergency Hotlines",
    ddma_helpline: "DDMA Control Room: 1077 | Police: 112 | SDRF: 1070",
    report_wizard_title: "Report Hazard Observation",
    category_label: "Hazard Category",
    severity_label: "Observed Severity",
    notes_label: "Observation Details",
    offline_banner: "You are currently offline. Reports will be saved locally and submitted automatically when connectivity returns.",
    sync_pending: "report(s) queued for sync",
    unverified_disclaimer: "Citizen observations are classified as UNVERIFIED until physically confirmed by SDRF or local magistrate patrols.",
  },
  hi: {
    app_title: "टेरा-गार्डियन सेफ",
    app_tagline: "आपका भूस्खलन सुरक्षा साथी",
    network_tag: "पूर्वोत्तर नागरिक नेटवर्क",
    active_monsoon_advisory: "सक्रिय मानसून चेतावनी",
    advisory_body: "पश्चिम कामेंग, NH-13 राजमार्ग पर भारी वर्षा जारी है। खड़ी ढलानों के पास सावधानी बरतें।",
    stay_safe_title: "सड़क पर सुरक्षित रहें",
    stay_safe_subtitle: "स्थिति रिपोर्ट करें · अलर्ट प्राप्त करें · सतर्क रहें",
    btn_report_hazard: "भूस्खलन की रिपोर्ट करें",
    btn_safety_guide: "सुरक्षा दिशानिर्देश एवं आपातकालीन नंबर",
    step_photo_title: "1. फोटो लें",
    step_photo_desc: "सड़क किनारे मलबा, पत्थरों का गिरना या दरारें रिकॉर्ड करें।",
    step_gps_title: "2. जीपीएस स्थान",
    step_gps_desc: "राहत दल के लिए निर्देशांक स्वतः दर्ज होते हैं।",
    step_dispatch_title: "3. त्वरित कार्रवाई",
    step_dispatch_desc: "प्रशासन समीक्षा कर बचाव दल भेजता है।",
    road_status_title: "सड़क स्थिति",
    road_status_bct: "NH-13 BCT रोड: KM-42 पर चेतावनी (केवल एकतरफा आवाजाही)",
    emergency_contacts: "आपातकालीन संपर्क",
    ddma_helpline: "डीडीएमए कंट्रोल रूम: 1077 | पुलिस: 112 | एसडीआरएफ: 1070",
    report_wizard_title: "खतरे की रिपोर्ट करें",
    category_label: "खतरे की श्रेणी",
    severity_label: "गंभीरता",
    notes_label: "विवरण",
    offline_banner: "आप ऑफ़लाइन हैं। आपकी रिपोर्ट सुरक्षित है और नेटवर्क आने पर अपने आप भेजी जाएगी।",
    sync_pending: "रिपोर्ट सिंक के लिए कतारबद्ध",
    unverified_disclaimer: "नागरिक रिपोर्ट को एसडीआरएफ टीम द्वारा सत्यापन होने तक असत्यापित माना जाता है।",
  },
  as: {
    app_title: "টেৰা-গাৰ্ডিয়ান ছেফ",
    app_tagline: "আপোনাৰ ভূমিস্খলন সুৰক্ষা সহচৰ",
    network_tag: "উত্তৰ-পূব নাগৰিক নেটৱৰ্ক",
    active_monsoon_advisory: "সক্ৰিয় বাৰিষাৰ সতৰ্কবাৰ্তা",
    advisory_body: "পশ্চিম কামেং, NH-13 ঘাইপথত প্ৰবল বৃষ্টিপাত হৈছে। থিয় পাহাৰীয়া ঢালৰ ওচৰত সাৱধানতা অৱলম্বন কৰক।",
    stay_safe_title: "পথত সুৰক্ষিত থাকক",
    stay_safe_subtitle: "পৰিভ্ৰমণৰ খবৰ দিয়ক · সতৰ্কবাৰ্তা পাওক",
    btn_report_hazard: "ভূমিস্খলনৰ খবৰ দিয়ক",
    btn_safety_guide: "সুৰক্ষা নিৰ্দেশনা আৰু জৰুৰীকালীন নম্বৰ",
    step_photo_title: "১. ফটো তোলক",
    step_photo_desc: "পথৰ কাষৰ বোকা, শিল বা ফাঁটৰ ফটো তোলক।",
    step_gps_title: "২. GPS অৱস্থান",
    step_gps_desc: "উদ্ধাৰকাৰী দলৰ বাবে স্থান স্বয়ংক্রিয়ভাৱে নথিভুক্ত হয়।",
    step_dispatch_title: "৩. বিভাগীয় প্ৰেৰণ",
    step_dispatch_desc: "প্ৰশাসনে পৰীক্ষা কৰি তৎপৰতাৰে দল প্ৰেৰণ কৰে।",
    road_status_title: "পথৰ স্থিতি",
    road_status_bct: "NH-13 BCT পথ: KM-42 ত সতৰ্কতা (কেৱল একমুখী চলাচল)",
    emergency_contacts: "জৰুৰীকালীন যোগাযোগ",
    ddma_helpline: "DDMA নিয়ন্ত্ৰণ কক্ষ: ১০৭৭ | আৰক্ষী: ১১২ | SDRF: ১০৭০",
    report_wizard_title: "বিপদৰ বিষয়ে অৱগত কৰক",
    category_label: "বিপদৰ শ্ৰেণী",
    severity_label: "তীব্ৰতা",
    notes_label: "বিৱৰণ",
    offline_banner: "আপুনি অফলাইনত আছে। নেটৱৰ্ক পোৱাৰ লগে লগে ৰিপৰ্ট প্ৰেৰণ কৰা হ'ব।",
    sync_pending: "টা ৰিপৰ্ট জমা হৈ আছে",
    unverified_disclaimer: "প্ৰশাসনৰ দ্বাৰা নিশ্চিত নোহোৱালৈকে এই প্ৰতিবেদন অপৰীক্ষিত হিচাপে চিহ্নিত কৰা হয়।",
  },
  bn: {
    app_title: "টেরা-গার্ডিয়ান সেফ",
    app_tagline: "আপনার ভূমিধস সুরক্ষা সহচর",
    network_tag: "উত্তর-পূর্ব নাগরিক নেটওয়ার্ক",
    active_monsoon_advisory: "সক্রিয় বর্ষার সতর্কতা",
    advisory_body: "পশ্চিম কামেং ও NH-13 রাজপথে ভারী বৃষ্টিপাত অব্যাহত। সতর্ক থাকুন।",
    stay_safe_title: "পথে নিরাপদ থাকুন",
    stay_safe_subtitle: "পরিস্থিতি জানান · সতর্কতা পান",
    btn_report_hazard: "ভূমিধসের রিপোর্ট জমা দিন",
    btn_safety_guide: "সুরক্ষা নির্দেশিকা ও জরুরি নম্বর",
    step_photo_title: "১. ছবি তুলুন",
    step_photo_desc: "রাস্তার ধারে মাটি বা পাথর পড়ার ছবি তুলুন।",
    step_gps_title: "২. জিপিএস অবস্থান",
    step_gps_desc: "উদ্ধারকারী দলের জন্য স্থানাঙ্ক সংরক্ষিত হয়।",
    step_dispatch_title: "৩. যাচাই ও দল প্রেরণ",
    step_dispatch_desc: "কর্তৃপক্ষ পর্যালোচনা করে টিম পাঠায়।",
    road_status_title: "সড়কের অবস্থা",
    road_status_bct: "NH-13 BCT রোড: KM-42 তে সতর্কতা",
    emergency_contacts: "জরুরি যোগাযোগ",
    ddma_helpline: "DDMA কন্ট্রোল রুম: ১০৭৭ | পুলিশ: ১১২ | SDRF: ১০৭০",
    report_wizard_title: "বিপদের তথ্য দিন",
    category_label: "বিপদের বিভাগ",
    severity_label: "তীব্রতা",
    notes_label: "বিবরণ",
    offline_banner: "আপনি অফলাইনে আছেন। ইন্টারনেট সংযুক্ত হলে রিপোর্ট স্বয়ংক্রিয়ভাবে জমা হবে।",
    sync_pending: "টি রিপোর্ট অপেক্ষমান",
    unverified_disclaimer: "মাঠপর্যায়ে যাচাইয়ের আগে রিপোর্টটি অযাচাইকৃত অবস্থায় থাকবে।",
  },
  ne: {
    app_title: "टेरा-गार्डियन सेफ",
    app_tagline: "तपाईंको पहिरो सुरक्षा साथी",
    network_tag: "पूर्वोत्तर नागरिक सञ्जाल",
    active_monsoon_advisory: "मनसुन सतर्कता सूचना",
    advisory_body: "पश्चिम कामेंग, NH-13 सडकखण्डमा भारी वर्षा जारी छ। भीरपाखा नजिक सावधानी अपनाउनुहोस्।",
    stay_safe_title: "सडकमा सुरक्षित रहनुहोस्",
    stay_safe_subtitle: "जानकारी दिनुहोस् · सतर्कता पाउनुहोस्",
    btn_report_hazard: "पहिरोको जानकारी दिनुहोस्",
    btn_safety_guide: "सुरक्षा निर्देशिका र आपतकालीन नम्बर",
    step_photo_title: "१. फोटो खिच्नुहोस्",
    step_photo_desc: "सडक किनाराको पहिरो वा चिरा परेको फोटो लिनुहोस्।",
    step_gps_title: "२. जीपीएस स्थान",
    step_gps_desc: "उद्धार टोलीका लागि निर्देशांक स्वतः रेकर्ड हुन्छ।",
    step_dispatch_title: "३. स्थलगत टोली परिचालन",
    step_dispatch_desc: "प्रशासनले अवलोकन गरी टोली पठाउँछ।",
    road_status_title: "सडक अवस्था",
    road_status_bct: "NH-13 BCT रोड: KM-42 मा सतर्कता",
    emergency_contacts: "आपतकालीन सम्पर्क",
    ddma_helpline: "DDMA नियन्त्रण कक्ष: १०७७ | प्रहरी: ११२ | SDRF: १०७०",
    report_wizard_title: "जोखिमको विवरण दिनुहोस्",
    category_label: "जोखिमको प्रकार",
    severity_label: "गम्भीरता",
    notes_label: "विवरण",
    offline_banner: "तपाईं हाल अफलाइन हुनुहुन्छ। नेटवर्क आएपछि विवरण पठाइनेछ।",
    sync_pending: "रिपोर्ट सिङ्कका लागि प्रतिक्षारत",
    unverified_disclaimer: "सुरक्षा टोलीले प्रमाणीकरण नगरेसम्म यो प्रतिवेदन असत्यापित रहन्छ।",
  },
  mni: {
    app_title: "TerraGuardian Safe (Manipuri)",
    app_tagline: "Ching-Leikhrangba Cheksin Thourang",
    network_tag: "NER Citizen Network",
    active_monsoon_advisory: "MONSOON ADVISORY: NONG NONGBA CHEKSIN WA",
    advisory_body: "Nong kanna chuba maramna ching leikhrangba yabagi cheksin wa.",
    stay_safe_title: "Lambi Semba Amasung Cheksinba",
    stay_safe_subtitle: "Report toubiyu · Alert fangbiyu",
    btn_report_hazard: "Ching Leikhrangba Report Toubiyu",
    btn_safety_guide: "Emergency Number Sing",
    step_photo_title: "1. Photo Loubiyu",
    step_photo_desc: "Lambi nakanda leikhrangba photo loubiyu.",
    step_gps_title: "2. GPS Location",
    step_gps_desc: "Automatic GPS coordinates record toui.",
    step_dispatch_title: "3. Action Loukhatpa",
    step_dispatch_desc: "Authority singna team thadorak-i.",
    road_status_title: "Lambi Phibam",
    road_status_bct: "NH-13 BCT Lambi: KM-42 da cheksin wa",
    emergency_contacts: "Emergency Helpline",
    ddma_helpline: "Control Room: 1077 | Police: 112 | SDRF: 1070",
    report_wizard_title: "Hazard Report",
    category_label: "Category",
    severity_label: "Severity",
    notes_label: "Details",
    offline_banner: "Offline leiri. Network fanglega automatic submit tourani.",
    sync_pending: "report queue touri",
    unverified_disclaimer: "Ground truth verify toudrifao UNVERIFIED oina thamgani.",
  },
  lus: {
    app_title: "TerraGuardian Safe (Mizo)",
    app_tagline: "Min Vanglaia Himna Puih Bawm",
    network_tag: "NER Citizen Network",
    active_monsoon_advisory: "RUAHSUR CHIAH CHUNGCHANG",
    advisory_body: "Ruah nasa tak a sur avangin kawngpui kam leh tlangpang ah fimkhur a ngai.",
    stay_safe_title: "Kawngpui ah Him Takin Awm Rawh",
    stay_safe_subtitle: "Hriattirna pe rawh · Alert dawng rawh",
    btn_report_hazard: "Lei Min Hriattirna Thehlut Rawh",
    btn_safety_guide: "Himna Lamkaihruaina leh Helpline",
    step_photo_title: "1. Thlalak La Rawh",
    step_photo_desc: "Kawngpui kama leimin leh vau chim thla la rawh.",
    step_gps_title: "2. GPS Hmun Zawnna",
    step_gps_desc: "Chhan chhuah hna thawktuten hmun an hriat theih nan.",
    step_dispatch_title: "3. Bawhzui Hna",
    step_dispatch_desc: "Thawktute tirhchhuah an ni ang.",
    road_status_title: "Kawngpui Dinhmun",
    road_status_bct: "NH-13 BCT Kawng: KM-42 ah fimkhurna pek a ni",
    emergency_contacts: "Emergency Helpline",
    ddma_helpline: "DDMA: 1077 | Police: 112 | SDRF: 1070",
    report_wizard_title: "Report Thehluhna",
    category_label: "Chi hrang",
    severity_label: "Nasa lam",
    notes_label: "Hrilhfiahna",
    offline_banner: "Offline i ni. Network a awm leh hunah thawn a ni ang.",
    sync_pending: "reports a in-queue",
    unverified_disclaimer: "Official-ten an finfiah hma chuan UNVERIFIED a ni.",
  },
  brx: {
    app_title: "TerraGuardian Safe (Bodo)",
    app_tagline: "Hasa Glinao Songrakhi",
    network_tag: "NER Citizen Network",
    active_monsoon_advisory: "BARIKHA THWRANG SANNA",
    advisory_body: "Okhabor jwng ha glinay khobor. Hasa khathiao songrakhi thang.",
    stay_safe_title: "Lamayao Songrakhwi Thang",
    stay_safe_subtitle: "Khobor hwo · Alert mwn",
    btn_report_hazard: "Ha Glinay Khobor Hwo",
    btn_safety_guide: "Songrakhi Lama arw Emergency Number",
    step_photo_title: "1. Photo Labw",
    step_photo_desc: "Hasa glinay photo labw.",
    step_gps_title: "2. GPS Jayga",
    step_gps_desc: "GPS coordinates gwbwn record jayw.",
    step_dispatch_title: "3. Action Labw",
    step_dispatch_desc: "Team thidw thangw.",
    road_status_title: "Lama Phibam",
    road_status_bct: "NH-13 BCT: KM-42 yao songrakhi hwonay dong",
    emergency_contacts: "Emergency Helpline",
    ddma_helpline: "DDMA: 1077 | Police: 112 | SDRF: 1070",
    report_wizard_title: "Hazard Report",
    category_label: "Category",
    severity_label: "Severity",
    notes_label: "Details",
    offline_banner: "Offline dong. Network mwnbla submit janai.",
    sync_pending: "report queue",
    unverified_disclaimer: "Verify janay simba UNVERIFIED thanai.",
  },
};

let currentLang: SupportedLanguage = "en";

export function setLanguage(lang: SupportedLanguage) {
  currentLang = lang;
  if (typeof window !== "undefined") {
    localStorage.setItem("tg_safe_lang", lang);
  }
}

export function getLanguage(): SupportedLanguage {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("tg_safe_lang") as SupportedLanguage;
    if (saved && TRANSLATIONS[saved]) return saved;
  }
  return currentLang;
}

export function t(key: string): string {
  const lang = getLanguage();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}
