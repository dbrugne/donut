donut
====

## In progress

- Historique => charger plus
- Sound on new message: if windows is not focus, or concerned discussion, different sound when i'm notified

- [ ] Room mentions
- [ ] Image in discussion (drag&drop, button, copy&paste)

Admin
- [ ] Add "admin" tag on user (allow them to view all history and op all rooms and send "reload" messages)
- [ ] Add event to make IHM reload
- [ ] Add event in all discussions to inform users of deployment

- Notification
- [ ] Add notification to owner/op when a user enter in room
- [ ] Add email to notify us of user connection
  -> Draft notifications: DONE https://irc.box.com/s/wk9iq6wihj8vsnqc7tpj

- History on connection/join
  - Store delivered user list on each onetoone/room:message (+delivered)
  - Take this on consideration when loading history on connection/join to select event to transmit

- Report poster cloudinary helper configuration in ws class
- Remove need of color for default avatar
- Store history without username/avatar/color and re-apply on retrieving

- Try to store instant status on user by connection/deconnection/restart persistence
- [ ] Stocker si un message est délivré (établir la liste des utilisateurs en ligne ou pas), trouver un moyen d'afficher les messages non lus par un utilisateur dans l'historique
 -> setInterval qui détecte le focus (window/discussion), les messages vus dans une discussion focus + de 2 secondes sont marqués comme lus côté serveur
  - [ ] Aggregate by day (!!!)
  - [ ] Sanitize event on history recording (avatar, color) and re-add on hydration to avoid bad avatar in history

- Add test instance

## Grunt tasks
- Deploy
  - git pull
  - compile JS
  - set chat.html require.js source
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms