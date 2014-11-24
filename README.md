donut
====

Next deploy : db['history-one'].find({'received': {$exists: true}})

[ ] Reactivate update moment (could scope only visible events ?)
[ ] Cleanup should be smarter : only if discussion has more than X event (history+realtime)
[ ] Improve browser notifications: in an centralized place, detect window is focused or not, which discussion is focused, scroll position, current user ; change window title, discussion tab badge, sound ; for user/room:message and mention of myself ; never for my own message and messages that i can see (window and discussion focused with scroll to bottom and not message from me)
[ ] Configure test instance
[ ] Add a push on ShopPaintball homepage and footer
[ ] Last connected at (in user profile and one to one header)
[ ] Priorize online users in home user list

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
  - set chat.html  require.js source
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms