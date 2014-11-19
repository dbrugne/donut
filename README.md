donut
====

Remove fqdn.js node01.donut.me hot hack

History
[ ] Take "received" list on consideration when loading history on connection/join to select only this events to transmit
[ ] Remove need of color for default avatar
[ ] Store history without name/time/username/avatar/color in data and re-apply on retrieving

Admin
[ ] Add "admin" tag on user (allow them to view all history and op all rooms and send "reload" messages)
[ ] Add event to make IHM reload
[ ] Add event in all discussions to inform users of deployment
[ ] Add whole platform maintenance mode

[ ] Diagnose client side slow perfomance : http://stackoverflow.com/questions/19502333/how-to-identify-a-memory-leak-with-backbone-js

[ ] Add test instance

[ ] Add automatic deploy system (+compilation, chat.html)

## To validate after pomelo

Add online/offline/afk management
[ ] On connection/deconnection[/stop/restart] set user in Redis (donut:onlines:user:_USER_ID_) as a HASH with sockets list (donut:onlines:sockets:_USER_ID_)
[ ] Handle process termination (SIGINT, SIGTERM, Uncaugth exception): http://stackoverflow.com/questions/26163800/node-js-pm2-on-exit

Improve "unread" messages viewing detection
 -> setInterval qui détecte le focus (window/discussion), les messages vus dans une discussion focus + de 2 secondes sont marqués comme lus côté serveur

## Grunt tasks
- Deploy
  - git pull
  - compile JS
  - set chat.html require.js source
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms