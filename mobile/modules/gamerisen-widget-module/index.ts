import { NativeModulesProxy } from 'expo-modules-core';

const GamerisenWidgetModule = NativeModulesProxy.GamerisenWidgetModule;

export function setWidgetData(key: string, value: string): void {
  if (GamerisenWidgetModule && GamerisenWidgetModule.setWidgetData) {
    GamerisenWidgetModule.setWidgetData(key, value);
  }
}

// Share Extension'ın App Group'a yazdığı değeri okur (ör. paylaşılan Steam
// appid'i). Android'de veya modül yoksa null döner — çağıran taraf zaten
// bunu "paylaşılan bir şey yok" olarak yorumluyor.
export async function getSharedValue(key: string): Promise<string | null> {
  if (GamerisenWidgetModule && GamerisenWidgetModule.getSharedValue) {
    return GamerisenWidgetModule.getSharedValue(key);
  }
  return null;
}
