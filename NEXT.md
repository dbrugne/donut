# Things to do on next deploy

* Migrate room name from with-hash to no-hash:
```
grunt migration-room-hash
```

* Change long room name:
```
grunt change-long-name
```

* Migrate onetoones to the new format:
```
grunt migration-onetoones
```

* Migrate history*.data.images=>.files
```
db.getCollection('history-room').update({'data.images': {$exists: true }}, {$rename: {'data.images': 'data.files'}}, {multi:true})
db.getCollection('history-one').update({'data.images': {$exists: true }}, {$rename: {'data.images': 'data.files'}}, {multi:true})
```

* Remove name in user model
```
db.getCollection('users').update({'name': {$exists: true}}, {$unset: {'name': true}}, {multi: true})
```


* Remove position in user model (Branch 477/610)
```
db.getCollection('users').update({}, {$unset: {positions: 1}}, {multi: true});
```

* Create some groups (for dev only)
```
grunt donut-groups
```

* Remove all old allowed_pending
```
db.getCollection('rooms').update({},{$set: {allowed_pending: []}},{"multi" : true});
```

* Set attribute allow_user_request to tru on all private rooms 
```
db.rooms.update( { mode: { $ne: 'public' } }, { $set: { allow_user_request: true }}, {multi: true} )
```

* Add history-room index for new history
```
db[ 'history-room' ].ensureIndex({
  'room': 1,
  '_id': -1
});
```

* Remove old/useless history-room index
```
db[ 'history-room' ].dropIndex({
  'room': 1,
  'time': -1
});
```

* Add onetoone index for new history
```
db[ 'history-one' ].ensureIndex({
  'from': 1,
  'to': 1,
  '_id': -1
});
```

* Remove old/useless onetoone index
```
db[ 'history-one' ].dropIndex({
  'from': 1,
  'to': 1,
  'time': -1
});
```

* Set all users to confirmed and add email to emails field
```
grunt migration-emails-confirmed
```