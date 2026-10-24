import Foundation

/// アプリが App Group の UserDefaults に置く内容（mobile/src/lib/widgetSnapshot.ts と同じ形）
struct WidgetSnapshot: Codable {
  struct Pair: Codable {
    let light: String
    let dark: String
  }

  struct Accent: Codable {
    let light: String
    let dark: String
    let lightText: String
    let darkText: String
  }

  struct Strings: Codable {
    let today: String
    let empty: String
    let allDone: String
    let proLarge: String
    let widgetName: String
    let widgetDescription: String
    let lockName: String
    let lockDescription: String
    let controlName: String
    let controlDescription: String
    let chooseHabit: String
    /// マス目のウィジェット（あとから足したので、古い内容にはない）
    let heatmapName: String?
    let heatmapDescription: String?
  }

  struct Habit: Codable, Identifiable {
    let id: String
    let name: String
    let symbol: String
    let emoji: String?
    /// 自分の画像のアイコン（App Group の icons/ のファイル名）
    let image: String?
    let color: Pair
    let kind: String
    let target: Double
    let step: Double
    let unit: String
    /// 繰り返し（mobile/src/lib/habit.ts の Schedule。Pro をやめても、すでに使っている繰り返しはそのまま）
    let schedule: ScheduleRule
    let limitPeriod: String
    let startDay: String
    let endDay: String?
    /// 目標や頻度を変える前の判定の決まり（古い順。mobile/src/lib/habit.ts の HabitRule）。古い内容にはない
    let rules: [Rule]?
  }

  /// 判定の決まり。until の日まで使った
  struct Rule: Codable {
    let until: String
    let kind: String
    let target: Double
    let limitPeriod: String
    let schedule: ScheduleRule
  }

  struct ScheduleRule: Codable {
    let type: String
    let days: AnyDays?
    let times: Int?
    let every: Int?
    let weeks: [Int]?
    /// 何日おきの数え始める日（古い内容にはない。そのときは始まりの日から数える）
    let anchor: String?

    /// weekdays・monthlyWeekday では曜日の配列、afterDone では日数（数）が入る
    enum AnyDays: Codable {
      case list([Int])
      case count(Int)

      init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let n = try? c.decode(Int.self) { self = .count(n) } else { self = .list(try c.decode([Int].self)) }
      }

      func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .list(let l): try c.encode(l)
        case .count(let n): try c.encode(n)
        }
      }
    }

    var weekdayList: [Int] { if case .list(let l) = days { return l }; return [] }
    var dayCount: Int { if case .count(let n) = days { return n }; return 1 }
  }

  let version: Int
  let generatedAt: String
  let dayStartHour: Int
  /// 0 = 日曜、1 = 月曜
  let weekStart: Int
  let isPro: Bool
  let accent: Accent
  let strings: Strings
  let habits: [Habit]

  static let key = "widgetSnapshot"

  static func load() -> WidgetSnapshot? {
    guard let defaults = UserDefaults(suiteName: AppGroup.id),
          let json = defaults.string(forKey: key),
          let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
  }

  /// アプリをまだ開いていないときの表示（英語）
  static let fallbackStrings = Strings(
    today: "Today",
    empty: "Add a habit in the app to log it here",
    allDone: "All done for today",
    proLarge: "The large widget is available with Pro",
    widgetName: "Today's habits",
    widgetDescription: "Tap to log",
    lockName: "Today's progress",
    lockDescription: "How many are done and what is next",
    controlName: "Log a habit",
    controlDescription: "Log the habit you choose with one tap",
    chooseHabit: "Choose a habit",
    heatmapName: "Habit grid",
    heatmapDescription: "Your history for the habit you choose"
  )
}

enum AppGroup {
  /// 拡張の Bundle ID（例：com.horizon.ongo.widget）から、アプリの App Group（group.com.horizon.ongo）を作る
  static let id: String = {
    let bundle = Bundle.main.bundleIdentifier ?? "com.horizon.ongo.widget"
    let app = bundle.split(separator: ".").dropLast().joined(separator: ".")
    return "group.\(app)"
  }()
}

enum OngoDay {
  /// 1日の区切り（0〜6時）を考えた、その瞬間の日（'YYYY-MM-DD'）
  static func string(for date: Date, startHour: Int) -> String {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = .current
    let hour = calendar.component(.hour, from: date)
    let target = hour < startHour ? calendar.date(byAdding: .day, value: -1, to: date) ?? date : date
    let c = calendar.dateComponents([.year, .month, .day], from: target)
    return String(format: "%04d-%02d-%02d", c.year ?? 2000, c.month ?? 1, c.day ?? 1)
  }

  /// 次に「きょう」が切り替わる時刻
  static func nextBoundary(after date: Date, startHour: Int) -> Date {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = .current
    let todayAt = calendar.date(bySettingHour: startHour, minute: 0, second: 0, of: date) ?? date
    if todayAt > date { return todayAt }
    let tomorrow = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: date)) ?? date
    return calendar.date(bySettingHour: startHour, minute: 0, second: 0, of: tomorrow) ?? tomorrow
  }
}
