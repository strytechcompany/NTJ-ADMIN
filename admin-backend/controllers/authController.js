const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const OTP_TTL_MS = 5 * 60 * 1000;

const normalizeIdentifier = (identifier = "") => identifier.trim().toLowerCase();

const buildToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
      department: user.department
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d"
    }
  );

const loginAdmin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Identifier and password are required" });
    }

    const normalizedIdentifier = normalizeIdentifier(identifier);

    // Fallback: Check environment variables for system admins
    const envGoldEmail = normalizeIdentifier(process.env.GOLD_ADMIN_EMAIL);
    const envSilverEmail = normalizeIdentifier(process.env.SILVER_ADMIN_EMAIL);
    const envGoldPass = (process.env.GOLD_ADMIN_PASSWORD || "").trim();
    const envSilverPass = (process.env.SILVER_ADMIN_PASSWORD || "").trim();

    const isGoldEnv = normalizedIdentifier === envGoldEmail && password.trim() === envGoldPass;
    const isSilverEnv = normalizedIdentifier === envSilverEmail && password.trim() === envSilverPass;

    if (isGoldEnv || isSilverEnv) {
      const dept = isGoldEnv ? "gold" : "silver";
      // Generate a token directly for environment admins (Bypassing OTP for setup)
      const token = jwt.sign(
        { userId: "env-admin", role: "admin", department: dept },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        message: "Login successful (System Admin)",
        token,
        user: { id: "env-admin", role: "admin", department: dept }
      });
    }

    // Database check
    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { mobile: identifier.trim() }]
    });

    if (!user) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this portal" });
    }

    if (!["gold", "silver"].includes(user.department)) {
      return res.status(403).json({ message: "Admin department is not configured" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    return res.status(200).json({
      message: "OTP sent",
      otp,
      userId: user._id,
      department: user.department
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to process admin login",
      error: error.message
    });
  }
};

const verifyAdminOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ message: "userId and otp are required" });
    }

    const user = await User.findById(userId);

    if (!user || user.role !== "admin") {
      return res.status(404).json({ message: "Admin user not found" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: "OTP not generated or already used" });
    }

    if (user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      user.otp = null;
      user.otpExpiry = null;
      await user.save();
      return res.status(401).json({ message: "OTP expired" });
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = buildToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to verify OTP",
      error: error.message
    });
  }
};

module.exports = {
  loginAdmin,
  verifyAdminOtp
};
