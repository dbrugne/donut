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

v2:
- [x] Refactor node.js/passport/mongodb
- [x] Need to repair FB only account Local account association
- [x] Block FB account unlinking when no local, block local unlinking (= delete account instead)
- [x] Move username in global context
- [] Need have a username in each case at the end of the process

- [] Implement change email form
- [] Implement change password form
- [] Account form and post (finished)
- [] Add confirmation message on delete account
- [] Add CSRF on forms (account, login, signup): http://dailyjs.com/2012/09/13/express-3-csrf-tutorial/

- [] Chat callback on homepage => /!#DagnirDae
- [] Room profile with chat callback => /!#DagnirDae

- [] Refactor socket.io (redis?)
-- [] Introduce guest mode
-- [] Introduce backend requests
-- [] Review all the messages exchanged between client/server
-- [] Remove topic to use room name instead (with prefix)

- [] Refactor grunt
- [] Refactor less.css
- [] Cleanup projects files
- [] Merge
- [] Sample activity generation

v3:
- [] Add customizable color line on room
- [] Repair auto-join room when come from homepage (need replacing room id with name everywhere)
- [] (irc) ACL on room => who is OP, set OP, remove OP, can change baseline, can kick users
- [] (irc) Kick users

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

v5:
- [] Make it work on IE8-11/FF
- [] Make it work on tablet/phone (browser)

v6:
- [] User profile
- [] User account: photo, bio, location, website
- [] Room profile
- [] Room edit
- [] Facebook Login
- [] + Invite your friends + page Facebook

vx:
- [] Fix old session bug (if still exists)
- [] Add "presence" management
- [] Add require.js on client side to simplify code organization
- [] (refactor) Reset the communication protocole: exit Wamp, only directionnal events and logic
- [] Add backend interface that is connect to server and give some informations
- [] Add anonyme mode (user come on platform, connect to chat, join rooms, discuss)
- [] (bug) Fix "unlog" bug that maintain user logged in chat
- [] (refactor) Sanitize all user input in Websocket and implement data control
- [] (specs) Draw client/server protocol with list and structure of message, uniformize
- [] Add tabbed-universe on homepage (TV, FIFA Worldcup, Sport, ...)
- [] Private Room / Permanent Room (will not be deleted on last user leave)
- [] Invite someone(s) in my room
- [] Highlight messages of the same user of this message
- [] (stats) Add statistics counter: user loggin, user logout, user create/enter/leave a room, user change title, search for room
- [] (stats) Google Analytics
- [] (social) Follow profile (= friend)
- [] (social) Add a "Friends are in rooms" list
- [] (irc) Message history on arrow up/down
- [] (refactor) Use App extends instead of actual server.php
- [] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions

Mobile:
- [] (mobile) Port a mobile version with SenchaTouch / Phonegap

Idea box:
- [] Add sound on events
- [] (social) Like a message
- [] Each user can black-list other users
- [] Store messages and history in localstorage
- [] (social) Automatic mention of a user in a message
- [] Public mod for a room (all the content is visible by anyone)
- [] Anonymous person allowed (could be blocked by room)
- [] Give ability to a room owner to "suspend a room" temporarily
- [] Pin a message