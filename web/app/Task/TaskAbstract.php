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
                'dbname'   => $this->project->getProperty('pdo.dbname'),
                'host'     => $this->project->getProperty('pdo.host'),
                'user'     => $this->project->getProperty('pdo.user'),
                'password' => $this->project->getProperty('pdo.password'),
            ),
        ));
        $this->app->register(new Silex\Provider\SecurityServiceProvider());
        $this->app->register(new App\User\UserServiceProvider());
    }
} 