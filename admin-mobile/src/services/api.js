import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

const extractError = (error) => {
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }

  throw new Error(error.message || "Request failed");
};

export const loginAdmin = async (payload) => {
  try {
    const response = await api.post("/admin/login", payload);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const verifyAdminOtp = async (payload) => {
  try {
    const response = await api.post("/admin/verify-otp", payload);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getDashboard = async (token) => {
  try {
    const response = await api.get("/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getPendingRequests = async (token) => {
  try {
    const response = await api.get("/admin/requests", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getActiveChits = async (token) => {
  try {
    const response = await api.get("/admin/active-chits", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const updateRequestStatus = async (token, requestId, status) => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/admin/requests/${requestId}`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (err) {
    extractError(err);
  }
};

export const getAllUsers = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (err) {
    extractError(err);
  }
};

export const updateMetalRate = async (token, payload) => {
  try {
    const response = await api.post("/admin/rate", payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (err) {
    extractError(err);
  }
};

export const manualCreateUser = async (token, payload) => {
  try {
    const response = await api.post("/admin/manual/user", payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (err) {
    extractError(err);
  }
};

export const manualAssignChit = async (token, payload) => {
  try {
    const response = await api.post("/admin/manual/chit", payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (err) {
    extractError(err);
  }
};

export const manualAddPayment = async (token, payload) => {
  try {
    const response = await api.post("/admin/manual/payment", payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (err) {
    extractError(err);
  }
};

export { API_BASE_URL };
