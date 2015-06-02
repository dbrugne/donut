#!/bin/bash

pm2 stop web && pm2 stop ws && git pull && npm update && bower update && grunt jst && grunt requirejs && pm2 restart web && pm2 restart ws