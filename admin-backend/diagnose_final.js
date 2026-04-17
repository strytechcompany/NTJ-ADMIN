require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('=== USERS COUNT ===');
  const allUsersCount = await db.collection('users').countDocuments({});
  const usersWithNames = await db.collection('users').countDocuments({ name: { $exists: true, $ne: '' } });
  console.log(`Total users: ${allUsersCount}`);
  console.log(`Users with names: ${usersWithNames}`);

  console.log('\n=== RECENT ORDERS (Top 20) ===');
  const payments = await db.collection("orders").aggregate([
    { $sort: { createdAt: -1 } },
    { $limit: 20 },
    {
      $addFields: {
        rawUserId: {
          $ifNull: ["$userId", { $ifNull: ["$user_id", { $ifNull: ["$user", { $ifNull: ["$customerId", null] }] }] }]
        }
      }
    },
    {
      $addFields: {
        userObjectId: { $convert: { input: "$rawUserId", to: "objectId", onError: null, onNull: null } }
      }
    },
    {
      $lookup: { from: "users", localField: "userObjectId", foreignField: "_id", as: "userByObjectId" }
    },
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
        rawUserId: 1,
        userName: "$resolvedUser.name",
        status: 1,
        amountPaid: 1,
        txnId: 1
      }
    }
  ]).toArray();

  payments.forEach((p, i) => {
    console.log(`${i+1}. TXN: ${p.txnId || p._id} | UserID: ${p.rawUserId} | ResolvedName: ${p.userName || 'MISSING/NULL'} | Status: ${p.status}`);
  });

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
