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
- [ ] add "delete" image (delete action in form and removing on cloud)
- [ ] on image change "delete" previous image
- [ ] cloudinary cache bug http://cloudinary.com/documentation/jquery_image_manipulation#image_versions

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
- [ ] Persist correctly user.rooms and room.users
- [ ] On room join make room search case insensitive
- [ ] Sort room/onetoone/room users lists alphabetically
- [ ] Move onlines block on home
- [ ] Refresh home on focus
- [ ] Get last 50 viewed on room/onetoone opening
- [ ] In welcome.users message list users and not sockets
- [ ] In room.welcome message list connected sockets and not users
- [ ] Handle empty room deletion on last user leave
- [ ] One one to one message check that to user exists in database
- [ ] Implement central username/room.name validator/sanitization
- [ ] Handle backnone 'default' route to display home (with redirect?) with alert message
- [ ] Implement room creation success/error alert message

**Signup**
- [x] Remove username from signup form (comment)

**Account**
- [ ] Add form validation/sanitization middleware for each form (account/*, login, signup)
- [ ] Refactor form error message display (use layout message box and middleware)
- [ ] Add color theme field
- [ ] Forgotten password (https://github.com/substack/node-password-reset && http://stackoverflow.com/questions/20277020/reset-change-password-in-nodejs-with-passportjs)
- [ ] Template user profile

**Finishing**
- [ ] CSRF and 304!
- [x] Update connect-mongo module
- [ ] Review all socket delegation and report: validation/sanitization, multi-device, ACL

**Site**
- [x] Mettre au propre les mockups du MVP
- [ ] Test it on IE8-11/FF
- [ ] Design integration
- [ ] Google Analytics (HP, interface de chat)
- [x] Deploy
- [ ] Backup
- [ ] Monitor

## Next releases

Critical:
- [ ] Introduce guest mode
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
- [ ] Add onetoone persistence: only open/close persistence for the user. Then reopen on connection as for rooms

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
- [ ] Security: use https://www.npmjs.org/package/google-caja on each input (especially socket inputs and messages)
- [ ] Move cloudinary params in configuration for both client and server

Automation:
- [ ] Refactor grunt
- [ ] Sample activity generation (rooms, users, messages, enter/leave room, one to one)

Bugs:
- [ ] Fix "unlog" bug that maintain user logged in chat

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
- [ ] Add a "Friends are in rooms" list
- [ ] + Invite your friends + page Facebook

Mobile:
- [ ] (mobile) Port a mobile version with Steroids.js
- [ ] Identify and track devices for each socket/activity
- [ ] Re-implement multi-devices
- [ ] Make it work on tablet/phone (browser)

Ideas:
- [ ] Share room on Twitter/Facebook
- [ ] Loyalty, advanced offline notification system (email, sms, frequency (instant, daily, weekly), filter (all activity, mentions, one to one, room where i am) with direct link to room/one to one allow fast anwser (even on mobile)
- [ ] Public mod for a room (all the content is visible by anyone)
- [ ] Pin a message
- [ ] Room widget to paste on a website to incentive website visitor to join the room
- [ ] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)