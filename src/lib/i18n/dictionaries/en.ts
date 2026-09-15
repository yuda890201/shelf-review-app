import type { Dictionary } from "./ja";

const en: Dictionary = {
  common: {
    back: "Back",
    backHome: "← Back to home",
    cancel: "Cancel",
    save: "Save",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    next: "Next",
    done: "Done",
    loading: "Loading...",
    processing: "Working...",
    error: "Error",
    search: "Search",
    confirmDelete: "Delete this?",
    duplicateName: "That name is already registered.",
    loadFailed: (message) => `Could not load: ${message}`,
    addFailed: (message) => `Could not add: ${message}`,
    updateFailed: (message) => `Could not update: ${message}`,
    deleteFailed: (message) => `Could not delete: ${message}`,
    postFailed: (message) => `Could not post: ${message}`,
    loginRequired: "You need to sign in.",
    camera: "📷 Take photo",
    retake: "📷 Retake",
    fromGallery: "Choose from camera roll",
    notRegistered: "Not set",
  },

  language: {
    label: "Language / 言語",
  },

  nav: {
    menu: "Main menu",
    newSession: "New post",
    profile: "Profile",
    guest: "Guest",
    comments: "💬 All comments",
    dashboard: "📊 Dashboard",
    masters: "🏬 Stores & delivery trucks",
    signOut: "Sign out",
  },

  login: {
    title: "Shelf Review",
    subtitle: "Enter your name to get started.",
    namePlaceholder: "e.g. Yamada",
    start: "Start",
    failed: "Sign-in failed.",
  },

  feed: {
    allStores: "All stores",
    allTrucks: "All delivery trucks",
    allGondolas: "All gondolas",
    sortNew: "Newest first",
    sortNeedsWork: "Highest needs-work rate",
    empty: "No posts yet. Upload a shelf photo to create the first one.",
    noMatch: "No posts match these filters.",
    loadMore: "Load more",
    loadingMore: "Loading...",
    pull: "Pull to refresh",
    release: "Release to refresh",
  },

  card: {
    untitled: "Untitled post",
    staff: "Staff",
    resolved: "✅ Fixed",
    statusOpen: "Open",
    statusClosed: "Closed",
    before: "Before",
    after: "After",
    selectGondola: "🏬 Pick a gondola",
    thanks: (count) => `🙏 Thanks ${count}`,
    done: (count) => `✅ Done ${count}`,
    needsWork: (count) => `🔧 Needs work ${count}`,
    doneRate: (rate) => `Done ${rate}%`,
    needsWorkRate: (rate) => `Needs work ${rate}%`,
    closeSession: "Close this post",
    closing: "Closing...",
    confirmClose: "Close this post?",
    closeFailed: (message) => `Could not close: ${message}`,
    markResolved: "✅ Mark as fixed",
    registering: "Saving...",
    resolvingPhoto: "Saving the after photo...",
    resolveFailed: (message) => `Could not save the after photo: ${message}`,
    sheetLabel: "Create feedback sheet",
    sheetGenerating: "Creating the feedback sheet...",
    sheetFailed: (message) => `Could not create the feedback sheet: ${message}`,
    sheetFileName: "feedback-sheet",
    gondolaFailed: (message) => `Could not set the gondola: ${message}`,
  },

  pin: {
    hintZoom: "Pinch with two fingers to zoom (you can still place pins while zoomed)",
    hint: "Tap the photo to pin a note where you noticed something.",
    hintFeed: "Tap to add a note (double-tap for 🙏)",
    hintTapOnly: "Tap to add a note",
    hintDrag:
      "Drag from a start point to an end point to place Move / Widen facing / Narrow facing.",
    typeGood: "Good point",
    typeBad: "Needs attention",
    frequentTags: "Frequently used notes:",
    editTags: "✎ Edit tags",
    bodyPlaceholder: "Type what you noticed...",
    preview: "(preview)",
    angle: "Angle",
    frameHint: "Drag the frame to move it\nDrag the ◯ to resize width and height",
    submit: "Post",
    whichObject: "Which object do you want to place?",
    photoAlt: "Shelf photo",
  },

  object: {
    move: "Move",
    widen: "Widen facing",
    narrow: "Narrow facing",
  },

  tags: {
    title: (type) => `Edit "${type}" tags`,
    placeholder: "Type a new tag...",
    empty: "No tags yet.",
    close: "Close",
  },

  wizard: {
    doneNothing: "Finished without taking any photos",
    missedTitle: "Gondolas not photographed yet",
    guidedProgress: (index, total) => `${index} / ${total}`,
    guidedHeading: (gondola) => `Photograph ${gondola}`,
    guidedRemaining: "Coming up",
    guidedNoReference: "No HQ reference photo for this gondola yet",
    skipThis: "Skip this gondola",
    chooseManually: "Pick from the list instead",
    allDone: "That's every gondola on this truck",
    shootMore: "Photograph another gondola",
    selectStore: "Choose a store",
    noStores:
      "No stores registered yet. Add one from “Stores & delivery trucks” in your profile.",
    selectTruck: "Choose a delivery truck",
    other: "Other",
    truckNameTitle: "Enter the delivery truck name",
    truckNamePlaceholder: "e.g. Center run 4",
    selectGondola: "Choose a gondola (shelf section)",
    gondolaHelp:
      "If one truck stocks several gondolas, take a photo for each one. Tap “Done” once you have them all.",
    noGondolasForTruck:
      "No gondolas are linked to this delivery truck yet. Pick one from the list below, or set them up under “Link delivery trucks to gondolas” in your profile.",
    noGondolas:
      "No gondolas registered yet. Add them from “HQ layout comparison”.",
    linkedGondolas: "Gondolas for this truck",
    otherGondolas: "Other gondolas",
    skipGondola: "Take a photo without choosing a gondola",
    shot: (count) => `${count} photo(s) taken`,
    notShot: "Not taken yet",
    finish: "Done",
    finishHint: (count) => `${count} photo(s) uploaded. You can see them on the home feed.`,
    takePhoto: "Take a photo",
    cameraButton: "📷 Open camera",
    galleryButton: (max) => `Choose photos (up to ${max} at once from the camera roll)`,
    uploading: "Uploading...",
    uploadingProgress: (done, total) => `Uploading... (${done}/${total})`,
    uploadFailed: "Upload failed.",
    uploadFailedWith: (message) => `Upload failed: ${message}`,
    partialFailure: (ok, failed) => `${ok} created, but ${failed} failed.`,
    backToStore: "Back to store selection",
    backToTruck: "Back to truck selection",
    backToGondola: "Back to gondola selection",
    storeLabel: (store) => `Store: ${store}`,
    truckLabel: (truck) => `Delivery truck: ${truck}`,
    contextLabel: (store, truck, gondola) =>
      gondola
        ? `Store: ${store} / Truck: ${truck} / Gondola: ${gondola}`
        : `Store: ${store} / Truck: ${truck}`,
  },

  masters: {
    title: "Stores & delivery trucks",
    description:
      "These lists appear when you choose a store and a delivery truck while posting. Anything you add, rename, or delete here applies right away.",
    stores: "Stores",
    storePlaceholder: "New store name",
    trucks: "Delivery trucks",
    truckPlaceholder: "New delivery truck name (e.g. Center run 4)",
    empty: "Nothing registered yet.",
    linkTitle: "Link delivery trucks to gondolas",
    linkDescription:
      "For each truck, pick the gondolas (shelf sections) it stocks. Those gondolas are then offered when posting. Example: Yamazaki bread run 1 → sweet buns, savory buns, multi-pack buns.",
    linkNoGondolas:
      "No gondolas registered yet. Add them from “HQ layout comparison” first.",
    linkNoTrucks: "No delivery trucks registered yet. Add one in the list above.",
    linkSelected: (count) => `${count} selected`,
    linkFailed: (message) => `Could not save the link: ${message}`,
  },

  layouts: {
    title: "HQ layout comparison",
    description:
      "Compare the shelf layout published by HQ (the reference photo) with each store's current shelf photo, and track the follow-up tasks.",
    addPlaceholder: "New gondola name (e.g. Onigiri fixture)",
    empty: "No gondolas registered yet. Add one with the form above.",
    noReference: "No reference photo",
    coverage: (count, total) => `Current photos ${count}/${total} stores`,
    coverageWithSeason: (season, count, total) =>
      `${season} · current photos ${count}/${total} stores`,
    openTasks: (count) => `${count} open task(s)`,
  },

  layoutDetail: {
    referenceTitle: "HQ reference photo",
    referenceAlt: "HQ reference photo",
    referenceShort: "HQ reference",
    referenceUploading: "Saving the reference photo...",
    referenceFailed: (message) => `Could not save the reference photo: ${message}`,
    referenceMissing: "No reference photo has been registered yet",
    currentTitle: (store) => `Current shelf at ${store}`,
    currentShort: "Current shelf",
    currentUploading: "Saving the current shelf photo...",
    currentFailed: (message) => `Could not save the current shelf photo: ${message}`,
    currentMissing: "No current shelf photo has been registered yet",
    tasksTitle: (store, done, total) => `Tasks for ${store} (${done}/${total} done)`,
    taskPlaceholder: "What needs doing...",
    taskEmpty: "No tasks yet.",
    taskFailed: (message) => `Could not add the task: ${message}`,
    taskCheck: "Mark as done",
    taskUncheck: "Mark as not done",
    seasonSpring: "Spring/Summer",
    seasonAutumn: "Autumn/Winter",
  },

  newProducts: {
    placementHint:
      "Tap where the new product goes and pin an instruction there.",
    backToPicker: "← Back to gondola and photo selection",
    photoCaption: (store, date) => `${store} · shelf photo from ${date}`,
    unknownGondola: "Unknown gondola",
    title: "New product rollout",
    description:
      "Pick the gondola where the new product goes, then pin notes on the current shelf photo (or an older archived photo) to show how to arrange it.",
    noLayouts:
      "No gondolas registered yet. Add them from “HQ layout comparison” first.",
    selectLayout: "Choose a gondola",
    selectStore: "Choose a store",
    selectPhoto: "Choose a shelf photo",
    noPhotos:
      "There is no current shelf photo for this gondola and store yet. Upload one from “HQ layout comparison” first.",
    current: "Current shelf",
    currentAlt: "Current shelf photo",
    archive: "Older archive",
    archiveAlt: "Archived shelf photo",
  },

  comments: {
    title: "All comments",
    searchPlaceholder: "Search comment text...",
    typeAll: "All",
    empty: "No comments match.",
  },

  dashboard: {
    title: "Needs-work dashboard",
    description:
      "A roll-up of “Done / Needs work” reactions per store and per delivery truck, sorted by the highest needs-work rate.",
    empty:
      "No reaction data yet. Tap “Done” or “Needs work” in the feed and the totals show up here.",
    byStore: "By store",
    byTruck: "By delivery truck",
    reactionCount: (count) => `${count} reaction(s)`,
  },

  push: {
    unsupported:
      "This device does not support notifications (on iPhone, iOS 16.4 or later is required).",
    enable: "🔔 Turn notifications on",
    disable: "🔔 Turn notifications off",
  },

  time: {
    justNow: "just now",
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
    daysAgo: (n) => `${n}d ago`,
  },

  celebration: {
    message: "Thank you!",
  },

  sheet: {
    storeUnset: "Store not set",
    appName: "Shelf Review",
    poster: (name) => `Posted by: ${name}`,
    reference: (season) => `HQ reference · ${season}`,
    currentPhoto: "Current shelf (posted photo)",
    captionWithReference:
      "Left: HQ reference. Right: the posted photo. Numbered frames match the comments below.",
    caption:
      "Frames are written comments (numbers match the list below); arrows are placement instructions (move / widen / narrow facing).",
    moreComments: (count) => `${count} more comment(s) — see them in the app`,
    statThanks: "🙏 Thanks",
    statDone: "✅ Done",
    statNeedsWork: "🔧 Needs work",
    statDoneRate: "Done rate",
    exportedAt: (dateTime) => `Exported ${dateTime}`,
    canvasFailed: "Could not initialise the canvas",
    imageFailed: "Could not generate the image",
  },

  viewer: {
    open: "View larger",
    close: "Close",
    showPins: "Show pins",
    hidePins: "Hide pins",
    reset: "Reset zoom",
    hint: "Double-tap to zoom / drag to pan",
    zoomLabel: (scale) => `${scale}×`,
  },

  tips: [
    "🙏 You can send Thanks as many times as you like — cheer the poster on.",
    "✅ Done / 🔧 Needs work can be tapped once per person, which shows how finished the shelf is.",
    "Scroll the feed to the very top and pull down to load the newest posts.",
    "The 📤 icon builds a feedback sheet image you can share.",
    "Double-tapping a photo also sends a 🙏.",
    "Bottom bar: Home, New product rollout, Post, HQ layout comparison, Profile.",
    "All comments and the dashboard open from your profile.",
    "The dashboard shows the done rate per store and per delivery truck.",
    "Marking a post as fixed shows the before and after photos side by side.",
    "All comments are anonymous — the author is never shown.",
    "Tap a photo to highlight the text of the pins on it.",
    "HQ layout comparison lets you compare the HQ reference photo with the current shelf and track tasks.",
    "New product rollout lets you pin placement instructions on current or archived shelf photos.",
    "When one truck stocks several gondolas, take a separate photo for each gondola.",
    "You can switch the language between 日本語, English and नेपाली from your profile.",
  ],
};

export default en;
