# yoga-display-none-repro

Minimal **bare React Native** (no expo) reproduction of a Yoga node-ownership crash on the New Architecture (Fabric):

```
Assertion failed: (YGNodeGetOwner(childYogaNode) == &yogaNode_), function layout, file YogaLayoutableShadowNode.cpp, line 709
```

> An earlier revision of this repo reproduced the same crash through `expo-router`'s `NativeTabs` (focusing a `TextInput` on a tab screen). See git history. The expo/native-tabs layer turned out to be incidental — its only role was producing a resize-driven measure pass — so this revision triggers the identical mechanism with React Native core components only.

## Reproduction steps

1. `yarn`
2. `bundle install && (cd ios && bundle exec pod install)`
3. `yarn ios` — must be a **Debug** build (`react_native_assert` is compiled out in Release; in Release the bug still occurs but silently writes layout metrics into the previous, sealed shadow tree instead of crashing)
4. Tap **"Step 1: resize container"**
5. Tap **"Step 2: restyle input"** → the app crashes with the assertion above

Alternative organic trigger (mirrors the original NativeTabs repro): focus the `TextInput` (keyboard resizes the `KeyboardAvoidingView` = step 1) and type a character (restyle on change = step 2).

All of the following are necessary:

- the `display: "none"` `View`
- inside the `justifyContent: "center"` wrapper `View` (a sibling of the `TextInput`)
- a commit that changes only the `TextInput`'s props (step 2)
- a preceding commit that changes the layout constraints around the row without changing the row's resulting size (step 1)

## Root cause

The assert in [`YogaLayoutableShadowNode::layout`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/renderer/components/view/YogaLayoutableShadowNode.cpp) encodes the invariant *"a yoga child flagged `hasNewLayout` is owned by the parent reading it"*. Three mechanisms combine to break it:

1. **`hasNewLayout` leak on `display: none` nodes** (`yoga/algorithm/CalculateLayout.cpp`, `computeFlexBasisForChildren`): `zeroOutLayoutRecursively` runs for `display: none` children **during measure-only passes too** (`performLayout == false`), setting `hasNewLayout = true`. Step 1 re-measures the row with new constraints (planting the flag on the hidden view) but the row's final layout is restored from Yoga's layout cache, so RN's metrics traversal never visits the wrapper and never consumes the flag. It survives the commit.

2. **Lazy clone sharing** (`YogaLayoutableShadowNode::adoptYogaChild`): step 2 changes the `TextInput` props, so Fabric clones the row with a new children list. The untouched wrapper sibling is adopted via `childNode.clone({})`, producing a clone whose yoga node still **shares** the hidden child (stale `hasNewLayout = true`, owner = previous generation's wrapper). Ownership is supposed to be repaired lazily by `cloneChildrenIfNeeded()` during the next layout.

3. **The cache hole** (`yoga/algorithm/CalculateLayout.cpp`, end of `calculateLayoutInternal`): the cloned wrapper is clean and its constraints are unchanged → layout cache hit → `calculateLayoutImpl` (and with it `cloneChildrenIfNeeded()`) is skipped — but `setHasNewLayout(true)` is **still** set on the wrapper. RN's traversal therefore descends into the wrapper, finds the shared hidden child flagged with the leaked `hasNewLayout` but owned by the old generation → assert.

### Fix

Gate the `display: none` zero-out on `performLayout` in `computeFlexBasisForChildren` (`ReactCommon/yoga/yoga/algorithm/CalculateLayout.cpp`):

```cpp
if (child->style().display() == Display::None) {
  if (performLayout) {
    zeroOutLayoutRecursively(child);
    child->setHasNewLayout(true);
    child->setDirty(false);
  }
  continue;
}
```

Zeroing hidden children contributes nothing to a measurement; doing it only in layout passes means the flag is always set in the same pass that already ran `cloneChildrenIfNeeded()` on the parent and that flags the parent for the RN traversal which consumes it — the leak becomes impossible, without touching the lazy-clone optimization.

(Forcing an eager deep clone in `adoptYogaChild` — passing an explicit children list instead of `clone({})` — also fixes this repro, but defeats Fabric's structural-sharing optimization and doesn't cover the equivalent sharing site in `cloneChildInPlace`.)

## Versions

| Library        | Version |
| -------------- | ------- |
| `react-native` | 0.86.0  |
| `react`        | 19.2.3  |

Both the `adoptYogaChild` clone and the unguarded `display: none` zero-out are unchanged on `react-native` `main` as of June 2026.
