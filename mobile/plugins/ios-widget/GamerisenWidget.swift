import WidgetKit
import SwiftUI

// MARK: - Data Models
struct DealData: Codable {
    let name: String
    let discount: Int
    let currentPrice: String
    let originalPrice: String
}

struct StatsData: Codable {
    let value: String
    let hours: Double
    let games: Int
    let lastPlayed: String
}

struct WishlistItem: Codable, Identifiable {
    var id: String { name }
    let name: String
    let discount: Int
    let price: String
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), deal: mockDeal, stats: mockStats, wishlist: mockWishlist)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = readSharedData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = readSharedData()
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func readSharedData() -> SimpleEntry {
        let defaults = UserDefaults(suiteName: "group.com.gamerisen.app")
        
        var deal: DealData? = nil
        var stats: StatsData? = nil
        var wishlist: [WishlistItem] = []

        if let dealJson = defaults?.string(forKey: "gamerisen_deal"),
           let data = dealJson.data(using: .utf8) {
            deal = try? JSONDecoder().decode(DealData.self, from: data)
        }

        if let statsJson = defaults?.string(forKey: "gamerisen_stats"),
           let data = statsJson.data(using: .utf8) {
            stats = try? JSONDecoder().decode(StatsData.self, from: data)
        }

        if let wishlistJson = defaults?.string(forKey: "gamerisen_wishlist"),
           let data = wishlistJson.data(using: .utf8) {
            wishlist = (try? JSONDecoder().decode([WishlistItem].self, from: data)) ?? []
        }

        return SimpleEntry(
            date: Date(),
            deal: deal,
            stats: stats,
            wishlist: wishlist
        )
    }
}

// MARK: - Entry
struct SimpleEntry: TimelineEntry {
    let date: Date
    let deal: DealData?
    let stats: StatsData?
    let wishlist: [WishlistItem]
}

// MARK: - Mock Data
let mockDeal = DealData(
    name: "The Witcher 3: Wild Hunt",
    discount: 80,
    currentPrice: "99,99 ₺",
    originalPrice: "499,99 ₺"
)

let mockStats = StatsData(
    value: "14.250 ₺",
    hours: 245.5,
    games: 34,
    lastPlayed: "Cyberpunk 2077"
)

let mockWishlist = [
    WishlistItem(name: "Elden Ring", discount: 30, price: "699,00 ₺"),
    WishlistItem(name: "Hades II", discount: 15, price: "382,50 ₺"),
    WishlistItem(name: "Portal 2", discount: 90, price: "10,50 ₺")
]

// MARK: - Color Palette
struct AppColors {
    static let bg = Color(red: 11/255, green: 13/255, blue: 16/255)
    static let card = Color(red: 20/255, green: 24/255, blue: 30/255)
    static let accent = Color(red: 224/255, green: 167/255, blue: 46/255) // #e0a72e
    static let accentSoft = Color(red: 224/255, green: 167/255, blue: 46/255, opacity: 0.15)
    static let text = Color(red: 243/255, green: 244/255, blue: 246/255)
    static let textMuted = Color(red: 156/255, green: 163/255, blue: 175/255)
    static let green = Color(red: 34/255, green: 197/255, blue: 94/255)
}

// MARK: - Views
struct DealWidgetView: View {
    let deal: DealData?

    var body: some View {
        ZStack {
            AppColors.bg
            
            if let deal = deal {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("-%" + String(deal.discount))
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(AppColors.bg)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(AppColors.accent)
                            .cornerRadius(6)
                        Spacer()
                        Image(systemName: "tag.fill")
                            .foregroundColor(AppColors.accent)
                            .font(.system(size: 13))
                    }
                    
                    Spacer()
                    
                    Text(deal.name)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(AppColors.text)
                        .lineLimit(2)
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text(deal.originalPrice)
                            .font(.system(size: 11))
                            .foregroundColor(AppColors.textMuted)
                            .strikethrough()
                        
                        Text(deal.currentPrice)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(AppColors.green)
                    }
                }
                .padding(12)
            } else {
                FallbackView(title: "Fırsat Bulunamadı", desc: "Bugün indirim yok.")
            }
        }
    }
}

struct StatsWidgetView: View {
    let stats: StatsData?

    var body: some View {
        ZStack {
            AppColors.bg
            
            if let stats = stats {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Image(systemName: "gamecontroller.fill")
                            .foregroundColor(AppColors.accent)
                            .font(.system(size: 14))
                        Spacer()
                        Text("DEĞER")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(AppColors.accent)
                    }
                    
                    Text(stats.value)
                        .font(.system(size: 18, weight: .black))
                        .foregroundColor(AppColors.text)
                    
                    Spacer()
                    
                    HStack(spacing: 12) {
                        VStack(alignment: .leading) {
                            Text("Oyun")
                                .font(.system(size: 9))
                                .foregroundColor(AppColors.textMuted)
                            Text(String(stats.games))
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(AppColors.text)
                        }
                        
                        VStack(alignment: .leading) {
                            Text("Süre")
                                .font(.system(size: 9))
                                .foregroundColor(AppColors.textMuted)
                            Text(String(Int(stats.hours)) + "s")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(AppColors.text)
                        }
                    }
                    
                    Text("Son: " + stats.lastPlayed)
                        .font(.system(size: 9))
                        .foregroundColor(AppColors.textMuted)
                        .lineLimit(1)
                }
                .padding(12)
            } else {
                FallbackView(title: "Giriş Gerekli", desc: "Steam bağlayın.")
            }
        }
    }
}

struct WishlistWidgetView: View {
    let wishlist: [WishlistItem]

    var body: some View {
        ZStack {
            AppColors.bg
            
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Image(systemName: "bell.fill")
                        .foregroundColor(AppColors.accent)
                        .font(.system(size: 12))
                    Text("Takip Listesi Fırsatları")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(AppColors.text)
                    Spacer()
                    Text("Gamerisen")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(AppColors.accent)
                }
                .padding(.horizontal, 14)
                .padding(.top, 12)
                .padding(.bottom, 8)
                
                Divider()
                    .background(Color.white.opacity(0.1))
                
                if wishlist.isEmpty {
                    Spacer()
                    HStack {
                        Spacer()
                        Text("İndirimde oyun bulunamadı.")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textMuted)
                        Spacer()
                    }
                    Spacer()
                } else {
                    VStack(spacing: 6) {
                        ForEach(wishlist.prefix(3)) { item in
                            HStack {
                                Text(item.name)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(AppColors.text)
                                    .lineLimit(1)
                                Spacer()
                                HStack(spacing: 6) {
                                    Text("-%" + String(item.discount))
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(AppColors.green)
                                        .padding(.horizontal, 4)
                                        .padding(.vertical, 1)
                                        .background(AppColors.green.opacity(0.15))
                                        .cornerRadius(4)
                                    
                                    Text(item.price)
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(AppColors.text)
                                }
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 4)
                            .background(AppColors.card)
                            .cornerRadius(6)
                            .padding(.horizontal, 10)
                        }
                    }
                    .padding(.top, 8)
                    Spacer()
                }
            }
        }
    }
}

struct FallbackView: View {
    let title: String
    let desc: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: "gamecontroller")
                .foregroundColor(AppColors.accent)
                .font(.system(size: 20))
                .padding(.bottom, 4)
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(AppColors.text)
            Text(desc)
                .font(.system(size: 10))
                .foregroundColor(AppColors.textMuted)
                .multilineTextAlignment(.center)
        }
        .padding(10)
    }
}

// MARK: - Main Target Structs
struct DealWidget: Widget {
    let kind: String = "GamerisenDealWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DealWidgetView(deal: entry.deal)
        }
        .configurationDisplayName("Günün Fırsatı")
        .description("Gamerisen'da günün en popüler indirimini gösterir.")
        .supportedFamilies([.systemSmall])
    }
}

struct StatsWidget: Widget {
    let kind: String = "GamerisenStatsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            StatsWidgetView(stats: entry.stats)
        }
        .configurationDisplayName("Kütüphane Özet")
        .description("Steam veya Xbox kütüphane istatistiklerinizi görüntüler.")
        .supportedFamilies([.systemSmall])
    }
}

struct WishlistWidget: Widget {
    let kind: String = "GamerisenWishlistWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WishlistWidgetView(wishlist: entry.wishlist)
        }
        .configurationDisplayName("Takip Listesi")
        .description("İstek listenizdeki indirimde olan oyunları listeler.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Widget Bundle
@main
struct GamerisenWidgetBundle: WidgetBundle {
    var body: some Widget {
        DealWidget()
        StatsWidget()
        WishlistWidget()
    }
}
