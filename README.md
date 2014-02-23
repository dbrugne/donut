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
* (refactor) Add $logger in $app
* (refactor) Chatroom code cleanup/refactoring/logging

vx:
* Multi-line postbox input bug
* (irc) One to one discussion
* Find user
* Facebook Login + Invite your friends + page Facebook
* Private Room / Permanent Room (will not be deleted on last user leave)
* (irc) Kick users
* (irc) ACL on room => who is OP, set OP, remove OP, can change baseline, can kick users
* Add worldcup match in sample and on homepage
* (refactor) Use only Joined and focusRoom in client.js
* Add statistics: user loggin, user logout, user create/enter/leave a room, user chage title, search for room
* (refactor) Sanitize all user input in Websocket and implement data control
* Translate in french
* Google Analytics
* Invite someone(s) in my room
* Move room close button in room list
* A page per room (as for user)
* (irc) Message history on arrow up/down
* Social
  * Like a message
  * Follow profile (= friend)
  * Add a "Friends are in rooms" list
  * Mention a user in a message
* (refactor) Use App extends instead of actual server.php

Idea box:
* Each user can black-list other users
* Store messages and history in localstorage
