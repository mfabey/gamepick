// USD/TRY kuru — open.er-api.com üzerinden saatlik güncelleme
// Tüm fiyat API route'larında kullanılan shared utility

export async function getUsdToTry() {
  try {
    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 3600 } }   // 1 saatte bir yenile
    );
    if (!res.ok) return 38;
    const d = await res.json();
    const rate = d?.rates?.TRY;
    return (rate > 0) ? rate : 38;
  } catch {
    return 38; // fallback — yaklaşık kur
  }
}

// Steam / ITAD fiyatları kuruş/cent cinsinden gelir → /100 → birim
// Sonra para birimi TRY değilse dönüştür
export function amountToTRY(amount, currency, usdTryRate) {
  if (amount == null) return null;
  const base = amount / 100;                 // kuruş → birim
  switch (currency) {
    case 'TRY': return Math.round(base);
    case 'USD': return Math.round(base * usdTryRate);
    case 'EUR': return Math.round(base * usdTryRate * 0.93);
    case 'GBP': return Math.round(base * usdTryRate * 0.79);
    default:    return Math.round(base * usdTryRate);  // bilinmeyen → USD say
  }
}
