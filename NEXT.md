# Things to do on next deploy
```
grunt migration-onetoones
```
* Remove position in user model (Branch 477/610)
```
db.getCollection('users').update({}, {$unset: {positions: 1}}, {multi: true});
```