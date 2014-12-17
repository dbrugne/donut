donut
====

- Wiki installation projet

## Pomelog migration
* Repair auto-reconnect
* Authentication, check that it's impossible to open a websocket if i'm not logged
* Only display user with avatar/or Facebook/or online and room with avatar on homepage (but not for search)
* Restore a var logger = require('../app/models/log'); and change console.log for pomelo logger
* Mute mode
* On "first" history load in room scrollDown
* [Finish kick form]
* [Add ban]
* [Add images]
* Redirect to room after signup/signin => FB campaign glander au boulot
* New donut header with logo, home, support, search
* Diagnose why cloudinary widget url/cam crash on Chrome only
* Grunt data migration for next release (history)

Deploy
[ ] Add "admin" tag on user (allow them to view all history and op all rooms and send "reload" messages)
[ ] Add event in all discussions to inform users of deployment
[ ] Add whole platform maintenance mode
[ ] Implement grunt deploy

## Backend
* Add user and room detail
* Add pomelo connection
* Refresh on home

## To validate after pomelo

[ ] Add "is typing" notification
[ ] Add online/offline/afk indication
[ ] Handle process termination (SIGINT, SIGTERM, Uncaugth exception): http://stackoverflow.com/questions/26163800/node-js-pm2-on-exit

## Read/unread
[ ] Events are stored as unread
[ ] Implement a new handler: markAsRead (name+last read event id) that e.unread($addToSet:user._id) on messages without user._id in e.unread AND e._id >= 'until' SORTED BY _ID DESC
[ ] Detect on a frontend, for each discussion, if focused and scolled to bottom for at least 2s, send markAsRead with last message ID

## Notifications
[ ] A user post me a message in one to one and i'm offline (immediate, email, 24h before next)
[ ] A user join my room (immediate, email , deactivable)
[ ] A user mention me (immediate, email, deactivable globally, , 30mn before next)
[ ] Global option to avoid all emails from donut

## Public mode
[ ] Each room content is by default visible by everyone
[ ] Anonymous user can access the interface (login/signup link + donut log in top bar) and view "one room per page"
[ ] Anonymous can just view everything but not post
[ ] [Remove some interface element for anonymous]
[ ] Authenticated is the same

## Possible methods
sendToUid
* Send to Uid globalChannel
sendToRoom
* Send to room globalChannel (with option to put in history or not)
sendToAll
* Send to every connected user
informAllUserThatCanViewThisOne

## Grunt tasks
- Deploy
  - create new folder, git clone
  - npm install: game-server, shared, web-server
  - bower install
  - compile JS
  - set chat.html require.js source
  - switch configuration file
  - stop application + start application (!!)
  - send reload event to connected users (!!)
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms