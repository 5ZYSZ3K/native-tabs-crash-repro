# native-tabs-repro

Minimal Expo reproduction for a crash that occurs when a `TextInput` is focused inside a tab screen rendered with `expo-router/unstable-native-tabs` (`NativeTabs`) on iOS with New Architecture (Fabric) enabled.

## The Bug

Focusing a `TextInput` on the **Search** tab causes an immediate crash on iOS. The crash is an assertion failure:

```
Assertion failed: (YGNodeGetOwner(childYogaNode) == &yogaNode_), function layout, file YogaLayoutableShadowNode.cpp, line 709
```

## Reproduction Steps

1. Install dependencies:
   ```sh
   yarn
   ```
2. Run on iOS (New Architecture must be on — already set in `app.config.ts`):
   ```sh
   yarn ios
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
