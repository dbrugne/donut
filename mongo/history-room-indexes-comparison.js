/**
 * TESTED INDEX
 */
db[ 'history-room' ].ensureIndex({
  'name': 1,
  'time': -1
});

/**
 * EXPLAIN QUERIES
 */
db[ 'history-room' ].find({
  name: '#donut',
  users: { '$in': [ ObjectId('54198f09eb6b4ca00b578ecd') ] },
  event: { '$nin': [ 'user:online', 'user:offline' ] },
  time: {
    '$lte': new Date('Tue Nov 18 2014 16:28:11 GMT+0100 (Paris, Madrid)'),
    '$gte': new Date('Mon Nov 17 2014 00:00:00 GMT+0100 (Paris, Madrid)')
  }
}).sort({ time: -1 }).limit(500).explain();
db[ 'history-room' ].find({
  name: '#donut',
  users: { '$in': [ ObjectId('54198f09eb6b4ca00b578ecd') ] },
  event: { '$nin': [ 'user:online', 'user:offline' ] },
  time: {
    '$lte': new Date('Tue Nov 18 2014 16:28:11 GMT+0100 (Paris, Madrid)'),
    '$gte': new Date('Mon Nov 17 2014 00:00:00 GMT+0100 (Paris, Madrid)')
  }
}).sort({ time: -1 }).limit(500).hint({ $natural: 1 }).explain();