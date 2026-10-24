import AppIntents
import WidgetKit

@main
struct OngoIntentsExtension: AppIntentsExtension {}

/// 習慣を記録する（Siri とショートカット）。「できた」の習慣はできたにし（取り消さない）、数値・上限の習慣は1回分を足す
struct LogHabitIntent: AppIntent {
  static var title: LocalizedStringResource = "Log a habit"
  static var description = IntentDescription("Logs a habit for today without opening the app.")

  @Parameter(title: "Habit", requestValueDialog: "Which habit?")
  var habit: HabitEntity

  init() {}

  init(habit: HabitEntity) {
    self.habit = habit
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    guard let snapshot = WidgetSnapshot.load(),
          let target = snapshot.habits.first(where: { $0.id == habit.id }),
          Store.shared.record(habit: target, startHour: snapshot.dayStartHour, weekStart: snapshot.weekStart, toggle: false) else {
      return .result(dialog: IntentDialog(LocalizedStringResource("Couldn't log it. Please open the app.")))
    }
    WidgetCenter.shared.reloadAllTimelines()
    if #available(iOS 18.0, *) {
      ControlCenter.shared.reloadAllControls()
    }
    return .result(dialog: IntentDialog(LocalizedStringResource("Logged \(target.name).")))
  }
}

/// きょうの進み具合（「きょうは 3/5 できました」）
struct TodayProgressIntent: AppIntent {
  static var title: LocalizedStringResource = "Today's progress"
  static var description = IntentDescription("Tells you how many of today's habits are done.")

  func perform() async throws -> some IntentResult & ProvidesDialog & ReturnsValue<Int> {
    guard let snapshot = WidgetSnapshot.load() else {
      return .result(value: 0, dialog: IntentDialog(LocalizedStringResource("Open the app to add a habit.")))
    }
    let day = OngoDay.string(for: Date(), startHour: snapshot.dayStartHour)
    let store = Store.shared
    let entries = store.entries(on: day)
    // きょうの画面と同じ数え方：きょうの一覧に出る習慣のうち、上限型とお休みを除く
    let counted = snapshot.habits.filter {
      $0.kind != "limit" && entries[$0.id]?.status != "rest" && ScheduleCheck.listed($0, on: day, weekStart: snapshot.weekStart, store: store)
    }
    let done = counted.filter { ScheduleCheck.isDone($0, entries[$0.id]) }.count
    return .result(value: done, dialog: IntentDialog(LocalizedStringResource("\(done) of \(counted.count) done today.")))
  }
}

/// Siri に話しかけるだけで使える言い方（設定なしで使える）。各言語は <言語>.lproj/AppShortcuts.strings
struct OngoShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: LogHabitIntent(),
      phrases: [
        "Log \(\.$habit) in \(.applicationName)",
        "Log a habit in \(.applicationName)",
      ],
      shortTitle: "Log a habit",
      systemImageName: "checkmark.circle"
    )
    AppShortcut(
      intent: TodayProgressIntent(),
      phrases: [
        "Today's progress in \(.applicationName)",
        "How am I doing in \(.applicationName)",
      ],
      shortTitle: "Today's progress",
      systemImageName: "chart.bar"
    )
  }
}
