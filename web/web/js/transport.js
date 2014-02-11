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
          * Server asks to client to open this room in the interface
          * @event enterInRoom
          * @param int roomId
          * @param Object data
          */
          , 'enterInRoom'

         /**
          * Server notify that a user is to display as room attendee
          * @event userInRoom
          * @param int roomId
          * @param Object data
          */
          , 'userInRoom'

        /**
         * Server notify that a user is to display as room attendee
         * @event userOutRoom
         * @param int roomId
         * @param Object data
         */
            , 'userOutRoom'

         /**
          * The server inform the client that a room title was changed
          * @event roomTitle
          * @param int roomId
          * @param Object data
          */
          , 'roomTitle'
        ]

      , debug: optDebug | false

      , setName: function(name) {
            // Name can not be longer than 32 characters

            sess.call('setName', name).then(function() {
            }, onError);
        }

      , subscribe: function(roomId) {
            sess.subscribe('ws://chat.local/room#'+roomId, function(topic, event) {
                var roomId = topic.replace('ws://chat.local/room#','');

                Debug([event.action, roomId, event.data]);

                $(api).trigger(event.action, [roomId, event.data]);
            });
        }

      , unsubscribe: function(roomId) {
            sess.unsubscribe('ws://chat.local/room#'+roomId);
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
            $(api).trigger('connect');

            // Subscribe to control topic
            sess.subscribe('ws://chat.local/control', function(topic, event) {
                $(api).trigger(event.action, event.data);
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