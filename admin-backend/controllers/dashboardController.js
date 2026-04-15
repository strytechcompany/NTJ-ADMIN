const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const buildTimeAgo = (value) => {
  if (!value) {
    return "just now";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const asObjectId = {
  $convert: {
    input: "$userId",
    to: "objectId",
    onError: null,
    onNull: null
  }
};

const getDashboard = async (req, res) => {
  try {
    const department = req.user?.department;

    if (!["gold", "silver"].includes(department)) {
      return res.status(403).json({ message: "Department access is required" });
    }

    const db = mongoose.connection.db;
    const balanceField = department === "gold" ? "goldBalance" : "silverBalance";
    const normalizedDepartment = department.toLowerCase();

    const [
      balanceUsers,
      chitUsers,
      orderUsers,
      activeChitsResult,
      revenueResult,
      pendingChitsResult,
      pendingOrdersResult,
      marketResult,
      recentUsers,
      recentChits,
      recentOrders
    ] = await Promise.all([
      db
        .collection("users")
        .aggregate([
          { $match: { [balanceField]: { $gt: 0 } } },
          { $project: { userId: { $toString: "$_id" } } }
        ])
        .toArray(),
      db
        .collection("chitfunds")
        .aggregate([
          { $match: { metalType: normalizedDepartment } },
          { $group: { _id: "$userId" } },
          { $project: { userId: "$_id" } }
        ])
        .toArray(),
      db
        .collection("orders")
        .aggregate([
          { $match: { metalType: normalizedDepartment } },
          { $group: { _id: "$userId" } },
          { $project: { userId: "$_id" } }
        ])
        .toArray(),
      db
        .collection("chitfunds")
        .aggregate([
          {
            $match: {
              metalType: normalizedDepartment,
              status: { $in: ["active", "approved"] }
            }
          },
          { $count: "count" }
        ])
        .toArray(),
      db
        .collection("orders")
        .aggregate([
          {
            $match: {
              metalType: normalizedDepartment,
              status: { $regex: /^success$/i }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $ifNull: ["$amountPaid", 0] } }
            }
          }
        ])
        .toArray(),
      db
        .collection("chitfunds")
        .aggregate([
          {
            $match: {
              metalType: normalizedDepartment,
              status: { $regex: /^pending$/i }
            }
          },
          { $count: "count" }
        ])
        .toArray(),
      db
        .collection("orders")
        .aggregate([
          {
            $match: {
              metalType: normalizedDepartment,
              status: { $regex: /^pending$/i }
            }
          },
          { $count: "count" }
        ])
        .toArray(),
      db
        .collection("rates")
        .aggregate([
          {
            $match: {
              metalType: normalizedDepartment,
              isActive: true
            }
          },
          { $sort: { updatedAt: -1, createdAt: -1 } },
          { $limit: 1 }
        ])
        .toArray(),
      db
        .collection("users")
        .aggregate([
          { $match: { [balanceField]: { $gt: 0 } } },
          { $sort: { createdAt: -1 } },
          { $limit: 4 },
          {
            $project: {
              createdAt: 1,
              title: { $literal: "New Member Onboarding" },
              name: { $ifNull: ["$name", "Member"] },
              details: {
                $concat: [
                  "KYC ",
                  {
                    $cond: [{ $ifNull: ["$kycStatus", false] }, "$kycStatus", "pending"]
                  }
                ]
              },
              type: { $literal: "user" },
              primaryAction: { $literal: "Review" },
              secondaryAction: { $literal: "Reject" }
            }
          }
        ])
        .toArray(),
      db
        .collection("chitfunds")
        .aggregate([
          { $match: { metalType: normalizedDepartment } },
          { $sort: { createdAt: -1 } },
          { $limit: 4 },
          { $addFields: { userObjectId: asObjectId } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "user"
            }
          },
          {
            $project: {
              createdAt: 1,
              title: {
                $cond: [
                  { $eq: [{ $toLower: "$status" }, "pending"] },
                  "Chit Approval Request",
                  "Active Chit Monitoring"
                ]
              },
              name: {
                $ifNull: [{ $arrayElemAt: ["$user.name", 0] }, "Member"]
              },
              details: {
                $concat: [
                  normalizedDepartment === "gold" ? "Gold" : "Silver",
                  " chit - ",
                  { $toString: "$monthlyAmount" },
                  "/month"
                ]
              },
              type: { $literal: "chit" },
              primaryAction: {
                $cond: [
                  { $eq: [{ $toLower: "$status" }, "pending"] },
                  "Approve",
                  "Review"
                ]
              },
              secondaryAction: {
                $cond: [
                  { $eq: [{ $toLower: "$status" }, "pending"] },
                  "Reject",
                  ""
                ]
              }
            }
          }
        ])
        .toArray(),
      db
        .collection("orders")
        .aggregate([
          { $match: { metalType: normalizedDepartment } },
          { $sort: { createdAt: -1 } },
          { $limit: 4 },
          { $addFields: { userObjectId: asObjectId } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "user"
            }
          },
          {
            $project: {
              createdAt: 1,
              title: {
                $cond: [
                  { $eq: [{ $toLower: "$status" }, "success"] },
                  "Payment Captured",
                  "Payment Pending Review"
                ]
              },
              name: {
                $ifNull: [{ $arrayElemAt: ["$user.name", 0] }, "Member"]
              },
              details: {
                $concat: [
                  "Amount ",
                  { $toString: "$amountPaid" },
                  " - ",
                  { $ifNull: ["$metalName", normalizedDepartment] }
                ]
              },
              type: { $literal: "payment" },
              primaryAction: {
                $cond: [
                  { $eq: [{ $toLower: "$status" }, "success"] },
                  "Release Funds",
                  "Review"
                ]
              },
              secondaryAction: {
                $cond: [
                  { $eq: [{ $toLower: "$status" }, "success"] },
                  "Verified",
                  ""
                ]
              }
            }
          }
        ])
        .toArray()
    ]);

    const totalUsersCount = await db.collection("users").countDocuments();

    const recentActivity = [...recentUsers, ...recentChits, ...recentOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map((activity) => ({
        title: activity.title,
        name: activity.name,
        details: activity.details,
        time: buildTimeAgo(activity.createdAt),
        type: activity.type,
        primaryAction: activity.primaryAction,
        secondaryAction: activity.secondaryAction
      }));

    const latestRate = marketResult[0] || null;
    const pendingRequests = (pendingChitsResult[0]?.count || 0) + (pendingOrdersResult[0]?.count || 0);

    return res.status(200).json({
      totalUsers: totalUsersCount,
      activeChits: activeChitsResult[0]?.count || 0,
      revenue: revenueResult[0]?.total || 0,
      pendingRequests,
      market: latestRate
        ? {
            rate: latestRate.buyPrice,
            sellRate: latestRate.sellPrice,
            currency: latestRate.currency,
            purity: latestRate.purity,
            type: latestRate.metalType,
            updatedAt: latestRate.updatedAt || latestRate.createdAt
          }
        : {
            rate: 0,
            sellRate: 0,
            currency: "INR",
            purity: "",
            type: normalizedDepartment,
            updatedAt: null
          },
      recentActivity
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch dashboard data",
      error: error.message
    });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const department = req.user?.department;
    if (!["gold", "silver"].includes(department)) {
      return res.status(403).json({ message: "Department access is required" });
    }

    const db = mongoose.connection.db;
    const normalizedDepartment = department.toLowerCase();

    // Match pending chits — also allow entries without metalType (some user apps may omit it)
    const matchStage = {
      status: { $regex: /^pending$/i },
      $or: [
        { metalType: normalizedDepartment },
        { metalType: { $exists: false } },
        { metalType: null }
      ]
    };

    const pendingRequests = await db
      .collection("chitfunds")
      .aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        // Try to convert userId to ObjectId (works if stored as string or ObjectId)
        {
          $addFields: {
            userObjectId: {
              $convert: {
                input: "$userId",
                to: "objectId",
                onError: null,
                onNull: null
              }
            }
          }
        },
        // Lookup by ObjectId
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "userByObjectId"
          }
        },
        // Also lookup by string userId (fallback for apps that store userId as string)
        {
          $lookup: {
            from: "users",
            let: { uid: { $toString: "$userId" } },
            pipeline: [
              { $addFields: { idStr: { $toString: "$_id" } } },
              { $match: { $expr: { $eq: ["$idStr", "$$uid"] } } }
            ],
            as: "userByString"
          }
        },
        {
          $addFields: {
            resolvedUser: {
              $cond: [
                { $gt: [{ $size: "$userByObjectId" }, 0] },
                { $arrayElemAt: ["$userByObjectId", 0] },
                { $arrayElemAt: ["$userByString", 0] }
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            txnId: { $ifNull: ["$txnId", { $toString: "$_id" }] },
            status: 1,
            metalType: 1,
            monthlyAmount: 1,
            totalAmount: 1,
            duration: 1,
            createdAt: 1,
            userId: 1,
            planName: 1,
            requestName: 1,
            userName: { $ifNull: ["$resolvedUser.name", "Unknown Member"] },
            userMobile: { $ifNull: ["$resolvedUser.mobile", ""] },
            userEmail: { $ifNull: ["$resolvedUser.email", ""] },
            userTier: { $ifNull: ["$resolvedUser.tier", "Member"] },
            userAvatar: { $ifNull: ["$resolvedUser.avatar", ""] }
          }
        }
      ])
      .toArray();

    return res.status(200).json(pendingRequests);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch pending requests",
      error: error.message
    });
  }
};

const getActiveChits = async (req, res) => {
  try {
    const department = req.user?.department;
    if (!["gold", "silver"].includes(department)) {
      return res.status(403).json({ message: "Department access is required" });
    }

    const db = mongoose.connection.db;
    const normalizedDepartment = department.toLowerCase();

    // Match active or approved chits
    const matchStage = {
      status: { $in: ["approved", "active"] },
      $or: [
        { metalType: normalizedDepartment },
        { metalType: { $exists: false } },
        { metalType: null }
      ]
    };

    const activeChits = await db
      .collection("chitfunds")
      .aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        {
          $addFields: {
            userObjectId: {
              $convert: {
                input: "$userId",
                to: "objectId",
                onError: null,
                onNull: null
              }
            }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "userByObjectId"
          }
        },
        {
          $lookup: {
            from: "users",
            let: { uid: { $toString: "$userId" } },
            pipeline: [
              { $addFields: { idStr: { $toString: "$_id" } } },
              { $match: { $expr: { $eq: ["$idStr", "$$uid"] } } }
            ],
            as: "userByString"
          }
        },
        {
          $addFields: {
            resolvedUser: {
              $cond: [
                { $gt: [{ $size: "$userByObjectId" }, 0] },
                { $arrayElemAt: ["$userByObjectId", 0] },
                { $arrayElemAt: ["$userByString", 0] }
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            txnId: { $ifNull: ["$txnId", { $toString: "$_id" }] },
            status: 1,
            metalType: 1,
            monthlyAmount: 1,
            totalAmount: 1,
            duration: 1,
            createdAt: 1,
            userId: 1,
            planName: 1,
            requestName: 1,
            userName: { $ifNull: ["$resolvedUser.name", "Unknown Member"] },
            userMobile: { $ifNull: ["$resolvedUser.mobile", ""] },
            userEmail: { $ifNull: ["$resolvedUser.email", ""] },
            userTier: { $ifNull: ["$resolvedUser.tier", "Member"] },
            userAvatar: { $ifNull: ["$resolvedUser.avatar", ""] }
          }
        }
      ])
      .toArray();

    return res.status(200).json(activeChits);
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch active chits",
      error: error.message
    });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const department = req.user?.department;

    if (!["approved", "rejected"].includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const db = mongoose.connection.db;
    const result = await db.collection("chitfunds").updateOne(
      { 
        _id: new mongoose.Types.ObjectId(id),
        metalType: department.toLowerCase() // Security: ensure admin can only approve their dept chits
      },
      { $set: { status: status.toLowerCase(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Request not found or unauthorized" });
    }

    return res.status(200).json({ message: `Request ${status} successfully` });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update request status",
      error: error.message
    });
  }
};

const getUsersList = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Aggregate users with their active chit counts (all non-admin users)
    const users = await db.collection("users").aggregate([
      { $match: { role: { $ne: "admin" } } },
      {
        $lookup: {
          from: "chitfunds",
          localField: "_id",
          foreignField: "userId",
          as: "chits"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          mobile: 1,
          email: 1,
          activeChitsCount: {
            $size: {
              $filter: {
                input: "$chits",
                as: "chit",
                cond: { $eq: ["$$chit.status", "approved"] }
              }
            }
          }
        }
      }
    ]).toArray();

    // Map to frontend format
    const formattedUsers = users.map(u => ({
      id: u._id.toString().slice(-6).toUpperCase(), // Using last 6 chars for ID
      realId: u._id,
      name: u.name || "Anonymous Member",
      email: u.email,
      mobile: u.mobile,
      initials: (u.name || "Member")
        .split(" ")
        .filter(n => n)
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      status: "VERIFIED",
      activeChits: u.activeChitsCount || 0,
      hasImage: false
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    return res.status(500).json({ 
      message: "Error fetching member directory", 
      error: error.message 
    });
  }
};

const updateMetalRate = async (req, res) => {
  try {
    const { rate, sellRate, purity, currency } = req.body;
    const department = req.user?.department;

    if (!["gold", "silver"].includes(department)) {
      return res.status(403).json({ message: "Department access is required" });
    }

    if (!rate) {
      return res.status(400).json({ message: "Rate is required" });
    }

    const db = mongoose.connection.db;
    const normalizedDepartment = department.toLowerCase();

    // Set all existing active rates for this metal type to inactive
    await db.collection("rates").updateMany(
      { metalType: normalizedDepartment, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    // Insert new rate
    const newRate = {
      metalType: normalizedDepartment,
      buyPrice: Number(rate),
      sellPrice: Number(sellRate || rate),
      purity: purity || (normalizedDepartment === "gold" ? "24K" : "999"),
      currency: currency || "INR",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("rates").insertOne(newRate);

    return res.status(200).json({
      message: `${department.charAt(0).toUpperCase() + department.slice(1)} rate updated successfully`,
      rate: newRate
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update metal rate",
      error: error.message
    });
  }
};

const manualCreateUser = async (req, res) => {
  try {
    const { name, mobile, email } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ message: "Name and mobile are required" });
    }

    // Check if user already exists with same mobile
    const existingUser = await User.findOne({ mobile: mobile.trim() });
    if (existingUser) {
      return res.status(400).json({ message: "A user with this mobile number already exists" });
    }

    const hashedPassword = await bcrypt.hash("NTJ@123", 10);

    const newUser = new User({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      role: "user",
      password: hashedPassword,
      department: null
    });

    await newUser.save();

    console.log("[manualCreateUser] Created user:", newUser._id, newUser.name);

    return res.status(201).json({
      message: "User created successfully",
      userId: newUser._id,
      user: { id: newUser._id, name: newUser.name, mobile: newUser.mobile }
    });
  } catch (error) {
    console.error("[manualCreateUser] Error:", error.message);
    return res.status(500).json({ message: error.message || "Unable to create user" });
  }
};

const manualAssignChit = async (req, res) => {
  try {
    const { userId, metalType, monthlyAmount, planName } = req.body;
    const adminDept = req.user?.department;

    if (!userId || !monthlyAmount) {
      return res.status(400).json({ message: "UserId and monthlyAmount are required" });
    }

    const db = mongoose.connection.db;
    const type = metalType || adminDept || "gold";
    
    const newChit = {
      userId: new mongoose.Types.ObjectId(userId),
      metalType: type.toLowerCase(),
      planName: planName || undefined,
      monthlyAmount: Number(monthlyAmount),
      status: "approved",
      txnId: `MAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("chitfunds").insertOne(newChit);

    return res.status(201).json({
      message: "Chit assigned successfully",
      chitId: result.insertedId,
      chit: newChit
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to assign chit", error: error.message });
  }
};

const manualAddPayment = async (req, res) => {
  try {
    const { userId, amount, metalType } = req.body;
    const adminDept = req.user?.department;

    if (!userId || !amount) {
      return res.status(400).json({ message: "UserId and amount are required" });
    }

    const db = mongoose.connection.db;
    const type = metalType || adminDept || "gold";

    const newPayment = {
      userId: new mongoose.Types.ObjectId(userId),
      amountPaid: Number(amount),
      metalType: type.toLowerCase(),
      metalName: type.toLowerCase() === "gold" ? "Gold" : "Silver",
      status: "success",
      paymentMethod: "manual",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("orders").insertOne(newPayment);

    // Update user's balance in the users collection
    const balanceField = type.toLowerCase() === "gold" ? "goldBalance" : "silverBalance";
    await db.collection("users").updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $inc: { [balanceField]: Number(amount) } }
    );

    return res.status(201).json({
      message: "Payment recorded successfully",
      paymentId: result.insertedId,
      payment: newPayment
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to record payment", error: error.message });
  }
};

module.exports = {
  getDashboard,
  getPendingRequests,
  getActiveChits,
  updateRequestStatus,
  getUsersList,
  updateMetalRate,
  manualCreateUser,
  manualAssignChit,
  manualAddPayment
};
