chat
====

## MVP

**Images**
- [x] Remove multiparty and crate
- Integrate cloudinary and user picture
- [x] define avatar 'formats' in configuration file
- [x] remove nasty cloudinary.cloudinary code
- [x] make add/edit picture work in all cases (inclusing "cancel")
- [x] re-Add a method on user model with "format" parameter (use in account/, user/ and #header)
- [x] in chat and on account/edit pass only the cloudinary id and implement image loading on client side
- [x] configure well upload constrains (maxsize, format ..) => !! not supported by jQuery uploader !!
- [x] handle default image
- [x] add "delete" image (delete action in form and removing on cloud)
- [x] Pass cloudinary conf in DOM to chat interface
- [x] cloudinary cache bug http://cloudinary.com/documentation/jquery_image_manipulation#image_versions

**Chat**
- [x] Chat default room with auto-join on connection
- [x] Review the chat interface loading process (init: {client, main, router}, run: (client-connect, ->welcome, home content, router start, join route hash, then join room welcome)
- [x] Repair URL-room-auto-join (double join when room is both in URL and user mongo entity, broke the routing)
- [x] Add a proxy for room:join/room:success to avoid previous bug in better way
- [x] Remove "your profile" in header and put the link on username
- [x] Modify "header" link to open account/ in blank
- [x] Add a chat button in logged header
- [x] Removed "logged" homepage to replace with automatic redirection to chat interface (expect for account/)
- [x] Add an intermediate "form" to choose a username when entering in chatroom
- [x] Separate onetoone and room list in left column (different views, collections and ... 'client' binds)
- [x] Chat default panel with homepage content
- [x] Change rendering pattern to "redrawn" everytime on rooms block, onetoones block and room user block
- [x] Persist onetoone open/close and reopen on 'welcome' event
- [x] In welcome.users message list users and not sockets
- [x] In room.welcome message list connected sockets and not users
- [x] On disconnect don't send room:out if another socket is active for this user
- [x] Persist correctly user.rooms and room.users
- [x] On room join make room search case insensitive
- [x] Sort room/onetoone/room users lists alphabetically
- [x] On client side, leaving a room/onetoone panel focus correctly the home but not change uri (if i F5 i get the room re-open)
- [x] One one to one message check that to user exists in database
- [x] Implement central username/room.name validator/sanitization
- [x] Handle backbone 'default' route to display home (with redirect?) with alert message
- [x] Implement room creation success/error alert message => to complicated at this stage to modify the room creation flow (deep in room:join)
- [x] Make discuss button in profile modal work
- [x] Repair room user number on room tab
- [x] Handle empty room deletion on last user leave
- [x] Move onlines block on home
- [x] Refresh home on focus
- [x] Add username in room:out
- [x] Add username in user:offline
- [x] Add correct cloudinary string in welcome.user, welcome.onlines
- [x] Add correct cloudinary string in room:welcome.users
- [x] Add correct cloudinary string in room:in
- [x] Add correct cloudinary string in room:out
- [x] Add correct cloudinary string in room:message
- [x] Add correct cloudinary string in room:topic
- [x] Add correct cloudinary string in user:open
- [x] Add correct cloudinary string in user:message
- [x] Add correct cloudinary string in user:search
- [x] Add correct cloudinary string in user:online
- [x] Add correct cloudinary string in user:profile
- [x] Add avatar in room user list and home online user list and onetoone tab
- [x] Connection stat on user:search
- [x] user:offline only it's the last socket
- [ ] room:message Caja sanitization
- [ ] room:topic Caja sanitization
- [ ] user:message Caja sanitization
- [ ] room:message and user:message validation
- [ ] ACL room:topic
- [ ] ACL room:message
- [ ] Add length limit on messagebox/topic
- [ ] Move error handler and activity recorder in helper
- [ ] Get last 50 viewed on room/onetoone opening

**Signup**
- [x] Remove username from signup form (comment)

**Account**
- [x] Remove change username field in profile
- [x] Block choose-username controller if username already set on req.user
- [x] Add form validation/sanitization middleware for each form (account/*, login, signup)
- [x] Add color theme field
- [ ] Forgotten password (https://github.com/substack/node-password-reset && http://stackoverflow.com/questions/20277020/reset-change-password-in-nodejs-with-passportjs)
- [x] Caja validation on bio and location

**Finishing**
- [x] CSRF and 304!
- [x] Update connect-mongo module

**Design**

- [x] Template user profile
- [ ] Global theme
- [ ] Template room block and user block (chat home page)

**Site**
- [x] Mettre au propre les mockups du MVP
- [x] Deploy
- [ ] Google Analytics (HP, interface de chat)
- [ ] Test it on IE8-11/FF
- [ ] Backup
- [ ] Monitor

**Additionnal**
- [ ] Minimum virtual trafic generation
- [ ] Basic backend
- [ ] Basic grunt sample data injection

**Improvment**
- [ ] Changing username on site shoud change it in chat interface (= Redis cache, form invalidate cache, how to send a message between www and ws without queue system)
- Avoid disconnected message transmission
- [ ] Search engine: remove profile button if user not online (info in user:profile)
- [ ] Onetoone: on focus trigger a (ping/pong) to ask for connectivity and block message posting
- [ ] Persist user.onetones here for both users message
- [ ] OR : reintroduce onetoone for room => open+message join room, disconnect leave+room, room expire on last user in

## Next releases

Critical:
- [ ] Room is permanent
- [ ] Room op (owner + list)
- [ ] Room kick
- [ ] Introduce guest mode (= no ?)
- [ ] Separate socket/web apps
- [ ] Introduce Redis

Room profile:
- [ ] Edit form
- [ ] Room profile templating
- [ ] Room header templating
- [ ] Add customizable color band on room
- [ ] Allow guests option
- [ ] Make room permanent option
- [ ] (irc) ACL on room => who is OP, set OP, remove OP, can change topic, can kick users
- [ ] (irc) Kick users
- [ ] #cloudinary integration

Chat:
- [ ] On one to one or room open show last messages of this conversation
- [ ] Add "presence" management (who is actually online in this room?)
- [ ] Replace user_id by username in user:profile

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

Security/performance:
- [ ] Scalability: implement Redis for sessions, MongoDb data cache (all User and Room documents used by socket.io) and sockets.
- [ ] Security: use https://www.npmjs.org/package/google-caja on message input (especially socket inputs and messages)

Automation:
- [ ] Refactor grunt
- [ ] Sample activity generation (rooms, users, messages, enter/leave room, one to one)

Bugs:
- [ ] Fix bug that maintain user logged in chat on logout

Features:
- [ ] Highlight messages of the same user of this message
- [ ] Room permanent
- [ ] Room personalization
- [ ] Bookmark user
- [ ] Bookmark room
- [ ] Invite friend in room
- [ ] Private room
- [ ] Add sound on events
- [ ] User can black-list other users (avoir invitation and onetoone)
- [ ] Store activity in local storage
- [ ] Automatic mention of a user in a message
- [ ] Message history on arrow up/down
- [ ] Add form validation client-side: account/*, login, signup
- [ ] Refactor form error message display (use layout message box and middleware)
- [ ] Add a "Friends are in rooms" list
- [ ] + Invite your friends + page Facebook

Mobile:
- [ ] (mobile) Port a mobile version with Steroids.js
- [ ] Identify and track devices for each socket/activity
- [ ] Make it work on tablet/phone (browser)

Ideas:
- [ ] Share room on Twitter/Facebook
- [ ] Loyalty, advanced offline notification system (email, sms, frequency (instant, daily, weekly), filter (all activity, mentions, one to one, room where i am) with direct link to room/one to one allow fast anwser (even on mobile)
- [ ] Public mod for a room (all the content is visible by anyone)
- [ ] Pin a message
- [ ] Room widget to paste on a website to incentive website visitor to join the room
- [ ] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)