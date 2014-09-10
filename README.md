chat
====

## v1.0 : opening platform to real people

**Tasks**
- [x] On profile pages put chat/page URL regarding if user is logged or not on join/discuss button
- [x] Handle Facebook image storage/retrieving on cloudinary
- [ ] Adjust join buttons
- [ ] Room/user profile cards in drawer
- [x] Fluid landing background on small resolutions (display donut background w/ opacity)
- [ ] Add kick reason form
- [ ] On room/user profile page, left colum is closed by default and opened by JS on background load (avoid repeated background display on load)
- [ ] Order donuts on home page (date or activity or ...)
- [ ] Add title in topic bubbles
- [ ] Remove A in op badge (test M)
- [ ] Review room/onetonone tabs to fix users badge on right (absolute) with room name above
- [ ] Add click on search block in left column focus home + focus input
- [ ] Create donut in left column => button + put on top
- [ ] Image uploader, display current avatar even if no avatar set
- [ ] Add permalink on user profile drawer
- [ ] Add a title on room user list: "XX utilisateurs dans ce donut"
- [ ] Create donut drawer: help message under field + size, main color name grey
- [ ] Add word-break on room name and user username in drawer
- [ ] room name and user username length constrains : 24
- [ ] Remove room permanent support, and add delete room feature
- [ ] Add avatar in left column en room
- [ ] Remove unread message count on left column badge
- [ ] Traduire online/offline dans l'entête one to one et ajouter le cercle de couleur
- [ ] Landing "déjà *connecté*" + passer les deux actions sur deux lignes différentes + "déconnexion" => « vous déconnecter »
- [ ] Send name/username constrains to David to have help translations
- [ ] Success message is displayed two time on page form layout/view
- [ ] Change page layout footer to have /! on "go back to homepage"
- [x] #General => #donut
- [ ] Landing tasty pictures cropped on iPad
- [ ] Home tiles: show description only on hover, justify, overflow hidden
- [ ] Reduce home name size
- [ ] Add a title on online on home : "Utilisateurs en ligne"
- [ ] Home search form : add submit on enter and on click on magnifier
- [ ] Home search results add title over users:  "Utilisateurs correspondant à votre recherche" + show username
- [ ] Remove home tile over on touch screen
- [ ] Show permanently the actions on room user list (not only on hover)
- [ ] Test and make it work on IE9 + Safari Windows
- [ ] Add a min-width on topic input field
- [x] In/out aligned to left in rooms
- [ ] Change alert = 25s + close button
- [ ] Add offline message when a user send a message to a user that is not longer connected
- [ ] Go down to .messages on discussion focus
- [ ] On onetoone default avatar (color problem) doesn't work in .messages
- [ ] On room profile default avatar of "owner" (color problem) doesn't work (and OP)
- [x] On room messages/notification, if i post a message, a notification is thrown, i repost a message my second message go on same line than previous message (add a test to detect that last message wasn't a notification)
- [ ] Room description/user bio justify and left align
- [ ] User profile drawer add edit your profile if it's mine
- [ ] User/room drawer add a scroll
- [ ] Add new socket.io-redis
  - [ ] Implement user count on room profile
  - [ ] Implement user online status on user profile
  - [ ] Implement current user list on room profile
**Contents**
- [x] Translate texts
- [ ] FAQ (link in HP and chat interface)
- [ ] Contact (link in HP and chat interface)
- [ ] CGU (link in HP and chat interface)
- [x] Emails : https://github.com/dbrugne/chat/issues/6
- [x] Welcome messages in welcome event (i18n)
- [ ] Implement open graph and SEO description and canonical url in room/user profile meta
- [ ] Implement open graph and SEO description and canonical url on landing

## Release 3

**Hosting**
- [ ] Add test instance on the same server (donut.me subdomain and new IP from OVH)

**Branding**
- [ ] Créer une email martine@
- [ ] Créer une email hello@
- [ ] Créer une email david@
- [ ] Créer une email damien@

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

**Account**
- [ ] Delete account (link on account drawer with target _blank) to /delete, confirmation page with text and field to type password + cancel button, reuse existing delete action + password check
- [ ] Change username
- [ ] Logout "cut" all user socket
- [x] Add confirmation email on email or password changing

**Chat**
- [ ] Add ban
- [ ] Add a 'room ops' drawer with 'remove user from op list' button (only for owner)
- [ ] Add a 'room bans' drawer with 'remove user from ban list' button (for op)
- [ ] Change the to server->client messages : room:join/leave and user:open/close (for something like ?)
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
- [x] Move email configuration in conf files
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

**Search**
- [ ] Quick search in left column (with 'light' param to get only username/name + avatar) and link for 'more results' that focus and fill the homepage search

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
- [x] Find email factorisation/rendering solution

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
