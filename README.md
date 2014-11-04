chat
====

## v1.0 : opening platform to real people

**Tasks**

- History
  - [ ] Aggregate by day (!!!)
  - [ ] sanitize event on history recording (avatar, color) and re-add on hydration to avoid bad avatar in history

- Welcome message (donut default)
  - Welcome massage en anglais: DONE https://irc.box.com/s/c6uqsvd2tbn1fanwu6fc

- Welcome message (custom by owner)
  - Wording à l'entrée d'un donut: DONE https://irc.box.com/s/v8ote63x8z8ktc0qz66n

- [ ] Image in discussion

- User mentions
- [ ] user highlight in .messages with @
- [ ] add @ before every username
- [ ] Add mentions in room (highlight room user in messages)

- [ ] Add notification to owner/op when a user enter in room
- [ ] Add email to notify us of user connection
  -> Draft notifications: DONE https://irc.box.com/s/wk9iq6wihj8vsnqc7tpj

=> prod

- User mentions
- [ ] user highlight in .messages with @
- [ ] add @ before every username
- [ ] Add mentions in room (highlight room user in messages)

- [ ] Badge for websites

[- [ ] Private room](??)

- Try to store instant status on user by connection/deconnection/restart persistence

## Big Ideas

- Mode public/logué
  => création de room on the fly / sans compte
- Donut wall (with APIs bridges)
- Room avec contenu "public"

## v1.1 : minimal features against competitors

- [ ] Multi-node support
- [ ] Onetoone message delivering (even for offline users) + onetoone refactoring
- [ ] Kick reason form
- [ ] Ban from room
- [ ] Ban user list edit => appears in bottom on room users list

**Other**
- User /logout not send a notlogged event (setInterval + check for cookie, if cookie expired or has disapeared : redirect to home)
- Image uploader doesn't work on <=IE9

## Scalability

- [ ] Add new socket.io-redis (https://github.com/Automattic/socket.io/issues/1630)
  - [ ] On connect/disconnect/join/leave maintain redis user set for each room
  - [ ] On connect/disconnect maintain redis user set
  - [ ] Implement user online status on user profile (drawer)
- [ ] Deploy on a strong infrastructure

## Release 3

**Hosting**
- [ ] Add test instance on the same server (donut.me subdomain and new IP from OVH)
- [ ] Add event to make IHM reload
- [ ] Add "admin" tag on user that allow them to view all history and op all rooms

**Other**
- [ ] @todo review
- [ ] Delete existing user/room image on cloudinary when user change image
- [ ] Change poster and avatar also when room/user color was changed

**Social**
- [ ] Invite users in room (donut)
- [ ] Invite users in room (Facebook)
- [ ] Invite users in room (email)
- [ ] Invite your friend on donut (Facebook)

**History**
- [ ] Store posted messages in localstorage
- [ ] Message history on arrow up/down based on localstorage
- [ ] Add a cleanup method that empty .messages periodically to avoid memory leak

**Search**
- [ ] Add pagination with limit of results
- Avoid noise queries
  - [ ] Set a setInterval and clearInterval tracker on 150ms
  - [ ] Test also that previous request has return (more than) one result if i just added a letter on the right of my request

**Account**
- [ ] Delete account (link on account drawer with target _blank) to /delete, confirmation page with text and field to type password + cancel button, reuse existing delete action + password check
- [ ] Change username

**Chat**
- [ ] Change the to server->client messages : room:join/leave and user:open/close (for something like ?)
- [ ] Add a check on ws connection to verify is user have "username"
- [ ] Bug : room user list scroll is not active when entering in room (but work once the first redraw)
- [ ] WS: implement REDIS cache for user and room and read in REDIS cache only "even" for socket.getUsername-like function to have always last data
- [ ] Bugfix: on room auto-deletion reactivation. Should handle in 'connection.populateRoom' the room recreation. Otherwise a room automatically removed cannot be re-join automatically by client cause room populate try to find room in DB before sending it to client in welcome
- [ ] Scrollbars adding (left column, home content, user and room edit drawer) and improvments (room messages and users)
- [ ] Activity logic and tracking : online, afk, offline (used on user profile, one to one, room users, ...)
- [ ] For onetoone discussion (only), persist if a message was delivered or not and delivered it on welcome
- Small and helpfull features:
  - [ ] Auto fill room user name in input
  - [ ] Hilight user name in messages
  - [ ] Own messages history on up and down
  - [ ] Ability to switch .messages display as compact (hide usernames, preserve date on right)
  - [ ] Ability to disabled auto-post on Enter (in this case enter will add break line in input box)
  - [ ] Commands handling: "/j|join room" "/l|leave room" "/msg user" "/info room|user" "/kick room user", "/whois user", "/quit", "/ping"
  - [ ] Hide notification (display only a colored line with number of notifications in bubble, on click show notifications)
  - [ ] Color this user messages by simply clicking on a user (stored in browser memory only)
  - [ ] Smileys popin
  - [ ] /me commande to describe current action
  - [ ] Add an option to avoid exit popin on chat interface
  - [ ] Improve backlog experience when refocus a room with lot of unread messages (button to jump on last viewed message and display highligth on unread messages)
  - [ ] Sound on new message
  - [ ] Animation on new message adding in .events

**Content**
- [ ] Animated 'rollers' for alternative texts on landing

**Help**
- [ ] Help infobox on chat interface + help button
- [ ] Help block with capture to explain the Facebook signup procedure (find best practices on internet)
- [ ] First entrance 'tutorial' (5 slides) + button to replay

**Features**
- [ ] Add bookmark a room star in header with favorites rooms in home and account and profile

**Room/user design**
- [ ] Add "your rooms" on homepage
- [ ] Add a bouncer feature when an unlogged user click on #!... URL (to room/user profile)

**Tooling**
- [ ] Backup
- [ ] Monitoring
- [ ] Minimum virtual traffic generation
- [ ] Basic grunt sample data injection (users and rooms) with production and dev fixture sets

**Search**
- [ ] Quick search in left column (with 'light' param to get only username/name + avatar) and link for 'more results' that focus and fill the homepage search

**SEO**
- [ ] Create an IRC channel page with Google Adwords campaign

## Release 4

**Chat**
- [ ] Implement async series/waterfall in socket code
- [ ] Auto-mention user in room message ($.fn.mentionize())
- [ ] Allow user to change room-user list sort order
- [ ] Allow user to change room-user list display

**Performance/security/maintenability**
- [ ] Compress JS: https://github.com/JakeWharton/uglify-js-middleware
- [ ] Strongify password constrains (signup, login and forgot, very long or complex)
- [ ] Remove HOGAN and re-add EJS

**Features**
- [ ] Implement "remember me" mechanism on login form

**Presence management**
  - [ ] Each user received on client side (room user, owner, onetoone user, home users ... but not search engine users) are instanciated as a User Model
  - [ ] This model is stored ALSO in a global knownUsers collection
  - [ ] Each model "listen for a user presence" socket.io room
  - [ ] View of this model (could have lot of different template) ... should listen for model modification : how to handle user list (room users) that are re-drawn totally? With the block listening for collection/model change?
  - [ ] How to cleanup users that have totally leave our vision space (no longer in the room we are, no one to one open, not displayed on room)

## Next releases

Critical:
- [ ] Room ban (time and permanent)
- [ ] Fix bug that maintain user logged in chat on logout
- [ ] Introduce guest mode (= no ?) and allow guest option

Chat:
- [ ] Replace user_id by username in user:profile request
- [ ] Message improving
  - [ ] Code syntax indexing
- [ ] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)
- [ ] Images drag&drop in input box + direct upload to cloudinary and hyperlink addition in message

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
- [ ] Highlight messages of the same user of this message
- [ ] Bookmark user
- [ ] Add sound on events
- [ ] Private room
- [ ] User can black-list other users (invitation and onetoone)
- [ ] Add form validation client-side: account/*, login, signup

Mobile:
- [ ] Make it work on tablet/phone (browser)
- [ ] (mobile) Port a mobile version with Cordova
- [ ] Identify and track devices for each socket/activity

Ideas:
- [ ] Room widget to paste on a website to incentive website visitor to join the room
- [ ] Loyalty, advanced offline notification system (email, sms, frequency (instant, daily, weekly), filter (all activity, mentions, one to one, room where i am) with direct link to room/one to one allow fast anwser (even on mobile)
- [ ] Public mod for a room (all the content is visible by anyone)
- [ ] Pin a message


## Project

- [ ] Run OPQAST security checklist
- [ ] Mocha/Chai + casperjs tests
