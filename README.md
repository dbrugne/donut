donut
====

- Wiki installation projet

## Pomelog migration
* Repair auto-reconnect
* Authentication, check that it's impossible to open a websocket if i'm not logged
* Management of data in req/res, auto remove empty/null/undefined key in Object
* Secure backend
* Remove exit popin on frontend if connection is not established
* Only display user with avatar/or Facebook/or online and room with avatar on homepage (but not for search)
* Restore a var logger = require('../app/models/log'); and change console.log for pomelo logger
* Mute mode per room

History
[ ] Remove need of color for default avatar
[ ] Store history without name/time/username/avatar/color in data and re-apply on retrieving

Admin
[ ] Add "admin" tag on user (allow them to view all history and op all rooms and send "reload" messages)
[ ] Add event in all discussions to inform users of deployment
[ ] Add whole platform maintenance mode

## To validate after pomelo

[ ] Improve "unread" messages viewing detection, consider in each discussion if i'm scroll bottom for two seconds (and window focused and discussion focused) mark messages as read
[ ] Add "is typing" notification
Add online/offline/afk management
[ ] On connection/deconnection[/stop/restart] set user in Redis (donut:onlines:user:_USER_ID_) as a HASH with sockets list (donut:onlines:sockets:_USER_ID_)
[ ] Handle process termination (SIGINT, SIGTERM, Uncaugth exception): http://stackoverflow.com/questions/26163800/node-js-pm2-on-exit

## Notifications
[ ] A user post me a message in one to one and i'm offline (immediate, email)
[ ] A user join my room (immediate, email , deactivable)
[ ] A user mention me (immediate, email, deactivable globally)
[ ] Global option to avoid all emails from donut

## Grunt tasks
- Deploy
  - create new folder, git clone
  - npm install: game-server, shared, web-server
  - bower install
  - compile JS
  - set chat.html require.js source
  - stop application + start application (!!)
  - send reload event to connected users (!!)
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms