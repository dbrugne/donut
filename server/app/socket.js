var User    = require('./models/user');
var Room    = require('./models/room');

var express = require("express");
var passportSocketIo = require("passport.socketio");

module.exports = function(app, io, passport, sessionStore) {

    io.set('transports', [
        'websocket'
        , 'flashsocket'
    ]);

    // https://www.npmjs.org/package/passport.socketio
    io.set('authorization', passportSocketIo.authorize({
        cookieParser: express.cookieParser,
        key:         'express.sid',       // the name of the cookie where express/connect stores its session_id
        secret:      'q4qsd65df45s4d5f45ds5fsf4s',    // the session_secret to parse the cookie
        passport:    passport,
        store:       sessionStore,        // we NEED to use a sessionstore. no memorystore please
        success:     onAuthorizeSuccess,  // *optional* callback on success - read more below
        fail:        onAuthorizeFail     // *optional* callback on fail/error - read more below
    }));
    function onAuthorizeSuccess(data, accept) {
        console.log('!!!!!!!!!! successful connection to socket.io');
        // The accept-callback still allows us to decide whether to
        // accept the connection or not.
        accept(null, true);
    }
    function onAuthorizeFail(data, message, error, accept) {
        if(error)
            throw new Error(message);
        console.log('!!!!!!!!!! failed connection to socket.io:', message);

        // We use this callback to log all of our failed connections.
        accept(null, false);
    }

    io.sockets.on('connection', function (socket) {

        socket.emit('welcome', {
            username: 'yangs',
            avatar: 'http://www.google.com/',
            rooms: ['#TF1', '#France2']
        });

        socket.on('other', function (data) {
            console.log(data);
        });
    });

};