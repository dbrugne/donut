# Things to do on next deploy

* Update rooms _id
```
grunt recreate-rooms
```
* Add rooms deleted flag
```
db.rooms.update({}, {$set: {deleted: false}}, {multi: true})
```
* Cleanup User.rooms
```
db.users.update({}, {$unset: {rooms: true}}, {multi: true})
```
* Create room (as deleted) that no longer exists in database but still have roomhistory records
```
grunt create-ancient-room
```
* Remove historyroom.name index
```
db['history-room'].dropIndex({
    "name" : 1,
    "time" : -1
});
```
* Update historyroom (launch multiple times, until no more record remain to update)
```
grunt historyroom-migration
grunt historyroom-migration
...
```
* Create new historyroom.room index
```
db['history-room'].ensureIndex({
  "room" : 1,
  "time" : -1
});
```

