import ExpoModulesCore
import WidgetKit

public class GamerisenWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GamerisenWidgetModule")

    Function("setWidgetData") { (key: String, value: String) in
      let defaults = UserDefaults(suiteName: "group.com.gamerisen.app")
      defaults?.set(value, forKey: key)
      defaults?.synchronize()
      
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
