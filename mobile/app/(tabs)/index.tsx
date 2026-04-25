import { StyleSheet, View } from "react-native";
import HomeHeader from "@/components/HomeHeader";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <HomeHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
