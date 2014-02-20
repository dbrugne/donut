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
* Deploy and send to David

v3:
* Smileys
* Add user picture in messages
* Clean up date displaying in messages
* Add open profile in messages
* Multi-line postbox input

vx:
* (irc) One to one discussion
* (irc) Kick users
* (irc) ACL on room => who is OP, set OP, remove OP, can change baseline, can kick users
* Add worldcup match in sample and on homepage
* (refactor) Add logger to $app in server.php and log only with it but all
* (refactor) Use only Joined and focusRoom in client.js
* Add statistics: user loggin, user logout, user create/enter/leave a room, user chage title, search for room
* Sanitize all user input in Websocket and implement data control
* Translate in french
* Google Analytics
* Invite someone(s) in my room
* Move room close button in room list
* Facebook Login + Invite your friens + page Facebook
* A page per room (as for user)
* Private Room / Permanent Room (will not be deleted on last user leave)
* IRC flavor
  * Message history on arrow up/down
* Social
  * Like a message
  * View profile
  * Follow profile (= friend)
  * Add a "Friends are in rooms" list
  * Mention a user in a message
* Make it work on IE (Polyfill flexbox and WS/SWF)
* (refactor) Use App extends instead of actual server.php
* Each user can black-list other users

Idea box:
* Store messages and history in localstorage
