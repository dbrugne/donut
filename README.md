donut
====

- Wiki installation projet

## Pomelog migration
* Repair auto-reconnect
* Use only pomelo logger and see if it is possible to view it on backend in realtime
* Authentication, check that it's impossible to open a websocket if i'm not logged
* Management of data in req/res, auto remove empty/null/undefined key in Object
* Secure backend
* Remove exit popin on frontend if connection is not established
* Only display user with avatar/or Facebook/or online and room with avatar on homepage (but not for search)

History
[ ] Remove need of color for default avatar
[ ] Store history without name/time/username/avatar/color in data and re-apply on retrieving

Admin
[ ] Add "admin" tag on user (allow them to view all history and op all rooms and send "reload" messages)
[ ] Add event to make IHM reload
[ ] Add event in all discussions to inform users of deployment
[ ] Add whole platform maintenance mode

[ ] Add automatic deploy system (+compilation, chat.html)

## To validate after pomelo

[ ] Improve "unread" messages viewing detection, consider in each discussion if i'm scroll bottom for two seconds (and window focused and discussion focused) mark messages as read

Add online/offline/afk management
[ ] On connection/deconnection[/stop/restart] set user in Redis (donut:onlines:user:_USER_ID_) as a HASH with sockets list (donut:onlines:sockets:_USER_ID_)
[ ] Handle process termination (SIGINT, SIGTERM, Uncaugth exception): http://stackoverflow.com/questions/26163800/node-js-pm2-on-exit

## Grunt tasks
- Deploy
  - git pull
  - compile JS
  - set chat.html  require.js source
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms