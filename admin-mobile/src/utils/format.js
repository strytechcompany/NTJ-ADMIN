export const formatCurrency = (value, currency = "INR") => {
  const amount = Number(value || 0);
  // Safe fallback if Intl is not available
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    return `${currency || "INR"} ${amount.toFixed(2)}`;
  }
};

export const formatNumber = (value) => {
  const num = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN").format(num);
  } catch (e) {
    return num.toString();
  }
};
