chat
====

## v1.0 : opening platform to real people

**Customization**
- [x] Set color to random color on user creation
- [x] Set room default color as pink
- [ ] Deal with default user avatar and poster
- [ ] Set room default avatar and poster with the same as user
- [ ] Default room/user avatar and poster not well set on named transformation
- [ ] Add user-xlarge size for user profile
- [ ] Handle Facebook image storage/retrieving
- [x] Add hyperlink on room name and user username on room/user profile pages

**Theme**
- [ ] Add the external page URL link in drawer profile pages (user and room)
- [ ] Add an edit link in room profile drawer (if owner)
- [ ] Add new socket.io-redis
- [ ] Implement user count on room profile
- [ ] Implement user online status on user profile
- [ ] Implement current user list on room profile
- [ ] If current user is logged put chat URL on join/discusso button elseif landing URL
- [ ] Implement open graph and SEO description and canonical url in room/user profile meta
- [ ] Implement open graph and SEO description and canonical url on landing
- [ ] Implement clean account form for email, password and Facebook in chat
- [ ] Add signup with Facebook button on landing page
- [ ] Handle landing display when i'm logged (replace login form)
- [ ] Fluid landing background on small resolutions (display donut background w/ opacity)

**Pictos SVG**
- Landing
  - [ ] F Facebook
  - [ ] -> Inputs
  - [ ] ? password
  - [ ] Mail input email
  - [ ] Lock input password
  - [ ] Replicate on signup/login/forgot/choose-username
- Chat
  - [ ] Logout
  - [ ] Search
  - [ ] Profile pen
  - [ ] Account
  - [ ] Edit button (edit room profile, edit profile)

**Room ops**
- [ ] Add kick reason form

**Search**
- [ ] Quick search in left column (with 'light' param to get only username/name + avatar) and link for 'more results' that focus and fill the homepage search

**Contents**
- [ ] Translate texts
- [ ] FAQ (link in HP and chat interface)
- [ ] Contact (link in HP and chat interface)
- [ ] CGU (link in HP and chat interface)
- [ ] Emails : https://github.com/dbrugne/chat/issues/6
- [ ] Welcome messages

## Release 3

**Hosting**
- [ ] Add test instance on the same server (donut.me subdomain and new IP from OVH)

**Branding**
- [ ] Créer une email contact@
- [ ] Créer une email martine@

**Other**
- [ ] @todo review

**Social**
- [ ] Invite users in room (donut)
- [ ] Invite users in room (Facebook)
- [ ] Invite users in room (email)
- [ ] Invite your friend on donut (Facebook)

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
- [ ] Add ban
- [ ] Add a 'room ops' drawer with 'remove user from op list' button (only for owner)
- [ ] Add a 'room bans' drawer with 'remove user from ban list' button (for op)
- [ ] Change the to server->client messages : room:join/leave and user:open/close (for something like ?)
- [x] Correct room:in for user that "reconnect"
- [ ] Add a check on ws connection to verify is user have "username"
- [ ] Bug : room user list scroll is not active when entering in room (but work once the first redraw)
- [ ] WS: implement REDIS cache for user and room and read in REDIS cache only "even" for socket.getUsername-like function to have always last data
- [ ] WS: implement async pattern in all WS methods
- [ ] Bugfix: on room auto-deletion reactivation. Should handle in 'connection.populateRoom' the room recreation. Otherwise a room automatically removed cannot be re-join automatically by client cause room populate try to find room in DB before sending it to client in welcome
- [ ] Scrollbars adding (left column, home content, user and room edit drawer) and improvments (room messages and users)
- [ ] Activity logic and tracking : online, afk, offline (used on user profile, one to one, room users, ...)
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

**Content**
- [ ] Formulaire; faire le tour des libellés des champs, messages d'aide, messages de confirmation
- [ ] Animated 'rollers' for alternative texts on landing

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
