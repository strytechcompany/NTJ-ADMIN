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
import { getPendingRequests, updateRequestStatus } from "../services/api";
import { getPersistedSession } from "../utils/storage";

const THEME = {
  page: "#f9f6e9",
  card: "#ffffff",
  accentStrong: "#b18a0b",
  accentSoft: "#f0d87a",
  muted: "#6c6257",
  inputBg: "#f2ede2",
  insightBg: "#f4eccd",
  queueBg: "#f3f0e8"
};

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

function RequestCard({ request, onApprove, onReject, isProcessing }) {
  const metal = (request.metalType || "gold").toLowerCase();
  const metalIcon = metal === "gold" ? "gold" : "silver";
  const metalColor = metal === "gold" ? "#b18a0b" : "#73808b";
  const metalBg = metal === "gold" ? "#fff8e0" : "#eef0f3";

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
        <View style={styles.pendingBadge}>
          <View style={styles.pendingDot} />
          <Text style={styles.pendingText}>
            {(request.status || "PENDING").toUpperCase()}
          </Text>
        </View>
      </View>

      {/* User Info Row */}
      <View style={styles.userInfoRow}>
        <View style={styles.avatarBubble}>
          <Text style={styles.avatarInitials}>
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
            <Text style={styles.chitDetailLabel}>REQUESTED CHIT</Text>
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
          <Text style={styles.chitSubLabel}>REQUESTED ON</Text>
          <Text style={styles.chitSubValue}>{formatDate(request.createdAt)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.approveBtn, isProcessing && { opacity: 0.5 }]}
          activeOpacity={0.8}
          onPress={() => onApprove(request._id)}
          disabled={isProcessing}
        >
          <MaterialCommunityIcons name="check" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.approveBtnText}>APPROVE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectBtn, isProcessing && { opacity: 0.5 }]}
          activeOpacity={0.6}
          onPress={() => onReject(request._id)}
          disabled={isProcessing}
        >
          <MaterialCommunityIcons name="close" size={16} color="#1c1610" style={{ marginRight: 6 }} />
          <Text style={styles.rejectBtnText}>REJECT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const session = await getPersistedSession();
      if (!session?.token) {
        Alert.alert("Authentication Required", "Please log in.");
        return;
      }

      const data = await getPendingRequests(session.token);
      setRequests(data || []);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (requestId, status) => {
    const label = status === "approved" ? "Approve" : "Reject";
    Alert.alert(
      `Confirm ${label}`,
      `Are you sure you want to ${status} this chit request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: label,
          style: status === "approved" ? "default" : "destructive",
          onPress: async () => {
            try {
              setProcessingId(requestId);
              const session = await getPersistedSession();
              await updateRequestStatus(session.token, requestId, status);
              // Remove from list immediately
              setRequests((prev) => prev.filter((r) => r._id !== requestId));
              Alert.alert(
                status === "approved" ? "✅ Approved" : "❌ Rejected",
                `Chit request has been ${status} successfully.`
              );
            } catch (err) {
              Alert.alert("Action Failed", err.message || "Something went wrong.");
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const pendingCount = requests.length;

  return (
    <SafeAreaView style={styles.safe}>
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
            <View style={styles.avatarSmall}>
              <MaterialCommunityIcons name="account" size={24} color={THEME.accentStrong} />
            </View>
            <View>
              <Text style={styles.headerBrand}>NTJ Admin</Text>
              <Text style={styles.headerSub}>CHIT REQUESTS</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <MaterialCommunityIcons name="bell" size={22} color="#444" />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.oversightBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>GOLD OVERSIGHT</Text>
          </View>
          <Text style={styles.heroTitle}>Pending{"\n"}Verifications</Text>
          <Text style={styles.heroSubtitle}>
            Review and validate incoming chit fund requests from members.
          </Text>
        </View>

        {/* Summary Strip */}
        {!loading && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{pendingCount}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                ₹{requests
                  .reduce((s, r) => s + (r.monthlyAmount || 0), 0)
                  .toLocaleString("en-IN")}
              </Text>
              <Text style={styles.summaryLabel}>Monthly Value</Text>
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
              <RequestCard
                key={req._id}
                request={req}
                isProcessing={processingId === req._id}
                onApprove={(id) => handleAction(id, "approved")}
                onReject={(id) => handleAction(id, "rejected")}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={64}
                color="#d8c99a"
              />
              <Text style={styles.emptyTitle}>All Clear</Text>
              <Text style={styles.emptyText}>
                No chit requests are pending review right now.
              </Text>
            </View>
          )}
        </View>

        {/* Audit Info Card */}
        <View style={styles.insightCard}>
          <MaterialCommunityIcons
            name="shield-check"
            size={26}
            color="#856a00"
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.insightTitle}>Audit Integrity</Text>
          <Text style={styles.insightText}>
            All approvals are logged with your admin credentials. Rejected
            requests are archived and auditable.
          </Text>
          <View style={styles.insightFooter}>
            <Text style={styles.insightLabel}>SYSTEM STATUS</Text>
            <Text style={styles.insightValue}>Active</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomTabWrapper}>
        <BottomTab theme={THEME} activeTab="Requests" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.page
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
  avatarSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  bellBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center"
  },

  // Hero
  heroSection: {
    marginTop: 10,
    marginBottom: 24
  },
  oversightBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffdf8e",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 14
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#856a00"
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#856a00",
    letterSpacing: 1
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
    fontWeight: "800",
    color: "#b18a0b"
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
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fbe49d",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  pendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#9a6e00"
  },
  pendingText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#856a00",
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
    marginBottom: 20,
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

  // Actions
  actionRow: {
    flexDirection: "row",
    gap: 12
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#b18a0b",
    borderRadius: 25,
    paddingVertical: 15,
    shadowColor: "#b18a0b",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4
  },
  approveBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0d5c1",
    borderRadius: 25,
    paddingVertical: 15
  },
  rejectBtnText: {
    color: "#1c1610",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2
  },

  // Empty State
  emptyBox: {
    padding: 50,
    alignItems: "center",
    gap: 12
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#b18a0b"
  },
  emptyText: {
    fontSize: 15,
    color: "#6c6257",
    textAlign: "center",
    lineHeight: 22
  },

  // Insight Card
  insightCard: {
    backgroundColor: THEME.insightBg,
    borderRadius: 28,
    padding: 24,
    marginBottom: 20
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1c1610",
    marginBottom: 10
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5c4d3d",
    marginBottom: 18
  },
  insightFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(133,106,0,0.12)",
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#856a00",
    letterSpacing: 1.2
  },
  insightValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3d3624"
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
