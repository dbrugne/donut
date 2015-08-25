# Things to do on next deploy

* Replace old user mentions in history:
```
grunt mentions-migration
```
* Add index MongoDB
```
db['history-room'].ensureIndex({
  "room" : 1,
  "users" : 1
});
```