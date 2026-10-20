import Foundation

/// 'YYYY-MM-DD' の計算（グレゴリオ暦、UTC で計算してタイムゾーンの影響を受けない）
enum DayMath {
  private static var calendar: Calendar = {
    var c = Calendar(identifier: .gregorian)
    c.timeZone = TimeZone(identifier: "UTC")!
    return c
  }()

  static func date(_ day: String) -> Date? {
    let p = day.split(separator: "-").compactMap { Int($0) }
    guard p.count == 3 else { return nil }
    return calendar.date(from: DateComponents(year: p[0], month: p[1], day: p[2], hour: 12))
  }

  static func string(_ date: Date) -> String {
    let c = calendar.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year ?? 2000, c.month ?? 1, c.day ?? 1)
  }

  static func add(_ day: String, _ n: Int) -> String {
    guard let d = date(day), let r = calendar.date(byAdding: .day, value: n, to: d) else { return day }
    return string(r)
  }

  static func diff(_ a: String, _ b: String) -> Int {
    guard let x = date(a), let y = date(b) else { return 0 }
    return calendar.dateComponents([.day], from: x, to: y).day ?? 0
  }

  /// 0 = 日曜
  static func weekday(_ day: String) -> Int {
    guard let d = date(day) else { return 0 }
    return calendar.component(.weekday, from: d) - 1
  }

  static func dayOfMonth(_ day: String) -> Int { Int(day.suffix(2)) ?? 1 }

  static func monthStart(_ day: String) -> String { String(day.prefix(8)) + "01" }

  static func weekStart(_ day: String, weekStart: Int) -> String {
    add(day, -((weekday(day) - weekStart + 7) % 7))
  }

  static func periodStart(_ day: String, period: String, weekStart: Int) -> String {
    switch period {
    case "week": return self.weekStart(day, weekStart: weekStart)
    case "month": return monthStart(day)
    default: return day
    }
  }
}

/// 判定の決まりが同じあいだ（mobile/src/lib/stats.ts の Segment と同じ考え方）
struct RuleSegment {
  /// その決まりを当てた習慣
  let habit: WidgetSnapshot.Habit
  /// その決まりを使い始めた日
  let from: String
  /// その決まりを使い終えた日（nil ならいままで）
  let until: String?
}

extension WidgetSnapshot.Habit {
  /// 決まりだけを入れ替えた習慣
  func applying(_ rule: WidgetSnapshot.Rule) -> WidgetSnapshot.Habit {
    WidgetSnapshot.Habit(
      id: id, name: name, symbol: symbol, emoji: emoji, image: image, color: color,
      kind: rule.kind, target: rule.target, step: step, unit: unit, schedule: rule.schedule,
      limitPeriod: rule.limitPeriod, startDay: startDay, endDay: endDay, rules: nil
    )
  }

  /// その日に使っていた決まり（mobile/src/lib/stats.ts の segmentOn と同じ）。
  /// 目標や頻度を変えても、過去の日はそのとき使っていた決まりで見せる
  func segment(on day: String) -> RuleSegment {
    var from = startDay
    for rule in rules ?? [] {
      if rule.until < from { continue }
      if day <= rule.until { return RuleSegment(habit: applying(rule), from: from, until: rule.until) }
      from = DayMath.add(rule.until, 1)
    }
    return RuleSegment(habit: self, from: from, until: nil)
  }
}

/// きょうの一覧に出すか（mobile/src/lib/stats.ts の isScheduledOn・todayStateOf と同じ考え方）
enum ScheduleCheck {
  static func isDone(_ habit: WidgetSnapshot.Habit, _ e: Store.Entry?) -> Bool {
    guard let e, e.status == "done" else { return false }
    if habit.kind == "count" { return (e.value * 100).rounded() >= (habit.target * 100).rounded() }
    return habit.kind == "check"
  }

  static func listed(_ stored: WidgetSnapshot.Habit, on day: String, weekStart: Int, store: Store) -> Bool {
    if day < stored.startDay { return false }
    if let end = stored.endDay, day > end { return false }
    // その日に使っている決まりで決める。週に何回は、その決まりを使い始めた日からの記録だけを数える
    let segment = stored.segment(on: day)
    let habit = segment.habit
    if habit.kind == "limit" { return true }
    let rule = habit.schedule
    let from: String
    switch rule.type {
    case "afterDone": from = DayMath.add(day, -max(rule.dayCount - 1, 0))
    case "perWeek": from = DayMath.weekStart(day, weekStart: weekStart)
    case "perMonth": from = DayMath.monthStart(day)
    default: from = day
    }
    let entries = store.entries(habitId: habit.id, from: from, to: day)
    // きょうできた習慣は、できたことが見えるように出す
    if isDone(habit, entries[day]) || entries[day]?.status == "rest" { return true }

    switch rule.type {
    case "daily":
      return true
    case "weekdays":
      return rule.weekdayList.contains(DayMath.weekday(day))
    case "interval":
      // 数え始める日から every 日ごと（その日より前も同じ間隔。mobile/src/lib/stats.ts の isScheduledOn と同じ）
      let every = max(rule.every ?? 2, 1)
      let d = DayMath.diff(rule.anchor ?? habit.startDay, day)
      return ((d % every) + every) % every == 0
    case "monthlyWeekday":
      guard rule.weekdayList.contains(DayMath.weekday(day)) else { return false }
      let weeks = rule.weeks ?? []
      if weeks.contains((DayMath.dayOfMonth(day) + 6) / 7) { return true }
      return weeks.contains(-1) && DayMath.monthStart(DayMath.add(day, 7)) != DayMath.monthStart(day)
    case "afterDone":
      // 前の N-1 日にできた日があれば、まだ予定ではない
      for i in 1..<max(rule.dayCount, 1) {
        let before = DayMath.add(day, -i)
        if before < habit.startDay { break }
        if isDone(habit, entries[before]) { return false }
      }
      return true
    case "perWeek", "perMonth":
      // この週（月）の回数がもう届いていれば出さない。お休みの日は必要な回数から引く
      let times = rule.times ?? 1
      var done = 0
      var rest = 0
      for (d, e) in entries where d < day && d >= segment.from {
        if e.status == "rest" { rest += 1 } else if isDone(habit, e) { done += 1 }
      }
      // stats.ts の unitState と同じ：お休みで必要な回数が 0 以下なら、できた日があるときだけ届いたとみなす
      let needed = times - rest
      let met = needed <= 0 ? done > 0 : done >= needed
      return !met
    default:
      return true
    }
  }

  /// 上限型の期間（日・週・月）の合計。その日に使っている決まりの期間で、決まりを使い始めた日から数える
  static func periodTotal(_ stored: WidgetSnapshot.Habit, on day: String, weekStart: Int, store: Store) -> Double {
    let segment = stored.segment(on: day)
    let habit = segment.habit
    var from = DayMath.periodStart(day, period: habit.limitPeriod, weekStart: weekStart)
    if from < segment.from { from = segment.from }
    let total = store.entries(habitId: habit.id, from: from, to: day).values.filter { $0.status == "done" }.reduce(0) { $0 + $1.value }
    return (total * 100).rounded() / 100
  }
}
