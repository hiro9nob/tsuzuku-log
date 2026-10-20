import ExpoModulesCore
import Foundation

/// アプリの iCloud コンテナ（entitlements の最初のコンテナ）の Documents/Backups に JSON を置く
public class OngoICloudModule: Module {
  /// iCloud の読み書き（ダウンロード待ちなど）で、ほかの Expo の非同期処理を止めないよう、専用のキューで動かす
  private static let queue = DispatchQueue(label: "app.no9.ongo.icloud", qos: .utility)

  public func definition() -> ModuleDefinition {
    Name("OngoICloud")

    AsyncFunction("isAvailable") { () -> Bool in
      FileManager.default.ubiquityIdentityToken != nil && Self.backupsURL() != nil
    }.runOnQueue(Self.queue)

    AsyncFunction("write") { (name: String, contents: String) in
      guard let dir = Self.backupsURL() else { throw ICloudUnavailable() }
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
      let url = dir.appendingPathComponent(Self.safe(name))
      var coordinationError: NSError?
      var writeError: Error?
      NSFileCoordinator().coordinate(writingItemAt: url, options: .forReplacing, error: &coordinationError) { target in
        do {
          try contents.write(to: target, atomically: true, encoding: .utf8)
        } catch {
          writeError = error
        }
      }
      if let error = coordinationError ?? writeError { throw error }
    }.runOnQueue(Self.queue)

    AsyncFunction("list") { () -> [[String: Any]] in
      guard let dir = Self.backupsURL(),
            let urls = try? FileManager.default.contentsOfDirectory(
              at: dir,
              includingPropertiesForKeys: [.contentModificationDateKey, .fileSizeKey],
              options: []
            ) else { return [] }
      return urls.compactMap { url -> [String: Any]? in
        var name = url.lastPathComponent
        var downloaded = true
        // まだ端末に落ちていないファイルは「.名前.icloud」になっている
        if name.hasPrefix("."), name.hasSuffix(".icloud") {
          name = String(name.dropFirst().dropLast(".icloud".count))
          downloaded = false
        }
        guard name.hasSuffix(".json") else { return nil }
        let values = try? url.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
        return [
          "name": name,
          "modifiedAt": (values?.contentModificationDate ?? Date.distantPast).timeIntervalSince1970 * 1000,
          "size": values?.fileSize ?? 0,
          "downloaded": downloaded,
        ]
      }
    }.runOnQueue(Self.queue)

    AsyncFunction("read") { (name: String) -> String in
      guard let dir = Self.backupsURL() else { throw ICloudUnavailable() }
      let url = dir.appendingPathComponent(Self.safe(name))
      if !FileManager.default.fileExists(atPath: url.path) {
        try FileManager.default.startDownloadingUbiquitousItem(at: url)
        // 落ちてくるまで少し待つ（最大20秒）
        for _ in 0..<40 {
          if FileManager.default.fileExists(atPath: url.path) { break }
          Thread.sleep(forTimeInterval: 0.5)
        }
      }
      var coordinationError: NSError?
      var result: String?
      var readError: Error?
      NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) { target in
        do {
          result = try String(contentsOf: target, encoding: .utf8)
        } catch {
          readError = error
        }
      }
      if let error = coordinationError ?? readError { throw error }
      guard let result else { throw ICloudUnavailable() }
      return result
    }.runOnQueue(Self.queue)

    AsyncFunction("remove") { (name: String) in
      guard let dir = Self.backupsURL() else { return }
      let url = dir.appendingPathComponent(Self.safe(name))
      var coordinationError: NSError?
      NSFileCoordinator().coordinate(writingItemAt: url, options: .forDeleting, error: &coordinationError) { target in
        try? FileManager.default.removeItem(at: target)
      }
    }.runOnQueue(Self.queue)
  }

  private static func backupsURL() -> URL? {
    FileManager.default.url(forUbiquityContainerIdentifier: nil)?
      .appendingPathComponent("Documents", isDirectory: true)
      .appendingPathComponent("Backups", isDirectory: true)
  }

  /// ファイル名だけを使う（フォルダをまたがない）
  private static func safe(_ name: String) -> String {
    (name as NSString).lastPathComponent
  }
}

struct ICloudUnavailable: Error, CustomStringConvertible {
  var description: String { "iCloud is not available" }
}
