donut
====

History on connection/join
[x] Store delivered user list on each onetoone/room:message (+delivered)
[ ] Report room recorder modifications to one to one
[ ] Store history without name/time/username/avatar/color in data and re-apply on retrieving
[ ] Take "received" list on consideration when loading history on connection/join to select only this events to transmit

- Notification
- https://irc.box.com/s/wk9iq6wihj8vsnqc7tpj

Improve "unread" messages experience
- In a centralized place detect if: window is focused or not, which discussion is focused, get current username
- Make new room/user:message trigger event on this object
- Change window title even if window is focused (display unread messages in other discussion)
- Update discussion tab badge if not focused room (and if i'm not the sender)
- Play a sound a message on new message in not focused discussion (or if window is not focused) (and if i'm not the sender)
- Play a different sound when i'm notified in not focused discussion (or if window is not focused) (and if i'm not the sender)
- http://stackoverflow.com/questions/9419263/playing-audio-with-javascript

- [ ] Image in discussion (drag&drop, button, copy&paste)
- [ ] Room mentions (on server side detect #word, search for correspondance and add mention on the fly)

Admin
- [ ] Add "admin" tag on user (allow them to view all history and op all rooms and send "reload" messages)
- [ ] Add event to make IHM reload
- [ ] Add event in all discussions to inform users of deployment

- Report poster cloudinary helper configuration in ws class
- Remove need of color for default avatar

- Add test instance

- Add automatic deploy system (+compilation, chat.html)

- Diagnose client side slow perfomance

Add online/offline/afk management
- On connection/deconnection[/stop/restart] set user in Redis (donut:onlines:user:_USER_ID_) as a HASH with sockets list (donut:onlines:sockets:_USER_ID_)
- Handle process termination (SIGINT, SIGTERM, Uncaugth exception): http://stackoverflow.com/questions/26163800/node-js-pm2-on-exit
- [ ] Stocker si un message est délivré (établir la liste des utilisateurs en ligne ou pas), trouver un moyen d'afficher les messages non lus par un utilisateur dans l'historique
 -> setInterval qui détecte le focus (window/discussion), les messages vus dans une discussion focus + de 2 secondes sont marqués comme lus côté serveur
  - [ ] Aggregate by day (!!!)

## Grunt tasks
- Deploy
  - git pull
  - compile JS
  - set chat.html require.js source
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms