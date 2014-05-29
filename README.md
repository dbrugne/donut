chat
====

***"Une plateforme de discussion temps réel autour de thématique. Pour ce faire la plateforme permet la création de "room" dans laquelle les utilisateurs pourront échanger autour d'un sujet, d'une communauté ou de tout et rien"***

## MVP

**Chat**
- [x] Helper: avoid room populate code recursion in helper
- [x] user:search avoid user without username
- [ ] user:profile remove discuss button if not online
- [ ] Also delete room on disconnect if needed (only on leave actually)
- [ ] Improve hyperlinking in topic and *:message (www.xxxx.com, http://, ftp://, ...) => http://soapbox.github.io/jQuery-linkify/
- [ ] Repair smileys (< and > and '3:)') => http://os.alfajango.com/css-emoticons/
- [ ] Avoir room:join/room:leave for socket that made the action to join/leave
- [ ] Replace "no topic" by "Choose a topic" and add a pen icon (all clickable)
- [ ] Use user color in "home", "onetoone" panel and tab and room user list
- [ ] On onetoone focus trigger a (user:status<->user:status) to ask for connectivity and block message posting
- [ ] Get last 50 viewed on onetoone opening
- [ ] Permanent room
- [ ] Room profile
- [ ] Room ops (room:op, room:deop, room:topic)
- [ ] Auto-mention user in room message

**User**
- [ ] Forgotten password (https://github.com/substack/node-password-reset && http://stackoverflow.com/questions/20277020/reset-change-password-in-nodejs-with-passportjs)
- [ ] Welcome email on signup
- [ ] Softness the hyperlink validation on profile => make it clickable on profile page
- [ ] Add accepted format and expected size on file uploader + test before uploading
- [ ] Room list on user profile

**Room**
- [ ] Room profile form
- [ ] Room profile page
- [ ] User list on room profile

**Design**

- [ ] Template room block and user tiles (chat home page)
- [ ] Global theme

**Contenu**
- [ ] Homepage content
- [ ] Help block with capture to explain the Facebook signup procedure (find best practices on internet)
- [ ] First entrance 'tutorial' (5 slides) + button to replay
- [ ] Help infobox on chat interface + help button
- [ ] 

**Site**
- [ ] Google Analytics (HP, interface de chat)
- [ ] Traduction fr
- [ ] Test it on IE8-11/FF
- [ ] Backup
- [ ] Monitor

**Tooling**
- [ ] Minimum virtual trafic generation
- [ ] Basic backend
- [ ] Basic grunt sample data injection (connect, disconnect, join/leave, create, message, ...)

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
