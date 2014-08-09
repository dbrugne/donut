chat
====

***"Une plateforme de discussion temps réel autour de thématique. Pour ce faire la plateforme permet la création de "room" dans laquelle les utilisateurs pourront échanger autour d'un sujet, d'une communauté ou de tout et rien"***

## Release 2

**Chat**
- [ ] Search engine
- [ ] Allow user to change room user sort order
- [ ] Allow user to change room user display
- Update chat interface on room/user details when room/user is edited
    - [ ] WS: implement corresponding events: room:update/user:update (or user:nickname, user:avatar, user:color, room:avatar and user:color)
    - [ ] JS: on previous events update IHM: room tab/header, onetoone tab/header
- Bug fixes
  - [ ] What's happen when a message is posted by someone (on a room) and my client is in sleep (eg. : tablet) ?
  - [ ] On room closing view / model already exist and we can not join the room again, also a problem with "home" focusing occurs
  - [x] Colorize vs. drawer

**Room ops**
- [ ] Sort room users list also on ownership/op status
- [ ] Add a 'room ops' list with 'remove user from op list' button
- [ ] Factorize socket room op/owner detection in helper and update room:op/deop events
- [ ] Kick a user

**Theme**
- [ ] Implement the new design
  - [x] Favicon
  - [ ] Scrollbars
  - [ ] Pictos SVG
  - Landing page
    - [x] Responsive
    - [x] Hovers
    - [ ] Fluid login background
    - [ ] Rouleaux
  - Chat interface
    - [x] Factorize custom 'main' and 'contrast' colors in views (http://stackoverflow.com/questions/1855884/determine-font-color-based-on-background-color - http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color)
    - [x] Integration discussion window
    - [x] Review all pictures size and update form/cloudinary transformations (room : avatar, background, user: avatar)
    - [x] Avatar now send only partial uri (v465645656/sq4654dz54q1d11qsd.jpg) and interface handle URL rendering with $.cloudinary
    - [ ] Responsivness
    - [ ] Fix left and right column and center is flexible
    - [ ] Fix line break in messages and description/bio by adding a nl2br method
    - [ ] Add room owner/ops list on room profile
    - [ ] Integration room list on user profile
    - [ ] Translate texts
  - Contents
    - [ ] FAQ
    - [ ] Contact (from HP and chat interface)
    - [ ] CGU (from HP and chat interface)
    - [ ] Emails : https://github.com/dbrugne/chat/issues/6
    - [ ] Welcome messages
  - [ ] Room page
  - [ ] User page

**Account**
- [ ] Implement clean user form in IHM
- [x] Implement clean room form in IHM
- [ ] Repair forgotten password integration in new HP

**Hosting**
- [ ] Add test instance on the same server (donut.me subdomain and new IP from OVH)
**Branding**
- [ ] Changer le proriétaire du domaine : MARTINE BLAJMAN
- [ ] Créer une email contact@
- [ ] Créer une email martine@

## Release 3

**Discussion history**
- Room/onetoone history step 2
  - [ ] Store discussion message in localstorage
  - [ ] Limit localstorage to n last event [/room]
  - [ ] Message history on arrow up/down based on localstorage
  - [ ] Add [Skype link|autoloader] to load more history on scroll top
  - [ ] No history retrieving in open/join, display only (already in DOM or localstorage) history
  - [ ] Add a cleanup method that empty .messages periodically to avoid memory leak

**Chat**
- [ ] Room ops drawer for owner
- [ ] Change the to server->client messages : room:join/leave and user:open/close (for something like ?)
- [ ] Correct room:in for user that "reconnect"
- [ ] Replace room:out by user:disconnect on socket disconnection
- [ ] Add a check on connection to verify is user have "username"
- [ ] Bug : room user list scroll is not active when entering in room (but work once the first redraw)
- [ ] WS: implement REDIS cache for user and room and read in REDIS cache only "even" for socket.getUsername-like function to have always last data
- [ ] WS: implement async pattern in all WS methods
- [ ] Bugfix: on room auto-deletion reactivation. Should handle in 'connection.populateRoom' the room recreation. Otherwise a room automatically removed cannot be re-join automatically by client cause room populate try to find room in DB before sending it to client in welcome

**Content**
- [ ] Emails: forgot, password changed, signup
- [ ] Homepage
- [ ] Formulaire : libellés des champs, messages d'aide, messages de confirmation

**Cleaning**
- [ ] Move email configuration in conf files
- [ ] Test it on IE8-11/FF/tablet

**Help**
- [ ] Help infobox on chat interface + help button
- [ ] Help block with capture to explain the Facebook signup procedure (find best practices on internet)
- [ ] First entrance 'tutorial' (5 slides) + button to replay

**Features**
- [ ] Add bookmark a room star in header with favorites rooms in home and account and profile

**Room/user design**
- [ ] Add "your rooms" on homepage
- [ ] Add "room owned/oped/joined" on user profile

**Tooling**
- [ ] Backup
- [ ] Monitoring
- [ ] Minimum virtual traffic generation
- [ ] Basic grunt sample data injection (connect, disconnect, join/leave, create, message, ...)

## Release 4

**Chat**
- [ ] Implement async series/waterfall in socket code
- [ ] Room kick
- [ ] Auto-mention user in room message ($.fn.mentionize())

**Performance/security/maintenability**
- [ ] Compress JS: https://github.com/JakeWharton/uglify-js-middleware
- [ ] Strongify password constrains (signup, login and forgot, very long or complex)
- [ ] Remove HOGAN and re-add EJS
- [ ] Find email factorisation/rendering solution

**Social**
- [ ] Invite users in room
- [ ] Invite users in room (Facebook)
- [ ] Invite users in room (email)
- [ ] Invite your friend on donut (Facebook)

**Features**
- [ ] Add option to no join #General on connection
- [ ] Implement "remember me" mechanisme on login form

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
- [ ] (mobile) Port a mobile version with Steroids.js
- [ ] Identify and track devices for each socket/activity

Ideas:
- [ ] Room widget to paste on a website to incentive website visitor to join the room
- [ ] Loyalty, advanced offline notification system (email, sms, frequency (instant, daily, weekly), filter (all activity, mentions, one to one, room where i am) with direct link to room/one to one allow fast anwser (even on mobile)
- [ ] Public mod for a room (all the content is visible by anyone)
- [ ] Pin a message
- [ ] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)

## Project

- [ ] Run OPQAST security checklist
- [ ] Mocha/Chai + casperjs tests
