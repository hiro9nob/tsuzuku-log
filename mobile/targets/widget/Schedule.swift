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

/// きょうの一覧に出すか（mobile/src/lib/stats.ts の isScheduledOn・todayStateOf と同じ考え方）
enum ScheduleCheck {
  static func isDone(_ habit: WidgetSnapshot.Habit, _ e: Store.Entry?) -> Bool {
    guard let e, e.status == "done" else { return false }
    if habit.kind == "count" { return (e.value * 100).rounded() >= (habit.target * 100).rounded() }
    return habit.kind == "check"
  }

  static func listed(_ habit: WidgetSnapshot.Habit, on day: String, weekStart: Int, store: Store) -> Bool {
    if day < habit.startDay { return false }
    if let end = habit.endDay, day > end { return false }
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
      let d = DayMath.diff(habit.startDay, day)
      return d >= 0 && d % max(rule.every ?? 2, 1) == 0
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
      for (d, e) in entries where d < day && d >= habit.startDay {
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

  /// 上限型の期間（日・週・月）の合計
  static func periodTotal(_ habit: WidgetSnapshot.Habit, on day: String, weekStart: Int, store: Store) -> Double {
    var from = DayMath.periodStart(day, period: habit.limitPeriod, weekStart: weekStart)
    if from < habit.startDay { from = habit.startDay }
    let total = store.entries(habitId: habit.id, from: from, to: day).values.filter { $0.status == "done" }.reduce(0) { $0 + $1.value }
    return (total * 100).rounded() / 100
  }
}
