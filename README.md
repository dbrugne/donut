chat
====

***"Une plateforme de discussion temps réel autour de thématique. Pour ce faire la plateforme permet la création de "room" dans laquelle les utilisateurs pourront échanger autour d'un sujet, d'une communauté ou de tout et rien"***

## Release 1

**Chat**
- [x] Helper: avoid room populate code recursion in helper
- [x] user:search avoid user without username
- [x] user:profile remove discuss button if not online
- [x] Also delete room on disconnect if needed (only on leave actually)
- [x] Improve hyperlinking in topic and *:message (www.xxxx.com, http://, ftp://, ...) => http://soapbox.github.io/jQuery-linkify/
- [x] Move room:message logic in room model instead of collections
- [x] Repair smileys (< and > and '3:)') => http://os.alfajango.com/css-emoticons/
- [x] Template room and user tiles
 - [x] Template room tile
 - [x] Template user tile 
 - [x] Make join and discuss button work
 - [x] Make room list dynamic
- [x] Avoid room:join/room:leave for socket that made the action to join/leave => broadcast call modified by receive "other" socket join notification
- [x] Room profile form/page/modal
- [x] Replace "no topic" by "Choose a topic" and add a pen icon (all clickable)
- [x] Room avatar/color in header
- [x] Room link to profile in room header
- [x] Room link to profile in room tile on homepage
- [x] Room profile modal 
- [x] Home replace topic by description
- [x] Room permanent switch in header
- Improve design
- [ ] Use "user color" in "home", "onetoone" panel and tab and room user list
- [ ] Use "room color" in room tab
- Improve usage
- [ ] Room profile form in a popin
- [ ] User profile form in a popin
- [ ] Use tile template in user:search and room:search and move search in page (as for home)
- [ ] Get last 50 viewed on onetoone opening
- [ ] On onetoone focus trigger a (user:status<->user:status) to ask for connectivity and block message posting
- Improve protocol
- [ ] Replace room:out by user:disconnect sometimes
- [ ] Change the to server->client messages : room:join/leave and user:open/close (for something like ?)
- [ ] Room ops (room:op, room:deop, room:topic)
- [ ] Upgrade socket.io to 1.0
  - [ ] Use redis for sessions (for socket and express)
  - [ ] user:nickname, user:avatar, user:color messages
  - [ ] room:avatar, user:color messages
  - [ ] Add a check on connection to verify is user have "username"

**User**
- [x] Add help text for each field
- [x] Make color picker open on click on preview
- [x] Softness the hyperlink validation on profile
- [x] Add accepted format and expected size on file uploader + test before uploading
- [ ] Add "left characters" indication on "bio" field
- [ ] Make website clickable on profile page (page and modal)
- [ ] Add user rooms on user profile
- [ ] Add rooms users on room profile
- [ ] Add "your rooms" list on account page
- [ ] Forgotten password (https://github.com/substack/node-password-reset && http://stackoverflow.com/questions/20277020/reset-change-password-in-nodejs-with-passportjs)
- [ ] Welcome email on signup

**Site**
- [ ] Global theme
- [ ] Google Analytics (HP, interface de chat)
- [ ] Traduction fr
- [ ] Test it on IE8-11/FF
- [ ] Backup
- [ ] Monitor

**Tooling**
- [ ] Minimum virtual trafic generation
- [ ] Basic backend
- [ ] Basic grunt sample data injection (connect, disconnect, join/leave, create, message, ...)

## Release 2

**Performance/security**
- [ ] Compress JS: https://github.com/JakeWharton/uglify-js-middleware

**Help**
- [ ] Help infobox on chat interface + help button
- [ ] Help block with capture to explain the Facebook signup procedure (find best practices on internet)
- [ ] First entrance 'tutorial' (5 slides) + button to replay

**Chat**
- [ ] Auto-mention user in room message ($.fn.mentionize())

**Contents**
- [ ] User list (avatar) on room tile
- [ ] Room list on user tile
- [ ] User list on room profile
- [ ] Room list on user profile

## Next releases

Critical:
- [ ] Room kick
- [ ] Room ban (time and permanent)
- [ ] Fix bug that maintain user logged in chat on logout
- [ ] Separate socket/web apps
- [ ] Introduce Redis
- [ ] Introduce guest mode (= no ?) and allow guest option
- [ ] Page Facebook

Chat:
- [ ] Replace user_id by username in user:profile request
- [ ] Get last 50 viewed on room opening
- [ ] Add "presence" management (who is actually online in this room?)
- [ ] Changing username/avatar on site should change it in chat interface (= Redis cache, form invalidate cache, how to send a message between www and ws without queue system)

Backend:
- [ ] Traditional page secured zone
- [ ] Room crud
- [ ] User crud
- [ ] Instant online user list
-- [ ] real time activity monitor (multi connections)
- [ ] Instant active room list
-- [ ] real time activity monitor
- [ ] Server list and state
- [ ] Aggregate some data to have count 

Features:
- [ ] Store activity in local storage (= no ?)
- [ ] Message history on arrow up/down (localstorage ?)
- [ ] Highlight messages of the same user of this message
- [ ] Bookmark user
- [ ] Bookmark room
- [ ] Invite users in room
- [ ] Invite users in room (Facebook)
- [ ] Invite users in room (email)
- [ ] Invite your friend on roomly (Facebook)
- [ ] Add sound on events
- [ ] Private room
- [ ] User can black-list other users (avoir invitation and onetoone)
- [ ] Add form validation client-side: account/*, login, signup

Mobile:
- [ ] Make it work on tablet/phone (browser)
- [ ] (mobile) Port a mobile version with Steroids.js
- [ ] Identify and track devices for each socket/activity

Ideas:
- [ ] Room widget to paste on a website to incentive website visitor to join the room
- [ ] Loyalty, advanced offline notification system (email, sms, frequency (instant, daily, weekly), filter (all activity, mentions, one to one, room where i am) with direct link to room/one to one allow fast anwser (even on mobile)
- [ ] Public mod for a room (all the content is visible by anyone)
- [ ] Pin a message
- [ ] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)
