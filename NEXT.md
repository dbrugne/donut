# Things to do on next deploy

* Set new user status fields:

``javascript
db.users.update(
    {},
    { $set : { "deleted" : false, "suspended" : false } },
    { multi: true}
  );
db.users.find({ "deleted" : { $exists : false } }).count();
```

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
     'notif:channels:email': true,
     'notif:channels:mobile': true,
     'notif:usermessage': true,
     'notif:roominvite': true
  } } },
  { multi: true }
);
```

* Create
  - add "to notify" detection on handlers and create database entities
  - receive and render notifications on frontend
  - add read handling on frontend notifications
* Do
  - implement consumers
