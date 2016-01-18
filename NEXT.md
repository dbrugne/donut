# Things to do on next deploy

### Remove old user.blocked records

```
db.getCollection('users').update({blocked: {$exists: true}}, {$unset: {blocked: true}}, {multi: true})

```

### Add group opened id on user

```
grunt donut-add-group-on-user
```