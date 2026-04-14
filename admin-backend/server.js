const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const port = process.env.PORT || 5001;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*"
  })
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/admin", authRoutes);
app.use("/admin", dashboardRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Admin backend listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start admin backend", error.message);
    process.exit(1);
  }
};

startServer();
