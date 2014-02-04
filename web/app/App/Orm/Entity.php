<?php

namespace App\Orm;

abstract class Entity
{
    /** @var array */
    protected $data = array();

    /**
     * Constructor.
     */
    public function __construct()
    {
    }

    /**
     * Return the current data array.
     *
     * @return array
     */
    public function getData()
    {
        return $this->data;
    }

    /**
     * Validate the current entity.
     *
     * @return array An array of error messages, or an ampty array if there were no errors.
     */
    public function validate()
    {
        return array();
    }

    /**
     * Magic method to implement dynamic accessors
     *
     * @param $name
     * @param $arguments
     * @return bool
     */
    public function __call($name, $arguments)
    {
        $action = substr($name, 0, 3);
        switch ($action)
        {
            case 'get':
                $property = strtolower(substr($name, 3));
                return (isset($this->data[$property])) ? $this->data[$property] : null;
                break;

            case 'set':
                $property = strtolower(substr($name, 3));
                $this->data[$property] = $arguments[0];
                break;

            default :
                return false;
        }
    }

} 