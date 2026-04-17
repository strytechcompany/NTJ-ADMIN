import { useCallback, useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
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
import { getPaymentHistory } from "../services/api";
import { getPersistedSession } from "../utils/storage";

const THEME = {
  page: "#f8f3e9",
  card: "#ffffff",
  surface: "#f4ede2",
  accentStrong: "#b18a0b",
  accentSoft: "#d8bc61",
  muted: "#6c6257"
};

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const formatAmount = (amount) => {
  if (!amount && amount !== 0) return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "success") return { bg: "#e6f4ea", text: "#1e7e34" };
  if (s === "pending") return { bg: "#fff8e1", text: "#b18a0b" };
  if (s === "failed") return { bg: "#fdecea", text: "#c0392b" };
  return { bg: "#f0f0f0", text: "#555" };
};

const getMethodIcon = (method) => {
  const m = (method || "").toLowerCase();
  if (m === "manual") return "cash";
  if (m === "upi") return "cellphone";
  if (m === "card") return "credit-card";
  return "bank-transfer";
};

const getInitials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────
function SummaryCard({ totalCollected, totalTransactions, pendingCount }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View>
          <Text style={styles.summaryLabel}>Total Collected</Text>
          <Text style={styles.summaryAmount}>{formatAmount(totalCollected)}</Text>
        </View>
        <View style={styles.summaryBadge}>
          <MaterialCommunityIcons name="trending-up" size={18} color="#1e7e34" />
          <Text style={styles.summaryBadgeText}>Active</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryMini}>
          <MaterialCommunityIcons name="receipt" size={18} color={THEME.accentStrong} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.miniLabel}>Transactions</Text>
            <Text style={styles.miniVal}>{totalTransactions}</Text>
          </View>
        </View>
        <View style={[styles.summaryMini, { marginLeft: 16 }]}>
          <MaterialCommunityIcons name="clock-outline" size={18} color="#b18a0b" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.miniLabel}>Pending</Text>
            <Text style={[styles.miniVal, { color: "#b18a0b" }]}>{pendingCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PaymentCard({ payment }) {
  const statusColors = getStatusColor(payment.status);
  const initials = getInitials(payment.userName);
  const methodIcon = getMethodIcon(payment.paymentMethod);

  const shortId = (payment.txnId || payment._id?.toString() || "").slice(-8).toUpperCase();

  return (
    <View style={styles.paymentCard}>
      {/* Avatar */}
      <View style={styles.avatarBubble}>
        <Text style={styles.avatarInitials}>{initials}</Text>
      </View>

      {/* Middle info */}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {payment.userName}
          </Text>
          <Text style={styles.amount}>{formatAmount(payment.amountPaid)}</Text>
        </View>
        <View style={styles.cardBottomRow}>
          <MaterialCommunityIcons name={methodIcon} size={13} color={THEME.muted} />
          <Text style={styles.metaText}>
            {" "}
            {(payment.paymentMethod || "online").replace(/^\w/, (c) => c.toUpperCase())}
          </Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{formatDate(payment.createdAt)}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{formatTime(payment.createdAt)}</Text>
        </View>
        <Text style={styles.txnId}>TXN #{shortId}</Text>
      </View>

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
        <Text style={[styles.statusText, { color: statusColors.text }]}>
          {(payment.status || "–").toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────────
export default function PaymentsScreen() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalCollected: 0,
    totalTransactions: 0,
    pendingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [searchText, setSearchText] = useState("");

  const FILTERS = ["All", "Success", "Pending", "Manual"];

  const fetchPayments = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const session = await getPersistedSession();
      if (!session?.token) {
        Alert.alert("Session Expired", "Please log in again.");
        return;
      }

      const data = await getPaymentHistory(session.token);
      setPayments(data?.payments || []);
      setSummary(
        data?.summary || {
          totalCollected: 0,
          totalTransactions: 0,
          pendingCount: 0
        }
      );
    } catch (err) {
      console.log("Fetch payments error:", err);
      Alert.alert("Error", err.message || "Could not load payment history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filtered = payments.filter((p) => {
    const matchesFilter =
      filter === "All" ||
      (filter === "Success" && (p.status || "").toLowerCase() === "success") ||
      (filter === "Pending" && (p.status || "").toLowerCase() === "pending") ||
      (filter === "Manual" && (p.paymentMethod || "").toLowerCase() === "manual");

    const query = searchText.toLowerCase();
    const matchesSearch =
      !query ||
      (p.userName || "").toLowerCase().includes(query) ||
      (p.txnId || "").toLowerCase().includes(query) ||
      (p.userMobile || "").toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPayments(true)}
            tintColor={THEME.accentStrong}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Payment History</Text>
            <Text style={styles.headerSub}>Track all collections & records</Text>
          </View>
          <Pressable style={styles.headerIcon} onPress={() => fetchPayments(true)}>
            <MaterialCommunityIcons name="refresh" size={24} color={THEME.accentStrong} />
          </Pressable>
        </View>

        {/* ── Summary Card ── */}
        {!loading && (
          <SummaryCard
            totalCollected={summary.totalCollected}
            totalTransactions={summary.totalTransactions}
            pendingCount={summary.pendingCount}
          />
        )}

        {/* ── Search ── */}
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={22} color={THEME.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, TXN ID or mobile"
            placeholderTextColor="#9a9287"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText("")}>
              <MaterialCommunityIcons name="close-circle" size={18} color={THEME.muted} />
            </Pressable>
          )}
        </View>

        {/* ── Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f}
              label={f}
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>

        {/* ── List Header ── */}
        <View style={styles.listHeader}>
          <Text style={styles.listLabel}>TRANSACTIONS</Text>
          <Text style={styles.listCount}>{filtered.length} records</Text>
        </View>

        {/* ── List ── */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color={THEME.accentStrong}
            style={{ marginTop: 60 }}
          />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="cash-remove"
              size={60}
              color="#d8bc61"
            />
            <Text style={styles.emptyTitle}>No Payments Found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filter.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((p) => (
              <PaymentCard key={p._id?.toString() || p.txnId} payment={p} />
            ))}
          </View>
        )}

        {/* Spacer for bottom tab */}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomTabWrapper}>
        <BottomTab theme={THEME} activeTab="Payments" />
      </View>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fdf8ef"
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
    alignItems: "flex-start",
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1c1610"
  },
  headerSub: {
    fontSize: 14,
    color: THEME.muted,
    marginTop: 3,
    fontWeight: "500"
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8d7445",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#1c1610",
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 5
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20
  },
  summaryLabel: {
    fontSize: 13,
    color: "#a09274",
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6
  },
  summaryAmount: {
    fontSize: 38,
    fontWeight: "800",
    color: "#d8bc61"
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,126,52,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4
  },
  summaryBadgeText: {
    color: "#52c27a",
    fontWeight: "700",
    fontSize: 12
  },
  summaryRow: {
    flexDirection: "row",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)"
  },
  summaryMini: {
    flexDirection: "row",
    alignItems: "center"
  },
  miniLabel: {
    fontSize: 11,
    color: "#9a8970",
    fontWeight: "600"
  },
  miniVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginTop: 2
  },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2ede2",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e8e0d0",
    gap: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1c1610",
    fontWeight: "500"
  },

  // Filter chips
  chipRow: {
    marginBottom: 20,
    flexGrow: 0
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f2ede2",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e8e0d0"
  },
  chipActive: {
    backgroundColor: "#1c1610",
    borderColor: "#1c1610"
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.muted
  },
  chipTextActive: {
    color: "#d8bc61"
  },

  // List header
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  listLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#856b1a",
    letterSpacing: 2
  },
  listCount: {
    fontSize: 13,
    color: THEME.muted,
    fontWeight: "600"
  },

  list: {
    gap: 12
  },

  // Payment card
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#8d7445",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 2
  },
  avatarBubble: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f5e9c8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5c4500"
  },
  cardBody: {
    flex: 1
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1610",
    flex: 1,
    marginRight: 8
  },
  amount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1c1610"
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 2,
    marginBottom: 4
  },
  metaText: {
    fontSize: 12,
    color: THEME.muted,
    fontWeight: "500"
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#c0b8ac",
    marginHorizontal: 4
  },
  txnId: {
    fontSize: 11,
    color: "#b8a98a",
    fontWeight: "600",
    marginTop: 2
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 10,
    alignSelf: "flex-start"
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8
  },

  // Empty state
  emptyState: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1c1610",
    marginTop: 20,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.muted,
    textAlign: "center",
    fontWeight: "500"
  },

  // Avatar small
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22
  }
});
