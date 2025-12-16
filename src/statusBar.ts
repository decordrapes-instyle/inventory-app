import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const isNative = Capacitor.isNativePlatform();

export function setDarkStatusBar() {
  if (!isNative) return;

  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setStyle({ style: Style.Dark }); // white icons
  StatusBar.setBackgroundColor({ color: '#000000' });
}

export function setLightStatusBar() {
  if (!isNative) return;

  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setStyle({ style: Style.Light }); // dark icons
  StatusBar.setBackgroundColor({ color: '#ffffff' });
}
