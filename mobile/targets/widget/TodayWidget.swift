import AppIntents
import SwiftUI
import WidgetKit

struct TodayItem: Identifiable {
  let habit: WidgetSnapshot.Habit
  let value: Double
  let done: Bool
  let resting: Bool
  var id: String { habit.id }
}

struct TodayEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
  let items: [TodayItem]

  var strings: WidgetSnapshot.Strings { snapshot?.strings ?? WidgetSnapshot.fallbackStrings }
  /** 達成数に数える習慣（上限型とお休みは数えない） */
  var counted: [TodayItem] { items.filter { $0.habit.kind != "limit" && !$0.resting } }
  var doneCount: Int { counted.filter(\.done).count }
  var nextUp: TodayItem? { counted.first { !$0.done } }
}

enum TodayLoader {
  static func entry(at date: Date = Date()) -> TodayEntry {
    guard let snapshot = WidgetSnapshot.load() else { return TodayEntry(date: date, snapshot: nil, items: []) }
    let day = OngoDay.string(for: date, startHour: snapshot.dayStartHour)
    let store = Store.shared
    let entries = store.entries(on: day)
    let listed = snapshot.habits.filter { ScheduleCheck.listed($0, on: day, weekStart: snapshot.weekStart, store: store) }
    let items = listed.map { habit -> TodayItem in
      let e = entries[habit.id]
      // 上限型は期間（日・週・月）の合計を見せる
      let value = habit.kind == "limit"
        ? ScheduleCheck.periodTotal(habit, on: day, weekStart: snapshot.weekStart, store: store)
        : (e?.status == "done" ? e?.value ?? 0 : 0)
      let done: Bool
      switch habit.kind {
      case "check": done = e?.status == "done"
      case "count": done = value >= habit.target
      default: done = false
      }
      return TodayItem(habit: habit, value: value, done: done, resting: e?.status == "rest")
    }
    return TodayEntry(date: date, snapshot: snapshot, items: items)
  }
}

struct TodayProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayEntry {
    TodayEntry(date: Date(), snapshot: nil, items: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    completion(TodayLoader.entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    let now = Date()
    let entry = TodayLoader.entry(at: now)
    // 1日の区切りで次の日に切り替える
    let next = OngoDay.nextBoundary(after: now, startHour: entry.snapshot?.dayStartHour ?? 0)
    completion(Timeline(entries: [entry, TodayLoader.entry(at: next)], policy: .after(next)))
  }
}

// MARK: - 部品

struct HabitGlyph: View {
  /// 自分の画像（ファイルがなければ nil。SF Symbols で表示する）
  static func loadImage(_ file: String?) -> UIImage? {
    guard let file, !file.contains("/"),
          let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: AppGroup.id) else { return nil }
    return UIImage(contentsOfFile: dir.appendingPathComponent("icons").appendingPathComponent(file).path)
  }

  let habit: WidgetSnapshot.Habit
  let size: CGFloat
  let color: Color

  var body: some View {
    if let image = HabitGlyph.loadImage(habit.image) {
      Image(uiImage: image).resizable().scaledToFill().frame(width: size * 1.7, height: size * 1.7).clipShape(Circle())
    } else if let emoji = habit.emoji {
      Text(emoji).font(.system(size: size))
    } else {
      Image(systemName: habit.symbol).font(.system(size: size, weight: .semibold)).foregroundStyle(color)
    }
  }
}

/// 大きな丸と同じ。タップで記録する
struct RecordCircle: View {
  @Environment(\.colorScheme) private var scheme
  let item: TodayItem
  let diameter: CGFloat

  var body: some View {
    let color = Color.pair(item.habit.color, scheme)
    Button(intent: RecordHabitIntent(habitId: item.habit.id)) {
      ZStack {
        Circle()
          .strokeBorder(color, style: StrokeStyle(lineWidth: 2.5, dash: item.resting ? [4, 3] : []))
          .background(Circle().fill(item.done ? color : Color.clear))
        if item.habit.kind == "count", !item.done, item.value > 0 {
          Circle()
            .trim(from: 0, to: min(1, item.value / max(item.habit.target, 0.01)))
            .stroke(color.opacity(0.45), style: StrokeStyle(lineWidth: diameter * 0.12, lineCap: .round))
            .rotationEffect(.degrees(-90))
            .padding(diameter * 0.14)
        }
        if item.done {
          Image(systemName: "checkmark")
            .font(.system(size: diameter * 0.42, weight: .bold))
            .foregroundStyle(scheme == .dark ? Color.black : Color.white)
        } else {
          HabitGlyph(habit: item.habit, size: diameter * 0.4, color: color)
        }
      }
      .frame(width: diameter, height: diameter)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(Text(item.habit.name))
  }
}

struct Header: View {
  let entry: TodayEntry

  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      Text(entry.strings.today).font(.headline)
      Spacer()
      if !entry.counted.isEmpty {
        Text("\(entry.doneCount)/\(entry.counted.count)").font(.headline.monospacedDigit()).foregroundStyle(.secondary)
      }
    }
  }
}

struct Message: View {
  let text: String
  var body: some View {
    Text(text).font(.footnote).foregroundStyle(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
      .multilineTextAlignment(.center)
  }
}

// MARK: - 大きさごとの表示

struct TodayWidgetView: View {
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var scheme
  let entry: TodayEntry

  var body: some View {
    content.containerBackground(for: .widget) { Color(.systemBackground) }
  }

  @ViewBuilder private var content: some View {
    switch family {
    case .accessoryCircular:
      Gauge(value: Double(entry.doneCount), in: 0...Double(max(entry.counted.count, 1))) {
        Text(entry.strings.today)
      } currentValueLabel: {
        Text("\(entry.doneCount)/\(entry.counted.count)")
      }
      .gaugeStyle(.accessoryCircularCapacity)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text("\(entry.strings.today) \(entry.doneCount)/\(entry.counted.count)").font(.headline)
        if let next = entry.nextUp {
          Label(next.habit.name, systemImage: next.habit.symbol).font(.caption).lineLimit(1)
        } else if !entry.counted.isEmpty {
          Text(entry.strings.allDone).font(.caption).lineLimit(1)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    case .accessoryInline:
      Text("\(entry.strings.today) \(entry.doneCount)/\(entry.counted.count)")
    case .systemSmall:
      VStack(alignment: .leading, spacing: 8) {
        Header(entry: entry)
        if entry.items.isEmpty {
          Message(text: entry.snapshot == nil || entry.snapshot?.habits.isEmpty == true ? entry.strings.empty : entry.strings.allDone)
        } else {
          LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
            ForEach(entry.items.prefix(4)) { RecordCircle(item: $0, diameter: 46) }
          }
          Spacer(minLength: 0)
        }
      }
    case .systemLarge:
      VStack(alignment: .leading, spacing: 10) {
        Header(entry: entry)
        if entry.snapshot?.isPro != true {
          Message(text: entry.strings.proLarge)
        } else if entry.items.isEmpty {
          Message(text: entry.snapshot?.habits.isEmpty == true ? entry.strings.empty : entry.strings.allDone)
        } else {
          ForEach(entry.items.prefix(7)) { item in
            Row(item: item)
          }
          Spacer(minLength: 0)
        }
      }
    default:
      VStack(alignment: .leading, spacing: 8) {
        Header(entry: entry)
        if entry.items.isEmpty {
          Message(text: entry.snapshot == nil || entry.snapshot?.habits.isEmpty == true ? entry.strings.empty : entry.strings.allDone)
        } else {
          LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 8) {
            ForEach(entry.items.prefix(4)) { Row(item: $0, compact: true) }
          }
          Spacer(minLength: 0)
        }
      }
    }
  }
}

struct Row: View {
  let item: TodayItem
  var compact = false

  var body: some View {
    HStack(spacing: 8) {
      RecordCircle(item: item, diameter: compact ? 34 : 38)
      VStack(alignment: .leading, spacing: 1) {
        Text(item.habit.name).font(compact ? .caption.weight(.semibold) : .subheadline.weight(.semibold)).lineLimit(compact ? 2 : 1)
        if item.habit.kind != "check", !compact {
          Text(amount).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
        }
      }
      Spacer(minLength: 0)
    }
  }

  private var amount: String {
    let f = NumberFormatter()
    f.maximumFractionDigits = 2
    let v = f.string(from: NSNumber(value: item.value)) ?? "\(item.value)"
    let t = f.string(from: NSNumber(value: item.habit.target)) ?? "\(item.habit.target)"
    let unit = item.habit.unit.isEmpty ? "" : " \(item.habit.unit)"
    return "\(v) / \(t)\(unit)"
  }
}

struct TodayWidget: Widget {
  let kind = "OngoToday"

  var body: some WidgetConfiguration {
    let strings = WidgetSnapshot.load()?.strings ?? WidgetSnapshot.fallbackStrings
    return StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
      TodayWidgetView(entry: entry)
    }
    .configurationDisplayName(Text(strings.widgetName))
    .description(Text(strings.widgetDescription))
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

/// ロック画面：きょうの達成数と次の習慣
struct LockWidget: Widget {
  let kind = "OngoLock"

  var body: some WidgetConfiguration {
    let strings = WidgetSnapshot.load()?.strings ?? WidgetSnapshot.fallbackStrings
    return StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
      TodayWidgetView(entry: entry)
    }
    .configurationDisplayName(Text(strings.lockName))
    .description(Text(strings.lockDescription))
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
