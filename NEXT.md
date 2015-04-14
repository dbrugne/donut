# Things to do on next deploy

* Remove users.welcome:

``javascript
db.users.update(
    { "welcome" : { $exists : true } },
    { $unset : { "welcome" : 1 } },
    { multi: true}
  );
db.users.find({ "welcome" : { $exists : true } }).count();
```

* Set new users.preferences:

```javascript
db.users.update(
  {},
  { $set: { preferences: {

    'browser:welcome': true,
    'browser:sounds': true,
    'notifications:roommessage:browser': true,
    'notifications:roommessage:desktop': true,
    'notifications:roommention:browser': true,
    'notifications:roommention:desktop': true,
    'notifications:roommention:email': true,
    'notifications:roommention:mobile': true,
    'notifications:roompromote:browser': true,
    'notifications:roompromote:desktop': true,
    'notifications:roompromote:email': true,
    'notifications:roompromote:mobile': true,
    'notifications:usermessage:browser': true,
    'notifications:usermessage:desktop': true,
    'notifications:usermessage:email': true,
    'notifications:usermessage:mobile': true

  } } },
  { multi: true }
);
```

- add per-room drawer with preferences: mention, new message, someone enter (to true by default for owner or op), promoted
- add "to notify" detection on handlers and create database entities
- implement consumers
