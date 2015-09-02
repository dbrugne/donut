# Things to do on next deploy

* Replace old user mentions in history:
```
grunt mentions-migration
```
* Replace old website attributes on rooms and users:
```
grunt website-migration
```
* Set preferences roommessage, roomtopic, roomjoin owner:
```
grunt preferences-owner-migration
```
* Rename #Support => #help
```
db.getCollection('rooms').update({ _id: ObjectId("557ed3a4bcb50bc52b74745a")}, {$set: {name: '#help'}})
```
* Cleanup 'user:online/offline' event from history
```
db.getCollection('history-room').remove({event: {$in: ['user:online','user:offline']}})
db.getCollection('history-one').remove({event: {$in: ['user:online','user:offline']}})
```
* Query mongo to set all existing room  with join_mode=everyone and history_mode=joined
```
db.getCollection('rooms').update({},
    {
        $set: {
            join_mode: "everyone",
            history_mode: "joined"
        }
    },
    {"multi" : true});
```