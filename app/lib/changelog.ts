export const APP_VERSION = "1.0.0";

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-04-05",
    title: "初回リリース",
    changes: [
      "お店の追加・編集・削除",
      "カテゴリ管理（絵文字付き、ドラッグで並び替え）",
      "予約開放日の管理（毎週・毎月・N日後）と残り日数バッジ表示",
      "カテゴリフィルター・並べ替え（開放順／登録順／名前順）",
      "ダークモード対応",
      "ファビコン・iPhoneホーム画面アイコン設定",
      "カテゴリ・残日数バッジのダークモード対応",
      "カテゴリフィルターと並べ替えを別行に分離（カテゴリ上段・並べ替え下段右端）",
      "表示件数をヘッダーからフィルター行左端へ移動",
      "カテゴリフィルター中は絞り込み後の件数を表示",
    ],
  },
];
