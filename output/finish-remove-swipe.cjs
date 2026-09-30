const fs = require('fs');
const root = 'C:/Users/User/.codex/worktrees/personalized-ota/gamepick/mobile';
for (const lang of ['tr','en','de','es','pt']) {
  const file = `${root}/src/i18n/${lang}.js`;
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^  'a11y.info':.*\r?\n/gm, ''));
}
fs.appendFileSync(`${root}/AGENTS.md`, '\n## Kaydırarak oyun seçme — KALDIRILDI (30 Eylül 2026)\n\nKullanıcı sağa/sola kaydırarak beğenme veya eleme ekranını tamamen kaldırdı.\n`/swipe` rotası ve yönlendirmeleri geri eklenmemeli. Anasayfada Senin İçin\n→ Tümü, aynı kişiselleştirilmiş önerileri normal oyun kartlarıyla gösterir.\nEski beğeni kayıtları istatistik ve ilgi geçmişi için korunur.\n');
