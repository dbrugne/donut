# Things to do on next deploy
// migration file type history-room and history-one
```
db.getCollection('history-room').update({$and: [{'data.files': {$exists: true}}, {'data.files.type': {$exists: false}}]},
     {$set: {'data.files.$.type': "image"}},
     {multi: true}
)
db.getCollection('history-one').update({$and: [{'data.files': {$exists: true}}, {'data.files.type': {$exists: false}}]},
    {$set: {'data.files.$.type': "image"}},
    {multi: true}
)
```