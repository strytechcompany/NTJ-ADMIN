import React, { useEffect, useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Modal,
  FlatList
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomTab from "../components/dashboard/BottomTab";
import { getAllUsers, getUserDetails, manualCreateUser, manualAssignChit, manualAddPayment } from "../services/api";
import { getPersistedSession } from "../utils/storage";
import { THEMES } from "../utils/themes";const THEME = THEMES.gold;


const SEGMENTS = ["Create User", "Assign Chit", "Add Payment"];

export default function ChitsScreen() {
  const [activeSegment, setActiveSegment] = useState("Create User");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showChitPicker, setShowChitPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userChits, setUserChits] = useState([]);
  const [theme, setTheme] = useState(THEMES.gold);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    userId: "",
    userName: "Select User",
    chitId: "",
    chitName: "Select Chit (Optional)",
    planName: "",
    monthlyAmount: "",
    duration: "12",
    amount: "",
    metalType: "gold"
  });

  useEffect(() => {
    const loadSession = async () => {
      const s = await getPersistedSession();
      setSession(s);
      const dept = s.department || "gold";
      setForm(f => ({ ...f, metalType: dept }));
      setTheme(THEMES[dept] || THEMES.gold);
    };
    loadSession();
  }, []);

  const fetchUsers = async () => {
    if (!session?.token) return;
    try {
      const data = await getAllUsers(session.token);
      setUsers(data || []);
    } catch (err) {
      console.log("Fetch users error:", err);
    }
  };

  const fetchUserChits = async (userId) => {
    if (!session?.token || !userId) return;
    try {
      const details = await getUserDetails(session.token, userId);
      setUserChits(details?.chits || []);
    } catch (err) {
      console.log("Fetch user chits error:", err);
      setUserChits([]);
    }
  };

  useEffect(() => {
    if (activeSegment !== "Create User") {
      fetchUsers();
    }
  }, [activeSegment]);

  const resetForm = () => {
    setUserChits([]);
    setForm({
      name: "",
      mobile: "",
      email: "",
      userId: "",
      userName: "Select User",
      chitId: "",
      chitName: "Select Chit (Optional)",
      planName: "",
      monthlyAmount: "",
      duration: "12",
      amount: "",
      metalType: session?.department || "gold"
    });
  };

  const handleSave = async () => {
    if (!session?.token) return;
    setLoading(true);
    try {
      let res;
      if (activeSegment === "Create User") {
        if (!form.name || !form.mobile) throw new Error("Name and Mobile are required");
        res = await manualCreateUser(session.token, {
          name: form.name,
          mobile: form.mobile,
          email: form.email
        });
      } else if (activeSegment === "Assign Chit") {
        if (!form.userId || !form.monthlyAmount) throw new Error("User and Monthly Amount are required");
        res = await manualAssignChit(session.token, {
          userId: form.userId,
          planName: form.planName,
          monthlyAmount: form.monthlyAmount,
          duration: form.duration,
          metalType: form.metalType
        });
      } else if (activeSegment === "Add Payment") {
        if (!form.userId || !form.amount) throw new Error("User and Amount are required");
        res = await manualAddPayment(session.token, {
          userId: form.userId,
          chitId: form.chitId || undefined,
          amount: form.amount,
          metalType: form.metalType
        });
      }

      if (res) {
        Alert.alert("Success ✓", res.message || "Operation completed successfully");
        resetForm();
      }
    } catch (err) {
      Alert.alert("Error", `${err.message}\n\nCheck that backend is restarted.`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.mobile?.includes(searchQuery)
  );

  const renderChitPicker = () => (
    <Modal visible={showChitPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Chit Plan</Text>
            <TouchableOpacity onPress={() => setShowChitPicker(false)}>
              <MaterialCommunityIcons name="close" size={24} color={THEME.muted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.userItem, { paddingVertical: 20 }]}
            onPress={() => {
              setForm({ ...form, chitId: "", chitName: "No specific chit" });
              setShowChitPicker(false);
            }}
          >
            <View>
              <Text style={styles.userItemName}>No specific chit</Text>
              <Text style={styles.userItemMobile}>General payment</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
          </TouchableOpacity>
          <FlatList
            data={userChits}
            keyExtractor={item => item.id?.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => {
                  setForm({ 
                    ...form, 
                    chitId: item.id?.toString(), 
                    chitName: `${item.planName} (${item.metalType})`,
                    metalType: (item.metalType || "gold").toLowerCase()
                  });
                  setShowChitPicker(false);
                }}
              >
                <View>
                  <Text style={styles.userItemName}>{item.planName}</Text>
                  <Text style={styles.userItemMobile}>{item.metalType} • ₹{item.monthlyAmount}/mo • {item.paidMonths || 0}/{item.duration || 12} paid</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptySearch}>No chits found for this user</Text>}
          />
        </View>
      </View>
    </Modal>
  );

  const renderUserPicker = () => (
    <Modal visible={showUserPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Participant</Text>
            <TouchableOpacity onPress={() => setShowUserPicker(false)}>
              <MaterialCommunityIcons name="close" size={24} color={THEME.muted} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchBar}
            placeholder="Search by name or mobile..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.realId}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.userItem}
                onPress={() => {
                  setForm({ ...form, userId: item.realId, userName: item.name, chitId: "", chitName: "Select Chit (Optional)" });
                  fetchUserChits(item.realId);
                  setShowUserPicker(false);
                }}
              >
                <View>
                  <Text style={styles.userItemName}>{item.name}</Text>
                  <Text style={styles.userItemMobile}>{item.mobile}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptySearch}>No participants found</Text>}
          />
        </View>
      </View>
    </Modal>
  );

  const renderForm = () => {
    if (activeSegment === "Create User") {
      return (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>LEGAL NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: THEME.inputBg }]}
              placeholder="e.g. Julianne Vane"
              placeholderTextColor="#b0a89c"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <TextInput
              style={[styles.input, { backgroundColor: THEME.inputBg }]}
              placeholder="+91 00000 00000"
              placeholderTextColor="#b0a89c"
              keyboardType="phone-pad"
              value={form.mobile}
              onChangeText={(t) => setForm({ ...form, mobile: t })}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ADDRESS (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: THEME.inputBg }]}
              placeholder="julianne@atelier.com"
              placeholderTextColor="#b0a89c"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
            />
          </View>
        </>
      );
    }

    if (activeSegment === "Assign Chit") {
      return (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SELECT PARTICIPANT</Text>
            <TouchableOpacity 
              style={[styles.pickerTrigger, { backgroundColor: THEME.inputBg }]} 
              onPress={() => setShowUserPicker(true)}
            >
              <Text style={[styles.pickerText, form.userId ? { color: '#1c1610' } : { color: '#b0a89c' }]}>
                {form.userName}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#b18a0b" />
            </TouchableOpacity>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PLAN NAME (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: THEME.inputBg }]}
              placeholder="e.g. My Gold Savings Plan"
              placeholderTextColor="#b0a89c"
              value={form.planName}
              onChangeText={(t) => setForm({ ...form, planName: t })}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CHIT DURATION (MONTHS)</Text>
            <View style={styles.radioGroup}>
              {["10", "12", "24", "36"].map(d => (
                <TouchableOpacity 
                  key={d}
                  style={[styles.radioItem, form.duration === d && { backgroundColor: THEME.surface, borderColor: THEME.accentStrong }]}
                  onPress={() => setForm({...form, duration: d})}
                >
                  <Text style={[styles.radioText, form.duration === d && { color: THEME.accentStrong, fontWeight: "800" }]}>
                    {d} MO
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>MONTHLY SAVING AMOUNT</Text>
            <TextInput
              style={[styles.input, { backgroundColor: THEME.inputBg }]}
              placeholder="e.g. 5000"
              placeholderTextColor="#b0a89c"
              keyboardType="numeric"
              value={form.monthlyAmount}
              onChangeText={(t) => setForm({ ...form, monthlyAmount: t })}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>METAL CATEGORY</Text>
            <View style={styles.radioGroup}>
              {["gold", "silver"].map(m => (
                <TouchableOpacity 
                  key={m}
                  style={[styles.radioItem, form.metalType === m && { backgroundColor: THEME.surface, borderColor: THEME.accentStrong }]}
                  onPress={() => setForm({...form, metalType: m})}
                >
                  <Text style={[styles.radioText, form.metalType === m && { color: THEME.accentStrong, fontWeight: "800" }]}>
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      );
    }

    if (activeSegment === "Add Payment") {
      return (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SELECT PARTICIPANT</Text>
            <TouchableOpacity 
              style={[styles.pickerTrigger, { backgroundColor: THEME.inputBg }]} 
              onPress={() => setShowUserPicker(true)}
            >
              <Text style={[styles.pickerText, form.userId ? { color: '#1c1610' } : { color: '#b0a89c' }]}>
                {form.userName}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={THEME.accentStrong} />
            </TouchableOpacity>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SELECT CHIT PLAN</Text>
            <TouchableOpacity 
              style={[styles.pickerTrigger, { backgroundColor: THEME.inputBg }, !form.userId && { opacity: 0.5 }]}
              onPress={() => form.userId && setShowChitPicker(true)}
            >
              <Text style={[styles.pickerText, form.chitId ? { color: '#1c1610' } : { color: '#b0a89c' }]}>
                {form.chitName}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={THEME.accentStrong} />
            </TouchableOpacity>
            {!form.userId && <Text style={styles.helperText}>Select a participant first</Text>}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PAYMENT AMOUNT (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: THEME.inputBg }]}
              placeholder="e.g. 2500"
              placeholderTextColor="#b0a89c"
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(t) => setForm({ ...form, amount: t })}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>LEDGER CATEGORY</Text>
            <View style={styles.radioGroup}>
              {["gold", "silver"].map(m => (
                <TouchableOpacity 
                  key={m}
                  style={[styles.radioItem, form.metalType === m && { backgroundColor: THEME.surface, borderColor: THEME.accentStrong }]}
                  onPress={() => setForm({...form, metalType: m})}
                >
                  <Text style={[styles.radioText, form.metalType === m && { color: THEME.accentStrong, fontWeight: "800" }]}>
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      );
    }
  };

  const THEME = theme;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: THEME.page }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatarSmall, { backgroundColor: "#fff", justifyContent: 'center', alignItems: 'center' }]}>
            <MaterialCommunityIcons name="account" size={24} color={THEME.accentStrong} />
          </View>
          <Text style={styles.headerBrand}>NTJ Admin</Text>
          <TouchableOpacity style={styles.bellBtn}>
            <MaterialCommunityIcons name="bell" size={22} color={THEME.muted} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Registry Atelier</Text>
          <Text style={styles.heroSubtitle}>
            Onboard manual participants and manage allocations outside the vault's automated loop.
          </Text>

          <View style={[styles.oversightBadge, { backgroundColor: THEME.surface }]}>
            <View style={[styles.badgeDot, { backgroundColor: THEME.accentStrong }]} />
            <Text style={[styles.badgeText, { color: THEME.accentStrong }]}>{session?.department?.toUpperCase() || "ADMIN"} OVERSIGHT</Text>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={[styles.segmentContainer, { backgroundColor: THEME.isSilver ? "#d8dee4" : "#efeadf" }]}>
          {SEGMENTS.map((seg) => {
            const isActive = activeSegment === seg;
            return (
              <TouchableOpacity
                key={seg}
                onPress={() => setActiveSegment(seg)}
                style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, isActive && { color: THEME.accentStrong, fontWeight: "700" }]}>
                  {seg.split(" ")[0]}
                  {"\n"}
                  {seg.split(" ")[1]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form Section */}
        <View style={styles.formCard}>
          {renderForm()}

          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: THEME.accentStrong }, loading && { opacity: 0.7 }]} 
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {activeSegment === "Create User" ? "Save User" : 
                 activeSegment === "Assign Chit" ? "Assign Plan" : "Record Payment"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Integrity Card */}
        <View style={[styles.integrityCard, { backgroundColor: THEME.integrityBg }]}>
          <View style={styles.integrityHeader}>
            <MaterialCommunityIcons name="shield-check" size={24} color={THEME.accentStrong} />
          </View>
          <Text style={styles.integrityTitle}>Manual Integrity</Text>
          <Text style={styles.integrityText}>
            Manual entries bypass the user-facing verification steps. Ensure physical receipts match numerical ledger entries.
          </Text>
        </View>

        {/* Spacer for bottom tab */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {renderUserPicker()}
      {renderChitPicker()}

      {/* Fixed Bottom Tab */}
      <View style={styles.bottomTabWrapper}>
        <BottomTab theme={THEME} activeTab="Chits" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22
  },
  headerBrand: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1610"
  },
  bellBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center"
  },

  // Hero
  heroSection: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1c1610",
    marginBottom: 8
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 15
  },
  oversightBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2
  },

  // Segments
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#efeadf",
    borderRadius: 15,
    padding: 6,
    marginBottom: 25,
    gap: 4
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6c6257",
    textAlign: "center",
    lineHeight: 18
  },
  segmentTextActive: {
    fontWeight: "700"
  },

  // Form Card
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 3
  },
  fieldGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1c1610",
    letterSpacing: 1.5,
    marginBottom: 10
  },
  input: {
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1c1610"
  },
  saveBtn: {
    marginTop: 10,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#8d6d10",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 5
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },

  // Integrity Card
  integrityCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20
  },
  integrityHeader: {
    marginBottom: 12
  },
  integrityTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1c1610",
    marginBottom: 8
  },
  integrityText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5c4d3d"
  },

  // Bottom Tab
  bottomTabWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000
  },

  // Manual Management Styles
  pickerTrigger: {
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pickerText: {
    fontSize: 16
  },
  radioGroup: {
    flexDirection: "row",
    gap: 12
  },
  radioItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0dad0",
    backgroundColor: "#ffffff"
  },
  radioActive: {
  },
  radioText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6c6257"
  },
  radioTextActive: {
    color: "#856a00"
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "80%",
    padding: 24
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1c1610"
  },
  searchBar: {
    backgroundColor: "#f2ede2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  userItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1610"
  },
  userItemMobile: {
    fontSize: 14,
    color: "#6c6257",
    marginTop: 2
  },
  emptySearch: {
    textAlign: "center",
    marginTop: 40,
    color: "#b0a89c",
    fontSize: 16
  },
  helperText: {
    fontSize: 11,
    color: "#b0a89c",
    marginTop: 6,
    fontStyle: "italic"
  }
});
