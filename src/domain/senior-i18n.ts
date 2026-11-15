import type { DoseSlot, MealTiming, MoodState } from "./types";

export type SeniorLanguage = "en" | "hi" | "mr";

export interface SeniorTranslations {
  label: string;
  shortLabel: string;
  speechLang: string;
  companionTag: string;
  morningGreeting: string;
  afternoonGreeting: string;
  eveningGreeting: string;
  noMedsSub: string;
  emptyHeroTitle: string;
  emptyHeroBody: string;
  openCaregiverHub: string;
  readSchedule: string;
  enableReminders: string;
  remindersOn: string;
  remindersBlocked: string;
  markDoseTaken: string;
  snooze15: string;
  takenBtn: string;
  snoozeBtn: string;
  undoTaken: string;
  snoozedStatus: string;
  takenStatus: string;
  pendingStatus: string;
  allDoneTitle: string;
  allDoneBody: string;
  timelineTitle: string;
  completeLabel: string;
  nothingScheduled: string;
  windowPassedGuard: string;
  nextUpLabel: string;
  wellnessTitle: string;
  saveCheckin: string;
  savedCheckin: string;
  bpTop: string;
  bpBottom: string;
  bloodSugar: string;
  sosTitle: string;
  sosButton: string;
  nextVisitLabel: string;
  slots: Record<DoseSlot, string>;
  meals: Record<MealTiming, string>;
  moods: Record<MoodState, string>;
}

export const SENIOR_LANGUAGES: Record<SeniorLanguage, SeniorTranslations> = {
  en: {
    label: "English",
    shortLabel: "EN",
    speechLang: "en-IN",
    companionTag: "Today's Companion",
    morningGreeting: "Good morning",
    afternoonGreeting: "Good afternoon",
    eveningGreeting: "Good evening",
    noMedsSub:
      "No medications are scheduled yet. Your caregiver can set up today's medicines in Caregiver Hub.",
    emptyHeroTitle: "No medications scheduled yet",
    emptyHeroBody:
      "Caregivers can add medicines, upload a prescription, and configure daily slots in Caregiver Hub.",
    openCaregiverHub: "Open Caregiver Hub",
    readSchedule: "Read My Schedule",
    enableReminders: "Enable Reminders",
    remindersOn: "Reminders Active",
    remindersBlocked: "Notifications Blocked",
    markDoseTaken: "Mark Dose Taken",
    snooze15: "Snooze 15m",
    takenBtn: "Taken",
    snoozeBtn: "Snooze",
    undoTaken: "Undo Taken",
    snoozedStatus: "snoozed",
    takenStatus: "taken",
    pendingStatus: "pending",
    allDoneTitle: "All scheduled doses complete for today",
    allDoneBody:
      "Great job staying steady. Everything scheduled for today is complete.",
    timelineTitle: "Daily Medication Timeline",
    completeLabel: "complete",
    nothingScheduled: "Nothing scheduled in this window.",
    windowPassedGuard:
      "Time window passed — confirm with your caregiver before doubling a missed dose.",
    nextUpLabel: "Next Up",
    wellnessTitle: "How are you feeling today?",
    saveCheckin: "Save Check-in",
    savedCheckin: "Check-in saved & shared.",
    bpTop: "BP Top (Systolic)",
    bpBottom: "BP Bottom (Diastolic)",
    bloodSugar: "Blood Sugar (mg/dL)",
    sosTitle: "Need Immediate Help?",
    sosButton: "Open SOS Card",
    nextVisitLabel: "Care Reminder",
    slots: {
      morning: "Morning",
      afternoon: "Afternoon",
      evening: "Evening",
      night: "Night",
    },
    meals: {
      before_food: "Before food",
      after_food: "After food",
      with_water: "With full glass of water",
      anytime: "Anytime in window",
    },
    moods: {
      good: "Feeling Good",
      tired: "A Bit Tired",
      dizzy: "Dizzy / Unsteady",
      nausea: "Upset Stomach",
    },
  },
  hi: {
    label: "हिन्दी",
    shortLabel: "हिं",
    speechLang: "hi-IN",
    companionTag: "आज का साथी",
    morningGreeting: "सुप्रभात",
    afternoonGreeting: "नमस्ते",
    eveningGreeting: "शुभ संध्या",
    noMedsSub:
      "अभी कोई दवा सेट नहीं है। परिवार के सदस्य Caregiver Hub से दवाइयाँ जोड़ सकते हैं।",
    emptyHeroTitle: "अभी कोई दवा निर्धारित नहीं है",
    emptyHeroBody:
      "देखभालकर्ता Caregiver Hub में दवाइयाँ जोड़ सकते हैं या डॉक्टर का पर्चा स्कैन कर सकते हैं।",
    openCaregiverHub: "Caregiver Hub खोलें",
    readSchedule: "दवाइयाँ सुनें",
    enableReminders: "रिमाइंडर चालू करें",
    remindersOn: "रिमाइंडर चालू है",
    remindersBlocked: "नोटिफिकेशन बंद हैं",
    markDoseTaken: "दवा ले ली",
    snooze15: "15 मिनट बाद",
    takenBtn: "ले ली",
    snoozeBtn: "बाद में",
    undoTaken: "वापस बदलें",
    snoozedStatus: "बाद में",
    takenStatus: "ले ली",
    pendingStatus: "बाकी है",
    allDoneTitle: "आज की सभी दवाइयाँ पूरी हो गईं",
    allDoneBody: "बहुत बढ़िया! आज की सभी निर्धारित खुराक ली जा चुकी हैं।",
    timelineTitle: "दैनिक दवा समय-सारणी",
    completeLabel: "पूरा",
    nothingScheduled: "इस समय कोई दवा नहीं है।",
    windowPassedGuard:
      "समय निकल चुका है — पिछली दवा की दोहरी खुराक लेने से पहले देखभालकर्ता से पूछें।",
    nextUpLabel: "अगली दवा",
    wellnessTitle: "आज आप कैसा महसूस कर रहे हैं?",
    saveCheckin: "सेव करें",
    savedCheckin: "जानकारी सेव हो गई।",
    bpTop: "ऊपरी बीपी (Systolic)",
    bpBottom: "निचला बीपी (Diastolic)",
    bloodSugar: "ब्लड शुगर (mg/dL)",
    sosTitle: "तुरंत मदद चाहिए?",
    sosButton: "SOS कार्ड खोलें",
    nextVisitLabel: "देखभाल सूचना",
    slots: {
      morning: "सुबह",
      afternoon: "दोपहर",
      evening: "शाम",
      night: "रात",
    },
    meals: {
      before_food: "खाने से पहले",
      after_food: "खाने के बाद",
      with_water: "पूरे गिलास पानी के साथ",
      anytime: "समय के अनुसार कभी भी",
    },
    moods: {
      good: "अच्छा महसूस",
      tired: "थोड़ी थकान",
      dizzy: "चक्कर आना",
      nausea: "पेट खराब",
    },
  },
  mr: {
    label: "मराठी",
    shortLabel: "मरा",
    speechLang: "mr-IN",
    companionTag: "आजचा सोबती",
    morningGreeting: "सुप्रभात",
    afternoonGreeting: "नमस्कार",
    eveningGreeting: "शुभ संध्याकाळ",
    noMedsSub:
      "अद्याप कोणतीही औषधे जोडलेली नाहीत. काळजीवाहू Caregiver Hub मध्ये औषधे जोडू शकतात.",
    emptyHeroTitle: "अद्याप कोणतेही औषध नाही",
    emptyHeroBody:
      "काळजीवाहू Caregiver Hub मध्ये औषधे जोडू शकतात किंवा डॉक्टरांची चिठ्ठी तपासू शकतात.",
    openCaregiverHub: "Caregiver Hub उघडा",
    readSchedule: "वेळापत्रक ऐका",
    enableReminders: "स्मरणपत्र सुरू करा",
    remindersOn: "स्मरणपत्र सुरू",
    remindersBlocked: "सूचना बंद आहेत",
    markDoseTaken: "औषध घेतले",
    snooze15: "१५ मिनिटांनंतर",
    takenBtn: "घेतले",
    snoozeBtn: "नंतर",
    undoTaken: "बदल रद्द करा",
    snoozedStatus: "नंतर",
    takenStatus: "घेतले",
    pendingStatus: "बाकी आहे",
    allDoneTitle: "आजची सर्व औषधे पूर्ण झाली आहेत",
    allDoneBody: "उत्तम! आजची सर्व ठरलेली औषधे घेतली गेली आहेत.",
    timelineTitle: "दैनिक औषध वेळापत्रक",
    completeLabel: "पूर्ण",
    nothingScheduled: "या वेळेत कोणतेही औषध नाही.",
    windowPassedGuard:
      "वेळ निघून गेली आहे — चुकलेल्या औषधाचा दुप्पट डोस घेण्यापूर्वी काळजीवाहूंना विचारा.",
    nextUpLabel: "पुढील औषध",
    wellnessTitle: "आज तुम्हाला कसे वाटत आहे?",
    saveCheckin: "माहिती जतन करा",
    savedCheckin: "माहिती जतन केली.",
    bpTop: "वरचा बीपी (Systolic)",
    bpBottom: "खालचा बीपी (Diastolic)",
    bloodSugar: "रक्तातील साखर (mg/dL)",
    sosTitle: "त्वरित मदत हवी आहे?",
    sosButton: "SOS कार्ड उघडा",
    nextVisitLabel: "काळजी नोंद",
    slots: {
      morning: "सकाळ",
      afternoon: "दुपार",
      evening: "संध्याकाळ",
      night: "रात्र",
    },
    meals: {
      before_food: "जेवणापूर्वी",
      after_food: "जेवणानंतर",
      with_water: "भरपूर पाण्यासोबत",
      anytime: "वेळेनुसार कधीही",
    },
    moods: {
      good: "छान वाटत आहे",
      tired: "थोडा थकवा",
      dizzy: "चक्कर येत आहे",
      nausea: "मळमळ / अस्वस्थ",
    },
  },
};
