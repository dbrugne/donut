# Things to do on next deploy

## remove default room from groups
```
db.getCollection('groups').update(
  { default: { $exists: true } }, 
  { $unset: { default: true  } }, 
  { multi: true }  
)
```

