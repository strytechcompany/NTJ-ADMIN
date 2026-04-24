import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getUserDetails, deleteMember, linkPaymentToChit } from "../services/api";
import { getPersistedSession } from "../utils/storage";
import { THEMES } from "../utils/themes";
import { formatCurrency, formatNumber } from "../utils/format";
const THEME = THEMES.gold;


const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  try {
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short"
    });
  } catch (e) {
    return `${d.getDate()} ${d.getMonth() + 1}`;
  }
};


// Month pill component - shows M1, M2 etc with paid/unpaid status
const MonthPill = ({ monthNumber, payment, onPress, theme }) => {
  const THEME = theme;
  const paid = !!payment;
  return (
    <TouchableOpacity
      style={[styles.monthPill, paid ? styles.monthPillPaid : styles.monthPillPending]}
      onPress={() => paid && onPress && onPress(payment)}
      activeOpacity={paid ? 0.7 : 1}
    >
      <MaterialCommunityIcons
        name={paid ? "check-circle" : "clock-outline"}
        size={12}
        color={paid ? THEME.success : "#bbb"}
        style={{ marginBottom: 2 }}
      />
      <Text style={[styles.monthPillLabel, { color: paid ? THEME.success : "#bbb" }]}>
        M{monthNumber}
      </Text>
      {paid && (
        <Text style={[styles.monthPillDate, { color: THEME.success }]}>{formatDate(payment.paidAt)}</Text>
      )}
    </TouchableOpacity>
  );
};

// Payment detail popup card
const PaymentDetailCard = ({ payment, onClose, theme }) => {
  const THEME = theme;
  if (!payment) return null;
  return (
    <View style={styles.paymentDetailOverlay}>
      <View style={styles.paymentDetailCard}>
        <View style={styles.paymentDetailHeader}>
          <View style={[styles.paymentDetailBadge, { backgroundColor: THEME.successBg }]}>
            <MaterialCommunityIcons name="check-circle" size={20} color={THEME.success} />
            <Text style={[styles.paymentDetailBadgeText, { color: THEME.success }]}>PAID</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={20} color={THEME.muted} />
          </TouchableOpacity>
        </View>
        <Text style={styles.paymentDetailAmount}>{formatCurrency(payment.amount)}</Text>
        <Text style={[styles.paymentDetailMonth, { color: THEME.muted }]}>Month {payment.monthNumber}</Text>
        <View style={styles.paymentDetailRow}>
          <MaterialCommunityIcons name="calendar" size={14} color={THEME.muted} />
          <Text style={styles.paymentDetailMeta}>
            {(() => {
              const d = new Date(payment.paidAt);
              try {
                return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
              } catch (e) {
                return d.toDateString();
              }
            })()}
          </Text>
        </View>
        <View style={styles.paymentDetailRow}>
          <MaterialCommunityIcons name="credit-card-outline" size={14} color={THEME.muted} />
          <Text style={styles.paymentDetailMeta}>{(payment.paymentMethod || "manual").toUpperCase()}</Text>
        </View>
        {payment.txnId && (
          <View style={styles.paymentDetailRow}>
            <MaterialCommunityIcons name="receipt" size={14} color={THEME.muted} />
            <Text style={[styles.paymentDetailMeta, { fontStyle: "italic" }]}>{payment.txnId}</Text>
          </View>
        )}
        {payment.notes && (
          <View style={styles.paymentDetailRow}>
            <MaterialCommunityIcons name="note-text" size={14} color={THEME.muted} />
            <Text style={styles.paymentDetailMeta}>{payment.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default function UserDetailScreen({ route, navigation }) {
  const { userId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [theme, setTheme] = useState(THEMES.gold);

  const THEME = theme; // Defined at the top of component scope

  const loadData = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const session = await getPersistedSession();
      setTheme(THEMES[session.department] || THEMES.gold);
      const details = await getUserDetails(session.token, userId);
      setData(details);
    } catch (error) {
      console.log("Error loading user details:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLinkPayment = async (paymentId) => {
    if (!chits || chits.length === 0) {
      Alert.alert("Error", "No active chit plans found to link this payment to.");
      return;
    }

    // If more than one chit, let user know we're linking to the first one or need a picker
    // For now, if there's only one, we link to it. If more, we use the first one but warn.
    const targetChit = chits[0];
    const chitName = targetChit.planName || "Standard Plan";

    Alert.alert(
      "Link to Plan",
      `Do you want to link this payment to the "${chitName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Link Now", 
          onPress: async () => {
            try {
              setLoading(true);
              const session = await getPersistedSession();
              await linkPaymentToChit(session.token, {
                paymentId,
                chitId: targetChit.id
              });
              Alert.alert("Success", "Payment linked to plan successfully!");
              loadData(true);
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to link payment");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDelete = async () => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this user and all their associated data? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const session = await getPersistedSession();
              await deleteMember(session.token, userId);
              Alert.alert("Success", "User deleted successfully");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to delete user");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={THEME.accentStrong} />
      </View>
    );
  }

  const { profile, stats, chits, unlinkedPayments } = data || {};


  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: THEME.page }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={THEME.accentStrong} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={32} color={THEME.accentStrong} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member Profile</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={24} color={THEME.danger} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: THEME.card }]}>
          <View style={[styles.avatarLarge, { backgroundColor: THEME.surface }]}>
            <Text style={[styles.avatarInitials, { color: THEME.accentStrong }]}>
              {profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.profileName}>{profile?.name}</Text>
          <Text style={[styles.profileId, { color: THEME.muted }]}>ID: #{profile?.displayId}</Text>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="phone" size={16} color={THEME.muted} />
            <Text style={styles.contactText}>{profile?.mobile || "—"}</Text>
          </View>
          <View style={styles.contactRow}>
            <MaterialCommunityIcons name="email" size={16} color={THEME.muted} />
            <Text style={styles.contactText}>{profile?.email || "—"}</Text>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: THEME.card }]}>
            <MaterialCommunityIcons name="currency-inr" size={20} color={THEME.success} style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>TOTAL PAID</Text>
            <Text style={[styles.statValue, { color: THEME.success }]}>
              {formatCurrency(stats?.totalPaid)}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: THEME.card }]}>
            <MaterialCommunityIcons name="file-document-multiple" size={20} color={THEME.accentStrong} style={{ marginBottom: 4 }} />
            <Text style={[styles.statLabel, { color: THEME.muted }]}>ACTIVE CHITS</Text>
            <Text style={styles.statValue}>{stats?.activeChits || 0}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: THEME.card }]}>
            <MaterialCommunityIcons name="check-all" size={20} color={THEME.isSilver ? "#1976d2" : "#5c6bc0"} style={{ marginBottom: 4 }} />
            <Text style={[styles.statLabel, { color: THEME.muted }]}>PAYMENTS</Text>
            <Text style={[styles.statValue, { color: THEME.isSilver ? "#1976d2" : "#5c6bc0" }]}>{stats?.totalPayments || 0}</Text>
          </View>
        </View>

        {/* Chits with per-month payment timeline */}
        <Text style={[styles.sectionTitle, { color: THEME.accentStrong }]}>CHIT PAYMENT DETAILS</Text>

        {chits?.length > 0 ? chits.map((chit) => {
          const duration = chit.duration || 12;
          // Build a lookup map: monthNumber => payment
          const paymentMap = {};
          (chit.payments || []).forEach(p => {
            paymentMap[p.monthNumber] = p;
          });

          const progressPct = Math.round((chit.paidMonths || 0) / duration * 100);

          return (
            <View key={chit.id?.toString()} style={[styles.chitCard, { backgroundColor: THEME.card }]}>
              {/* Chit Header */}
              <View style={styles.chitHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chitPlanName}>{chit.planName}</Text>
                  <Text style={[styles.chitMeta, { color: THEME.muted }]}>
                    {chit.metalType} • {formatCurrency(chit.monthlyAmount)}/mo • {duration} months
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: ["APPROVED", "ACTIVE"].includes(chit.status) ? THEME.successBg : THEME.pendingBg }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: ["APPROVED", "ACTIVE"].includes(chit.status) ? THEME.success : THEME.pending }
                  ]}>
                    {chit.status}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: THEME.accentStrong }]} />
                </View>
                <Text style={[styles.progressText, { color: THEME.muted }]}>
                  {chit.paidMonths || 0}/{duration} months paid • {formatCurrency(chit.totalPaid)} of {formatCurrency(chit.totalAmount || (chit.monthlyAmount * duration))}
                </Text>
              </View>

              {/* Monthly Pills Grid */}
              <Text style={[styles.timelineLabel, { color: THEME.muted }]}>MONTHLY PAYMENT TRACKER</Text>
              <View style={styles.monthGrid}>
                {Array.from({ length: duration }, (_, i) => i + 1).map(month => (
                  <MonthPill
                    key={month}
                    monthNumber={month}
                    payment={paymentMap[month] || null}
                    onPress={(payment) => setSelectedPayment(payment)}
                    theme={THEME}
                  />
                ))}
              </View>

              {/* Paid Summary */}
              {chit.payments?.length > 0 && (
                <View style={styles.paidSummary}>
                  <MaterialCommunityIcons name="information-outline" size={13} color={THEME.muted} />
                  <Text style={styles.paidSummaryText}>
                    Tap a green month pill to see payment details
                  </Text>
                </View>
              )}

              {/* No payments yet */}
              {(!chit.payments || chit.payments.length === 0) && (
                <View style={[styles.noPaymentsBanner, { backgroundColor: THEME.pendingBg }]}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={THEME.pending} />
                  <Text style={[styles.noPaymentsText, { color: THEME.pending }]}>No payments recorded yet</Text>
                </View>
              )}
            </View>
          );
        }) : (
          <View style={[styles.emptyCard, { backgroundColor: THEME.card }]}>
            <MaterialCommunityIcons name="file-document-outline" size={40} color={THEME.accentSoft} />
            <Text style={[styles.emptyText, { color: THEME.muted }]}>No chit enrollments found</Text>
          </View>
        )}

        {/* Unlinked Payments Section */}
        {data?.unlinkedPayments?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: THEME.accentStrong, marginTop: 10 }]}>GENERAL PAYMENTS</Text>
            <View style={[styles.chitCard, { backgroundColor: THEME.card }]}>
              <View style={styles.unlinkedGrid}>
                {data.unlinkedPayments.map((p) => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.unlinkedPill, { backgroundColor: THEME.surface }]}
                    onPress={() => setSelectedPayment(p)}
                  >
                    <MaterialCommunityIcons name="cash" size={14} color={THEME.accentStrong} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.unlinkedAmount}>{formatCurrency(p.amount)}</Text>
                      <Text style={styles.unlinkedDate}>{formatDate(p.paidAt)}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.linkBtn}
                      onPress={() => handleLinkPayment(p.id)}
                    >
                      <Text style={styles.linkBtnText}>LINK TO PLAN</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.paidSummaryText, { marginTop: 12, color: THEME.muted }]}>
                These payments are not linked to any specific chit plan.
              </Text>
            </View>
          </>
        )}

        {/* Transaction History Section */}
        {data?.transactions?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: THEME.accentStrong, marginTop: 10 }]}>TRANSACTION HISTORY</Text>
            <View style={[styles.chitCard, { backgroundColor: THEME.card, padding: 0 }]}>
              {data.transactions.map((t, idx) => {
                const statusColor = t.status === "SUCCESS" ? THEME.success : t.status === "PENDING" ? THEME.pending : THEME.danger;
                const statusBg = t.status === "SUCCESS" ? THEME.successBg : t.status === "PENDING" ? THEME.pendingBg : "#ffebee";
                
                return (
                  <View key={t.id || idx} style={[styles.txnRow, idx < data.transactions.length - 1 && styles.txnDivider]}>
                    <View style={styles.txnMain}>
                      <Text style={styles.txnAmtText}>{formatCurrency(t.amount)}</Text>
                      <Text style={[styles.txnMetaText, { color: THEME.muted }]}>
                        {formatDate(t.date)} • {t.metalType}
                      </Text>
                      {t.txnId && <Text style={[styles.txnRefText, { color: THEME.muted }]}>Ref: {t.txnId}</Text>}
                    </View>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusTextSmall, { color: statusColor }]}>{t.status}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment Detail Popup — rendered outside ScrollView so it covers full screen */}
      {selectedPayment && (
        <PaymentDetailCard
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          theme={THEME}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 20, paddingTop: 10 },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1c1610" },
  backBtn: { padding: 4, marginLeft: -8 },

  // Profile Card
  profileCard: {
    borderRadius: 24, padding: 24,
    alignItems: "center", marginBottom: 16, elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: "center", alignItems: "center", marginBottom: 14
  },
  avatarInitials: { fontSize: 28, fontWeight: "800" },
  profileName: { fontSize: 22, fontWeight: "800", color: "#1c1610" },
  profileId: { fontSize: 13, color: THEME.muted, fontWeight: "600", marginBottom: 12 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  contactText: { fontSize: 13, color: "#444", fontWeight: "500" },

  // Stats Row
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statBox: {
    flex: 1, borderRadius: 18, padding: 14,
    alignItems: "center", elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6
  },
  statLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "800", color: "#1c1610" },

  // Section
  sectionTitle: {
    fontSize: 13, fontWeight: "900",
    letterSpacing: 1.5, marginBottom: 14
  },

  // Chit Card
  chitCard: {
    borderRadius: 24, padding: 20,
    marginBottom: 16, elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12
  },
  chitHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  chitPlanName: { fontSize: 17, fontWeight: "800", color: "#1c1610", marginBottom: 4 },
  chitMeta: { fontSize: 13, fontWeight: "500" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "800" },

  // Progress Bar
  progressContainer: { marginBottom: 16 },
  progressBarBg: {
    height: 6, backgroundColor: "#f0ebe0", borderRadius: 3, marginBottom: 6, overflow: "hidden"
  },
  progressBarFill: {
    height: "100%", borderRadius: 3
  },
  progressText: { fontSize: 12, fontWeight: "600" },

  // Month grid
  timelineLabel: {
    fontSize: 10, fontWeight: "800",
    letterSpacing: 1.5, marginBottom: 10
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },

  // Month pill
  monthPill: {
    width: 48, paddingVertical: 8, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5
  },
  monthPillPaid: {
    backgroundColor: THEME.successBg, borderColor: "#a5d6a7"
  },
  monthPillPending: {
    backgroundColor: "#f7f7f7", borderColor: "#e0e0e0"
  },
  monthPillLabel: { fontSize: 11, fontWeight: "800" },
  monthPillLabelPaid: { },
  monthPillLabelPending: { color: "#ccc" },
  monthPillDate: { fontSize: 8, fontWeight: "600", marginTop: 1 },

  // Info row
  paidSummary: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  paidSummaryText: { fontSize: 11, fontStyle: "italic" },

  // No payments banner
  noPaymentsBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: THEME.pendingBg, borderRadius: 10, padding: 12, marginTop: 4
  },
  noPaymentsText: { fontSize: 13, fontWeight: "600" },

  // Empty state
  emptyCard: {
    borderRadius: 20, padding: 40,
    alignItems: "center", marginBottom: 20
  },
  emptyText: { marginTop: 12, fontSize: 15, fontStyle: "italic" },

  // Payment detail overlay (popup)
  paymentDetailOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 24
  },
  paymentDetailCard: {
    backgroundColor: "#fff", borderRadius: 28, padding: 28, width: "100%",
    elevation: 10, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20
  },
  paymentDetailHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16
  },
  paymentDetailBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
  },
  paymentDetailBadgeText: { fontSize: 12, fontWeight: "800" },
  paymentDetailAmount: { fontSize: 32, fontWeight: "900", color: "#1c1610", marginBottom: 4 },
  paymentDetailMonth: { fontSize: 14, fontWeight: "600", marginBottom: 16 },
  paymentDetailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  paymentDetailMeta: { fontSize: 14, color: "#444", fontWeight: "500", flex: 1 },

  // Unlinked payments styles
  unlinkedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  unlinkedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: '45%'
  },
  unlinkedAmount: { fontSize: 14, fontWeight: "700", color: "#1c1610" },
  unlinkedDate: { fontSize: 10, color: "#6c6257", marginTop: 2 },
  linkBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: THEME.accentStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  linkBtnText: {
    fontSize: 9,
    fontWeight: "800",
    color: THEME.accentStrong
  },

  // Transaction history styles
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12
  },
  txnDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  txnMain: {
    flex: 1
  },
  txnAmtText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1610"
  },
  txnMetaText: {
    fontSize: 12,
    marginTop: 2
  },
  txnRefText: {
    fontSize: 10,
    marginTop: 2,
    fontStyle: "italic"
  },
  statusBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: "800"
  }
});
