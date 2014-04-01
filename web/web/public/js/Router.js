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
            console.log('router: focusRoom');
            Chat.discussions.focusRoomByName('#'+name);
        },

        focusOneToOne: function(username) {
            console.log('router: focusOneToOne');
            Chat.discussions.focusOneToOneByUsername(username);
        },

        default: function() {
            console.log('router: default');
            // @todo : handle 404 type behavior in DOM
        }
    });

});