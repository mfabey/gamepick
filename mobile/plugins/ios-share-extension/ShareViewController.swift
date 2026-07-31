import UIKit
import UniformTypeIdentifiers

// Gamerisen Share Extension — Safari (veya başka bir uygulama) üzerinden
// paylaşılan bir Steam mağaza linkini yakalar, appid'i çıkarıp App Group'a
// yazar. Ana uygulama önplana gelince bu değeri okuyup oyuna gider.
//
// Bilinçli olarak sade tutuldu: SwiftUI/Storyboard layout'u yok, yalnızca
// sistem UIAlertController'ı kullanılıyor. Mac/Xcode olmadan görsel test
// mümkün olmadığından, hiç layout riski taşımayan en güvenli yol bu.
class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        handleShare()
    }

    private func handleShare() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let provider = item.attachments?.first else {
            complete()
            return
        }

        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, _ in
                DispatchQueue.main.async {
                    guard let url = data as? URL else {
                        self?.showAlert(
                            title: "Desteklenmeyen Bağlantı",
                            message: "Bu bağlantı Gamerisen tarafından desteklenmiyor."
                        )
                        return
                    }
                    self?.handle(url: url)
                }
            }
        } else {
            complete()
        }
    }

    private func handle(url: URL) {
        guard let appId = Self.extractSteamAppId(from: url.absoluteString) else {
            showAlert(
                title: "Desteklenmeyen Bağlantı",
                message: "Şu an yalnızca Steam mağaza linkleri destekleniyor."
            )
            return
        }

        let defaults = UserDefaults(suiteName: "group.com.gamerisen.app")
        defaults?.set(appId, forKey: "pending_shared_appid")
        defaults?.synchronize()

        showAlert(
            title: "Gamerisen'e Eklendi",
            message: "Fiyat karşılaştırmasını görmek için uygulamayı açman yeterli."
        )
    }

    static func extractSteamAppId(from urlString: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: "store\\.steampowered\\.com/app/(\\d+)") else {
            return nil
        }
        let range = NSRange(urlString.startIndex..., in: urlString)
        guard let match = regex.firstMatch(in: urlString, range: range),
              let appIdRange = Range(match.range(at: 1), in: urlString) else {
            return nil
        }
        return String(urlString[appIdRange])
    }

    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Tamam", style: .default) { [weak self] _ in
            self?.complete()
        })
        present(alert, animated: true)
    }

    private func complete() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
