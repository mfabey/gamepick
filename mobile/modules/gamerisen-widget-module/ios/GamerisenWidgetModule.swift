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

    // Share Extension'ın App Group'a yazdığı değeri okur (ör. paylaşılan Steam
    // appid'i). Değer, tekrar tetiklenmesin diye okunduktan sonra silinir.
    Function("getSharedValue") { (key: String) -> String? in
      let defaults = UserDefaults(suiteName: "group.com.gamerisen.app")
      let value = defaults?.string(forKey: key)
      if value != nil {
        defaults?.removeObject(forKey: key)
        defaults?.synchronize()
      }
      return value
    }
  }
}
