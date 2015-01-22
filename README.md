donut
====

## Pomelog migration
* Push on test, reimport database and migrate data, email to David (migration, redirect, facebook)

## After pomelo
* Profile page design: same as chat, with donut description on left, user list on right, profile content on center
* Add pomelo connection on backend + log tail -f on backend
* [Finish kick form]
* [Add ban]
* Diagnose why cloudinary widget url/cam crash on Chrome only
* Auto-tag/remove un/posted images

## Notifications
* A user post me a message in one to one and i'm offline (immediate, email, 24h before next)
* A user join my room (immediate, email , deactivable)
* A user mention me (immediate, email, deactivable globally, , 30mn before next)
* Global option to avoid all emails from donut

## Read/unread
* Events are stored as unread
* Implement a new handler: markAsRead (name+last read event id) that e.unread($addToSet:user._id) on messages without user._id in e.unread AND e._id >= 'until' SORTED BY _ID DESC
* Detect on a frontend, for each discussion, if focused and scolled to bottom for at least 2s, send markAsRead with last message ID

## Grunt tasks (tbi later)
- Deploy
  - create new folder, git clone
  - npm install: game-server, /, web-server
  - bower install
  - handle shared dirs : game-server/logs
  - compile
  - stop application
  - update ln
  - start application
  - send reload event to connected users
- Cleanup cloudinary pictures with "discussion" and "notposted" tag
- Inject sample data (for new deployment on dev): #donut, #support, fake users and rooms