import { useCallback, useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomTab from "../components/dashboard/BottomTab";
import { getAllUsers } from "../services/api";
import { getPersistedSession } from "../utils/storage";
import { THEMES } from "../utils/themes";
const THEME = THEMES.gold;

function AvatarBubble({ member, theme }) {
  const THEME = theme;
  if (member.hasImage && member.image) {
    return (
      <Image
        source={{ uri: member.image }}
        style={styles.avatarImage}
      />
    );
  }
  return (
    <View style={[styles.avatarBubble, { backgroundColor: THEME.accentSoft }]}>
      <Text style={styles.avatarInitials}>{member.initials}</Text>
    </View>
  );
}

function StatusBadge({ status, theme }) {
  const THEME = theme;
  const isVerified = status === "VERIFIED";
  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: isVerified ? (THEME.isSilver ? "#e3f2fd" : "#edf3ff") : (THEME.isSilver ? "#eef0f3" : "#fff6e0") }
      ]}
    >
      <Text
        style={[
          styles.statusText,
          { color: isVerified ? (THEME.isSilver ? "#1976d2" : "#4a6fc8") : THEME.accentStrong }
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function MemberCard({ member, theme }) {
  const THEME = theme;
  return (
    <View style={[styles.memberCard, { backgroundColor: THEME.card }]}>
      <AvatarBubble member={member} theme={THEME} />
      <View style={styles.memberInfo}>
        <View style={styles.memberTopRow}>
          <Text style={[styles.memberName, { color: "#1c1610" }]}>{member.name}</Text>
          <StatusBadge status={member.status} theme={THEME} />
        </View>
        <View style={styles.memberBottomRow}>
          <Text style={styles.memberId}>ID: #{member.id}</Text>
          <View style={styles.dot} />
          <Text style={styles.memberChits}>
            {member.activeChits === 1
              ? "1 Active Chit"
              : `${member.activeChits} Active Chits`}
          </Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </View>
  );
}

export default function MemberDirectoryScreen({ navigation }) {
  const [members, setMembers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(THEMES.gold);

  const fetchMembers = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const s = await getPersistedSession();
      if (!s?.token) {
        Alert.alert("Authentication Required", "Please log in to manage members.");
        return;
      }
      setSession(s);
      setTheme(THEMES[s.department] || THEMES.gold);

      const data = await getAllUsers(s.token);
      setMembers(data || []);
    } catch (err) {
      console.log("Fetch members error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const onRefresh = () => {
    fetchMembers(true);
  };

  const filteredMembers = (members || []).filter((m) =>
    (m.name || "").toLowerCase().includes(searchText.toLowerCase()) ||
    (m.id || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const totalMembers = members.length;
  const activeChits = members.reduce((sum, m) => sum + (m.activeChits || 0), 0);
  const pendingKyc = members.filter(m => m.status === "PENDING").length || 0;
  const THEME = theme;
  const department = session?.department || "gold";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: THEME.page }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accentStrong} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatarSmall, { backgroundColor: "#fff", justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialCommunityIcons name="account" size={24} color={THEME.accentStrong} />
            </View>
            <Text style={styles.headerTitle}>NTJ Admin</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.roleBadge, { backgroundColor: THEME.accentSoft + "40" }]}>
              <Text style={[styles.roleBadgeTop, { color: THEME.accentStrong }]}>{department.toUpperCase()}</Text>
              <Text style={[styles.roleBadgeBottom, { color: THEME.accentStrong }]}>OVERSIGHT</Text>
            </View>
            <Pressable style={styles.bellBtn}>
              <MaterialCommunityIcons name="bell" size={24} color="#333" />
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={24} color={THEME.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members by name"
              placeholderTextColor="#9a9287"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <Pressable style={styles.filterBtn}>
            <MaterialCommunityIcons name="filter-variant" size={26} color="#333" />
          </Pressable>
        </View>

        {/* Total Members card */}
        <View style={[styles.totalCard, { backgroundColor: THEME.card }]}>
          <Text style={styles.totalLabel}>Total Members</Text>
          <Text style={[styles.totalValue, { color: THEME.accentStrong }]}>
            {totalMembers.toLocaleString("en-IN") || "0"}
          </Text>
          <View style={styles.growthBadge}>
            <Text style={styles.growthText}>+12% Growth</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.statCard, { marginRight: 16, backgroundColor: THEME.surface }]}>
            <Text style={styles.statLabel}>Active Chits</Text>
            <Text style={styles.statValue}>{activeChits}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: THEME.surface }]}>
            <Text style={styles.statLabel}>Pending KYC</Text>
            <Text style={styles.statValue}>{pendingKyc}</Text>
          </View>
        </View>

        {/* Directory header */}
        <View style={styles.dirHeader}>
          <View>
            <Text style={[styles.dirTitle, { color: THEME.accentStrong }]}>MEMBER DIRECTORY</Text>
            <Text style={styles.dirSubtitle}>Managing high-value custodians</Text>
          </View>
          <Pressable>
            <Text style={[styles.viewReports, { color: THEME.accentStrong }]}>View Reports ↗</Text>
          </Pressable>
        </View>

        {/* Member list */}
        <View style={styles.memberList}>
          {loading ? (
            <ActivityIndicator size="large" color={THEME.accentStrong} style={{ marginTop: 40 }} />
          ) : filteredMembers.map((member) => (
            <Pressable 
              key={member.realId} 
              onPress={() => navigation.navigate("UserDetail", { userId: member.realId })}
            >
              <MemberCard member={member} theme={THEME} />
            </Pressable>
          ))}
          {!loading && filteredMembers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No members found.</Text>
            </View>
          )}
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomTabWrapper}>
        <BottomTab theme={THEME} activeTab="Users" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fdf8ef" // Exact cream background from mockup
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 16
  },
  bottomTabWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  headerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#e0d5c1"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1c1610",
    lineHeight: 26,
    fontFamily: "System"
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  roleBadge: {
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  roleBadgeTop: {
    fontSize: 10,
    fontWeight: "900",
    color: "#5c4500",
    letterSpacing: 1.5
  },
  roleBadgeBottom: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1
  },
  bellBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center"
  },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2ede2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e8e0d0"
  },
  searchIcon: {
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: "#1c1610",
    fontWeight: "500"
  },
  filterBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f2ede2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e0d0"
  },

  // Total Members card
  totalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#8d7445",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 3
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6c6257"
  },
  totalValue: {
    fontSize: 48,
    fontWeight: "800",
    marginVertical: 6
  },
  growthBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e7ff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 4
  },
  growthText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4a6fc8"
  },

  // Stat row
  statRow: {
    flexDirection: "row",
    marginBottom: 32
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#ede5d5"
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c6257",
    marginBottom: 8
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1c1610"
  },

  // Directory header
  dirHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24
  },
  dirTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2
  },
  dirSubtitle: {
    fontSize: 13,
    color: "#6c6257",
    marginTop: 5,
    fontWeight: "500"
  },
  viewReports: {
    fontSize: 15,
    fontWeight: "700"
  },

  // Member list
  memberList: {
    gap: 14
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#8d7445",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 15,
    elevation: 2
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16
  },
  avatarBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "800",
    color: "#5c4500"
  },
  memberInfo: {
    flex: 1
  },
  memberTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
    flexWrap: "wrap"
  },
  memberName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1610"
  },
  statusBadge: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  memberBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  memberId: {
    fontSize: 13,
    color: "#6c6257",
    fontWeight: "500"
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#d0c5b5"
  },
  memberChits: {
    fontSize: 13,
    color: "#6c6257",
    fontWeight: "500"
  },
  chevron: {
    marginLeft: 10
  },

  emptyState: {
    padding: 40,
    alignItems: "center"
  },
  emptyText: {
    fontSize: 16,
    color: "#9a9287",
    fontWeight: "600"
  }
});

