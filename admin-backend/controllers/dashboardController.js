const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const UPIConfig = require("../models/UPIConfig");
const Notification = require("../models/Notification");

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
          { $addFields: { userObjectId: asObjectId } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "user"
            }
          },
          { $match: { "user._id": { $exists: true } } },
          { $count: "count" }
        ])
        .toArray(),
      db
        .collection("orders")
        .aggregate([
          {
            $match: {
              metalType: normalizedDepartment,
              status: { $regex: /^(success|paid|completed|captured)$/i }
            }
          },
          { $addFields: { userObjectId: asObjectId } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "user"
            }
          },
          { $match: { "user._id": { $exists: true } } },
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
          { $addFields: { userObjectId: asObjectId } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "user"
            }
          },
          { $match: { "user._id": { $exists: true } } },
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
          { $addFields: { userObjectId: asObjectId } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "user"
            }
          },
          { $match: { "user._id": { $exists: true } } },
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
          { $limit: 10 },
          { $addFields: { userObjectId: asObjectId } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "user"
            }
          },
          { $match: { "user._id": { $exists: true } } },
          { $limit: 4 },
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
                  "View"
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
          { $limit: 10 },
          { $addFields: { userObjectId: asObjectId } },
          {
            $lookup: {
              from: "users",
              localField: "userObjectId",
              foreignField: "_id",
              as: "user"
            }
          },
          { $match: { "user._id": { $exists: true } } },
          { $limit: 4 },
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
                  "View"
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

    const activeUPI = await UPIConfig.findOne({ 
      department: department.toLowerCase(), 
      isActive: true 
    });

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
      activeUPI: activeUPI ? { upiId: activeUPI.upiId, label: activeUPI.label } : null,
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
        { $addFields: { requestType: "chit" } },
        {
          $unionWith: {
            coll: "orders",
            pipeline: [
              { 
                $match: { 
                  status: { $regex: /^pending$/i },
                  metalType: normalizedDepartment
                } 
              },
              { $addFields: { requestType: "payment" } }
            ]
          }
        },
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
        // Filter out orphaned records (requests where no user was found in the DB)
        {
          $match: {
            "resolvedUser._id": { $exists: true }
          }
        },
        {
          $project: {
            _id: 1,
            txnId: { 
              $ifNull: [
                "$txnId", 
                { $ifNull: ["$paymentId", { $ifNull: ["$transactionId", { $toString: "$_id" }] }] }
              ] 
            },
            requestType: { $ifNull: ["$requestType", "chit"] },
            status: 1,
            metalType: 1,
            monthlyAmount: { $ifNull: ["$monthlyAmount", "$amountPaid"] },
            amountPaid: 1,
            totalAmount: 1,
            duration: 1,
            createdAt: 1,
            userId: { $ifNull: ["$userId", "$user_id"] },
            planName: { $ifNull: ["$planName", "$metalName"] },
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
        // Filter out orphaned records (chits where no user was found in the DB)
        {
          $match: {
            "resolvedUser._id": { $exists: true }
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
    const objectId = new mongoose.Types.ObjectId(id);
    const normalizedStatus = status.toLowerCase();

    // 1. Try updating chitfunds first
    let result = await db.collection("chitfunds").updateOne(
      { 
        _id: objectId,
        $or: [
          { metalType: department.toLowerCase() },
          { metalType: { $exists: false } },
          { metalType: null }
        ]
      },
      { $set: { status: normalizedStatus, updatedAt: new Date() } }
    );

    // 2. If no chit found, try updating orders (Online Payment Verification)
    if (result.matchedCount === 0) {
      const order = await db.collection("orders").findOne({ _id: objectId });
      
      if (order) {
        // Security check: ensure admin can only approve their dept orders
        if (order.metalType !== department.toLowerCase()) {
          return res.status(403).json({ message: "Unauthorized to approve this department's payments" });
        }

        // If approved, update user balance
        if (normalizedStatus === "approved") {
          const finalStatus = "success";
          await db.collection("orders").updateOne(
            { _id: objectId },
            { $set: { status: finalStatus, updatedAt: new Date() } }
          );

          // Robust resolution of chitId and monthNumber
          const rawChitId = order.chitId || order.chit_id || order.chit;
          let resolvedMonth = order.monthNumber ? Number(order.monthNumber) : null;
          const userRef = order.userId || order.user_id || order.user || order.customerId;
          const userObjectId = mongoose.isValidObjectId(userRef) ? new mongoose.Types.ObjectId(userRef) : null;

          if (userObjectId) {
             const chitIdObj = rawChitId && mongoose.isValidObjectId(rawChitId) ? new mongoose.Types.ObjectId(rawChitId) : null;
             
             // If monthNumber is missing and we have a chit, auto-calculate it
             if (chitIdObj && !resolvedMonth) {
                const existingCount = await db.collection("payments").countDocuments({ chitId: chitIdObj });
                resolvedMonth = existingCount + 1;
             }
             
             // Check for duplicate payment if month and chit are known
             let shouldInsert = true;
             if (chitIdObj && resolvedMonth) {
                const existingPayment = await db.collection("payments").findOne({
                    chitId: chitIdObj,
                    monthNumber: resolvedMonth
                });
                if (existingPayment) shouldInsert = false;
             }
             
             if (shouldInsert) {
                 await db.collection("payments").insertOne({
                    userId: userObjectId,
                    chitId: chitIdObj, // May be null (unlinked)
                    amount: Number(order.amountPaid || order.amount || 0),
                    monthNumber: resolvedMonth, // May be null
                    metalType: order.metalType || "gold",
                    paymentMethod: "online",
                    txnId: order.paymentId || order.orderId || order.transactionId || id,
                    notes: order.notes || (chitIdObj ? "Online Payment Approved" : "General Payment (Unlinked)"),
                    paidAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                 });

                 // Update `paidMonths` inside `chitfunds` document if linked
                 if (chitIdObj) {
                    await db.collection("chitfunds").updateOne(
                        { _id: chitIdObj },
                        { $inc: { paidMonths: 1 }, $set: { updatedAt: new Date() } }
                    );
                 }
             }
          }

          if (userObjectId) {
            const balanceField = (order.metalType || "gold").toLowerCase() === "gold" ? "goldBalance" : "silverBalance";
            await db.collection("users").updateOne(
              { _id: userObjectId },
              { $inc: { [balanceField]: Number(order.amountPaid || order.amount || 0) } }
            );
          }
          
          return res.status(200).json({ message: "Payment approved and balance updated" });
        } else {
          // Rejected order
          await db.collection("orders").updateOne(
            { _id: objectId },
            { $set: { status: "rejected", updatedAt: new Date() } }
          );
          return res.status(200).json({ message: "Payment rejected" });
        }
      }
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Request not found or unauthorized" });
    }

    return res.status(200).json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error("[updateRequestStatus] Error:", error);
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

const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const db = mongoose.connection.db;
    const userObjectId = new mongoose.Types.ObjectId(id);

    // 1. Fetch User Profile
    const user = await db.collection("users").findOne({ _id: userObjectId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Fetch User Chits
    const chits = await db.collection("chitfunds").find({
      $or: [
        { userId: id },
        { userId: userObjectId }
      ]
    }).sort({ createdAt: -1 }).toArray();

    // 3. Fetch monthly payments from the 'payments' collection
    const monthlyPayments = await db.collection("payments").find({
      $or: [
        { userId: id },
        { userId: userObjectId }
      ]
    }).sort({ createdAt: 1 }).toArray();

    // 4. Fetch full transaction history from orders collection
    const transactions = await db.collection("orders").find({
      $or: [
        { userId: id },
        { userId: userObjectId },
        { user_id: id },
        { user_id: userObjectId }
      ]
    }).sort({ createdAt: -1 }).toArray();

    // 5. Calculate overall total paid across all payments
    const totalPaidAmount = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const paymentsByChit = {};
    monthlyPayments.forEach(p => {
      const chitKey = p.chitId ? p.chitId.toString() : "unlinked";
      if (!paymentsByChit[chitKey]) paymentsByChit[chitKey] = [];
      paymentsByChit[chitKey].push(p);
    });

    // AUTO-RECOVERY: If user has exactly one chit, and has unlinked payments, link them automatically.
    if (chits.length === 1 && paymentsByChit["unlinked"]?.length > 0) {
      const targetChit = chits[0];
      const targetChitId = targetChit._id;
      const unlinked = paymentsByChit["unlinked"];
      
      // Move them to the target chit in memory for this response
      if (!paymentsByChit[targetChitId.toString()]) paymentsByChit[targetChitId.toString()] = [];
      
      for (let i = 0; i < unlinked.length; i++) {
        const p = unlinked[i];
        // Calculate a safe month number based on current count
        const monthNum = (targetChit.paidMonths || 0) + i + 1;
        
        // Update in memory for current view
        p.chitId = targetChitId;
        p.monthNumber = monthNum;
        paymentsByChit[targetChitId.toString()].push(p);

        // TRIGGER ASYNC REPAIR (Fire and forget DB update to fix data permanently)
        db.collection("payments").updateOne({ _id: p._id }, { $set: { chitId: targetChitId, monthNumber: monthNum } });
        db.collection("chitfunds").updateOne({ _id: targetChitId }, { $inc: { paidMonths: 1 } });
      }
      
      // Clear unlinked list as they are now "linked"
      delete paymentsByChit["unlinked"];
    }

    const formattedChits = chits.map(c => {
      const chitId = c._id.toString();
      const chitPayments = (paymentsByChit[chitId] || []).sort((a, b) => a.monthNumber - b.monthNumber);
      const duration = c.duration || 12;
      const totalPaidForChit = chitPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      return {
        id: c._id,
        planName: c.planName || "Standard Plan",
        metalType: (c.metalType || "Gold").toUpperCase(),
        monthlyAmount: c.monthlyAmount,
        totalAmount: c.totalAmount || (c.monthlyAmount * duration),
        duration: duration,
        status: (c.status || "PENDING").toUpperCase(),
        createdAt: c.createdAt,
        txnId: c.txnId,
        totalPaid: totalPaidForChit,
        paidMonths: chitPayments.length,
        payments: chitPayments.map(p => ({
          id: p._id,
          monthNumber: p.monthNumber,
          amount: p.amount,
          paidAt: p.paidAt || p.createdAt,
          txnId: p.txnId,
          paymentMethod: p.paymentMethod || "manual",
          notes: p.notes || null
        }))
      };
    });

    const details = {
      profile: {
        id: id,
        displayId: id.slice(-6).toUpperCase(),
        name: user.name || "Anonymous Member",
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        department: user.department,
        joinedAt: user.createdAt
      },
      stats: {
        totalChits: chits.length,
        activeChits: chits.filter(c => ["approved", "active"].includes((c.status || "").toLowerCase())).length,
        totalPaid: totalPaidAmount,
        totalPayments: monthlyPayments.length,
        totalTransactions: transactions.length
      },
      chits: formattedChits,
      unlinkedPayments: (paymentsByChit["unlinked"] || []).map(p => ({
        id: p._id,
        amount: p.amount,
        paidAt: p.paidAt || p.createdAt,
        txnId: p.txnId,
        paymentMethod: p.paymentMethod || "manual",
        notes: p.notes || null,
        metalType: (p.metalType || "gold").toUpperCase()
      })),
      transactions: transactions.map(t => ({
        id: t._id,
        amount: t.amountPaid || t.amount || 0,
        status: (t.status || "PENDING").toUpperCase(),
        txnId: t.transactionId || t.orderId || t.txnId,
        date: t.createdAt || t.updatedAt,
        metalType: (t.metalType || "GOLD").toUpperCase()
      }))
    };

    return res.status(200).json(details);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching user details",
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
    const { userId, metalType, monthlyAmount, planName, duration } = req.body;
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
      duration: Number(duration) || 12,
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
    console.log("[manualAddPayment] Request Body:", JSON.stringify(req.body, null, 2));
    const { userId, chitId, amount, metalType, monthNumber, txnId, notes } = req.body;
    const adminDept = req.user?.department;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "A valid UserId is required" });
    }

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ message: "A valid payment amount is required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const resolvedChitId = chitId && mongoose.isValidObjectId(chitId) ? new mongoose.Types.ObjectId(chitId) : null;
    
    const db = mongoose.connection.db;
    const type = metalType || adminDept || "gold";

    // Auto-calculate month number if not provided
    let month = monthNumber ? Number(monthNumber) : null;
    if (!month) {
      if (resolvedChitId) {
        const existingCount = await db.collection("payments").countDocuments({
          chitId: resolvedChitId
        });
        month = existingCount + 1;
      } else {
        const existingCount = await db.collection("payments").countDocuments({
          userId: userObjectId
        });
        month = existingCount + 1;
      }
    }

    const autoTxnId = txnId || `MAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Save to 'payments' collection (per-month tracking)
    const newPayment = {
      userId: userObjectId,
      chitId: resolvedChitId,
      amount: Number(amount),
      monthNumber: month,
      metalType: type.toLowerCase(),
      paymentMethod: "manual",
      txnId: autoTxnId,
      notes: notes || null,
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("payments").insertOne(newPayment);

    // Also record in orders for backward compatibility with payment history screen
    await db.collection("orders").insertOne({
      userId: userObjectId,
      orderId: autoTxnId, // Set orderId to avoid duplicate null key error (E11000)
      amountPaid: Number(amount),
      metalType: type.toLowerCase(),
      metalName: type.toLowerCase() === "gold" ? "Gold" : "Silver",
      status: "success",
      paymentMethod: "manual",
      txnId: autoTxnId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update user's balance
    const balanceField = type.toLowerCase() === "gold" ? "goldBalance" : "silverBalance";
    await db.collection("users").updateOne(
      { _id: userObjectId },
      { $inc: { [balanceField]: Number(amount) } }
    );

    // CRITICAL: Update paidMonths inside chitfunds document if chitId is provided
    if (resolvedChitId) {
      await db.collection("chitfunds").updateOne(
        { _id: resolvedChitId },
        { 
          $inc: { paidMonths: 1 }, 
          $set: { updatedAt: new Date() } 
        }
      );
    }

    return res.status(201).json({
      message: `Month ${month} payment recorded successfully`,
      paymentId: result.insertedId,
      txnId: autoTxnId,
      month: month
    });
  } catch (error) {
    console.error("manualAddPayment error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const linkPaymentToChit = async (req, res) => {
  try {
    const { paymentId, chitId, monthNumber } = req.body;
    const db = mongoose.connection.db;

    if (!paymentId || !chitId) {
      return res.status(400).json({ message: "Payment ID and Chit ID are required" });
    }

    const paymentObjectId = new mongoose.Types.ObjectId(paymentId);
    const chitObjectId = new mongoose.Types.ObjectId(chitId);

    // 1. Get payment details
    const payment = await db.collection("payments").findOne({ _id: paymentObjectId });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // 2. Get chit details to verify existence and check for existing month payment
    const chit = await db.collection("chitfunds").findOne({ _id: chitObjectId });
    if (!chit) return res.status(404).json({ message: "Chit not found" });

    // 3. Resolve month number
    let month = monthNumber ? Number(monthNumber) : null;
    if (!month) {
      const existingCount = await db.collection("payments").countDocuments({ chitId: chitObjectId });
      month = existingCount + 1;
    }

    // 4. Update payment
    await db.collection("payments").updateOne(
      { _id: paymentObjectId },
      { 
        $set: { 
          chitId: chitObjectId, 
          monthNumber: month,
          updatedAt: new Date()
        } 
      }
    );

    // 5. Update chit's paidMonths
    await db.collection("chitfunds").updateOne(
      { _id: chitObjectId },
      { 
        $inc: { paidMonths: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    return res.status(200).json({ 
      message: "Payment successfully linked to chit plan",
      month: month
    });
  } catch (error) {
    console.error("linkPaymentToChit error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const department = req.user?.department;
    if (!["gold", "silver"].includes(department)) {
      return res.status(403).json({ message: "Department access is required" });
    }

    const db = mongoose.connection.db;
    const normalizedDepartment = department.toLowerCase();

    const payments = await db
      .collection("orders")
      .aggregate([
        {
          $match: {
            $or: [
              { metalType: normalizedDepartment },
              { metalType: { $exists: false } },
              { metalType: null }
            ]
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 200 },

        // ── Resolve the user reference field ──────────────────────────
        // Different apps store the user reference differently.
        // Build a single "rawUserId" that normalises all variants.
        {
          $addFields: {
            rawUserId: {
              $ifNull: [
                "$userId",
                {
                  $ifNull: [
                    "$user_id",
                    { $ifNull: ["$user", { $ifNull: ["$customerId", null] }] }
                  ]
                }
              ]
            }
          }
        },

        // Convert that raw id to ObjectId (works if it is already an ObjectId or a valid hex string)
        {
          $addFields: {
            userObjectId: {
              $convert: {
                input: "$rawUserId",
                to: "objectId",
                onError: null,
                onNull: null
              }
            }
          }
        },

        // Lookup 1 – by ObjectId
        {
          $lookup: {
            from: "users",
            localField: "userObjectId",
            foreignField: "_id",
            as: "userByObjectId"
          }
        },

        // Lookup 2 – by string (handles cases where _id is stored as string in users)
        {
          $lookup: {
            from: "users",
            let: { uid: { $toString: "$rawUserId" } },
            pipeline: [
              { $addFields: { idStr: { $toString: "$_id" } } },
              { $match: { $expr: { $eq: ["$idStr", "$$uid"] } } }
            ],
            as: "userByString"
          }
        },

        // Lookup 3 – by mobile number (fallback when userId is actually a mobile string)
        {
          $lookup: {
            from: "users",
            let: { mob: { $toString: "$rawUserId" } },
            pipeline: [
              { $match: { $expr: { $eq: ["$mobile", "$$mob"] } } }
            ],
            as: "userByMobile"
          }
        },

        // Pick the first successful lookup result
        {
          $addFields: {
            resolvedUser: {
              $switch: {
                branches: [
                  {
                    case: { $gt: [{ $size: "$userByObjectId" }, 0] },
                    then: { $arrayElemAt: ["$userByObjectId", 0] }
                  },
                  {
                    case: { $gt: [{ $size: "$userByString" }, 0] },
                    then: { $arrayElemAt: ["$userByString", 0] }
                  },
                  {
                    case: { $gt: [{ $size: "$userByMobile" }, 0] },
                    then: { $arrayElemAt: ["$userByMobile", 0] }
                  }
                ],
                default: null
              }
            }
          }
        },

        // Filter out orphaned records (orders where no user was found in the DB)
        // We use resolvedUser._id existence to be 100% sure we have a valid user object
        {
          $match: {
            "resolvedUser._id": { $exists: true }
          }
        },

        {
          $project: {
            _id: 1,
            amountPaid: { $ifNull: ["$amountPaid", { $ifNull: ["$amount", 0] }] },
            metalType: 1,
            metalName: 1,
            status: { $ifNull: ["$status", "unknown"] },
            paymentMethod: { $ifNull: ["$paymentMethod", { $ifNull: ["$method", "online"] }] },
            createdAt: 1,
            txnId: {
              $ifNull: [
                "$txnId",
                { $ifNull: ["$transactionId", { $ifNull: ["$paymentId", { $ifNull: ["$razorpay_payment_id", { $toString: "$_id" }] }] }] }
              ]
            },
            userName: { $ifNull: ["$resolvedUser.name", "Unknown Member"] },
            userMobile: { $ifNull: ["$resolvedUser.mobile", ""] },
            userEmail: { $ifNull: ["$resolvedUser.email", ""] },
            rawUserId: 1,
            resolvedUserId: { $ifNull: ["$resolvedUser._id", null] }
          }
        },

        {
          $match: {
            status: { $regex: /^(success|paid|completed|captured)$/i }
          }
        }
      ])
      .toArray();

    // Compute summary stats (all these statuses represent successful collection)
    const successStatuses = ["success", "paid", "completed", "captured"];
    const totalCollected = payments
      .filter(p => successStatuses.includes((p.status || "").toLowerCase()))
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const pendingCount = payments.filter(
      p => (p.status || "").toLowerCase() === "pending"
    ).length;

    const unknownUserCount = payments.filter(p => p.userName === "Unknown Member").length;

    return res.status(200).json({
      payments,
      summary: {
        totalCollected,
        totalTransactions: payments.length,
        pendingCount,
        unknownUserCount  // helpful diagnostic field
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch payment history",
      error: error.message
    });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// DEBUG endpoint — shows raw order + user data to diagnose field mismatches
// Access: GET /admin/debug/orders  (requires admin token)
// ────────────────────────────────────────────────────────────────────────────
const debugOrders = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // Grab the 5 most recent orders with ALL fields
    const rawOrders = await db
      .collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Grab 5 users for comparison
    const rawUsers = await db
      .collection("users")
      .find({ role: { $ne: "admin" } })
      .limit(5)
      .project({ name: 1, mobile: 1, email: 1, _id: 1 })
      .toArray();

    // Show distinct field names actually present in orders collection
    const allFieldNames = [...new Set(rawOrders.flatMap(o => Object.keys(o)))];

    return res.status(200).json({
      hint: "Compare 'orderFields' keys with 'users._id' to find the correct userId field",
      orderFields: allFieldNames,
      sampleOrders: rawOrders.map(o => ({
        ...o,
        _id: o._id?.toString(),
        userId: o.userId?.toString(),
        user_id: o.user_id?.toString(),
        user: o.user?.toString()
      })),
      sampleUsers: rawUsers.map(u => ({
        _id: u._id?.toString(),
        name: u.name,
        mobile: u.mobile,
        email: u.email
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Debug failed", error: error.message });
  }
};

// ──────────────── UPI MANAGEMENT ────────────────
const getUPIs = async (req, res) => {
  try {
    const department = req.user?.department;
    if (!department) return res.status(403).json({ message: "Forbidden" });

    const upis = await UPIConfig.find({ department: department.toLowerCase() }).sort({ createdAt: -1 });
    return res.status(200).json(upis);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch UPIs", error: error.message });
  }
};

const addUPI = async (req, res) => {
  try {
    const { upiId, label } = req.body;
    const department = req.user?.department;

    if (!upiId || !label) {
      return res.status(400).json({ message: "UPI ID and label are required" });
    }

    // If this is the first UPI for this department, mark it as active
    const count = await UPIConfig.countDocuments({ department: department.toLowerCase() });

    const newUPI = new UPIConfig({
      upiId: upiId.trim(),
      label: label.trim(),
      department: department.toLowerCase(),
      isActive: count === 0
    });

    await newUPI.save();
    return res.status(201).json(newUPI);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add UPI", error: error.message });
  }
};

const setActiveUPI = async (req, res) => {
  try {
    const { id } = req.params;
    const department = req.user?.department;

    // Set all UPIs for this department to inactive
    await UPIConfig.updateMany(
      { department: department.toLowerCase() },
      { $set: { isActive: false } }
    );

    // Set the specific UPI to active
    const updated = await UPIConfig.findOneAndUpdate(
      { _id: id, department: department.toLowerCase() },
      { $set: { isActive: true } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "UPI not found" });

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update active UPI", error: error.message });
  }
};

const deleteUPI = async (req, res) => {
  try {
    const { id } = req.params;
    const department = req.user?.department;

    const target = await UPIConfig.findOne({ _id: id, department: department.toLowerCase() });
    if (!target) return res.status(404).json({ message: "UPI not found" });

    await UPIConfig.deleteOne({ _id: id });

    // If we deleted the active one, mark the most recent one as active
    if (target.isActive) {
      const latest = await UPIConfig.findOne({ department: department.toLowerCase() }).sort({ createdAt: -1 });
      if (latest) {
        latest.isActive = true;
        await latest.save();
      }
    }

    return res.status(200).json({ message: "UPI deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete UPI", error: error.message });
  }
};

// PUBLIC endpoint for Customer App to fetch the active UPI
const getActiveUPIPublic = async (req, res) => {
  try {
    const { department } = req.query; // gold or silver
    if (!department) return res.status(400).json({ message: "Department is required" });

    const activeUPI = await UPIConfig.findOne({ 
      department: department.toLowerCase(), 
      isActive: true 
    });

    if (!activeUPI) {
      return res.status(404).json({ message: "No active UPI found for this department" });
    }

    return res.status(200).json({ upiId: activeUPI.upiId, label: activeUPI.label });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching active UPI", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = mongoose.connection.db;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid User ID format" });
    }

    const userId = new mongoose.Types.ObjectId(id);

    // Perform deletions across all related collections
    const deleteResults = await Promise.all([
      db.collection("users").deleteOne({ _id: userId }),
      db.collection("chitfunds").deleteMany({ userId: userId }),
      db.collection("payments").deleteMany({ userId: userId }),
      db.collection("orders").deleteMany({ userId: userId }),
      db.collection("chitrequests").deleteMany({ userId: userId })
    ]);

    const userDeleted = deleteResults[0].deletedCount > 0;

    if (!userDeleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ 
      message: "User and all associated data deleted successfully",
      summary: {
        chits: deleteResults[1].deletedCount,
        payments: deleteResults[2].deletedCount,
        orders: deleteResults[3].deletedCount
      }
    });
  } catch (error) {
    console.error("[deleteUser] Error:", error);
    return res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { title, message, type, target, userId } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const notification = new Notification({
      title: title || "Admin Message",
      message,
      type: type || "general",
      target: target || "all",
      userId: target === "individual" && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null
    });

    await notification.save();

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification
    });
  } catch (error) {
    console.error("sendNotification error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { userId } = req.query;
    let query = { target: 'all' };

    if (userId && mongoose.isValidObjectId(userId)) {
      query = {
        $or: [
          { target: 'all' },
          { userId: new mongoose.Types.ObjectId(userId) }
        ]
      };
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = {
  getDashboard,
  getPendingRequests,
  getActiveChits,
  updateRequestStatus,
  getUsersList,
  getUserDetails,
  updateMetalRate,
  manualCreateUser,
  manualAssignChit,
  manualAddPayment,
  linkPaymentToChit,
  getPaymentHistory,
  getUPIs,
  addUPI,
  setActiveUPI,
  deleteUPI,
  getActiveUPIPublic,
  debugOrders,
  deleteUser,
  sendNotification,
  getNotifications
};
