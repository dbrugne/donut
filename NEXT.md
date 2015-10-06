# Things to do on next deploy

* Migrate room name from with-hash to no-hash:
```
grunt migration-room-hash
```
* Migrate onetoones to the new format:
```
grunt migration-onetoones
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