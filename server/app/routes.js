module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (authenticated or not) ====
    // =====================================
    app.get('/', function(req, res) {
        var title = 'index';
        if (req.isAuthenticated()) {
            title += ' (authenticated!)';
        } else {
            title += ' (not authenticated!)';
        }
        res.render('index', { title: title });
    });

    app.get('/welcome', function(req, res) {
        res.render('welcome', { title: 'welcome' });
    });

    // =====================================
    // SIGNUP / LOGIN / LOGOUT =============
    // =====================================
    app.get('/login', function(req, res) {
        res.render('login', { message: req.flash('loginMessage') });
    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/',
        failureRedirect : '/login',
        failureFlash : true
    }));

    app.get('/signup', function(req, res) {
        res.render('signup', { message: req.flash('signupMessage') });
    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/',
        failureRedirect : '/signup',
        failureFlash : true
    }));

    // =====================================
    // USER PROFILE ========================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/user', isLoggedIn, function(req, res) {
        res.render('user', {
            user : req.user // get the user out of session and pass to template
        });
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
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