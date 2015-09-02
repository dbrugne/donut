# Things to do on next deploy
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