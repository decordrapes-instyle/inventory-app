import { StatusBar, Style } from '@capacitor/status-bar';

export function setDarkStatusBar() {
  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setStyle({ style: Style.Dark }); // white icons
  StatusBar.setBackgroundColor({ color: '#000000' });
}

export function setLightStatusBar() {
  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setStyle({ style: Style.Light }); // dark icons
  StatusBar.setBackgroundColor({ color: '#ffffff' });
}
