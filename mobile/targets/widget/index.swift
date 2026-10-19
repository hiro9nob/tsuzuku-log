import SwiftUI
import WidgetKit

@main
struct OngoWidgets: WidgetBundle {
  var body: some Widget {
    TodayWidget()
    LockWidget()
    HeatmapWidget()
    if #available(iOS 18.0, *) {
      RecordControl()
    }
  }
}
