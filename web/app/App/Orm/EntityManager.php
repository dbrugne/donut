<?php

namespace App\Orm;

use Doctrine\DBAL\Connection;
use Silex\Application;

abstract class EntityManager
{
    /** @var string */
    protected $table;

    /** @var string */
    protected $entityClass;

    /** @var \Silex\Application */
    /** @var $this->app['db'] Doctrine\DBAL\Connection */
    protected $app;

    /**
     * Constructor.
     *
     * @param Application $app
     */
    public function __construct(Application $app)
    {
        $this->app = $app;

        if (null == $this->table) {
            throw new Exception(__CLASS__ . " should implement the 'table' property");
        }

        if (null == $this->entityClass) {
            throw new Exception(__CLASS__ . " should implement the 'entityClass' property");
        }
    }

    /**
     * Insert a new line in table and return last_inserted_id
     *
     * @param array $data
     * @return int
     */
    public function insert( array $data )
    {
        $this->app['db']->insert($this->table, $data);

        return $this->app['db']->lastInsertId();
    }

    /**
     * Update an existing line table and return last_inserted_id
     *
     * @param array $data
     * @param array $criteria
     * @return int
     */
    public function update( array $data, array $criteria )
    {
        return $this->app['db']->update($this->table, $data, $criteria);
    }

    /**
     * Delete lines in table
     *
     * @param array $criteria
     */
    public function delete( array $criteria )
    {
        return $this->app['db']->delete($this->table, $criteria);
    }

    /**
     * Search for lines that correspond to $criteria.
     * Return the first line found as an Entity instance or null.
     *
     * @param array $criteria
     * @return Entity|null
     */
    public function findOneBy( array $criteria )
    {
        $entities = $this->findBy($criteria);

        if (empty($entities)) {
            return null;
        }

        return reset($entities);
    }

    /**
     * Search for lines that correspond to $criteria.
     * Return the lines found as an array of Entity or null.
     *
     * @param array $criteria
     * @param array $options An array of the following options (all optional):<pre>
     *      limit (int|array) The maximum number of results to return, or an array of (offset, limit).
     *      order_by (string|array) The name of the column to order by, or an array of column name and direction, ex. array(time_created, DESC)
     * </pre>
     * @return Entity[] An array of matching Entity instances, or an empty array if no matching lines were found.
     */
    public function findBy(array $criteria = array(), array $options = array())
    {
        list ($common_sql, $params) = $this->createCommonFindSql($criteria);

        $sql = 'SELECT * ' . $common_sql;

        if (array_key_exists('order_by', $options)) {
            list ($order_by, $order_dir) = is_array($options['order_by']) ? $options['order_by'] : array($options['order_by']);
            $sql .= 'ORDER BY ' . $this->app['db']->quoteIdentifier($order_by) . ' ' . ($order_dir == 'DESC' ? 'DESC' : 'ASC') . ' ';
        }
        if (array_key_exists('limit', $options)) {
            list ($offset, $limit) = is_array($options['limit']) ? $options['limit'] : array(0, $options['limit']);
            $sql .= 'LIMIT ' . (int) $offset . ', ' . (int) $limit . ' ';
        }

//        if ($this->table == 'user_room') { var_dump($sql, $params); exit;}
        $data = $this->app['db']->fetchAll($sql, $params);

        $entities = array();
        foreach ($data as $entityData)
        {
            $entity = $this->hydrateEntity($entityData);
            $entities[] = $entity;
        }

        return $entities;
    }

    /**
     * Count lines that match the given criteria.
     *
     * @param array $criteria
     * @return int The number of lines that match the criteria.
     */
    public function findCount(array $criteria = array())
    {
        list ($common_sql, $params) = $this->createCommonFindSql($criteria);

        $sql = 'SELECT COUNT(*) ' . $common_sql;

        return $this->app['db']->fetchColumn($sql, $params) ?: 0;
    }

    /**
     * Reconstitute an Entity object from stored data.
     *
     * @param array $data
     * @return Entity
     */
    protected function hydrateEntity(array $data)
    {
        $entity = new $this->entityClass();

        foreach ($data as $column => $value)
        {
            $entity->{'set'.ucfirst($column)}($value);
        }

        return $entity;
    }

    /**
     * Get SQL query fragment common to both find and count queries.
     *
     * @param array $criteria
     * @return array An array of SQL and query parameters, in the form array($sql, $params)
     */
    protected function createCommonFindSql(array $criteria = array())
    {
        $params = array();

        $sql = "FROM {$this->table} ";

        $first_crit = true;
        foreach ($criteria as $key => $val)
        {
            $sql .= ($first_crit ? 'WHERE' : 'AND') . ' ' . $key . ' = :' . $key . ' ';
            $params[$key] = $val;
            $first_crit = false;
        }

        return array($sql, $params);
    }

} 