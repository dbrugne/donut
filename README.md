chat
====

v1:
* Auto-reconnect - done!
* Block on window popin (do you want really leave this page?) - done!
* Fix auto-reconnect bug to auto re-subscribe to topics - done!
* Deploy on production - done!
* Redirect on homepage when registered - done!

v2:
* Install Supervisor - done!
* Replace available room by "search in available rooms" and do that in modal - done!
* Remove availableRooms - done!
* Correct fluid on tablet/phone - done!
* Open user profile in modal - done!
* Install Libevent - done!
* Make it work on IE<10 (Polyfill flexbox and WS/SWF) - done!
* Deploy and send to David - done!

v3:
* Add user picture in messages - done!
* Clean up date displaying in messages - done!
* Smileys - done!
* Hyperlink - done!
* Add open profile in .messages - done!

v4:
* (irc) One to one discussion - done!
* (refactor) Process to enter in a room: on click subscribe/createIhm/getRoomData/getUsers + error handling - done!
* (refactor) Add $logger in $app and log properly - done!
* (refactor) Chatroom code cleanup/refactoring - done!
* (refactor) Use only URI as identifier (room / discussion) in old.server.js and client.js - done!
* Move room close button in room list - done!

v5:
* Online / find user - done!
* Secure MongoDb and install on production - done!
* Get and store userId on connect on client side on connect - done!
* Add anchor by room, that change when selecting another room, could be shared with people - done!
* Add user count on "room tab" - done!
* Add user count on "room search" - done!

v6:
* Change [data-room-id=] to [data-topic=] - done!
* (try) Extend the "room box" to include the user list - done!
* Extend header width in chat/ - done!
* Add indicate in page title when a new message come

v7:
* Fix old session bug
* User account: photo, bio, town
* A page per room (as for user)
* (refactor) Database on MongoDb
* (refactor) App on node.js/express + http://passportjs.org/
* (social) Facebook Login + Invite your friends + page Facebook

v8:
* Refactor Room/Discussion/ChatWindow on Backbone.js

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