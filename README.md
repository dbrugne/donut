chat
====

***"Une plateforme de discussion temps réel autour de thématique. Pour ce faire la plateforme permet la création de "room" dans laquelle les utilisateurs pourront échanger autour d'un sujet, d'une communauté ou de tout et rien"***

## Release 2

**Chat**
- Search engine
  - [x] Search on home
  - [ ] Quick search in left column (with 'light' param to get only username/name + avatar) and link for 'more results' that focus and fill the homepage search
- [x] Sort room users list on ownership/op status
- Update chat interface on room/user details when room/user is edited
  - [x] WS: implement corresponding events: room:update/user:update (or user:nickname, user:avatar, user:color, room:avatar and user:color)
  - [x] JS: on previous events update IHM: room tab/header, onetoone tab/header
- Bug fixes
  - [x] Colorize vs. drawer
  - [ ] What's happen when a message is posted by someone (on a room) and my client is in sleep (eg. : tablet) ?

**Room ops**
- [ ] Factorize socket room op/owner detection in helper and update room:op/deop/topic/update events
- [ ] Add a 'room ops' drawer with 'remove user from op list' button (only for owner)
- [ ] Kick a user

**Theme**
- Implement the new design
  - [ ] Favicon
  - [ ] Pictos SVG
  - Landing page
    - [x] Responsive
    - [x] Hovers
    - [ ] Fluid login background (on small resolutions display donut background w/ opacity)
    - [ ] Animated 'rollers' for alternative texts
  - Chat interface
    - [x] Factorize custom 'main' and 'contrast' colors in views (http://stackoverflow.com/questions/1855884/determine-font-color-based-on-background-color - http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color)
    - [x] Integration discussion window
    - [x] Review all pictures size and update form/cloudinary transformations (room : avatar, background, user: avatar)
    - [x] Avatar now send only partial uri (v465645656/sq4654dz54q1d11qsd.jpg) and interface handle URL rendering with $.cloudinary
    - [x] Responsivness
    - [x] Fix left and right column and center is flexible
    - [ ] Fix line break in messages and description/bio by adding a nl2br method
    - [ ] One to one
    - [ ] Add room owner/ops list on room profile
    - [ ] Add owned/opsed room list on user profile
    - [ ] Add room where the user is in on user profile
    - [ ] Replace actual color panel with PAM colors
    - [ ] FAQ / contact / CGU / help in left column (_blank)
  - [ ] Room page
  - [ ] User page

**Account**
- [x] Implement clean room form in IHM
- [x] Implement clean user profile form in IHM
- [ ] Implement clean account form (email, password, Facebook) in IHM
- [x] Repair forgotten password integration in new HP
- [x] Re-add login/signup page with design
- [x] Set User.general to true on user creation
- [ ] Set color to random color on user creation
- [ ] Handle Facebook image storage/retrieving
- [ ] Allow dot in username (aaron.aronson)

**Hosting**
- [ ] Add test instance on the same server (donut.me subdomain and new IP from OVH)
**Branding**
- [ ] Changer le proriétaire du domaine : MARTINE BLAJMAN
- [ ] Créer une email contact@
- [ ] Créer une email martine@

**Contents**
- [ ] Translate texts
- [ ] FAQ
- [ ] Contact (from HP and chat interface)
- [ ] CGU (from HP and chat interface)
- [ ] Emails : https://github.com/dbrugne/chat/issues/6
- [ ] Welcome messages

**Other**
- [ ] @todo review


## Release 3

**History**
- [ ] Store discussion message in localstorage
- [ ] Limit localstorage to n last event [/room]
- [ ] Message history on arrow up/down based on localstorage
- [ ] Add [Skype link|autoloader] to load more history on scroll top
- [ ] No history retrieving in open/join, display only (already in DOM or localstorage) history
- [ ] Add a cleanup method that empty .messages periodically to avoid memory leak

**Search**
- [ ] Add pagination with limit of results
- Avoid noise queries
  - [ ] Set a setInterval and clearInterval tracker on 150ms
  - [ ] Test also that previous request has return (more than) one result if i just added a letter on the right of my request

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
- [ ] Scrollbars adding (home content, user and room edit drawer) and improvments (room messages and users)
- [ ] Smileys popin

**Content**
- [ ] Formulaire; faire le tour des libellés des champs, messages d'aide, messages de confirmation

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
- [ ] Add a bouncer feature when an unlogged user click on #!... URL (to room/user profile)

**Tooling**
- [ ] Backup
- [ ] Monitoring
- [ ] Minimum virtual traffic generation
- [ ] Basic grunt sample data injection (users and rooms) with production and dev fixture sets

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
- [ ] Find email factorisation/rendering solution

**Social**
- [ ] Invite users in room (donut)
- [ ] Invite users in room (Facebook)
- [ ] Invite users in room (email)
- [ ] Invite your friend on donut (Facebook)

**Features**
- [x] Add option to no join #General on connection
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
- [ ] Hyperlink analyse and open graph extraction with hover popin in rooms and discussions (specific template for YouTube content)
- [ ] Images drag&drop in input box + direct upload to cloudinary and hyperlink addition in message

## Project

- [ ] Run OPQAST security checklist
- [ ] Mocha/Chai + casperjs tests
