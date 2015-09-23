#!/bin/bash

grunt admin-notify-message \
  && pm2 stop web \
  && pm2 stop ws \
  && git pull \
  && npm install \
  && bower install \
  && grunt build --uglify=true \
  && pm2 restart web \
  && pm2 restart ws \
  && sleep 10 \
  && grunt admin-notify-reload