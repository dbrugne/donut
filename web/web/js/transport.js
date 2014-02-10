ChatRoom = function(optDebug) {
    var onError = function(error) {
        Debug('Error: ' + error);
    }

    var Debug = function(msg) {
        if (api.debug) {
            console.log(msg);
        }
    }

    var api = {
        events: [
            /**
             * The user has connected to the server
             * @event connected
             */
            'connect'

            /**
             * The user has disconnected from the server
             * @event disconnect
             */
          , 'disconnect'

            /**
             * Crap crap crap!
             * @event error
             * @param string Message from the server
             */
          , 'error'

            /**
             * A new room has been created by another user
             * @event openRoom
             * @param string Room name
             */
          , 'openRoom'

            /**
             * A room has been closed
             * @event closeRoom
             * @param string Room name
             */
          , 'closeRoom'

            /**
             * Another use has joined a room the current user is in
             * @event joinRoom
             * @param string Room name
             * @param string Unique ID of the person who joined
             * @param string Display name of the person who joined (make sure to store this in a lookup)
             */
          , 'joinRoom'

            /**
             * Another use has left one of the rooms this user is in
             * @event leftRoom
             * @param string Room name
             * @param string Unique ID of the person who left
             */
          , 'leftRoom'

            /**
             * A message has been received in one of the chat rooms
             * @event message
             * @param string Room the message is sent to
             * @param string Unique ID of the person who sent the message
             * @param string Message received
             */
          , 'message'

            /**
             * We get roomData from control topic, probably user just subscribed to a room
             * @event roomData
             * @param Object
             */
          , 'roomData'

         /**
          * We get roomUserList from control topic, probably user just subscribed to a room
          * @event roomUsers
          * @param Object
          */
          , 'roomUsers'
        ]

      , debug: optDebug | false

      , setName: function(name) {
            // Name can not be longer than 32 characters

            sess.call('setName', name).then(function() {
            }, onError);
        }

        , join: function(roomId) {
            sess.subscribe(roomId, function(room, msg) {
                var action = msg.shift();
                msg.unshift(room);


                Debug([action, msg]);

                $(api).trigger(action, msg);
            });
        }

      , leave: function(room) {
            sess.unsubscribe(room);
        }

      , send: function(roomId, msg) {
            // Message can not be longer than 140 characters

            sess.publish('ws://chat.local/room#'+roomId, msg);
        }

      , end: function() {
            sess.close();
        }

      , create: function(name, callback) {
            sess.call('createRoom', name).then(function(args) {
                callback(args.id, args.display);
            }, function(args) {
                callback(args.id, args.display);
            });
        }

        // DBR ajout
        , getUserRooms: function(callback) {
            sess.call('getUserRooms').then(function(args) {
                callback(args);
            }, function(args) {
                callback(args);
            });
        }
        // DBR ajout

      , sessionId: ''

      , rooms: {}
    }

    ab._debugrpc    = api.debug;
    ab._debugpubsub = api.debug;
    ab._debugws     = api.debug;

    var sess = new ab.Session(
        'ws://' + window.location.hostname + ':8080/chat'
      , function() {
            api.sessionId = sess._session_id;

            Debug('Connected! ' + api.sessionId);

            $(api).trigger('connect'); // !! before subscribe to control

            sess.subscribe('ws://chat.local/control', function(topic, event) {
                var action = event.action;
                if (action == 'roomData') {
                    $(api).trigger('roomData', event.data);
                }
                if (action == 'roomUsers') {
                    $(api).trigger('roomUsers', event.data);
                }
            });
        }
      , function() {
            Debug('Connection closed');
            $(api).trigger('close');
        }
      , {
            'skipSubprotocolCheck': true
        }
    );

    return api;
};