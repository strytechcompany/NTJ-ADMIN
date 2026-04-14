const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    mobile: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: "user"
    },
    department: {
      type: String,
      enum: ["gold", "silver", null],
      default: null
    },
    otp: {
      type: String,
      default: null
    },
    otpExpiry: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: "users"
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
