const mongoose = require("mongoose");

const upiConfigSchema = new mongoose.Schema(
  {
    upiId: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true,
      default: "Primary UPI"
    },
    isActive: {
      type: Boolean,
      default: false
    },
    department: {
      type: String,
      enum: ["gold", "silver"],
      required: true
    }
  },
  {
    timestamps: true,
    collection: "upi_configs"
  }
);

module.exports = mongoose.models.UPIConfig || mongoose.model("UPIConfig", upiConfigSchema);
