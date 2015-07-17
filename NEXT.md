# Things to do on next deploy

```
// notifications
db['notifications'].ensureIndex({
  "done" : 1,
  "user" : 1
});
db['notifications'].ensureIndex({
  "done" : 1,
  "time" : -1
});
```