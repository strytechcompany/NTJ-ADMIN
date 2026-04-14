import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  token: "admin_token",
  user: "admin_user",
  department: "admin_department"
};

export const persistSession = async ({ token, user }) => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.token, token],
    [STORAGE_KEYS.user, JSON.stringify(user)],
    [STORAGE_KEYS.department, user.department]
  ]);
};

export const getPersistedSession = async () => {
  const entries = await AsyncStorage.multiGet([
    STORAGE_KEYS.token,
    STORAGE_KEYS.user,
    STORAGE_KEYS.department
  ]);

  const session = Object.fromEntries(entries);

  return {
    token: session[STORAGE_KEYS.token],
    user: session[STORAGE_KEYS.user] ? JSON.parse(session[STORAGE_KEYS.user]) : null,
    department: session[STORAGE_KEYS.department] || null
  };
};

export const clearSession = () =>
  AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user, STORAGE_KEYS.department]);
