/**
 * 日本語の辞書。これが「原本」で、他言語の辞書はこの型 (`Dictionary`) に
 * 従うため、キーを足し忘れるとコンパイルエラーになる。
 */
const ja = {
  common: {
    back: "戻る",
    backHome: "← ホームに戻る",
    cancel: "キャンセル",
    save: "保存",
    add: "追加",
    edit: "編集",
    delete: "削除",
    next: "次へ",
    done: "完了",
    loading: "読み込み中...",
    processing: "処理中...",
    error: "エラー",
    search: "検索",
    confirmDelete: "削除しますか?",
    duplicateName: "同じ名前がすでに登録されています。",
    loadFailed: (message: string) => `読み込みに失敗しました: ${message}`,
    addFailed: (message: string) => `追加に失敗しました: ${message}`,
    updateFailed: (message: string) => `更新に失敗しました: ${message}`,
    deleteFailed: (message: string) => `削除に失敗しました: ${message}`,
    postFailed: (message: string) => `投稿に失敗しました: ${message}`,
    loginRequired: "ログインが必要です。",
    camera: "📷 撮影する",
    retake: "📷 撮り直す",
    fromGallery: "カメラロールから選ぶ",
    notRegistered: "未登録",
  },

  language: {
    label: "言語 / Language",
  },

  nav: {
    menu: "メインメニュー",
    newSession: "新規セッション",
    profile: "プロフィール",
    guest: "ゲスト",
    comments: "💬 コメント一覧",
    dashboard: "📊 ダッシュボード",
    masters: "🏬 店舗・納品トラックの管理",
    signOut: "ログアウト",
  },

  login: {
    title: "売場添削アプリ",
    subtitle: "お名前を入力して始めてください。",
    namePlaceholder: "例: 山田",
    start: "はじめる",
    failed: "ログインに失敗しました。",
  },

  feed: {
    allStores: "すべての店舗",
    allTrucks: "すべての納品トラック",
    allGondolas: "すべてのゴンドラ",
    sortNew: "新着順",
    sortNeedsWork: "まだまだ率が高い順",
    empty: "まだ投稿がありません。売場写真をアップロードして最初の投稿を作りましょう。",
    noMatch: "条件に一致する投稿がありません。",
    loadMore: "もっと見る",
    loadingMore: "読み込み中...",
    pull: "引っ張って更新",
    release: "離すと更新",
  },

  card: {
    untitled: "無題のセッション",
    staff: "スタッフ",
    resolved: "✅ 対応済み",
    statusOpen: "進行中",
    statusClosed: "クローズ済",
    before: "改善前",
    after: "改善後",
    selectGondola: "🏬 ゴンドラを選択",
    thanks: (count: number) => `🙏 ありがとう ${count}`,
    done: (count: number) => `✅ 完成 ${count}`,
    needsWork: (count: number) => `🔧 まだまだ ${count}`,
    doneRate: (rate: number) => `完成率 ${rate}%`,
    needsWorkRate: (rate: number) => `まだまだ率 ${rate}%`,
    closeSession: "セッションをクローズ",
    closing: "クローズ中...",
    confirmClose: "このセッションをクローズしますか?",
    closeFailed: (message: string) => `クローズに失敗しました: ${message}`,
    markResolved: "✅ 対応済みにする",
    registering: "登録中...",
    resolvingPhoto: "対応済み写真を登録中...",
    resolveFailed: (message: string) => `対応済み写真の登録に失敗しました: ${message}`,
    sheetLabel: "フィードバックシートを作成",
    sheetGenerating: "フィードバックシートを作成中...",
    sheetFailed: (message: string) => `フィードバックシートの作成に失敗しました: ${message}`,
    sheetFileName: "フィードバックシート",
    gondolaFailed: (message: string) => `ゴンドラの設定に失敗しました: ${message}`,
  },

  pin: {
    hint: "画像をタップして、気づいた箇所にピンを打ってください。",
    hintFeed: "タップしてコメントを貼り付け(ダブルタップで🙏)",
    hintTapOnly: "タップしてコメントを貼り付け",
    hintDrag: "ドラッグで始点→終点を指定すると「移動/フェイス拡げる/縮める」を配置できます。",
    typeGood: "良い点",
    typeBad: "気になる点",
    frequentTags: "よく使う指摘:",
    editTags: "✎ タグを編集",
    bodyPlaceholder: "気づいた点を入力...",
    preview: "(プレビュー)",
    angle: "角度",
    frameHint: "枠をドラッグで移動\n右下の◯で縦横自由にサイズ変更",
    submit: "投稿",
    whichObject: "どのオブジェクトを配置しますか?",
    photoAlt: "売場写真",
  },

  object: {
    move: "移動",
    widen: "フェイス拡げる",
    narrow: "フェイス縮める",
  },

  tags: {
    title: (type: string) => `${type}のタグを編集`,
    placeholder: "新しいタグを入力...",
    empty: "まだタグがありません。",
    close: "閉じる",
  },

  wizard: {
    doneNothing: "撮影せずに終了しました",
    missedTitle: "まだ撮っていないゴンドラ",
    guidedProgress: (index: number, total: number) => `${index} / ${total}`,
    guidedHeading: (gondola: string) => `${gondola} を撮影してください`,
    guidedRemaining: "このあとのゴンドラ",
    guidedNoReference: "お手本写真が未登録のゴンドラです",
    skipThis: "このゴンドラは飛ばす",
    chooseManually: "一覧から選んで撮る",
    allDone: "この便のゴンドラをすべて撮り終えました",
    shootMore: "他のゴンドラも撮る",
    selectStore: "店舗を選んでください",
    noStores:
      "店舗が登録されていません。マイページの「店舗・納品トラックの管理」から追加してください。",
    selectTruck: "納品トラックを選んでください",
    other: "その他",
    truckNameTitle: "納品トラックの名前を入力してください",
    truckNamePlaceholder: "例: センター4便",
    selectGondola: "ゴンドラ(売場)を選んでください",
    gondolaHelp:
      "1つの便で複数のゴンドラに並べる場合は、ゴンドラごとに写真を撮ってください。すべて撮り終えたら「完了」を押します。",
    noGondolasForTruck:
      "この納品トラックに紐づくゴンドラがまだ登録されていません。下の一覧からゴンドラを選ぶか、マイページの「納品トラックとゴンドラの紐づけ」で設定してください。",
    noGondolas:
      "ゴンドラが登録されていません。「本部レイアウト比較」から追加してください。",
    linkedGondolas: "この便のゴンドラ",
    otherGondolas: "その他のゴンドラ",
    skipGondola: "ゴンドラを指定せずに撮影する",
    shot: (count: number) => `${count}枚 撮影済み`,
    notShot: "未撮影",
    finish: "完了",
    finishHint: (count: number) => `${count}枚アップロード済み。ホームで確認できます。`,
    takePhoto: "写真を撮影してください",
    cameraButton: "📷 カメラを起動",
    galleryButton: (max: number) =>
      `写真を選ぶ(カメラロールから、最大${max}枚まとめて選択可)`,
    uploading: "アップロード中...",
    uploadingProgress: (done: number, total: number) =>
      `アップロード中... (${done}/${total})`,
    uploadFailed: "アップロードに失敗しました。",
    uploadFailedWith: (message: string) => `アップロードに失敗しました: ${message}`,
    partialFailure: (ok: number, failed: number) =>
      `${ok}件は作成できましたが、${failed}件失敗しました。`,
    backToStore: "店舗選択に戻る",
    backToTruck: "納品トラック選択に戻る",
    backToGondola: "ゴンドラ選択に戻る",
    storeLabel: (store: string) => `店舗: ${store}`,
    truckLabel: (truck: string) => `納品トラック: ${truck}`,
    contextLabel: (store: string, truck: string, gondola: string | null) =>
      gondola
        ? `店舗: ${store} / 納品トラック: ${truck} / ゴンドラ: ${gondola}`
        : `店舗: ${store} / 納品トラック: ${truck}`,
  },

  masters: {
    title: "店舗・納品トラックの管理",
    description:
      "投稿時の店舗選択・納品トラック選択に表示される一覧です。ここで追加・編集・削除した内容がすぐに反映されます。",
    stores: "店舗",
    storePlaceholder: "新しい店舗名を入力",
    trucks: "納品トラック",
    truckPlaceholder: "新しい納品トラック名を入力(例: センター4便)",
    empty: "まだ登録がありません。",
    linkTitle: "納品トラックとゴンドラの紐づけ",
    linkDescription:
      "便ごとに、その便が商品を持ってくるゴンドラ(売場)を選んでください。投稿時にここで選んだゴンドラが候補として出ます。例: ヤマザキパン1便 → 菓子パン・惣菜パン・マルチパン。",
    linkNoGondolas:
      "ゴンドラが登録されていません。先に「本部レイアウト比較」から追加してください。",
    linkNoTrucks: "納品トラックが登録されていません。上の一覧から追加してください。",
    linkSelected: (count: number) => `${count}件選択中`,
    linkFailed: (message: string) => `紐づけの保存に失敗しました: ${message}`,
  },

  layouts: {
    title: "本部レイアウト比較",
    description:
      "本部が発表する売場レイアウト(お手本写真)と各店舗の現在の売場写真を比較し、対応タスクを管理します。",
    addPlaceholder: "新しいゴンドラ名を入力(例: おにぎり什器)",
    empty: "まだゴンドラが登録されていません。上のフォームから追加してください。",
    noReference: "お手本写真未登録",
    coverage: (count: number, total: number) => `現在写真 ${count}/${total}店舗`,
    coverageWithSeason: (season: string, count: number, total: number) =>
      `${season} · 現在写真 ${count}/${total}店舗`,
    openTasks: (count: number) => `未完了タスク ${count}`,
  },

  layoutDetail: {
    referenceTitle: "本部お手本写真",
    referenceAlt: "本部お手本写真",
    referenceShort: "本部お手本",
    referenceUploading: "お手本写真を登録中...",
    referenceFailed: (message: string) => `お手本写真の登録に失敗しました: ${message}`,
    referenceMissing: "お手本写真がまだ登録されていません",
    currentTitle: (store: string) => `${store}の現在の売場`,
    currentShort: "現在の売場",
    currentUploading: "現在の売場写真を登録中...",
    currentFailed: (message: string) => `現在の売場写真の登録に失敗しました: ${message}`,
    currentMissing: "現在の売場写真がまだ登録されていません",
    tasksTitle: (store: string, done: number, total: number) =>
      `${store}のタスク (${done}/${total}完了)`,
    taskPlaceholder: "やるべきことを入力...",
    taskEmpty: "まだタスクがありません。",
    taskFailed: (message: string) => `タスクの追加に失敗しました: ${message}`,
    taskCheck: "完了にする",
    taskUncheck: "未完了に戻す",
    seasonSpring: "春夏",
    seasonAutumn: "秋冬",
  },

  newProducts: {
    placementHint: "新商品を並べる位置をタップして、指示コメントを貼り付けてください。",
    backToPicker: "← ゴンドラ・写真の選択に戻る",
    photoCaption: (store: string, date: string) => `${store} ・ ${date} の売場写真`,
    unknownGondola: "不明なゴンドラ",
    title: "新商品導入",
    description:
      "新商品を並べるゴンドラを選び、現在の売場写真(または過去のアーカイブ写真)にコメントを貼り付けて、並べ方を指示します。",
    noLayouts:
      "まだゴンドラが登録されていません。先に「本部レイアウト比較」からゴンドラを追加してください。",
    selectLayout: "ゴンドラを選択",
    selectStore: "店舗を選択",
    selectPhoto: "売場写真を選択",
    noPhotos:
      "このゴンドラ・店舗の現在の売場写真がまだありません。先に「本部レイアウト比較」からアップロードしてください。",
    current: "現在の売場",
    currentAlt: "現在の売場写真",
    archive: "過去のアーカイブ",
    archiveAlt: "アーカイブ売場写真",
  },

  comments: {
    title: "コメント一覧",
    searchPlaceholder: "コメント本文を検索...",
    typeAll: "すべて",
    empty: "該当するコメントがありません。",
  },

  dashboard: {
    title: "まだまだ率ダッシュボード",
    description:
      "店舗・納品トラックごとの「完成/まだまだ」反応の集計です。まだまだ率が高い順に並んでいます。",
    empty:
      "まだリアクションのデータがありません。フィードで「完成」「まだまだ」を押すとここに集計されます。",
    byStore: "店舗別",
    byTruck: "納品トラック別",
    reactionCount: (count: number) => `${count}件の反応`,
  },

  push: {
    unsupported:
      "この端末は通知に対応していません(iPhoneの場合はiOS 16.4以降が必要です)。",
    enable: "🔔 通知を有効にする",
    disable: "🔔 通知をオフにする",
  },

  time: {
    justNow: "たった今",
    minutesAgo: (n: number) => `${n}分前`,
    hoursAgo: (n: number) => `${n}時間前`,
    daysAgo: (n: number) => `${n}日前`,
  },

  celebration: {
    message: "ありがとう!",
  },

  sheet: {
    storeUnset: "店舗未設定",
    appName: "売場添削アプリ",
    poster: (name: string) => `投稿者: ${name}`,
    reference: (season: string) => `本部お手本 ・ ${season}`,
    currentPhoto: "現在の売場(投稿写真)",
    captionWithReference:
      "左が本部お手本(参考)、右が今回の投稿写真。番号の枠は下記コメント全文と対応",
    caption:
      "枠は文章コメント(番号は下記全文と対応)、矢印はオブジェクト指示(移動/フェイス拡げる/縮める)",
    moreComments: (count: number) => `ほか${count}件のコメントはアプリでご確認ください`,
    statThanks: "🙏 ありがとう",
    statDone: "✅ 完成",
    statNeedsWork: "🔧 まだまだ",
    statDoneRate: "完成率",
    exportedAt: (dateTime: string) => `${dateTime} 書き出し`,
    canvasFailed: "Canvasの初期化に失敗しました",
    imageFailed: "画像の生成に失敗しました",
  },

  tips: [
    "🙏 ありがとうは何回でも送れます。投稿者を応援しましょう。",
    "✅ 完成 / 🔧 まだまだ は1人1回だけ押せます。売場の完成度が可視化されます。",
    "フィードを一番上まで戻して下に引っ張ると、最新の投稿に更新できます。",
    "📤 のアイコンでフィードバックシートの画像を作って共有できます。",
    "写真をダブルタップしても🙏を送れます。",
    "下のアイコンバー: ホーム・新商品導入・投稿・本部レイアウト比較・プロフィールです。",
    "コメント一覧・ダッシュボードはプロフィールから開けます。",
    "ダッシュボードでは店舗・納品トラック別の完成率を確認できます。",
    "「対応済み」にすると、改善前後の写真を並べて表示できます。",
    "コメントはすべて匿名です。誰が投稿したかは表示されません。",
    "写真をタップすると、打たれたピンの内容がハイライト表示されます。",
    "本部レイアウト比較では、本部お手本写真と現在の売場写真を見比べてタスク管理できます。",
    "新商品導入では、現在の売場写真や過去のアーカイブ写真に配置指示のピンを貼れます。",
    "1つの便で複数のゴンドラに並べるときは、ゴンドラごとに写真を撮ってください。",
    "表示言語はプロフィールから日本語・English・नेपालीに切り替えられます。",
  ],
};

export default ja;

export type Dictionary = typeof ja;
