import AppIntents

// ウィジェット・コントロール・Siri とショートカットで共有する（targets/_shared はすべての拡張とアプリに入る）

/// 選ぶ習慣（コントロール、ウィジェットの編集、Siri とショートカット）
struct HabitEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Habit"
  static var defaultQuery = HabitQuery()

  let id: String
  let name: String

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }
}

/// 名前でも探せる（Siri に「水を飲むを記録」と言ったとき）
struct HabitQuery: EntityStringQuery {
  private func all() -> [HabitEntity] {
    (WidgetSnapshot.load()?.habits ?? []).map { HabitEntity(id: $0.id, name: $0.name) }
  }

  func entities(for identifiers: [String]) async throws -> [HabitEntity] {
    all().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [HabitEntity] {
    all()
  }

  func entities(matching string: String) async throws -> [HabitEntity] {
    let q = string.trimmingCharacters(in: .whitespaces).lowercased()
    return all().filter { $0.name.lowercased().contains(q) || q.contains($0.name.lowercased()) }
  }

  func defaultResult() async -> HabitEntity? {
    all().first
  }
}

