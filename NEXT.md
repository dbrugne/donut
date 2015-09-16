# Things to do on next deploy

* Query mongo to set all existing room  with join_mode=everyone
```
db.getCollection('rooms').update({},
    {
        $set: {
            join_mode: "everyone"
        }
    },
    {"multi" : true});
```

* Cleanup legacy history data
```
db.getCollection('history-room').update({users: {$exists: true}}, {$unset: {users: true}}, {multi: true});
```

* Remove flag from env: 
```
"RAW_MESSAGE": true
```

* Cleanup logs collection
```
db.getCollection('logs').drop()
```
