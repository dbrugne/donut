<?php

require_once 'TaskAbstract.php';

class Sample extends TaskAbstract
{

    /**
     * @var string
     */
    protected $_filename = null;

    public function setFilename($filename)
    {
        $this->_filename = $filename;
    }

    public function main()
    {
        parent::main();

        $samples = json_decode(file_get_contents($this->_filename));

        foreach ($samples as $table => $tuples)
        {
            foreach ($tuples as $tuple)
            {
                if ($table == 'users') {
                    $user = $this->app['user.manager']->createUser(
                        $tuple->username,
                        $tuple->password,
                        $tuple->email,
                        $tuple->roles
                    );
                    $this->app['user.manager']->insert($user);
                    $this->log("User created {$tuple->username}");
                    continue;
                }

                $this->app['db']->insert($table, (array)$tuple);
                $this->log("New line inserted in {$table} (id:{$this->app['db']->lastInsertId()})");
            }
        }
    }

}