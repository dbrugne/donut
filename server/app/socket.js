var User    = require('./models/user');
var Room    = require('./models/room');
var express = require("express");
var passportSocketIo = require("passport.socketio");

module.exports = function(app, io, passport, sessionStore) {

    io.set('transports', [
        'websocket'
        , 'flashsocket'
    ]);

    io.set('log level', 3);

    // https://www.npmjs.org/package/passport.socketio
    io.set('authorization', passportSocketIo.authorize({
        cookieParser: express.cookieParser,
        key:         'express.sid',       // the name of the cookie where express/connect stores its session_id
        secret:      'q4qsd65df45s4d5f45ds5fsf4s',    // the session_secret to parse the cookie
        passport:    passport,
        store:       sessionStore,
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

        User.findById(socket.handshake.user._id, function(err, user) {
            if (err) {
                console.log('io.sockets.on.connection: '+err);
                user.rooms = [];
            }

            socket.emit('welcome', {
                username: socket.handshake.user.username,
                avatar: socket.handshake.user.avatar,
                rooms: user.rooms
            });
        });
        socket.on('room:join', function (data) {
            // @todo
            // escape room identifier
            // test room identifier validity
            // test ACL
            // broadcast other devices
            // broadcast user room
            // send room details
            // persist

            if (data.room == undefined || data.room == '') {
                // @todo : implement error callback
                return;
            }

            // @todo : test if room exist effectively (and why not creating rooms on the fly ?

            Room.findOne({'name': data.room}, 'name topic users', function(err, room) {
                if (err) {
                    console.log('Room.findOne: '+err);
                    return;
                }

                if (room) {
                    console.log('room:welcome' + room.name);
                    socket.emit('room:welcome', {
                        name: room.name,
                        topic: room.topic,
                        users: room.users
                    });
                }

                socket.join(data.room);

                io.sockets.in(data.room).emit('room:in', {
                    room: data.room,
                    username: socket.handshake.user.username,
                    avatar: socket.handshake.user.avatar
                });
            });
        });
        socket.on('room:leave', function (data) {
            // @todo
            // escape room identifier
            // test room identifier validity
            // broadcast other devices
            // broadcast user room
            // persist
            console.log(data);
            socket.leave(data.room);
            io.sockets.in(data.room).emit('room:out', {
                room: data.room,
                username: socket.handshake.user.username
            });
            // @todo : persist
        });
        socket.on('room:topic', function (data) {
            // @todo
            // escape
            // test validity (ASCII)
            // test ACL
            // broadcast
            // persist in database

            console.log(data);
        });
        socket.on('room:message', function (data) {
            // @todo
            // escape
            // test message validity (not empty, ASCII)
            // test that user is in this room
            // broadcast message
            // persist in database

            console.log(data);

            io.sockets.in(data.room).emit('room:message', {
                room: data.room,
                time: Date.now(),
                message: data.message,
                username: socket.handshake.user.username,
                avatar: socket.handshake.user.avatar
            });
        });
        socket.on('room:create', function (data) {
            // @todo : import ratchet logic
            console.log(data);
        });
        socket.on('room:search', function (data) {
            var search = {};
            if (data.search) {
                search = {name: new RegExp(data.search, "i")};
            }
            Room.find(search, 'name topic users', function(err, rooms) {
                if (err) {
                    console.log('room:searcherror: '+err);
                    socket.emit('room:searcherror');
                    return;
                }

                var results = [];
                for(var i=0; i<rooms.length; i++) {
                    results.push({
                        name: rooms[i].name,
                        topic: rooms[i].topic,
                        count: io.sockets.clients(rooms[i].name).length
                    });
                }
                console.log(['room:search', results]);
                socket.emit('room:searchsuccess', {
                    rooms: results
                });
            });
        });

    });

    // @todo : global escape input
    // @todo : specific validation and sanitization for room name / user name

};