import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomTab from "../components/dashboard/BottomTab";
import { getActiveChits } from "../services/api";
import { getPersistedSession } from "../utils/storage";
import { THEMES } from "../utils/themes";
const THEME = THEMES.gold;


function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function ActiveChitCard({ request }) {
  const metal = (request.metalType || "gold").toLowerCase();
  const metalColor = metal === "gold" ? "#b18a0b" : "#73808b";
  const metalBg = metal === "gold" ? "#fff8e0" : "#eef0f3";
  const statusColor = request.status === "active" ? "#28a745" : "#b18a0b";

  return (
    <View style={styles.reqCard}>
      {/* Card Header: TXN ID + Status */}
      <View style={styles.reqHeader}>
        <View>
          <Text style={styles.reqTxnLabel}>TRANSACTION ID</Text>
          <Text style={styles.reqTxnId}>
            #{(request.txnId || "").slice(-8).toUpperCase() || "—"}
          </Text>
        </View>
        <View style={styles.activeBadge}>
          <View style={[styles.activeDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.activeText, { color: statusColor }]}>
            {(request.status || "ACTIVE").toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.userInfoRow}>
        <View style={[styles.avatarBubble, { backgroundColor: THEME.surface }]}>
          <Text style={[styles.avatarInitials, { color: THEME.accentStrong }]}>
            {getInitials(request.userName)}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{request.userName || "Unknown Member"}</Text>
          {request.userMobile ? (
            <View style={styles.infoLine}>
              <MaterialCommunityIcons name="phone-outline" size={13} color={THEME.muted} />
              <Text style={styles.infoText}>{request.userMobile}</Text>
            </View>
          ) : null}
          {request.userEmail ? (
            <View style={styles.infoLine}>
              <MaterialCommunityIcons name="email-outline" size={13} color={THEME.muted} />
              <Text style={styles.infoText}>{request.userEmail}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Chit Details Box */}
      <View style={[styles.chitDetailBox, { backgroundColor: metalBg }]}>
        <View style={styles.chitDetailRow}>
          <View>
            <Text style={styles.chitDetailLabel}>ACTIVE CHIT</Text>
            <Text style={[styles.chitDetailValue, { color: metalColor }]}>
              ₹{(request.monthlyAmount || 0).toLocaleString("en-IN")}/month
            </Text>
          </View>
          <View style={[styles.metalBadge, { backgroundColor: metalColor }]}>
            <Text style={styles.metalBadgeText}>{metal.toUpperCase()}</Text>
          </View>
        </View>
        {(request.planName || request.requestName) ? (
          <View style={styles.chitSubRow}>
            <Text style={styles.chitSubLabel}>PLAN NAME</Text>
            <Text style={styles.chitSubValue}>
              {request.planName || request.requestName}
            </Text>
          </View>
        ) : null}
        {request.totalAmount ? (
          <View style={styles.chitSubRow}>
            <Text style={styles.chitSubLabel}>TOTAL VALUE</Text>
            <Text style={styles.chitSubValue}>
              ₹{Number(request.totalAmount).toLocaleString("en-IN")}
            </Text>
          </View>
        ) : null}
        {request.duration ? (
          <View style={styles.chitSubRow}>
            <Text style={styles.chitSubLabel}>DURATION</Text>
            <Text style={styles.chitSubValue}>{request.duration} months</Text>
          </View>
        ) : null}
        <View style={styles.chitSubRow}>
          <Text style={styles.chitSubLabel}>STARTED ON</Text>
          <Text style={styles.chitSubValue}>{formatDate(request.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ActiveChitsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState(THEMES.gold);

  const THEME = theme;


  const fetchRequests = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const session = await getPersistedSession();
      if (!session?.token) {
        Alert.alert("Authentication Required", "Please log in.");
        return;
      }
      setTheme(THEMES[session.department] || THEMES.gold);

      const data = await getActiveChits(session.token);
      setRequests(data || []);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to fetch active chits");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const activeCount = requests.length;


  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: THEME.page }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRequests(true)}
            tintColor={THEME.accentStrong}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={THEME.accentStrong} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerBrand}>NTJ Admin</Text>
              <Text style={styles.headerSub}>ACTIVE CHITS</Text>
            </View>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Active{"\n"}Chit Plans</Text>
          <Text style={styles.heroSubtitle}>
            Overview of all currently running chit funds and user commitments.
          </Text>
        </View>

        {/* Summary Strip */}
        {!loading && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: THEME.accentStrong }]}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>Active Plans</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: THEME.accentStrong }]}>
                ₹{requests
                  .reduce((s, r) => s + (r.monthlyAmount || 0), 0)
                  .toLocaleString("en-IN")}
              </Text>
              <Text style={styles.summaryLabel}>Total Monthly Flow</Text>
            </View>
          </View>
        )}

        {/* Request Cards */}
        <View style={styles.requestList}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={THEME.accentStrong}
              style={{ marginTop: 40 }}
            />
          ) : requests.length > 0 ? (
            requests.map((req) => (
              <ActiveChitCard
                key={req._id}
                request={req}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="notebook-outline"
                size={64}
                color={THEME.accentSoft}
              />
              <Text style={[styles.emptyTitle, { color: THEME.accentStrong }]}>No Active Plans</Text>
              <Text style={styles.emptyText}>
                There are currently no active chit plans.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomTabWrapper}>
        <BottomTab theme={THEME} activeTab="Dashboard" />
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
    paddingTop: 12
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2
  },
  headerBrand: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1c1610"
  },
  headerSub: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a08850",
    letterSpacing: 1
  },

  // Hero
  heroSection: {
    marginTop: 10,
    marginBottom: 24
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: "800",
    color: "#1c1610",
    lineHeight: 44,
    marginBottom: 10
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#6c6257",
    lineHeight: 21
  },

  // Summary Strip
  summaryStrip: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#8d7445",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2
  },
  summaryItem: {
    flex: 1,
    alignItems: "center"
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800"
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6c6257",
    marginTop: 4,
    fontWeight: "600"
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#ede5d5"
  },

  // Request List
  requestList: {
    gap: 18,
    marginBottom: 24
  },
  reqCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 22,
    shadowColor: "#8d7445",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3
  },
  reqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  reqTxnLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#a0968b",
    letterSpacing: 1,
    marginBottom: 4
  },
  reqTxnId: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1c1610"
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eaf8ed",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  activeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8
  },

  // User Info
  userInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 18
  },
  avatarBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f0d87a",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5c4500"
  },
  userDetails: {
    flex: 1,
    gap: 4
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1610",
    marginBottom: 4
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  infoText: {
    fontSize: 13,
    color: "#6c6257"
  },

  // Chit Detail Box
  chitDetailBox: {
    borderRadius: 18,
    padding: 18,
    gap: 12
  },
  chitDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chitDetailLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#a0968b",
    letterSpacing: 1,
    marginBottom: 5
  },
  chitDetailValue: {
    fontSize: 20,
    fontWeight: "800"
  },
  metalBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  metalBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1
  },
  chitSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10
  },
  chitSubLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a0968b",
    letterSpacing: 0.8
  },
  chitSubValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3d3624"
  },

  // Empty State
  emptyBox: {
    padding: 50,
    alignItems: "center",
    gap: 12
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800"
  },
  emptyText: {
    fontSize: 15,
    color: "#6c6257",
    textAlign: "center",
    lineHeight: 22
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
  }
});
