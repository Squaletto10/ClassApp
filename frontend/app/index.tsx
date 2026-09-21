// Route gate: waits for auth, then redirects to login / setup / tabs
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/src/api";
import { useTheme } from "@/src/theme";

export default function Index() {
  const { user, loading, hasClass, needsClassSetup } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!hasClass || needsClassSetup) return <Redirect href="/(auth)/setup-class" />;
  return <Redirect href="/(tabs)/home" />;
}
