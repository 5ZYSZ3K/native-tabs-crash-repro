import { useState } from "react";
import { Button, TextInput, View } from "react-native";

/**
 * Repro for (New Architecture, debug build):
 *
 *   Assertion failed: (YGNodeGetOwner(childYogaNode) == &yogaNode_),
 *   function layout, file YogaLayoutableShadowNode.cpp, line 709
 *
 * Mechanism (no expo / screens / native tabs required):
 *
 * 1. "Step 1: resize container" changes the height of the View wrapping the
 *    row. The row's own size is content-determined and does not change, so
 *    Yoga re-MEASURES the row subtree with new constraints (a measure-only
 *    pass: `zeroOutLayoutRecursively` wipes the `display: none` child and
 *    sets `hasNewLayout` on it) but then restores the row's final layout from
 *    cache. RN's metrics traversal never visits the centered wrapper, so the
 *    `hasNewLayout` flag on the hidden child is never consumed — it leaks
 *    across the commit.
 *
 * 2. "Step 2: restyle input" changes only the TextInput's props. Fabric
 *    clones the row with a new children list; `adoptYogaChild` clones the
 *    untouched centered wrapper via `clone({})`, which SHARES the hidden
 *    child's yoga node (stale `hasNewLayout`, owner = previous generation's
 *    wrapper). During layout the wrapper is a clean cache hit, so
 *    `cloneChildrenIfNeeded()` never repairs ownership — yet
 *    `calculateLayoutInternal` still flags the wrapper with `hasNewLayout`.
 *    RN's traversal then descends into the wrapper, finds the shared hidden
 *    child flagged but owned by the old generation, and trips the assert.
 *
 * The KeyboardAvoidingView + focus/typing path reproduces the same sequence
 * organically (keyboard resize = step 1, restyle-on-change = step 2), mirroring
 * the original expo-router NativeTabs repro where react-native-screens'
 * keyboard/screen resize provided the measure-only pass.
 */
export default function App() {
  const [tall, setTall] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  return (
    <View style={{ flex: 1, marginTop: 100 }}>
      <Button
        title="Step 1: resize container"
        onPress={() => setTall((v) => !v)}
      />
      <Button
        title="Step 2: restyle input (crashes)"
        onPress={() => setHighlighted((v) => !v)}
      />
      <View style={{ height: tall ? 400 : 300, justifyContent: "center" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ justifyContent: "center" }}>
            <View style={{ display: "none" }} />
          </View>
          <TextInput
            onFocus={() => setHighlighted(true)}
            onBlur={() => setHighlighted(false)}
            onChangeText={() => setHighlighted((v) => !v)}
            style={[
              { borderWidth: 1, minWidth: 120 },
              highlighted && { borderColor: "red" },
            ]}
          />
        </View>
      </View>
    </View>
  );
}
