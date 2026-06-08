import type { ExpoConfig } from "@expo/config";

const defineConfig = (): ExpoConfig => ({
  name: "native-tabs-repro",
  slug: "native-tabs-repro",
  scheme: "nativetabsrepro",
  version: "1.0.0",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "com.repro.nativetabs",
    supportsTablet: true,
    infoPlist: {
      // Opts into Liquid Glass UITabBarController on iOS 26 — mirrors the main
      // app change from commit 1fc91ce5 and is a likely factor in the crash.
      UIDesignRequiresCompatibility: true,
    },
  },
  android: {
    package: "com.repro.nativetabs",
    adaptiveIcon: {
      backgroundColor: "#ffffff",
    },
    // Mirrors main app config — affects keyboard layout behaviour.
    softwareKeyboardLayoutMode: "pan",
  },
  plugins: ["expo-router"],
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    // React Compiler is enabled in the main app; include it here so the
    // reproduction environment matches.
    reactCompiler: true,
  },
});

export default defineConfig;
