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

/// コントロールで選ぶ習慣
struct HabitEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Habit"
  static var defaultQuery = HabitQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }
}

struct HabitQuery: EntityQuery {
  private func all() -> [HabitEntity] {
    (WidgetSnapshot.load()?.habits ?? []).map { HabitEntity(id: $0.id, name: $0.name) }
  }

  func entities(for identifiers: [String]) async throws -> [HabitEntity] {
    all().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [HabitEntity] {
    all()
  }

  func defaultResult() async -> HabitEntity? {
    all().first
  }
}
