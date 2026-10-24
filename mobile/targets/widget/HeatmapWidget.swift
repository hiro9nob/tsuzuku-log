import AppIntents
import SwiftUI
import WidgetKit

/// マス目のウィジェット：選んだ習慣の、これまでの記録（列が週、行が曜日。右端がきょう）
/// アプリの習慣の詳細の「これまでの記録」（mobile/src/components/Heatmap.tsx）と同じ見せ方

struct SelectHabitWidgetIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Choose a habit"

  @Parameter(title: "Habit")
  var habit: HabitEntity?

  init() {}
}

enum CellState {
  /// 始める前の日と、これからの日
  case outside
  case none
  case done
  case partial
  case rest
  case over
}

struct HeatmapEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
  let habit: WidgetSnapshot.Habit?
  /// 列（週）ごとの、行（曜日）ごとの状態。古い週から
  let weeks: [[CellState]]
  let today: TodayItem?
}

enum HeatmapLoader {
  /// 小と中で入りきる週の数（多めに作って、表示するときに右端から切る）
  static let maxWeeks = 30

  static func entry(for configuration: SelectHabitWidgetIntent, at date: Date = Date()) -> HeatmapEntry {
    guard let snapshot = WidgetSnapshot.load() else {
      return HeatmapEntry(date: date, snapshot: nil, habit: nil, weeks: [], today: nil)
    }
    let habit = snapshot.habits.first { $0.id == configuration.habit?.id } ?? snapshot.habits.first
    guard let habit else { return HeatmapEntry(date: date, snapshot: snapshot, habit: nil, weeks: [], today: nil) }

    let today = OngoDay.string(for: date, startHour: snapshot.dayStartHour)
    let firstWeek = DayMath.add(DayMath.weekStart(today, weekStart: snapshot.weekStart), -7 * (maxWeeks - 1))
    // 上限型の週・月の合計のため、期間の始まりまでさかのぼって読む
    let from = DayMath.add(firstWeek, -31)
    let entries = Store.shared.entries(habitId: habit.id, from: from, to: today)

    func state(_ day: String) -> CellState {
      if day > today || day < habit.startDay { return .outside }
      if let end = habit.endDay, day > end { return .outside }
      let e = entries[day]
      if e?.status == "rest" { return .rest }
      // その日に使っていた決まりで見せる（mobile/src/lib/stats.ts の dayStatus と同じ）
      let segment = habit.segment(on: day)
      let h = segment.habit
      if h.kind == "limit" {
        let periodStart = DayMath.periodStart(day, period: h.limitPeriod, weekStart: snapshot.weekStart)
        let start = periodStart < segment.from ? segment.from : periodStart
        let total = entries.filter { $0.key >= start && $0.key <= day && $0.value.status == "done" }.reduce(0) { $0 + $1.value.value }
        if (total * 100).rounded() > (h.target * 100).rounded() { return .over }
        return day == today ? .none : .done
      }
      if ScheduleCheck.isDone(h, e) { return .done }
      if h.kind == "count", e?.status == "done", (e?.value ?? 0) > 0 { return .partial }
      return .none
    }

    let weeks = (0..<maxWeeks).map { w in
      (0..<7).map { r in state(DayMath.add(firstWeek, w * 7 + r)) }
    }

    let e = entries[today]
    let value = habit.kind == "limit"
      ? ScheduleCheck.periodTotal(habit, on: today, weekStart: snapshot.weekStart, store: Store.shared)
      : (e?.status == "done" ? e?.value ?? 0 : 0)
    let item = TodayItem(habit: habit, value: value, done: ScheduleCheck.isDone(habit, e), resting: e?.status == "rest")
    return HeatmapEntry(date: date, snapshot: snapshot, habit: habit, weeks: weeks, today: item)
  }
}

struct HeatmapProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> HeatmapEntry {
    HeatmapEntry(date: Date(), snapshot: nil, habit: nil, weeks: [], today: nil)
  }

  func snapshot(for configuration: SelectHabitWidgetIntent, in context: Context) async -> HeatmapEntry {
    HeatmapLoader.entry(for: configuration)
  }

  func timeline(for configuration: SelectHabitWidgetIntent, in context: Context) async -> Timeline<HeatmapEntry> {
    let now = Date()
    let entry = HeatmapLoader.entry(for: configuration, at: now)
    // 1日の区切りで次の日に切り替える
    let next = OngoDay.nextBoundary(after: now, startHour: entry.snapshot?.dayStartHour ?? 0)
    return Timeline(entries: [entry, HeatmapLoader.entry(for: configuration, at: next)], policy: .after(next))
  }
}

struct HeatmapGrid: View {
  @Environment(\.colorScheme) private var scheme
  let weeks: [[CellState]]
  let color: Color

  var body: some View {
    GeometryReader { geo in
      let gap: CGFloat = 3
      // 高さから1マスの大きさを決め、幅に入る週の数だけ右端（きょう）から並べる
      let cell = max(4, (geo.size.height - gap * 6) / 7)
      let count = min(weeks.count, Int((geo.size.width + gap) / (cell + gap)))
      let shown = Array(weeks.suffix(count))
      HStack(alignment: .top, spacing: gap) {
        ForEach(shown.indices, id: \.self) { w in
          VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { r in
              Cell(state: shown[w][r], color: color, size: cell)
            }
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
    }
  }
}

struct Cell: View {
  let state: CellState
  let color: Color
  let size: CGFloat

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: size * 0.22)
    switch state {
    case .done: shape.fill(color).frame(width: size, height: size)
    case .partial: shape.fill(color.opacity(0.45)).frame(width: size, height: size)
    case .rest: shape.strokeBorder(color, lineWidth: max(1.5, size * 0.16)).frame(width: size, height: size)
    case .over: shape.fill(Color.secondary).frame(width: size, height: size)
    case .none: shape.fill(Color.secondary.opacity(0.18)).frame(width: size, height: size)
    case .outside: shape.fill(Color.secondary.opacity(0.07)).frame(width: size, height: size)
    }
  }
}

struct HeatmapWidgetView: View {
  @Environment(\.colorScheme) private var scheme
  let entry: HeatmapEntry

  var body: some View {
    content
      .containerBackground(for: .widget) { Color(.systemBackground) }
      .widgetURL(entry.habit.map { URL(string: "ongo://habit/\($0.id)") } ?? URL(string: "ongo://"))
  }

  @ViewBuilder private var content: some View {
    if let habit = entry.habit {
      let color = Color.pair(habit.color, scheme)
      VStack(alignment: .leading, spacing: 8) {
        HStack(spacing: 6) {
          HabitGlyph(habit: habit, size: 13, color: color)
          Text(habit.name).font(.subheadline.weight(.semibold)).lineLimit(1)
          Spacer(minLength: 0)
          if let item = entry.today {
            RecordCircle(item: item, diameter: 26)
          }
        }
        HeatmapGrid(weeks: entry.weeks, color: color)
      }
    } else {
      Message(text: (entry.snapshot?.strings ?? WidgetSnapshot.fallbackStrings).empty)
    }
  }
}

struct HeatmapWidget: Widget {
  let kind = "OngoHeatmap"

  var body: some WidgetConfiguration {
    let strings = WidgetSnapshot.load()?.strings ?? WidgetSnapshot.fallbackStrings
    return AppIntentConfiguration(kind: kind, intent: SelectHabitWidgetIntent.self, provider: HeatmapProvider()) { entry in
      HeatmapWidgetView(entry: entry)
    }
    .configurationDisplayName(Text(strings.heatmapName ?? WidgetSnapshot.fallbackStrings.heatmapName ?? ""))
    .description(Text(strings.heatmapDescription ?? WidgetSnapshot.fallbackStrings.heatmapDescription ?? ""))
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
