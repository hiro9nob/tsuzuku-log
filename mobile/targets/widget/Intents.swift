import AppIntents
import WidgetKit

/// ウィジェットとコントロールから、アプリを開かずに記録する
struct RecordHabitIntent: AppIntent {
  static var title: LocalizedStringResource = "Log habit"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Habit ID")
  var habitId: String

  init() {}

  init(habitId: String) {
    self.habitId = habitId
  }

  func perform() async throws -> some IntentResult {
    // 消した習慣など、記録できなかったときは失敗にする（アプリを開けば一覧が新しくなる）
    guard let snapshot = WidgetSnapshot.load(), let habit = snapshot.habits.first(where: { $0.id == habitId }),
          Store.shared.record(habit: habit, startHour: snapshot.dayStartHour, weekStart: snapshot.weekStart) else {
      WidgetCenter.shared.reloadAllTimelines()
      throw RecordError.failed
    }
    WidgetCenter.shared.reloadAllTimelines()
    if #available(iOS 18.0, *) {
      ControlCenter.shared.reloadAllControls()
    }
    return .result()
  }
}

enum RecordError: Error {
  case failed
}

/// きょうの習慣のウィジェット：表示する習慣を選ぶ（選ばなければ、きょうやる習慣を並べ替えの順に出す）
struct SelectHabitsIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Choose habits"
  static var description = IntentDescription("Leave empty to show today's habits.")

  @Parameter(title: "Habits")
  var habits: [HabitEntity]?

  init() {}
}
