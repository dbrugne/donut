# Things to do on next deploy
* Migrate onetoones to the new format:
```
grunt migration-onetoones
```
* Remove position in user model (Branch 477/610)
```
db.getCollection('users').update({}, {$unset: {positions: 1}}, {multi: true});
```