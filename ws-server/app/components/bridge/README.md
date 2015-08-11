# PomeloBridge

**Example:**

```
var Bridge = require('./ws-server/app/components/bridge').Bridge;
var bridge = Bridge({
  masterId  : serverId,
  host      : host,
  port      : port,
  username  : username,
  password  : password
});

// first parameter could be: 'master', 'connector', 'chat'
bridge.notify('chat', 'ping', {
  message: 'hello'
}, function(err) {
  // error handling
});

bridge.request('chat', 'ping', {
  message: 'hello'
}, function(err, response) {
  // error handling
  // response handling
});

```

