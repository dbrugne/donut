chat
====

# Install

Meet the pre-requisites: **see below**.

Clone the project, go in server/ folder and install dependencies:

```
npm install
```

Then launch the application:

```
npm start
```

*nodemon* will detect changes and restart automatically application when needed. Just type "rs" and Enter in terminal to relaunch manually.

# Pre-requisites

* node.js + npm
* MongoDB

# Roadmap

node.js:
- [x] Refactor node.js/passport/mongodb
- [x] Need to repair FB only account Local account association
- [x] Block FB account unlinking when no local, block local unlinking (= delete account instead)
- [x] Move username in global context
- [] Need have a username in each case at the end of the process

User account:
- [] Add form validation middleware for each form (account/*, login, signup)
- [x] Implement change email form
- [x] Implement change password form
- [x] Account form and post (finish)
- [] Add confirmation message on delete account
- [] Add CSRF on forms (account, login, signup): http://dailyjs.com/2012/09/13/express-3-csrf-tutorial/
- [] Add color band field
- [] Template user profile
- [] Add upload file mechanism and handle user pictures

Room profile:
- [] Add customizable color band on room
- [] Repair auto-join room when come from homepage (need replacing room id with name everywhere)
- [] (irc) ACL on room => who is OP, set OP, remove OP, can change baseline, can kick users
- [] (irc) Kick users

Chat:
- [] Chat callback on homepage => /!#DagnirDae
- [] Room profile with chat callback => /!#DagnirDae
- [] On one to one or room open show last messages of this conversation

socket.io:
- [x] Refactor socket.io (redis?)
-- [] Introduce guest mode
-- [] Review all the messages exchanged between client/server
-- [x] Remove topic to use room name instead (with prefix)

- [] Refactor grunt
- [x] Refactor less.css
- [] Cleanup projects files
- [] Merge

v4:
- [] Backend
-- [] Traditional page secured zone
-- [] Room crud
-- [] User crud
-- [] Instant online user list
--- [] real time activity monitor (multi connections)
-- [] Instant active room list
--- [] real time activity monitor
-- [] Server list and state

Room profile:
- [] Edit form
- [] Template

vx:
- [] Add form validation client-side: account/*, login, signup
- [] Fix old session bug (if still exists)
- [] Add "presence" management
- [] Add require.js on client side to simplify code organization
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
