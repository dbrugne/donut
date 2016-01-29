# Things to do on next deploy

```
# remove color attribute
db.getCollection('users').update({}, {$unset: {color: true}}, {multi:true});
db.getCollection('rooms').update({}, {$unset: {color: true}}, {multi:true});
db.getCollection('groups').update({}, {$unset: {color: true}}, {multi:true});
```
