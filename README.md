chat
====

# Install

Meet the pre-requisites: **see below**.

Clone the project, go in server/ folder and install dependencies:

```
npm install
bower install
```

Then launch the application:

```
npm start
```

*nodemon* will detect changes and restart automatically application when needed. Just type "rs" and Enter in terminal to relaunch manually.

# Pre-requisites

* node.js + npm
* nodemon
* Bower
* MongoDB

# Roadmap

## MVP

- Images
- [x] Remove multiparty and crate
- [ ] Integrate cloudinary and user picture
-- [x] define avatar 'formats' in configuration file
-- [x] remove nasty cloudinary.cloudinary code
-- [x] make add/edit picture work in all cases (inclusing "cancel")
-- [x] re-Add a method on user model with "format" parameter (use in account/, user/ and #header)
-- [x] in chat and on account/edit pass only the cloudinary id and implement image loading on client side
-- [-] configure well upload constrains (maxsize, format ..) => not supported by jQuery uploader
-- [x] handle default image
-- [ ] add "delete" image (delete action in form and removing on cloud)
-- [ ] on image change "delete" previous image
-- [ ] cloudinary cache bug http://cloudinary.com/documentation/jquery_image_manipulation#image_versions

- Chat
- [ ] Chat default panel with homepage content
- [ ] Chat default room with auto-join on connection
- [ ] Separate onetoone and room list in left column (different views, collections and ... 'client' binds)
- [ ] Sort room list alphabetically and change rendering pattern to "redrawn" everytime
- [ ] Review the chat interface loading process
-- [ ] Repair URL-room-auto-join (double join when room is both in URL and user mongo entity, broke the routing)
-- [ ] Add a proxy for room:join/room:success to avoid previous bug in better way

- [x] Remove "your profile" in header and put the link on username
- [x] Modify "header" link to open account/ in blank
- [x] Add a chat button in logged header
- [x] Removed "logged" homepage to replace with automatic redirection to chat interface (expect for account/)
- [x] Add an intermediate "form" to choose a username when entering in chatroom

- Signup
- [x] Remove username from signup form (comment)

- Account
- [ ] Add form validation middleware for each form (account/*, login, signup)
- [ ] Refactor form error message display (use layout message box and middleware)
- [ ] Add color theme field
- [ ] CSRF and 304!
- [ ] Forgotten password
- [ ] Template user profile

- Site
- [x] Mettre au propre les mockups du MVP
- [ ] Test it on IE8-11/FF
- [ ] Design integration
- [ ] Google Analytics (HP, interface de chat)
- [ ] Deploy/backup/monitor

## Next

Critical:
- [ ] Introduce guest mode
- [ ] Re-introduce room_id (if needed)

User account:

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

Multi-devices:
- [ ] Re-implement

Automation:
- [ ] Refactor grunt

vx:
- [ ] Fix "unlog" bug that maintain user logged in chat
- [ ] Sample activity generation (rooms, users, messages, enter/leave room, one to one)
- [ ] Add a "Friends are in rooms" list
- [ ] Make it work on tablet/phone (browser)
- [ ] + Invite your friends + page Facebook

Mobile:
- [ ] (mobile) Port a mobile version with Steroids.js
- [ ] Identify and track devices for each socket/activity

Features:
- [ ] Highlight messages of the same user of this message
- [ ] Share room on Twitter/Facebook
- [ ] Room permanent
- [ ] Room personalization
- [ ] Bookmark user
- [ ] Invite friend in room
- [ ] Private room
- [ ] Room widget to paste on a website to incentive website visitor to join the room
- [ ] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)
- [ ] Add sound on events
- [ ] User can black-list other users (avoir invitation and onetoone)
- [ ] Store activity in local storage
- [ ] Automatic mention of a user in a message
- [ ] Message history on arrow up/down
- [ ] Add form validation client-side: account/*, login, signup

Ideas:
- [ ] Loyalty, advanced offline notification system (email, sms, frequency (instant, daily, weekly), filter (all activity, mentions, one to one, room where i am) with direct link to room/one to one allow fast anwser (even on mobile)
- [ ] Public mod for a room (all the content is visible by anyone)
- [ ] Pin a message
