import { useState } from "react";
import { TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
  const [focused, setFocused] = useState(false);
  return (
    <SafeAreaView>
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[{ borderWidth: 1 }, focused ? { borderColor: "red" } : {}]}
        />
      </View>
    </SafeAreaView>
  );
}
