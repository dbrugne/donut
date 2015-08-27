# Things to do on next deploy

* Replace old user mentions in history:
```
grunt mentions-migration
```
* Replace old website attributes on rooms and users:
```
grunt website-migration
```
* Rename #Support => #help
```
db.getCollection('rooms').update({ _id: ObjectId("557ed3a4bcb50bc52b74745a")}, {$set: {name: '#help'}})
```