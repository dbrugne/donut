# TODO
### add index MongoDB
```
db['history-room'].ensureIndex({
  "room" : 1,
  "users" : 1
});
```