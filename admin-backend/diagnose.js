require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  // Test: manually look up the user for Order 1
  // Order 1 userId: 69d3cc85f2e521a1ab871b61
  // User 1  _id:    69d3cc85f2e521a1ab871b61

  const testUserId = "69d3cc85f2e521a1ab871b61";

  console.log('\n=== Test 1: Convert to ObjectId and lookup ===');
  try {
    const oid = new mongoose.Types.ObjectId(testUserId);
    const user = await db.collection('users').findOne({ _id: oid });
    console.log('Found by ObjectId:', user ? user.name : 'NOT FOUND');
  } catch(e) {
    console.log('ObjectId convert error:', e.message);
  }

  console.log('\n=== Test 2: String match lookup ===');
  const users2 = await db.collection('users').aggregate([
    { $addFields: { idStr: { $toString: "$_id" } } },
    { $match: { idStr: testUserId } }
  ]).toArray();
  console.log('Found by string:', users2.length > 0 ? users2[0].name : 'NOT FOUND');

  console.log('\n=== Test 3: Full aggregate pipeline simulation ===');
  const result = await db.collection('orders').aggregate([
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    {
      $addFields: {
        rawUserId: { $ifNull: ["$userId", null] }
      }
    },
    {
      $addFields: {
        userObjectId: {
          $convert: { input: "$rawUserId", to: "objectId", onError: null, onNull: null }
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
          $switch: {
            branches: [
              { case: { $gt: [{ $size: "$userByObjectId" }, 0] }, then: { $arrayElemAt: ["$userByObjectId", 0] } },
              { case: { $gt: [{ $size: "$userByString" }, 0] }, then: { $arrayElemAt: ["$userByString", 0] } }
            ],
            default: null
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        rawUserId: 1,
        userObjectId: 1,
        status: 1,
        amountPaid: 1,
        metalType: 1,
        userByObjectIdCount: { $size: "$userByObjectId" },
        userByStringCount: { $size: "$userByString" },
        resolvedName: { $ifNull: ["$resolvedUser.name", "UNRESOLVED"] }
      }
    }
  ]).toArray();

  console.log('\nLookup results:');
  result.forEach((r, i) => {
    console.log(`Order ${i+1}: rawUserId=${r.rawUserId?.toString()}, objectIdLookup=${r.userByObjectIdCount}, stringLookup=${r.userByStringCount}, name=${r.resolvedName}, status=${r.status}, amount=${r.amountPaid}`);
  });

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
