import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "iconsax-react-nativejs";

interface HeaderProps {
  title: string;
  rightSlot?: React.ReactNode;
}

export default function Header({ title, rightSlot }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.5}
        hitSlop={8}
      >
        <ArrowLeft size={24} color="#131212" />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>
        {rightSlot ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D1D5DB",
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    color: "#131212",
  },
  right: {
    minWidth: 24,
    alignItems: "flex-end",
  },
  placeholder: {
    width: 24,
    height: 24,
  },
});
