chat
====

# Install

Meet the pre-requisites: **see below**.

Clone the project, go in server/ folder and install dependencies:

```
npm install
bower install
```

Then launch the application:

```
npm start
```

*nodemon* will detect changes and restart automatically application when needed. Just type "rs" and Enter in terminal to relaunch manually.

# Pre-requisites

* node.js + npm
* Bower
* MongoDB
* ImageMagick convert CLI command
* Python 2.7 (and not 3.x, for mongoose-crate)

# Roadmap

Critical:
- [ ] Need have a username in each case at the end of the process
- [ ] Introduce guest mode

User account:
- [ ] Add color band field
- [ ] Add form validation middleware for each form (account/*, login, signup)
- [ ] Refactor form error message display (use layout message box and middleware)
- [ ] Template user profile
- [ ] #cloudinary integration
-- [ ] Remove Multiparty and crate
-- [ ] Implement the new connect-multiparty version or fork the project to avoid tmpFiles
-- [ ] Customized configuration (maxFiles, MaxFilesSize...)
-- [ ] Auto removing of tmp files
-- [ ] Rationnalize avatar/background with common accessor (client/server) that return only a valid url

Room profile:
- [ ] Edit form
- [ ] Room profile templating
- [ ] Room header templating
- [ ] Add customizable color band on room
- [ ] Allow guests option
- [ ] Make room permanent option
- [ ] (irc) ACL on room => who is OP, set OP, remove OP, can change baseline, can kick users
- [ ] (irc) Kick users
- [ ] #cloudinary integration

Chat:
- [ ] Separate onetoone and room list in left column (different views, collections and ... 'client' binds) => ?
- [ ] Add homepage tab => ?
- [ ] On one to one or room open show last messages of this conversation
- [ ] Add "presence" management (who is actually online in this room?)
- [ ] Add onetoone persistence: only open/close persistence for the user. Then reopen on connection as for rooms

Backend:
- [ ] Traditional page secured zone
- [ ] Room crud
- [ ] User crud
- [ ] Instant online user list
-- [ ] real time activity monitor (multi connections)
- [ ] Instant active room list
-- [ ] real time activity monitor
- [ ] Server list and state
- [ ] Aggregate some data to have count (connect, disconnect, join/leave, create, message, ...)

MVP:
- [ ] Chat default panel with homepage content
- [ ] Share room on Twitter/Facebook
- [ ] Room permanent
- [ ] Room personalization
- [ ] User profile
- [ ] Bookmark user
- [ ] Invite friend in room
- [ ] Private room

Security/performance:
- [ ] Scalability: implement Redis for sessions, MongoDb data cache (all User and Room documents used by socket.io) and sockets.
- [ ] CSRF and 304!

Multi-devices:
- [ ] Re-implement

Finishing:
- [ ] Add form validation client-side: account/*, login, signup

Automation:
- [ ] Refactor grunt

vx:
- [ ] Fix "unlog" bug that maintain user logged in chat
- [ ] Sample activity generation (rooms, users, messages, enter/leave room, one to one)
- [ ] Highlight messages of the same user of this message
- [ ] (stats) Google Analytics
- [ ] Add a "Friends are in rooms" list
- [ ] Test it on IE8-11/FF
- [ ] Make it work on tablet/phone (browser)
- [ ] + Invite your friends + page Facebook

Mobile:
- [ ] (mobile) Port a mobile version with Steroids.js
- [ ] Identify and track devices for each socket/activity

Features:
- [ ] Room block code to paste on website to invite user to come
- [ ] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)
- [ ] Add sound on events
- [ ] User can black-list other users (avoir invitation and onetoone)
- [ ] Store activity in local storage
- [ ] Automatic mention of a user in a message
- [ ] Message history on arrow up/down

Ideas:
- [ ] Loyalty, advanced offline notification system (email, sms, frequency (instant, daily, weekly), filter (all activity, mentions, one to one, room where i am) with direct link to room/one to one allow fast anwser (even on mobile)
- [ ] Public mod for a room (all the content is visible by anyone)
- [ ] Pin a message
