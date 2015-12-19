donut
====

DONUT is a node.js/backbonejs based chatroom platform. Usage is inspired of IRC on a side and modern social platform on other hand.

## Pre-requisites
**Server**
* node.js (4.x) and npm (3.x)
* MongoDB (3.x)
* Redis
* nginx

**Global NPM packages** *(generally installed as root)*
* grunt-cli
* pm2

**DNS**
For development:
```
127.0.0.1	donut.local
```

Root FQDN should be configured in **shared/config/config.{NODE_ENV}.js**

Be sure you have an auto-signed SSL for **donut.local** (https://gist.github.com/jessedearing/2351836) that is fully accepted by your
browser (on MacOSX: http://www.robpeck.com/2010/10/google-chrome-mac-os-x-and-self-signed-ssl-certificates/#.VRBtepOG869).

Configure nginx accordingly:

```
http {
  upstream io_nodes {
    ip_hash;
    server donut.local:3050;
    server donut.local:3051;
  }
  server {
      listen       80;
      server_name  donut.local;
      rewrite ^(.*) https://donut.local$request_uri permanent;
  }
  server {
    listen 443;
    server_name donut.local;
    
    error_page 403 /error/403.html;
    error_page 404 /error/404.html;
    error_page 500 501 502 503 504 /error/50x.html;
    location /error/ {
      root  /www/donut/server;
    }
    location /socket.io/ {
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $host;
      proxy_http_version 1.1;
      proxy_pass http://io_nodes;
    }
    location / {
      proxy_pass http://donut.local:3000;
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
}
```

### Local running

First deployment:

```
grunt donut-pull-database
grunt pm2 --deployEnvironment development
pm2 delete all && pm2 startOrReload ecosystem.json
```

Restarting:

```
pm2 reload all
```

### Hosted running (test, production)

First deployment (be sure remote SSH user has you SSH public key):

```
pm2 deploy deploy.conf <env> setup
pm2 deploy deploy.conf <env> update 
```

Next deployments:
```
pm2 deploy deploy.conf <env> update 
```