var User    = require('./models/user');
var Room    = require('./models/room');
var express = require("express");
var passportSocketIo = require("passport.socketio");

module.exports = function(app, io, passport, sessionStore) {

    // brodcast : https://github.com/LearnBoost/socket.io/wiki/How-do-I-send-a-response-to-all-clients-except-sender%3F

    // big tasks
     // @todo: escaped and valid input with clean return to caller
     // @todo : make usage of room identifier and user identifier clear
     // @todo: test ACL for each operation
     // @todo: add "activity" entry for each action

    // @todo : global escape input
    // @todo : specific validation and sanitization for room name / user name

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

        // push online users to this socket
        io.sockets.clients().forEach(function(online) {
            if (online.handshake.user._id != socket.handshake.user._id) {
                socket.emit('user:online', {
                    id: online.handshake.user._id,
                    username: online.handshake.user.username,
                    avatar: online.handshake.user.avatar
                });
            }
        });

        // push this user to other socket
        socket.broadcast.emit('user:online', {
            id: socket.handshake.user._id,
            username: socket.handshake.user.username,
            avatar: socket.handshake.user.avatar
        });

        socket.on('room:join', function (data) {
            if (!validateRoom(data.name)) {
                console.log('room:join bad room identifier '+data.name)
                return;
            }

            // @todo
            // test ACL
            // broadcast other devices

            var onRoom = function(room) {
                User.update({
                    _id: socket.handshake.user._id
                },{
                    $addToSet: { rooms: room.name }
                }, function(err, numberAffected) {
                    if (err) {
                        console.log('room:join '+err);
                        return;
                    }
                    // socket subscription
                    socket.join(data.name);
                    // room details
                    socket.emit('room:welcome', {
                        name: room.name,
                        topic: room.topic,
                        users: room.users
                    });
                    // inform room attendees
                    io.sockets.in(data.name).emit('room:in', {
                        name: data.name,
                        username: socket.handshake.user.username,
                        avatar: socket.handshake.user.avatar
                    });
                });
            }

            Room.findOne({'name': data.name}, 'name topic users', function(err, room) {
                if (err) {
                    console.log('room:join '+err);
                    return;
                }
                if (!room) {
                    console.log('room:join unable to find room '+data.name+' we create it');
                    room = new Room({name: data.name});
                    room.save(function (err, product, numberAffected) {
                        console.log('room:join room '+data.name+' created');
                        onRoom(room);
                    });
                } else {
                    onRoom(room);
                }
            });
        });
        socket.on('room:leave', function (data) {
            if (!validateRoom(data.name)) {
                console.log('room:leave bad room identifier '+data.name)
                return;
            }

            // @todo
            // test room existence
            // broadcast other devices
            // room deletion on last client leaved and permanent != 0

            User.update({
                _id: socket.handshake.user._id
            },{
                $pull: { rooms: data.name }
            }, function(err, affectedDocuments) {
                if (err) {
                    console.log('room:leave '+err);
                    return;
                }
                // socket unsubscription
                socket.leave(data.name);
                // inform room attendees
                io.sockets.in(data.name).emit('room:out', {
                    name: data.name,
                    username: socket.handshake.user.username
                });
            });
        });
        socket.on('room:topic', function (data) {
            if (!validateRoom(data.name)) {
                console.log('room:topic bad room identifier '+data.name)
                return;
            }

            // @todo : test validity (ASCII)
            // @todo : sanitize
            // @todo : test ACL

            // persist
            console.log('update ' + data.name + ' with ' + data.topic);
            Room.update({name: data.name}, {topic: data.topic}, function(err, numberAffected) {
                if (err)
                    console.error('room:topic error ' + err);

                console.log('room updated '+numberAffected);
                io.sockets.in(data.name).emit('room:topic', {
                    name: data.name,
                    topic: data.topic
                });
            });

            console.log(data);
        });
        socket.on('room:message', function (data) {
            if (!validateRoom(data.name)) {
                console.log('room:message bad room identifier '+data.name)
                return;
            }

            // @todo
            // escape
            // test message validity (not empty, ASCII)
            // test that user is in this room
            // broadcast message
            // persist in database

            console.log(data);

            io.sockets.in(data.name).emit('room:message', {
                name: data.name,
                time: Date.now(),
                message: data.message,
                username: socket.handshake.user.username,
                avatar: socket.handshake.user.avatar
            });
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

        socket.on('disconnect', function() {
            socket.broadcast.emit('user:offline', {
                id: socket.handshake.user._id
            });
        });

    });

};

function validateRoom(name) {
    var pattern = /^#[-a-z0-9_\\|[\]{}@^`]{2,30}$/i;
    if (pattern.test(name)) {
        return true;
    } else {
        return false;
    }
}