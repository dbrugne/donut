chat - stresser
====

stresser is a Random Traffic Generator for chat testing and simulations.

# Stresser users

Each connection should have an existing user in database.
The stresser will use user with MongoDb ID of type: stresser-1, stresser-2, stresser-3.
If, when the stresser want to use a user, the user not already exists in database, he will create it on the fly in database.
The next time the stresser will be run the user will be already created.

The user is created with following data:

```javascript
new User({
  _id: 'stresser-'+{{SEQUENCE_NUMBER}}
  username: {{SAME_AS__ID}},
  local: {
    email: {{RANDOM_EMAIL}},
    password: {{RANDOM_STRING_OF_10}}
  }
});
```

# The loop

At launching the stresser set up a recurring (each 250ms) function.
This function will do the following evaluation:
- Add a new user to stress simulation: yes/no
- Remove a user from the stress simulation: yes/no
- Loop over the actual stress users and for each one:
  - Do nothing
  - Or do something:
    - Join a room
    - Leave a room where the user is in
    - Post a message in a room where the user is in
    - Search for rooms
    - {{to complete}}
