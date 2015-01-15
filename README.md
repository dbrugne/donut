donut
====

# Next release
- New pomelo platform
- Backend
- New avatar/poster uploader with cropping
- New donut left/top bar disposition
- Mute button
- Bug fixed
- New Relic, Grunt

## Pomelog migration
* Restore broadcast to user sockets on user logout
* Refresh button on backend home
* Grunt history migration for next release
* Redirect to room after signup/signin => FB campaign glander au boulot
* Git merge

## After pomelo
* Profile page design: same as chat, with donut description on left, user list on right, profile content on center
* Add pomelo connection on backend
* Add log tail -f on backend
* [Finish kick form]
* [Add ban]
* Popin smiley
* Add "is typing" notification
* Add online/offline/afk indication
* Handle process termination (SIGINT, SIGTERM, Uncaugth exception): http://stackoverflow.com/questions/26163800/node-js-pm2-on-exit
* Diagnose why cloudinary widget url/cam crash on Chrome only
* Search in top bar
* Wiki installation projet
* Auto-tag/remove un/posted images
* Only display user with avatar/or Facebook/or online and room with avatar on homepage (but not for search)
* HTTPS
* Disable user account

## Read/unread
* Events are stored as unread
* Implement a new handler: markAsRead (name+last read event id) that e.unread($addToSet:user._id) on messages without user._id in e.unread AND e._id >= 'until' SORTED BY _ID DESC
* Detect on a frontend, for each discussion, if focused and scolled to bottom for at least 2s, send markAsRead with last message ID

## Notifications
* A user post me a message in one to one and i'm offline (immediate, email, 24h before next)
* A user join my room (immediate, email , deactivable)
* A user mention me (immediate, email, deactivable globally, , 30mn before next)
* Global option to avoid all emails from donut

## Deploy
* Add event in all discussions to inform users of deployment
* Add whole platform maintenance mode
* Implement grunt deploy

## Public mode
* Each room content is by default visible by everyone
* Anonymous user can access the interface (login/signup link + donut log in top bar) and view "one room per page"
* Anonymous can just view everything but not post
* [Remove some interface element for anonymous]
* Authenticated is the same

## Grunt tasks
- Deploy
  - create new folder, git clone
  - npm install: game-server, shared, web-server
  - bower install
  - compile JS
  - stop application + start application (!!)
  - send reload event to connected users (!!)
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms