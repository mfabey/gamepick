import { NativeModulesProxy } from 'expo-modules-core';

const GamerisenWidgetModule = NativeModulesProxy.GamerisenWidgetModule;

export function setWidgetData(key: string, value: string): void {
  if (GamerisenWidgetModule && GamerisenWidgetModule.setWidgetData) {
    GamerisenWidgetModule.setWidgetData(key, value);
  }
}
