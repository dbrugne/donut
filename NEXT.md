# Things to do on next deploy

* Replace old user mentions in history:
```
grunt mentions-migration
```
* Replace old website attributes on rooms and users:
```
grunt website-migration
```
* Rename #Support => #help
```
db.getCollection('rooms').update({ _id: ObjectId("557ed3a4bcb50bc52b74745a")}, {$set: {name: '#help'}})
```
* Add index MongoDB
```
db['history-room'].ensureIndex({
  "users" : 1,
  "room" : 1
});

db['history-one'].ensureIndex({
  "from" : 1,
  "to" : 1,
  "viewed" : 1
});
```