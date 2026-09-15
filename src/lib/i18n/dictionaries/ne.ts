import type { Dictionary } from "./ja";

const ne: Dictionary = {
  common: {
    back: "पछाडि",
    backHome: "← होममा फर्कने",
    cancel: "रद्द गर्ने",
    save: "सेभ गर्ने",
    add: "थप्ने",
    edit: "सम्पादन",
    delete: "मेटाउने",
    next: "अर्को",
    done: "सकियो",
    loading: "लोड हुँदैछ...",
    processing: "प्रक्रियामा छ...",
    error: "त्रुटि",
    search: "खोज्ने",
    confirmDelete: "मेटाउने हो?",
    duplicateName: "यही नाम पहिले नै दर्ता भइसकेको छ।",
    loadFailed: (message) => `लोड गर्न सकिएन: ${message}`,
    addFailed: (message) => `थप्न सकिएन: ${message}`,
    updateFailed: (message) => `अपडेट गर्न सकिएन: ${message}`,
    deleteFailed: (message) => `मेटाउन सकिएन: ${message}`,
    postFailed: (message) => `पोस्ट गर्न सकिएन: ${message}`,
    loginRequired: "लगइन गर्नुपर्छ।",
    camera: "📷 फोटो खिच्ने",
    retake: "📷 फेरि खिच्ने",
    fromGallery: "ग्यालरीबाट छान्ने",
    notRegistered: "दर्ता छैन",
  },

  language: {
    label: "भाषा / Language",
  },

  nav: {
    menu: "मुख्य मेनु",
    newSession: "नयाँ पोस्ट",
    profile: "प्रोफाइल",
    guest: "अतिथि",
    comments: "💬 सबै कमेन्ट",
    dashboard: "📊 ड्यासबोर्ड",
    masters: "🏬 पसल र डेलिभरी ट्रक व्यवस्थापन",
    signOut: "लगआउट",
  },

  login: {
    title: "सेल्फ रिभ्यु एप",
    subtitle: "सुरु गर्न आफ्नो नाम लेख्नुहोस्।",
    namePlaceholder: "उदाहरण: यामादा",
    start: "सुरु गर्ने",
    failed: "लगइन असफल भयो।",
  },

  feed: {
    allStores: "सबै पसल",
    allTrucks: "सबै डेलिभरी ट्रक",
    allGondolas: "सबै गन्डोला",
    sortNew: "नयाँ पहिले",
    sortNeedsWork: "‘अझै बाँकी’ दर बढी भएको पहिले",
    empty: "अहिलेसम्म कुनै पोस्ट छैन। सेल्फको फोटो अपलोड गरेर पहिलो पोस्ट बनाउनुहोस्।",
    noMatch: "यी फिल्टरसँग मिल्ने पोस्ट छैन।",
    loadMore: "अझै हेर्ने",
    loadingMore: "लोड हुँदैछ...",
    pull: "तानेर अपडेट गर्ने",
    release: "छोड्दा अपडेट हुन्छ",
  },

  card: {
    untitled: "शीर्षकविहीन पोस्ट",
    staff: "स्टाफ",
    resolved: "✅ सुधार भयो",
    statusOpen: "चलिरहेको",
    statusClosed: "बन्द भएको",
    before: "सुधार अघि",
    after: "सुधार पछि",
    selectGondola: "🏬 गन्डोला छान्ने",
    thanks: (count) => `🙏 धन्यवाद ${count}`,
    done: (count) => `✅ पूरा ${count}`,
    needsWork: (count) => `🔧 अझै बाँकी ${count}`,
    doneRate: (rate) => `पूरा दर ${rate}%`,
    needsWorkRate: (rate) => `अझै बाँकी दर ${rate}%`,
    closeSession: "यो पोस्ट बन्द गर्ने",
    closing: "बन्द गर्दै...",
    confirmClose: "यो पोस्ट बन्द गर्ने हो?",
    closeFailed: (message) => `बन्द गर्न सकिएन: ${message}`,
    markResolved: "✅ सुधार भयो भनेर राख्ने",
    registering: "दर्ता गर्दै...",
    resolvingPhoto: "सुधारपछिको फोटो दर्ता गर्दै...",
    resolveFailed: (message) => `सुधारपछिको फोटो दर्ता गर्न सकिएन: ${message}`,
    sheetLabel: "फिडब्याक सिट बनाउने",
    sheetGenerating: "फिडब्याक सिट बनाउँदै...",
    sheetFailed: (message) => `फिडब्याक सिट बनाउन सकिएन: ${message}`,
    sheetFileName: "फिडब्याक-सिट",
    gondolaFailed: (message) => `गन्डोला सेट गर्न सकिएन: ${message}`,
  },

  pin: {
    hint: "फोटोमा ट्याप गरेर आफूले देखेको ठाउँमा पिन राख्नुहोस्।",
    hintFeed: "ट्याप गरेर कमेन्ट राख्नुहोस् (डबल ट्यापले 🙏)",
    hintTapOnly: "ट्याप गरेर कमेन्ट राख्ने",
    hintDrag:
      "सुरुको बिन्दुदेखि अन्तिम बिन्दुसम्म ड्र्याग गर्दा ‘सार्ने / फेस बढाउने / फेस घटाउने’ राख्न सकिन्छ।",
    typeGood: "राम्रो कुरा",
    typeBad: "ध्यान दिनुपर्ने कुरा",
    frequentTags: "बारम्बार प्रयोग हुने कुरा:",
    editTags: "✎ ट्याग सम्पादन",
    bodyPlaceholder: "के देख्नुभयो लेख्नुहोस्...",
    preview: "(प्रिभ्यु)",
    angle: "कोण",
    frameHint: "फ्रेम ड्र्याग गरेर सार्नुहोस्\nतलको ◯ ले चौडाइ र उचाइ मिलाउनुहोस्",
    submit: "पोस्ट गर्ने",
    whichObject: "कुन वस्तु राख्ने?",
    photoAlt: "सेल्फको फोटो",
  },

  object: {
    move: "सार्ने",
    widen: "फेस बढाउने",
    narrow: "फेस घटाउने",
  },

  tags: {
    title: (type) => `“${type}” का ट्याग सम्पादन`,
    placeholder: "नयाँ ट्याग लेख्नुहोस्...",
    empty: "अहिलेसम्म ट्याग छैन।",
    close: "बन्द गर्ने",
  },

  wizard: {
    doneNothing: "कुनै फोटो नखिची सकियो",
    missedTitle: "अझै फोटो नखिचिएका गन्डोला",
    guidedProgress: (index, total) => `${index} / ${total}`,
    guidedHeading: (gondola) => `${gondola} को फोटो खिच्नुहोस्`,
    guidedRemaining: "अब आउने गन्डोला",
    guidedNoReference: "यो गन्डोलाको नमुना फोटो अझै छैन",
    skipThis: "यो गन्डोला छोड्ने",
    chooseManually: "सूचीबाट छानेर खिच्ने",
    allDone: "यो ट्रकका सबै गन्डोला खिचियो",
    shootMore: "अर्को गन्डोला खिच्ने",
    selectStore: "पसल छान्नुहोस्",
    noStores:
      "कुनै पसल दर्ता छैन। प्रोफाइलको “पसल र डेलिभरी ट्रक व्यवस्थापन” बाट थप्नुहोस्।",
    selectTruck: "डेलिभरी ट्रक छान्नुहोस्",
    other: "अन्य",
    truckNameTitle: "डेलिभरी ट्रकको नाम लेख्नुहोस्",
    truckNamePlaceholder: "उदाहरण: सेन्टर ४ नम्बर",
    selectGondola: "गन्डोला (सेल्फ सेक्सन) छान्नुहोस्",
    gondolaHelp:
      "एउटै ट्रकले धेरै गन्डोलामा सामान ल्याउँछ भने, हरेक गन्डोलाको छुट्टै फोटो खिच्नुहोस्। सबै सकिएपछि “सकियो” थिच्नुहोस्।",
    noGondolasForTruck:
      "यो डेलिभरी ट्रकसँग अहिलेसम्म कुनै गन्डोला जोडिएको छैन। तलको सूचीबाट छान्नुहोस्, वा प्रोफाइलको “डेलिभरी ट्रक र गन्डोला जोड्ने” बाट मिलाउनुहोस्।",
    noGondolas:
      "कुनै गन्डोला दर्ता छैन। “हेड अफिस लेआउट तुलना” बाट थप्नुहोस्।",
    linkedGondolas: "यो ट्रकका गन्डोला",
    otherGondolas: "अन्य गन्डोला",
    skipGondola: "गन्डोला नछानी फोटो खिच्ने",
    shot: (count) => `${count} फोटो खिचियो`,
    notShot: "अझै खिचिएको छैन",
    finish: "सकियो",
    finishHint: (count) => `${count} फोटो अपलोड भयो। होम फिडमा हेर्न सकिन्छ।`,
    takePhoto: "फोटो खिच्नुहोस्",
    cameraButton: "📷 क्यामेरा खोल्ने",
    galleryButton: (max) => `फोटो छान्ने (ग्यालरीबाट एकैचोटि ${max} वटासम्म)`,
    uploading: "अपलोड हुँदैछ...",
    uploadingProgress: (done, total) => `अपलोड हुँदैछ... (${done}/${total})`,
    uploadFailed: "अपलोड असफल भयो।",
    uploadFailedWith: (message) => `अपलोड असफल भयो: ${message}`,
    partialFailure: (ok, failed) => `${ok} वटा बन्यो, तर ${failed} वटा असफल भयो।`,
    backToStore: "पसल छनोटमा फर्कने",
    backToTruck: "डेलिभरी ट्रक छनोटमा फर्कने",
    backToGondola: "गन्डोला छनोटमा फर्कने",
    storeLabel: (store) => `पसल: ${store}`,
    truckLabel: (truck) => `डेलिभरी ट्रक: ${truck}`,
    contextLabel: (store, truck, gondola) =>
      gondola
        ? `पसल: ${store} / ट्रक: ${truck} / गन्डोला: ${gondola}`
        : `पसल: ${store} / ट्रक: ${truck}`,
  },

  masters: {
    title: "पसल र डेलिभरी ट्रक व्यवस्थापन",
    description:
      "पोस्ट गर्दा देखिने पसल र डेलिभरी ट्रकको सूची यहीँबाट बन्छ। यहाँ थपेको, नाम फेरेको वा मेटाएको तुरुन्तै लागू हुन्छ।",
    stores: "पसल",
    storePlaceholder: "नयाँ पसलको नाम",
    trucks: "डेलिभरी ट्रक",
    truckPlaceholder: "नयाँ डेलिभरी ट्रकको नाम (उदाहरण: सेन्टर ४ नम्बर)",
    empty: "अहिलेसम्म केही दर्ता छैन।",
    linkTitle: "डेलिभरी ट्रक र गन्डोला जोड्ने",
    linkDescription:
      "हरेक ट्रकले कुन-कुन गन्डोला (सेल्फ सेक्सन) मा सामान ल्याउँछ छान्नुहोस्। पोस्ट गर्दा ती गन्डोला नै सुझावमा देखिन्छन्। उदाहरण: यामाजाकी पाउरोटी १ नम्बर → मीठो पाउरोटी, तरकारी पाउरोटी, मल्टिप्याक पाउरोटी।",
    linkNoGondolas:
      "कुनै गन्डोला दर्ता छैन। पहिले “हेड अफिस लेआउट तुलना” बाट थप्नुहोस्।",
    linkNoTrucks: "कुनै डेलिभरी ट्रक दर्ता छैन। माथिको सूचीबाट थप्नुहोस्।",
    linkSelected: (count) => `${count} वटा छानिएको`,
    linkFailed: (message) => `जोड्न सकिएन: ${message}`,
  },

  layouts: {
    title: "हेड अफिस लेआउट तुलना",
    description:
      "हेड अफिसले पठाएको सेल्फ लेआउट (नमुना फोटो) र हरेक पसलको अहिलेको सेल्फ फोटो तुलना गरेर गर्नुपर्ने कामहरू व्यवस्थापन गर्नुहोस्।",
    addPlaceholder: "नयाँ गन्डोलाको नाम (उदाहरण: ओनिगिरी र्‍याक)",
    empty: "अहिलेसम्म कुनै गन्डोला दर्ता छैन। माथिको फारमबाट थप्नुहोस्।",
    noReference: "नमुना फोटो छैन",
    coverage: (count, total) => `अहिलेको फोटो ${count}/${total} पसल`,
    coverageWithSeason: (season, count, total) =>
      `${season} · अहिलेको फोटो ${count}/${total} पसल`,
    openTasks: (count) => `बाँकी काम ${count}`,
  },

  layoutDetail: {
    referenceTitle: "हेड अफिसको नमुना फोटो",
    referenceAlt: "हेड अफिसको नमुना फोटो",
    referenceShort: "हेड अफिस नमुना",
    referenceUploading: "नमुना फोटो दर्ता गर्दै...",
    referenceFailed: (message) => `नमुना फोटो दर्ता गर्न सकिएन: ${message}`,
    referenceMissing: "नमुना फोटो अझै दर्ता भएको छैन",
    currentTitle: (store) => `${store} को अहिलेको सेल्फ`,
    currentShort: "अहिलेको सेल्फ",
    currentUploading: "अहिलेको सेल्फ फोटो दर्ता गर्दै...",
    currentFailed: (message) => `अहिलेको सेल्फ फोटो दर्ता गर्न सकिएन: ${message}`,
    currentMissing: "अहिलेको सेल्फ फोटो अझै दर्ता भएको छैन",
    tasksTitle: (store, done, total) => `${store} का काम (${done}/${total} सकियो)`,
    taskPlaceholder: "के गर्नुपर्ने हो लेख्नुहोस्...",
    taskEmpty: "अहिलेसम्म कुनै काम छैन।",
    taskFailed: (message) => `काम थप्न सकिएन: ${message}`,
    taskCheck: "सकियो भनेर राख्ने",
    taskUncheck: "बाँकीमा फर्काउने",
    seasonSpring: "वसन्त/गर्मी",
    seasonAutumn: "शरद/जाडो",
  },

  newProducts: {
    placementHint:
      "नयाँ सामान राख्ने ठाउँमा ट्याप गरेर निर्देशन पिन राख्नुहोस्।",
    backToPicker: "← गन्डोला र फोटो छनोटमा फर्कने",
    photoCaption: (store, date) => `${store} · ${date} को सेल्फ फोटो`,
    unknownGondola: "थाहा नभएको गन्डोला",
    title: "नयाँ सामान राख्ने",
    description:
      "नयाँ सामान राख्ने गन्डोला छान्नुहोस्, अनि अहिलेको सेल्फ फोटो (वा पुरानो फोटो) मा कमेन्ट पिन राखेर कसरी मिलाउने भनेर देखाउनुहोस्।",
    noLayouts:
      "अहिलेसम्म कुनै गन्डोला दर्ता छैन। पहिले “हेड अफिस लेआउट तुलना” बाट थप्नुहोस्।",
    selectLayout: "गन्डोला छान्ने",
    selectStore: "पसल छान्ने",
    selectPhoto: "सेल्फ फोटो छान्ने",
    noPhotos:
      "यो गन्डोला र पसलको अहिलेको सेल्फ फोटो छैन। पहिले “हेड अफिस लेआउट तुलना” बाट अपलोड गर्नुहोस्।",
    current: "अहिलेको सेल्फ",
    currentAlt: "अहिलेको सेल्फ फोटो",
    archive: "पुराना फोटो",
    archiveAlt: "पुरानो सेल्फ फोटो",
  },

  comments: {
    title: "सबै कमेन्ट",
    searchPlaceholder: "कमेन्टको शब्द खोज्नुहोस्...",
    typeAll: "सबै",
    empty: "मिल्ने कमेन्ट छैन।",
  },

  dashboard: {
    title: "‘अझै बाँकी’ ड्यासबोर्ड",
    description:
      "पसल र डेलिभरी ट्रक अनुसार ‘पूरा / अझै बाँकी’ प्रतिक्रियाको जोड। ‘अझै बाँकी’ दर बढी भएको क्रममा देखाइएको छ।",
    empty:
      "अहिलेसम्म प्रतिक्रियाको डाटा छैन। फिडमा “पूरा” वा “अझै बाँकी” थिचेपछि यहाँ जोड देखिन्छ।",
    byStore: "पसल अनुसार",
    byTruck: "डेलिभरी ट्रक अनुसार",
    reactionCount: (count) => `${count} प्रतिक्रिया`,
  },

  push: {
    unsupported:
      "यो यन्त्रले सूचना समर्थन गर्दैन (आइफोनमा iOS 16.4 वा नयाँ चाहिन्छ)।",
    enable: "🔔 सूचना सुरु गर्ने",
    disable: "🔔 सूचना बन्द गर्ने",
  },

  time: {
    justNow: "भर्खरै",
    minutesAgo: (n) => `${n} मिनेट अघि`,
    hoursAgo: (n) => `${n} घण्टा अघि`,
    daysAgo: (n) => `${n} दिन अघि`,
  },

  celebration: {
    message: "धन्यवाद!",
  },

  sheet: {
    storeUnset: "पसल तोकिएको छैन",
    appName: "सेल्फ रिभ्यु",
    poster: (name) => `पोस्ट गर्ने: ${name}`,
    reference: (season) => `हेड अफिस नमुना · ${season}`,
    currentPhoto: "अहिलेको सेल्फ (पोस्ट गरिएको फोटो)",
    captionWithReference:
      "बायाँ: हेड अफिसको नमुना। दायाँ: यसपटकको फोटो। नम्बर भएका फ्रेम तलका कमेन्टसँग मिल्छन्।",
    caption:
      "फ्रेम भनेको लेखिएको कमेन्ट हो (नम्बर तलको सूचीसँग मिल्छ); तीर भनेको राख्ने निर्देशन हो (सार्ने / फेस बढाउने / घटाउने)।",
    moreComments: (count) => `अरू ${count} कमेन्ट एपमा हेर्नुहोस्`,
    statThanks: "🙏 धन्यवाद",
    statDone: "✅ पूरा",
    statNeedsWork: "🔧 अझै बाँकी",
    statDoneRate: "पूरा दर",
    exportedAt: (dateTime) => `${dateTime} मा निकालिएको`,
    canvasFailed: "Canvas सुरु गर्न सकिएन",
    imageFailed: "फोटो बनाउन सकिएन",
  },

  viewer: {
    open: "ठूलो बनाएर हेर्ने",
    close: "बन्द गर्ने",
    showPins: "पिन देखाउने",
    hidePins: "पिन लुकाउने",
    reset: "सामान्य आकारमा",
    hint: "डबल ट्यापले ठूलो / ड्र्याग गरेर सार्ने",
    zoomLabel: (scale) => `${scale}×`,
  },

  tips: [
    "🙏 धन्यवाद जतिपटक पनि पठाउन सकिन्छ। पोस्ट गर्नेलाई हौसला दिनुहोस्।",
    "✅ पूरा / 🔧 अझै बाँकी एक जनाले एकपटक मात्र थिच्न सकिन्छ। सेल्फ कति तयार भयो देखिन्छ।",
    "फिडलाई सबैभन्दा माथि लगेर तल तान्नुभयो भने नयाँ पोस्ट आउँछ।",
    "📤 आइकनले फिडब्याक सिटको फोटो बनाएर सेयर गर्न सकिन्छ।",
    "फोटोमा डबल ट्याप गर्दा पनि 🙏 जान्छ।",
    "तलको बार: होम, नयाँ सामान, पोस्ट, हेड अफिस लेआउट तुलना, प्रोफाइल।",
    "सबै कमेन्ट र ड्यासबोर्ड प्रोफाइलबाट खुल्छ।",
    "ड्यासबोर्डमा पसल र डेलिभरी ट्रक अनुसारको पूरा दर हेर्न सकिन्छ।",
    "“सुधार भयो” राख्दा सुधार अघि र पछिको फोटो सँगै देखिन्छ।",
    "सबै कमेन्ट अज्ञात हुन्छन्। कसले लेख्यो देखिँदैन।",
    "फोटोमा ट्याप गर्दा त्यहाँका पिनको लेख हाइलाइट हुन्छ।",
    "हेड अफिस लेआउट तुलनामा नमुना फोटो र अहिलेको सेल्फ फोटो दाँजेर काम व्यवस्थापन गर्न सकिन्छ।",
    "नयाँ सामान राख्नेमा अहिलेको वा पुरानो सेल्फ फोटोमा कसरी मिलाउने भनेर पिन राख्न सकिन्छ।",
    "एउटै ट्रकले धेरै गन्डोलामा सामान ल्याउँछ भने, हरेक गन्डोलाको छुट्टै फोटो खिच्नुहोस्।",
    "भाषा प्रोफाइलबाट 日本語, English र नेपालीमा बदल्न सकिन्छ।",
  ],
};

export default ne;
