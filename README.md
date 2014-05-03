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

critical:
- [] Need have a username in each case at the end of the process
- [] Introduce guest mode

node.js:
- [x] Refactor node.js/passport/mongodb
- [x] Need to repair FB only account Local account association
- [x] Block FB account unlinking when no local, block local unlinking (= delete account instead)
- [x] Move username in global context

User account:
- [x] Implement change email form
- [x] Implement change password form
- [x] Account form and post (finish)
- [x] Add confirmation message on delete account
- [x] Add CSRF on forms (account, login, signup): http://dailyjs.com/2012/09/13/express-3-csrf-tutorial/
- [x] Add upload file mechanism and handle user pictures
- [] Add form validation middleware for each form (account/*, login, signup)
- [] Add color band field
- [] Refactor form error message display (use layout message box and middleware)
- [] Template user profile
- [] #cloudinary integration
-- [] Remove Multiparty and crate
-- [] Implement the new connect-multiparty version or fork the project to avoid tmpFiles
-- [] Customized configuration (maxFiles, MaxFilesSize...)
-- [] Auto removing of tmp files
-- [] Rationnalize avatar/background with common accessor (client/server) that return only a valid url

Room profile:
- [] Edit form
- [] Template
- [] Add customizable color band on room
- [] (irc) ACL on room => who is OP, set OP, remove OP, can change baseline, can kick users
- [] (irc) Kick users
- [] #cloudinary integration

Repair:
- [] Repair auto-join room when come from homepage (need replacing room id with name everywhere)
- [x] Move open onetoone and view profile in MainView
- [] CSRF and nested forms and 304

Chat:
- [] Chat callback on homepage => /!#DagnirDae
- [] Room profile with chat callback => /!#DagnirDae
- [] On one to one or room open show last messages of this conversation

socket.io:
- [x] Refactor socket.io (redis?)
-- [] Review all the messages exchanged between client/server
-- [x] Remove topic to use room name instead (with prefix)
- [] Add chat interface "alert" popin and handle errors on: room:join, room:topic, user:message, room:create

- Refactor Bower + require.js
- [] Refactor grunt
- [x] Refactor less.css
- [x] Cleanup projects files
- [] Merge

Security/performance:

Backend:
- [] Traditional page secured zone
- [] Room crud
- [] User crud
- [] Instant online user list
-- [] real time activity monitor (multi connections)
- [] Instant active room list
-- [] real time activity monitor
- [] Server list and state

MVP:
- [] Chat default panel with homepage content
- [] Share room on Twitter/Facebook
- [] Room personalization
- [] User profile
- [] Bookmark user
- [] Invite friend in room

Multi-devices:
- [] Re-implement

vx:
- [] Add form validation client-side: account/*, login, signup
- [] Add "presence" management
- [x] Add require.js on client side to simplify code organization
- [] (refactor) Reset the communication protocole: exit Wamp, only directionnal events and logic
- [] Add backend interface that is connect to server and give some informations
- [] Add anonyme mode (user come on platform, connect to chat, join rooms, discuss)
- [] (bug) Fix "unlog" bug that maintain user logged in chat
- [] (refactor) Sanitize all user input in Websocket and implement data control
- [] (specs) Draw client/server protocol with list and structure of message, uniformize
- [] Private Room / Permanent Room (will not be deleted on last user leave)
- [] Invite someone(s) in my room
- [] Highlight messages of the same user of this message
- [] (stats) Add statistics counter: user loggin, user logout, user create/enter/leave a room, user change title, search for room
- [] (stats) Google Analytics
- [] (social) Follow profile (= friend)
- [] (social) Add a "Friends are in rooms" list
- [] (irc) Message history on arrow up/down
- [] (refactor) Use App extends instead of actual server.php
- [] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)
- [] Sample activity generation (rooms, users, messages, enter/leave room, one to one)
- [] Loyalty, advanced offline notification system (email, sms, frequency (instant, daily, weekly), filter (all activity, mentions, one to one, room where i am) with direct link to room/one to one allow fast anwser (even on mobile)
- [] Make it work on IE8-11/FF
- [] Make it work on tablet/phone (browser)
- [] + Invite your friends + page Facebook

Mobile:
- [] (mobile) Port a mobile version with Steroids.js

Idea box:
- [] Room block code to past on this website to invite user to come
- [] Add sound on events
- [] (social) Like a message
- [] Each user can black-list other users
- [] Store messages and history in localstorage
- [] (social) Automatic mention of a user in a message
- [] Public mod for a room (all the content is visible by anyone)
- [] Anonymous person allowed (could be blocked by room)
- [] Give ability to a room owner to "suspend a room" temporarily
- [] Pin a message
