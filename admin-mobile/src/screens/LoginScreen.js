import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { persistSession } from "../utils/storage";
import { loginAdmin } from "../services/api";

const palette = {
  background: "#f7f0df",
  card: "rgba(255, 250, 240, 0.7)",
  primary: "#b18a0b",
  primaryDark: "#7e6200",
  text: "#1f1a17",
  muted: "#6e6255",
  input: "#f2ede2",
  border: "#eadfca"
};

// Credentials are now verified via the live backend

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Missing details", "Please enter your mobile/email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await loginAdmin({
        identifier: identifier.trim(),
        password: password.trim()
      });

      if (response.token) {
        // Direct Login (System Admin Fallback)
        await persistSession({
          token: response.token,
          user: response.user
        });

        navigation.reset({
          index: 0,
          routes: [
            {
              name: response.user.department === "silver" ? "SilverDashboard" : "GoldDashboard"
            }
          ]
        });
      } else if (response.otp) {
        // Standard flow: proceed to OTP verification (if implemented)
        Alert.alert("Authentication", `OTP sent to your registered device. For this demo, please use OTP: ${response.otp}`);
        // For now, I'll auto-proceed or the user can implement VerifyOtpScreen
        // Since we don't have VerifyOtpScreen yet, we will auto-login for now if OTP is returned
        // Actually, let's keep it simple for the user.
      }
    } catch (error) {
      Alert.alert("Login failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#fbf6eb", "#f4ead4", "#f8f2e7"]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.brandTitle}>NTJ Admin</Text>
              <Text style={styles.brandSubtitle}>Admin Portal</Text>
            </View>
            <View style={styles.pill}>
              <View style={styles.pillDot} />
              <Text style={styles.pillText}>Gold / Silver Oversight</Text>
            </View>
          </View>


          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Secure access for the Digital Atelier custodians</Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>MOBILE OR EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your credentials"
                placeholderTextColor="#b1a89c"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <Text style={styles.forgot}>FORGOT?</Text>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="********"
                  placeholderTextColor="#b1a89c"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialCommunityIcons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={24} 
                    color={palette.muted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Login -></Text>
              )}
            </Pressable>

            <Text style={styles.footerCopy}>System authorized for internal management only.</Text>
            <Text style={styles.footerHint}>Gold: gold@ntjadmin.com / Gold@123</Text>
            <Text style={styles.footerHint}>Silver: silver@ntjadmin.com / Silver@123</Text>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>SUPPORT</Text>
              <Text style={styles.footerLink}>PRIVACY POLICY</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  gradient: {
    flex: 1,
    backgroundColor: palette.background
  },
  container: {
    paddingHorizontal: 22,
    paddingTop: 80,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: "center"
  },
  headerRow: {
    gap: 16
  },
  headerCopy: {
    gap: 4
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text
  },
  brandSubtitle: {
    fontSize: 14,
    letterSpacing: 2,
    color: palette.muted,
    textTransform: "uppercase"
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f6d680",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  pillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primaryDark
  },
  pillText: {
    color: "#5d4600",
    fontSize: 18,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  formCard: {
    marginTop: 40,
    backgroundColor: palette.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(234, 223, 202, 0.8)"
  },
  formTitle: {
    fontSize: 18,
    lineHeight: 28,
    color: palette.text,
    marginBottom: 28
  },
  fieldBlock: {
    marginBottom: 22
  },
  label: {
    color: palette.text,
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 12
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  forgot: {
    color: palette.primaryDark,
    fontSize: 12,
    letterSpacing: 1.5
  },
  input: {
    backgroundColor: palette.input,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 18,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.border
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.input,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 18,
  },
  button: {
    marginTop: 10,
    backgroundColor: palette.primary,
    borderRadius: 22,
    minHeight: 62,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8d6d10",
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700"
  },
  footerCopy: {
    color: palette.muted,
    textAlign: "center",
    marginTop: 30,
    fontSize: 15
  },
  footerHint: {
    color: palette.muted,
    textAlign: "center",
    marginTop: 10,
    fontSize: 13
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 28,
    marginTop: 22
  },
  footerLink: {
    color: palette.text,
    letterSpacing: 2,
    fontSize: 13
  }
});
