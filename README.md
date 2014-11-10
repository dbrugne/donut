chat
====

## v1.0 : opening platform to real people

**Input box**
- [ ] Contenteditable
- [ ] Placeholder
- [ ] Post on Enter, line return with shift+enter
- [x] Avoid bold, italic, other formatting
- [x] Filter pasted content to remove HTML
- [ ] on cleanup we should deal with escaped HTML &chars; bug that are unescaped after $().text()
- [ ] Image in discussion (drag&drop, button, copy&paste)
- [ ] Store and load previous message with arrow up/down (localstorage)
- [ ] Smileys popin
- [ ] Images drag&drop in input box + direct upload to cloudinary and hyperlink addition in message
- [ ] User mentions (with @ and auto-dropdown) + highlight in .events
- [ ] Link detection and highlight
- [ ] Filter output before sending: 512 car. max, without HTML, no specials expect image/smiley

- [x] Add @ before every username

Admin
- [ ] Add event to make IHM reload
- [ ] Add event in all discussions to inform users of deployment

- [ ] Add a cleanup method that empty .messages periodically to avoid memory leak

- Notification
- [ ] Add notification to owner/op when a user enter in room
- [ ] Add email to notify us of user connection
  -> Draft notifications: DONE https://irc.box.com/s/wk9iq6wihj8vsnqc7tpj

- History on connection/join
  - Store delivered user list on each onetoone/room:message (+delivered)
  - Take this on consideration when loading history on connection/join to select event to transmit

- [ ] Badge for websites

- Justiniscooking => Justine

[- [ ] Private room](??)

- Try to store instant status on user by connection/deconnection/restart persistence
- [ ] Stocker si un message est délivré (établir la liste des utilisateurs en ligne ou pas), trouver un moyen d'afficher les messages non lus par un utilisateur dans l'historique
 -> setInterval qui détecte le focus (window/discussion), les messages vus dans une discussion focus + de 2 secondes sont marqués comme lus côté serveur
  - [ ] Aggregate by day (!!!)
  - [ ] Sanitize event on history recording (avatar, color) and re-add on hydration to avoid bad avatar in history

## Big Ideas

- Mode public/logué
  => création de room on the fly / sans compte
- Donut wall (with APIs bridges)
- Room avec contenu "public"

## v1.1 : minimal features against competitors

- [ ] Multi-node support
- [ ] Onetoone message delivering (even for offline users)
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
- [ ] WS: implement REDIS cache for user and room and read in REDIS cache only "even" for socket.getUsername-like function to have always last data
- [ ] Bugfix: on room auto-deletion reactivation. Should handle in 'connection.populateRoom' the room recreation. Otherwise a room automatically removed cannot be re-join automatically by client cause room populate try to find room in DB before sending it to client in welcome
- [ ] Activity logic and tracking : online, afk, offline (used on user profile, one to one, room users, ...)
- Small and helpfull features:
  - [ ] Ability to switch .events display as compact (hide usernames, preserve date on right)
  - [ ] Ability to disabled auto-post on Enter (in this case enter will add break line in input box)
  - [ ] Commands handling: "/j|join room" "/l|leave room" "/msg user" "/info room|user" "/kick room user", "/whois user", "/quit", "/ping"
  - [ ] Hide notification (display only a colored line with number of notifications in bubble, on click show notifications)
  - [ ] Color this user messages by simply clicking on a user (stored in browser memory only)
  - [ ] /me commande to describe current action
  - [ ] Add an option to avoid exit popin on chat interface
  - [ ] Improve backlog experience when refocus a room with lot of unread messages (button to jump on last viewed message and display highligth on unread messages)


- [ ] Backup
- [ ] Monitoring



## Grunt tasks
- Deploy
  - git pull
  - compile JS
  - set chat.html require.js source
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms