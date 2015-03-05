donut
====

DONUT is a node.js/backbonejs based chatroom platform. Usage is inspired of IRC on a side and modern social platform on other hand.

## Pre-requisites
**Server**
* node.js
* MongoDB
* Redis
* nginx

**Global NPM packages** *(generally installed as root)*
* bower
* grunt-cli
* pomelo
* pomelo-cli
* pm2 (hosted deployment only)

Be sure you have correct DNS address, e.g.:
```
127.0.0.1		donut.local
127.0.0.1		ws.donut.local
```
Root FQDN should be configured in **shared/config/config.{NODE_ENV}.js**
Check game-server/config/servers.json config file for nodes an port list.

Configure nginx accordingly:

```
http {
  server {
    listen       80;
    server_name  donut.local;
    location / {
      proxy_pass http://donut.local:3000;
    }
  }
  upstream io_nodes {
    ip_hash;
    server ws.donut.local:3050;
    server ws.donut.local:3051;
  }
  server {
    listen 80;
    server_name ws.donut.local;
    location / {
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $host;
      proxy_http_version 1.1;
      proxy_pass http://io_nodes;
    }
  }
}
```

## Installation

Clone and install dependencies (as donut):
```
$ sudo su - donut
$ mkdir /home/donut/app
$ cd /home/donut/app
$ git clone git@github.com:dbrugne/donut.git ./
$ npm install
$ cd game-server
$ npm install
$ cd ../web-server
$ npm install
$ bower install
$ grunt jst
$ grunt requirejs
```

### Local running

Be sure that:
- shared/config/config.development.js is up to date
- DNS records and nginx are well configured and running
- NODE_ENV is 'development'

Run with:
```
node game-server/app.js
node web-server/app.js
```

### Hosted running (production, test)
Run Donut app (as donut):
Source: https://github.com/unitech/pm2#a1
```
$ sudo su - donut
$ vi /home/donut/web.json
```
```json
{
  "name" : "web",
  "script" : "./app.js",
  "cwd" : "/home/donut/app/web-server",
  "exec_mode"  : "fork_mode",
    "env": {
        "NODE_ENV": "test",
        "DEBUG": "donut:*"
    }
}
```
```
$ vi /home/donut/ws.json
```
```json
{
  "name" : "ws",
  "script" : "./app.js",
  "cwd" : "/home/donut/app/game-server",
  "exec_mode"  : "fork_mode",
    "env": {
        "NODE_ENV": "test",
        "DEBUG": "donut:*",
        "RAW_MESSAGE": true
    }
}
```
```
$ pm2 start /home/donut/web.json
$ pm2 start /home/donut/ws.json
$ pm2 save
```
