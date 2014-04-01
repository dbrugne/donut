chat
====

v1: Refactor Backbone.js
* Change baseline - done!
* View/search online users - done!
* View user profile - done!
* Repair unread badge - done!
* Add open profile in .messages - done!
* repair Add user count on "room tab" - done!
* One to one discussion - done!
* Repair smileys popover and rendering - done!
* Restore add room notification when user enter/leave - done!
* Restore room notification when user change baseline - done!
* Create room form (set owner_id) - done!
* Add unread count in page title - done!
* Block on window popin (do you want really leave this page?)
* Repair auto-join room when come from homepage
* embeded init in an App object
* Review @todo
* require.js
* Postbox on two lines (resizable?)
* Review old code
* Cleanup projects files
* Merge

v6:
* Refactor node.js/passport/mongodb
* Refactor socket.io (redis?)
* Review all the messages exchanged between client/server
** Remove topic to use room name instead
* Refactor grunt
* Refactor less.css
* Sample activity generation

v7:
* Backend
** Traditional page secured zone
** Room crud
** User crud
** Instant online user list
*** real time activity monitor (multi connections)
** Instant active room list
*** real time activity monitor
** Server list and state

v7:
* Make it work on IE8-11/FF
* Make it work on tablet/phone (browser)

v8:
* Add "presence" management
* Fix old session bug
* User account: photo, bio, town
* A page per room (as for user)

v9:
* Facebook Login
* + Invite your friends + page Facebook

v9:
* Translate in french
* (irc) ACL on room => who is OP, set OP, remove OP, can change baseline, can kick users
* (irc) Kick users

vx:
* (refactor) Reset the communication protocole: exit Wamp, only directionnal events and logic
* Add backend interface that is connect to server and give some informations
* Add anonyme mode (user come on platform, connect to chat, join rooms, discuss)
* (bug) Fix "unlog" bug that maintain user logged in chat
* (refactor) Sanitize all user input in Websocket and implement data control
* (specs) Draw client/server protocol with list and structure of message, uniformize
* Add tabbed-universe on homepage (TV, FIFA Worldcup, Sport, ...)
* Multi-line postbox input bug
* Private Room / Permanent Room (will not be deleted on last user leave)
* Invite someone(s) in my room
* Highlight messages of the same user of this message
* (stats) Add statistics counter: user loggin, user logout, user create/enter/leave a room, user change title, search for room
* (stats) Google Analytics
* (social) Follow profile (= friend)
* (social) Add a "Friends are in rooms" list
* (irc) Message history on arrow up/down
* (refactor) Use App extends instead of actual server.php

Mobile:
* (mobile) Port a mobile version with SenchaTouch / Phonegap

Idea box:
* Add sound on events
* (social) Like a message
* Each user can black-list other users
* Store messages and history in localstorage
* (social) Automatic mention of a user in a message
* Public mod for a room (all the content is visible by anyone)
* Anonymous person allowed (could be blocked by room)
* Give ability to a room owner to "suspend a room" temporarily
* Pin a message