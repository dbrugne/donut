// user
db['users'].ensureIndex({
  "username": 1
});
// room
db['rooms'].ensureIndex({
  "name" : 1
});
// room history
db['history-room'].ensureIndex({
  "room" : 1,
  "time" : -1
});
db['history-room'].ensureIndex({
  "event" : 1
});
db['history-room'].ensureIndex({
  "room" : 1,
  "users" : 1
});
// onetoone history
db['history-one'].ensureIndex({
  "from" : 1,
  "to" : 1,
  "time" : -1
});
db['history-one'].ensureIndex({
  "event" : 1
});
db['history-one'].ensureIndex({
  "from" : 1,
  "to" : 1,
  "viewed" : 1
});
// logs
db['logs'].ensureIndex({
  "timestamp" : 1,
  "level" : 1
});
// notifications
db['notifications'].ensureIndex({
  "done" : 1,
  "user" : 1
});
db['notifications'].ensureIndex({
  "done" : 1,
  "time" : -1
});