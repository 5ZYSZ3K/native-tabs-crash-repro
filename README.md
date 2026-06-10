# native-tabs-repro

Minimal Expo reproduction for a crash that occurs when a `TextInput` is focused inside a tab screen rendered with `expo-router/unstable-native-tabs` (`NativeTabs`) on iOS with New Architecture (Fabric) enabled.

## The Bug

Focusing a `TextInput` on the **Search** tab causes an immediate crash on iOS. The crash is an assertion failure:

```
Thread 6 Crashed: com.facebook.react.runtime.JavaScript
facebook::react::YogaLayoutableShadowNode::layout(facebook::react::LayoutContext)
  -> recurses 27+ levels
  -> __assert_rtn
  -> abort (SIGABRT)
```

## Reproduction Steps

1. Install dependencies:
   ```sh
   npm install
   ```
2. Run on iOS (New Architecture must be on — already set in `app.json`):
   ```sh
   npx expo run:ios
   ```
3. The app opens on the **Home** tab.
4. Tap the **Search** tab in the bottom tab bar.
5. Tap the `TextInput` (the search field).
6. The keyboard appears and the app **crashes immediately**.

## Crash Signature

- **Thread:** Thread 6 — `com.facebook.react.runtime.JavaScript`
- **Function:** `facebook::react::YogaLayoutableShadowNode::layout(facebook::react::LayoutContext)`
- **Depth:** 27+ recursive frames
- **Termination:** `__assert_rtn` -> `abort` -> SIGABRT
- **Architecture:** Fabric / New Architecture only. The crash does **not** reproduce with `newArchEnabled: false`.

## Library Versions

| Library                          | Version |
| -------------------------------- | ------- |
| `expo`                           | ~55.0.7 |
| `expo-router`                    | ~55.0.6 |
| `react-native`                   | 0.83.2  |
| `react-native-screens`           | 4.23.0  |
| `react-native-safe-area-context` | 5.6.2   |
| `react-native-reanimated`        | ~3.17.4 |

## Root Cause Theory

`NativeTabs` (from `expo-router/unstable-native-tabs`) renders its tab bar natively via `react-native-screens`' `RNSBottomTabs`, which is backed by a `UITabBarController`. Because the tab bar is managed natively, it is **removed from Yoga's shadow tree** — Yoga only sees the content area above it, without a known bottom constraint.

`NativeTabsView` also wraps each screen in a `SafeAreaProvider` on iOS, adding another layout boundary.

When a `TextInput` is focused:

1. The iOS keyboard appears.
2. React Native's keyboard-avoidance logic triggers a layout pass through the entire shadow tree.
3. Yoga attempts to compute the height of the content area, but because the tab bar's height is not in the shadow tree, the bottom of the content area is unconstrained relative to the root container.
4. This creates a **circular layout dependency**: the content area's height depends on the tab bar height, which is not tracked by Yoga, causing Yoga to re-enter its own layout recursively until the stack overflows and the assertion fires.

## Files

```
native-tabs-repro/
├── package.json
├── app.json               <- newArchEnabled: true
├── tsconfig.json
├── metro.config.js
├── babel.config.js
└── src/
    └── app/
        ├── _layout.tsx          <- root Stack layout (headerShown: false)
        └── (tabs)/
            ├── _layout.tsx      <- NativeTabs layout with Home + Search triggers
            ├── index.tsx        <- Home tab (static label)
            └── search.tsx       <- Search tab with TextInput (triggers the crash)
```
