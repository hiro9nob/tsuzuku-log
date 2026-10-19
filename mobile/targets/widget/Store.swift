import Foundation
import SQLite3
import UserNotifications

/// アプリと同じ SQLite（App Group の ongo.db）を読み書きする。テーブルは mobile/src/db/schema.ts
final class Store {
  static let shared = Store()

  struct Entry {
    let status: String
    let value: Double
  }

  private var path: String? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: AppGroup.id)?
      .appendingPathComponent("ongo.db").path
  }

  private func open() -> OpaquePointer? {
    guard let path, FileManager.default.fileExists(atPath: path) else { return nil }
    var db: OpaquePointer?
    guard sqlite3_open_v2(path, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else {
      sqlite3_close(db)
      return nil
    }
    // アプリが書いている途中なら少し待つ。外部キーは接続ごとに有効にする（消した習慣に記録を作らない）
    sqlite3_busy_timeout(db, 3000)
    sqlite3_exec(db, "PRAGMA foreign_keys = ON;", nil, nil, nil)
    return db
  }

  /// 1つの習慣の、from〜to の記録（日ごと）
  func entries(habitId: String, from: String, to: String) -> [String: Entry] {
    guard let db = open() else { return [:] }
    defer { sqlite3_close(db) }
    var stmt: OpaquePointer?
    guard sqlite3_prepare_v2(db, "SELECT day, status, value FROM entries WHERE habit_id = ? AND day >= ? AND day <= ?", -1, &stmt, nil) == SQLITE_OK else { return [:] }
    defer { sqlite3_finalize(stmt) }
    sqlite3_bind_text(stmt, 1, habitId, -1, SQLITE_TRANSIENT)
    sqlite3_bind_text(stmt, 2, from, -1, SQLITE_TRANSIENT)
    sqlite3_bind_text(stmt, 3, to, -1, SQLITE_TRANSIENT)
    var out: [String: Entry] = [:]
    while sqlite3_step(stmt) == SQLITE_ROW {
      guard let day = sqlite3_column_text(stmt, 0), let status = sqlite3_column_text(stmt, 1) else { continue }
      out[String(cString: day)] = Entry(status: String(cString: status), value: sqlite3_column_double(stmt, 2))
    }
    return out
  }

  /// その日の記録（習慣の ID ごと）
  func entries(on day: String) -> [String: Entry] {
    guard let db = open() else { return [:] }
    defer { sqlite3_close(db) }
    var stmt: OpaquePointer?
    guard sqlite3_prepare_v2(db, "SELECT habit_id, status, value FROM entries WHERE day = ?", -1, &stmt, nil) == SQLITE_OK else { return [:] }
    defer { sqlite3_finalize(stmt) }
    sqlite3_bind_text(stmt, 1, day, -1, SQLITE_TRANSIENT)
    var out: [String: Entry] = [:]
    while sqlite3_step(stmt) == SQLITE_ROW {
      guard let id = sqlite3_column_text(stmt, 0), let status = sqlite3_column_text(stmt, 1) else { continue }
      out[String(cString: id)] = Entry(status: String(cString: status), value: sqlite3_column_double(stmt, 2))
    }
    return out
  }

  /// きょうの画面の大きな丸と同じ：check はできた ↔ 記録なし、count / limit は1回分を足す
  /// 習慣がまだあるか（消した直後の古いウィジェットから記録しない）
  private func habitExists(_ db: OpaquePointer, _ id: String) -> Bool {
    var stmt: OpaquePointer?
    guard sqlite3_prepare_v2(db, "SELECT 1 FROM habits WHERE id = ?", -1, &stmt, nil) == SQLITE_OK else { return false }
    defer { sqlite3_finalize(stmt) }
    sqlite3_bind_text(stmt, 1, id, -1, SQLITE_TRANSIENT)
    return sqlite3_step(stmt) == SQLITE_ROW
  }

  @discardableResult
  func record(habit: WidgetSnapshot.Habit, startHour: Int, weekStart: Int) -> Bool {
    let day = OngoDay.string(for: Date(), startHour: startHour)
    guard let db = open() else { return false }
    defer { sqlite3_close(db) }
    guard habitExists(db, habit.id) else { return false }
    let now = ISO8601DateFormatter.withMilliseconds.string(from: Date())

    let ok: Bool
    if habit.kind == "check" {
      // できた ↔ 記録なし。消すのは、できたの記録があるときだけ（1つの文で決める）
      let deleted = exec(db, "DELETE FROM entries WHERE habit_id = ? AND day = ? AND status = 'done'", [habit.id, day]) && sqlite3_changes(db) > 0
      ok = deleted ? true : exec(
        db,
        "INSERT INTO entries (habit_id, day, status, value, recorded_at) VALUES (?, ?, 'done', 1, ?) "
          + "ON CONFLICT(habit_id, day) DO UPDATE SET status = 'done', value = 1, recorded_at = excluded.recorded_at",
        [habit.id, day, now]
      )
      if deleted { return true }
    } else {
      // 1回分を足す。アプリと同時に足しても消えないよう、読み取りと書き込みを1つの文にする（mobile/src/lib/habits.ts の addToEntry と同じ）
      ok = exec(
        db,
        "INSERT INTO entries (habit_id, day, status, value, recorded_at) VALUES (?, ?, 'done', round(?, 2), ?) "
          + "ON CONFLICT(habit_id, day) DO UPDATE SET "
          + "value = CASE WHEN entries.status = 'done' THEN round(entries.value + excluded.value, 2) ELSE excluded.value END, "
          + "status = 'done', recorded_at = excluded.recorded_at",
        [habit.id, day, habit.step, now]
      )
    }
    // できたら、その日の通知を消す（アプリを開いたときにも予約し直す）
    let value = entries(habitId: habit.id, from: day, to: day)[day]?.value ?? 0
    let done = habit.kind == "check" || habit.kind == "limit" || (value * 100).rounded() >= (habit.target * 100).rounded()
    if ok && done { removeReminders(habit: habit, from: day, weekStart: weekStart) }
    return ok
  }

  /// きょうの通知と、この記録で予定でなくなった先の日（週に何回の残りの日、やってから N 日後のあいだ）の通知を消す
  private func removeReminders(habit: WidgetSnapshot.Habit, from day: String, weekStart: Int) {
    // identifier は mobile/src/lib/notifications.ts と同じ形（7日先まで予約している）
    var days = [day]
    for i in 1..<7 {
      let d = DayMath.add(day, i)
      if !ScheduleCheck.listed(habit, on: d, weekStart: weekStart, store: self) { days.append(d) }
    }
    let ids = days.flatMap { d in (0..<20).map { "ongo.\(habit.id).\(d).\($0)" } }
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
  }

  private func exec(_ db: OpaquePointer, _ sql: String, _ args: [Any]) -> Bool {
    var stmt: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return false }
    defer { sqlite3_finalize(stmt) }
    for (i, arg) in args.enumerated() {
      let index = Int32(i + 1)
      if let s = arg as? String {
        sqlite3_bind_text(stmt, index, s, -1, SQLITE_TRANSIENT)
      } else if let d = arg as? Double {
        sqlite3_bind_double(stmt, index, d)
      }
    }
    return sqlite3_step(stmt) == SQLITE_DONE
  }
}

private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

extension ISO8601DateFormatter {
  static let withMilliseconds: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
  }()
}
