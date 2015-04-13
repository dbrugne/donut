# Things to do on next deploy

* Remove users.welcome:

``javascript
db.users.update(
    { "welcome" : { $exists : true } },
    { $unset : { "welcome" : 1 } },
    { multi: true}
  );
db.users.find({ "welcome" : { $exists : true } }).count()
```

- set preferences to default value set on new user creation
- apply to existing users on next deploy (take care of welcome)

- add per-room drawer with preferences
