$(function() {

    Chat = window.Chat || { };

    /* ====================================================== */
    /* =====================  ROUTER  ======================= */
    /* ====================================================== */

    Chat.Routes = Backbone.Router.extend({

        routes: {
            '':                 'root',
            'room/:name':       'focusRoom',
            'user/:user':       'focusOneToOne',
            '*default':         'default'
        },

        root: function() {
            console.log('router: home');
        },

        focusRoom: function(name) {
            Chat.discussions.focusRoomByName('#'+name);
        },

        focusOneToOne: function(username) {
            Chat.discussions.focusOneToOneByUsername(username);
        },

        default: function() {
            console.log('router: default');
            // @todo : handle 404 type behavior in DOM
        }
    });

});