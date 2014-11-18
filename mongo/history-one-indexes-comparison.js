/**
 * TESTED INDEX
 */
db['history-one'].ensureIndex({
  "from" : 1,
  "to" : 1,
  "time" : -1
});

/**
 * EXPLAIN QUERIES
 */
db['history-one'].find({
  '$or': [
    { to: ObjectId("54285377bb6c3d101ec179cb"), from: ObjectId("53e69205962c67de3e4e9550") },
    { to: ObjectId("53e69205962c67de3e4e9550"), from: ObjectId("54285377bb6c3d101ec179cb") }
  ],
  event: { '$nin': [ 'user:online', 'user:offline' ] },
  time: {
    '$lte': new Date("Mon Nov 17 2014 00:00:00 GMT+0100 (Paris, Madrid)"),
    '$gte': new Date("Tue Nov 04 2014 12:30:22 GMT+0100 (Paris, Madrid)")
  }
}).sort({time: -1}).limit(500).hint({$natural:1}).explain();
db['history-one'].find({
  '$or': [
    { to: ObjectId("54285377bb6c3d101ec179cb"), from: ObjectId("53e69205962c67de3e4e9550") },
    { to: ObjectId("53e69205962c67de3e4e9550"), from: ObjectId("54285377bb6c3d101ec179cb") }
  ],
  event: { '$nin': [ 'user:online', 'user:offline' ] },
  time: {
    '$lte': new Date("Mon Nov 17 2014 00:00:00 GMT+0100 (Paris, Madrid)"),
    '$gte': new Date("Tue Nov 04 2014 12:30:22 GMT+0100 (Paris, Madrid)")
  }
}).sort({time: -1}).limit(500).explain();