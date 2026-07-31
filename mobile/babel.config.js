// Reanimated 4, worklet fonksiyonlarını derleme zamanında dönüştüren bir Babel
// eklentisi gerektirir. Reanimated 3'te bu eklenti `react-native-reanimated/plugin`
// idi; 4 ile birlikte `react-native-worklets` paketine taşındı (kurulu paketten
// doğrulandı: node_modules/react-native-worklets/plugin/index.js).
//
// Eklenti listenin EN SONUNDA kalmalı — diğer dönüşümlerden sonra çalışması gerekiyor.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
