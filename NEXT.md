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

