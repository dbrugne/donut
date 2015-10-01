# Things to do on next deploy

* Remove position in user model (Branch 477/610)
```
db.getCollection('users').update({}, {$unset: {positions: 1}}, {multi: true});
```

* Warning, Do not commit that !!
```
db.getCollection('users').update({}, {$unset: {onetoones: 1}}, {multi: true});
db.getCollection('users').update({}, {$set: {onetoones: [
{
	user: ObjectId('558ba6d689bfd9d0126813de'),
	lastactivity_at: '30/09/15 06:51:23 UTC'
},
{
	user: ObjectId('558ba79a89bfd9d0126813df'),
	lastactivity_at: '30/09/15 06:51:23 UTC'
},
{
	user: ObjectId('54285377bb6c3d101ec179cb'),
	lastactivity_at: '30/09/15 06:51:23 UTC'
}
]}}, {multi: true});
```