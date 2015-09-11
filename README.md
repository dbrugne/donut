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
* pm2 (hosted deployment only)

Be sure you have correct DNS address, e.g.:
```
127.0.0.1		donut.local
127.0.0.1		ws.donut.local
```
Root FQDN should be configured in **shared/config/config.{NODE_ENV}.js**
Check ws-server/config/servers.json config file for nodes an port list.

Be sure you have an auto-signed SSL locally (https://gist.github.com/jessedearing/2351836) that is fully accepted by your
browser (on MacOSX: http://www.robpeck.com/2010/10/google-chrome-mac-os-x-and-self-signed-ssl-certificates/#.VRBtepOG869).
Both for FQDN *donut.local* and *ws.donut.local*.

Configure nginx accordingly:

```
http {
  gzip on;
  gzip_disable "msie6";

  server {
      listen       80;
      server_name  donut.local;
      rewrite ^(.*) https://donut.local$request_uri permanent;
  }

  server {
    listen 443;
    server_name donut.local;
    location / {
      proxy_pass http://donut.local:3000;
    }
    error_page  403  /error/403.html;
    error_page  404  /error/404.html;
    error_page  500 501 502 503 504  /error/50x.html;
    location /error/ {
      root  /www/donut/server;
    }
    gzip on;
    gzip_min_length  1100;
    gzip_buffers  16 32k;
    gzip_types    text/plain application/x-javascript text/xml text/css;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_vary on;
    ssl                  on;
    ssl_certificate      /www/ssl/donut.local.crt; # ADJUST WITH YOUR OWN PATH
    ssl_certificate_key  /www/ssl/donut.local.key; # ADJUST WITH YOUR OWN PATH
    ssl_session_timeout  5m;
    ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers   on;
  }

  upstream io_nodes {
    ip_hash;
    server ws.donut.local:3050;
    server ws.donut.local:3051;
  }
  server {
      listen       80;
      server_name  ws.donut.local;
      rewrite ^(.*) https://ws.donut.local$request_uri permanent;
  }
  server {
    listen 443;
    server_name ws.donut.local;
    location / {
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $host;
      proxy_http_version 1.1;
      proxy_pass http://io_nodes;
    }
    gzip on;
    gzip_min_length  1100;
    gzip_buffers  16 32k;
    gzip_types    text/plain application/x-javascript text/xml text/css;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_vary on;
    ssl                  on;
    ssl_certificate      /www/ssl/ws.donut.local.crt; # ADJUST WITH YOUR OWN PATH
    ssl_certificate_key  /www/ssl/ws.donut.local.key; # ADJUST WITH YOUR OWN PATH
    ssl_session_timeout  5m;
    ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers   on;
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
$ bower install
$ grunt jst
$ grunt requirejs
```

To inject a fresh copy of the production database:
```
grunt grunt donut-pull-database
```

### Local running

Be sure that:
- shared/config/config.development.js is up to date
- DNS records and nginx are well configured and running
- NODE_ENV is 'development'

Run with:
```
node ws-server/app.js
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
  "cwd" : "/home/donut/app/ws-server",
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
