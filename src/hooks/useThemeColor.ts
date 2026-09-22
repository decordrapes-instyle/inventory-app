import { useEffect } from "react";
export function useThemeColor(isDark: boolean) {
  useEffect(() => {
    const color = isDark ? "#000000" : "#ffffff";

    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;

    (async () => {
      try {
        const cap: any = (window as any).Capacitor;
        if (!cap?.isNativePlatform?.()) return;
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        if (cap.getPlatform?.() === "android") {
          await StatusBar.setBackgroundColor({ color });
        }
      } catch {
      }
    })();
  }, [isDark]);
}