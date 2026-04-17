import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ActivityCard from "../components/dashboard/ActivityCard";
import BottomTab from "../components/dashboard/BottomTab";
import Header from "../components/dashboard/Header";
import MarketCard from "../components/dashboard/MarketCard";
import RevenueCard from "../components/dashboard/RevenueCard";
import StatCard from "../components/dashboard/StatCard";
import RateEditorModal from "../components/dashboard/RateEditorModal";
import { getDashboard, updateMetalRate } from "../services/api";
import { clearSession, getPersistedSession } from "../utils/storage";

const THEMES = {
  gold: {
    page: "#f8f3e9",
    card: "#ffffff",
    surface: "#f4ede2",
    accentStrong: "#b18a0b",
    accentSoft: "#d8bc61",
    muted: "#6c6257",
    revenueGradient: ["#8e7200", "#b48b08", "#d6b12f"],
    marketCard: "#f3ede2",
    negative: "#c11d1d"
  },
  silver: {
    page: "#f2f4f6",
    card: "#ffffff",
    surface: "#e9edf2",
    accentStrong: "#73808b",
    accentSoft: "#aeb8c1",
    muted: "#5f6870",
    revenueGradient: ["#5f6972", "#7e8a95", "#9faab5"],
    marketCard: "#e9edf2",
    negative: "#c11d1d"
  }
};

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(Number(value || 0));

const formatRevenue = (value) => {
  const amount = Number(value || 0);

  if (amount >= 1000000) {
    return `Rs${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `Rs${(amount / 1000).toFixed(1)}K`;
  }

  return `Rs${amount.toFixed(0)}`;
};

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const getNextFixingLabel = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(18, 0, 0, 0);

  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }

  return `Next fixing ${next.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
};

const FALLBACK_DATA = {
  totalUsers: 0,
  activeChits: 0,
  revenue: 0,
  pendingRequests: 0,
  market: {
    rate: 0,
    currency: "INR",
    type: "gold",
    updatedAt: null
  },
  recentActivity: []
};

export default function DashboardScreen({ navigation, department = "gold" }) {
  const [dashboard, setDashboard] = useState(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editorVisible, setEditorVisible] = useState(false);
  const theme = THEMES[department] || THEMES.gold;

  const loadDashboard = async (mode = "initial") => {
    try {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");
      const session = await getPersistedSession();

      if (!session.token) {
        throw new Error("Authentication session expired. Please log in again.");
      }

      const response = await getDashboard(session.token);
      setDashboard(response);
    } catch (loadError) {
      setError(loadError.message);
      setDashboard(FALLBACK_DATA);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [department]);

  const subtitle = department === "gold" ? "GOLD OVERSIGHT" : "SILVER OVERSIGHT";
  const marketHeadline = useMemo(() => {
    if (!dashboard.market?.updatedAt) {
      return `Global ${department} pricing will appear once the live admin token is available.`;
    }

    return `Global ${department} pricing current as of ${new Date(
      dashboard.market.updatedAt
    ).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit"
    })}.`;
  }, [dashboard.market?.updatedAt, department]);

  const handleUpdateRate = async (payload) => {
    try {
      const session = await getPersistedSession();
      await updateMetalRate(session.token, payload);
      await loadDashboard("refresh");
    } catch (saveError) {
      alert(saveError.message);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }]
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loaderWrap, { backgroundColor: theme.page }]}>
        <ActivityIndicator size="large" color={theme.accentStrong} />
        <Text style={[styles.loaderText, { color: theme.muted }]}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.page }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard("refresh")} />
        }
      >
        <Header theme={theme} subtitle={subtitle} onLogout={handleLogout} />

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.card }]}>
            <Text style={styles.errorTitle}>Live dashboard unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: 22 }}>
          <MarketCard
            theme={theme}
            rate={dashboard.market?.rate || 0}
            currency={dashboard.market?.currency || "INR"}
            metalType={department}
            onEdit={() => setEditorVisible(true)}
          />
        </View>

        <View style={styles.stack}>
          <StatCard
            theme={theme}
            title="TOTAL USERS"
            value={formatNumber(dashboard.totalUsers)}
            detail="+ 4.2% this month"
            badge="USR"
            accent={theme.accentStrong}
          />

          <StatCard
            theme={theme}
            title="ACTIVE CHITS"
            value={formatNumber(dashboard.activeChits)}
            detail={`Across ${formatNumber(dashboard.activeChits || 0)} active plans`}
            badge="CHT"
            accent={theme.accentStrong}
            onPress={() => navigation.navigate("ActiveChits")}
          />

          <RevenueCard
            theme={theme}
            value={formatRevenue(dashboard.revenue)}
            detail={`Equivalent to ${formatCurrency(dashboard.revenue, dashboard.market?.currency || "INR")}`}
          />

          <StatCard
            theme={theme}
            title="UPI CONFIG"
            value={dashboard.activeUPI ? "ACTIVE" : "NONE"}
            detail={dashboard.activeUPI ? dashboard.activeUPI.upiId : "No active UPI set"}
            badge="UPI"
            accent={dashboard.activeUPI ? theme.accentStrong : theme.negative}
            onPress={() => navigation.navigate("UPIScreen", { department })}
          />
        </View>

        <RateEditorModal
          visible={editorVisible}
          onClose={() => setEditorVisible(false)}
          onSave={handleUpdateRate}
          theme={theme}
          currentRate={dashboard.market?.rate}
          metalType={department}
        />
      </ScrollView>

      <View style={styles.bottomTabWrapper}>
        <BottomTab theme={theme} activeTab="Dashboard" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 100 // Leave space for the floating bottom tab
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
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15
  },
  errorBanner: {
    marginTop: 18,
    borderRadius: 22,
    padding: 16
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#231c15"
  },
  errorText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: "#6b5f54"
  },
  stack: {
    marginTop: 22,
    gap: 18
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16120f"
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: "700"
  },
  activityList: {
    gap: 16
  },
  emptyCard: {
    borderRadius: 26,
    padding: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#181410"
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: "#655b51"
  }
});
