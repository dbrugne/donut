module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (authenticated or not) ====
    // =====================================
    app.get('/', function(req, res) {

        res.locals.user = req.user;

        if (!req.isAuthenticated()) {
            res.render('index', { });
        } else {
            res.render('welcome', { });
        }

    });

    // =====================================
    // USER ================================
    // =====================================
    app.get('/login', function(req, res) {

        res.locals.user = req.user;
        res.render('login', { message: req.flash('loginMessage') });

    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/',
        failureRedirect : '/login',
        failureFlash : true
    }));

    app.get('/signup', function(req, res) {

        res.locals.user = req.user;
        res.render('signup', { message: req.flash('signupMessage') });

    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/',
        failureRedirect : '/signup',
        failureFlash : true
    }));

    app.get('/account', isLoggedIn, function(req, res) {
        res.locals.user = req.user;
        res.render('account', { });
    });

    app.post('/account', isLoggedIn, function(req, res) {
        res.locals.user = req.user;
        //
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // =====================================
    // PROFILES ============================
    // =====================================

    app.get('/user/:username', isLoggedIn, function(req, res) {
        res.locals.user = req.user;
        res.render('user', {
            user : req.user // get the user out of session and pass to template
        });
    });

};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}