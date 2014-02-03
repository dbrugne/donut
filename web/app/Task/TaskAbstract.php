<?php

require_once __DIR__.'/../../vendor/autoload.php';

class TaskAbstract extends Task
{
    /**
     * @var Silex\Application
     */
    protected $_app = null;

    public function main()
    {
        $this->app = new Silex\Application();
        $this->app->register(new Silex\Provider\DoctrineServiceProvider(), array(
            'db.options' => array(
                'driver'   => 'pdo_mysql',
                'dbname'   => 'chat',
                'host'     => 'localhost',
                'user'     => 'root',
                'password' => '',
            ),
        ));
        $this->app->register(new Silex\Provider\SecurityServiceProvider());
        $this->app->register(new App\User\UserServiceProvider());
    }
} 