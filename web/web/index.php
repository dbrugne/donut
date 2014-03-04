<?php

/**********************************************
 * Bootstrap
 *********************************************/
require_once __DIR__.'/../vendor/autoload.php';
$app = new Silex\Application();
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\PdoSessionHandler;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\MongoDbSessionHandler;
use App\User;
use App\Chat;

/**********************************************
 * Configuration
 *********************************************/
if (!file_exists(__DIR__.'/../env') || null == $env = file_get_contents(__DIR__.'/../env')) {
    die('no, sorry!');
}
$configuration = parse_ini_file(__DIR__."/../config/{$env}.ini");
foreach ($configuration as $k => $v) {
    $app[$k] = $v;
}

/**********************************************
 * Services
 *********************************************/
$app->register(new Silex\Provider\SessionServiceProvider());
$app['pdo.dsn'] = 'mysql:dbname='.$app['pdo.dbname'];
$app['session.db_options'] = array(
    'db_table'      => 'sessions',
    'db_id_col'     => 'session_id',
    'db_data_col'   => 'session_value',
    'db_time_col'   => 'session_time',
);
$app['pdo'] = $app->share(function () use ($app) {
    return new PDO(
        $app['pdo.dsn'],
        $app['pdo.user'],
        $app['pdo.password']
    );
});
$app['pdo']->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
$app['mongo'] = $app->share(function () use ($app) {
    return new MongoClient();
});
$app['session.storage.handler'] = $app->share(function () use ($app) {
    return new MongoDbSessionHandler(
        $app['mongo'],
        array(
            'database' => 'chat',
            'collection' => 'chat_sessions',
        )
    );
});
$app->register(new Silex\Provider\DoctrineServiceProvider(), array(
    'db.options' => array(
        'driver'   => 'pdo_mysql',
        'dbname'   => $app['pdo.dbname'],
        'host'     => $app['pdo.host'],
        'user'     => $app['pdo.user'],
        'password' => $app['pdo.password'],
    ),
)); // doc: http://www.doctrine-project.org/api/dbal/2.4/class-Doctrine.DBAL.Connection.html
$app->register(new Silex\Provider\SecurityServiceProvider(), array(
    'security.firewalls' => array(
        'secured_area' => array(
            'pattern' => '^.*$',
            'anonymous' => true,
            'remember_me' => array(),
            'form' => array(
                'login_path' => '/u/login',
                'check_path' => '/u/login_check',
            ),
            'logout' => array(
                'logout_path' => '/u/logout',
            ),
            'users' => $app->share(function($app) { return $app['user.manager']; }),
        ),
    ),
));
$app->register($u = new App\User\UserServiceProvider());
$app->register(new Silex\Provider\RememberMeServiceProvider());
$app->register(new Silex\Provider\ServiceControllerServiceProvider());
$app->register(new Silex\Provider\UrlGeneratorServiceProvider());
$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path' => __DIR__.'/../views',
));

$app['user.controller']->setLayoutTemplate('layout.twig.html');


/**********************************************
 * Controllers
 *********************************************/
$app->mount('/u', $u);

$app->get('/chat', function() use ($app) {

    if (null === $user = $app['user.manager']->getCurrentUser()) {
        return $app->redirect('/');
    }

    return $app['twig']->render('chat.twig.html', array(
        'user' => $user,
    ));

})->bind('chat');

$app->get('/test', function() use ($app) {

    return $app['twig']->render('test.twig.html', array(
    ));

})->bind('test');

$app->get('/', function(Request $request) use ($app) {

    $tvcm = new App\Chat\TvChannelManager($app);
    $channels = array();
    foreach ($tvcm->findBy() as $channel)
    {
        $channels[] = $channel->getData();
    }

    return $app['twig']->render('welcome.twig.html', array(
        'error' => $app['security.last_error']($request),
        'last_username' => $app['session']->get('_security.last_username'),
        'channels' => $channels,
    ));

})->bind('homepage');

$app->run();
