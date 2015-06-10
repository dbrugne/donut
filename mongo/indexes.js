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
// onetoone history
db['history-one'].ensureIndex({
  "from" : 1,
  "to" : 1,
  "time" : -1
});
// logs
db['logs'].ensureIndex({
  "timestamp" : 1,
  "level" : 1
});