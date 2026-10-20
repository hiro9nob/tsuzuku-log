import AppIntents
import SwiftUI
import WidgetKit

/// コントロールセンター：選んだ習慣をワンタップで記録する（iOS 18）
@available(iOS 18.0, *)
struct SelectHabitIntent: ControlConfigurationIntent {
  static var title: LocalizedStringResource = "Choose a habit"

  @Parameter(title: "Habit")
  var habit: HabitEntity?

  init() {}
}

@available(iOS 18.0, *)
struct RecordControlValue {
  let habitId: String
  let name: String
  let symbol: String
  let done: Bool
}

@available(iOS 18.0, *)
struct RecordControlProvider: AppIntentControlValueProvider {
  func previewValue(configuration: SelectHabitIntent) -> RecordControlValue {
    let strings = WidgetSnapshot.load()?.strings ?? WidgetSnapshot.fallbackStrings
    return RecordControlValue(habitId: "", name: configuration.habit?.name ?? strings.chooseHabit, symbol: "checkmark.circle", done: false)
  }

  func currentValue(configuration: SelectHabitIntent) async throws -> RecordControlValue {
    let snapshot = WidgetSnapshot.load()
    let strings = snapshot?.strings ?? WidgetSnapshot.fallbackStrings
    guard let snapshot, let id = configuration.habit?.id, let habit = snapshot.habits.first(where: { $0.id == id }) else {
      return RecordControlValue(habitId: "", name: strings.chooseHabit, symbol: "checkmark.circle", done: false)
    }
    let day = OngoDay.string(for: Date(), startHour: snapshot.dayStartHour)
    let e = Store.shared.entries(on: day)[id]
    // チェック印は「できた」型だけ（数値型は押すと足すので、届いてもアイコンのまま）
    let done = habit.kind == "check" && ScheduleCheck.isDone(habit, e)
    return RecordControlValue(habitId: id, name: habit.name, symbol: habit.symbol, done: done)
  }
}

@available(iOS 18.0, *)
struct RecordControl: ControlWidget {
  static let kind = "OngoRecordControl"

  var body: some ControlWidgetConfiguration {
    let strings = WidgetSnapshot.load()?.strings ?? WidgetSnapshot.fallbackStrings
    return AppIntentControlConfiguration(kind: Self.kind, provider: RecordControlProvider()) { value in
      ControlWidgetButton(action: RecordHabitIntent(habitId: value.habitId)) {
        Label(value.name, systemImage: value.done ? "checkmark.circle.fill" : value.symbol)
      }
    }
    .displayName(LocalizedStringResource(stringLiteral: strings.controlName))
    .description(LocalizedStringResource(stringLiteral: strings.controlDescription))
    .promptsForUserConfiguration()
  }
}
