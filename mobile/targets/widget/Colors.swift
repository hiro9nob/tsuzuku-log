import SwiftUI

extension Color {
  init(hex: String) {
    var value: UInt64 = 0
    Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&value)
    self.init(
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255
    )
  }

  static func pair(_ pair: WidgetSnapshot.Pair, _ scheme: ColorScheme) -> Color {
    Color(hex: scheme == .dark ? pair.dark : pair.light)
  }
}
