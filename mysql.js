// 使用mysql库连接数据库
var mysql = require("mysql")

// 设置数据库的配置，包括用户名、密码以及数据库名称
var pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'crawl'
})

// 执行具有查询语句和查询参数的数据库查询
var query = function(sql, sqlparam, callback) {
    // 根据设置的数据库参数连接数据库
    pool.getConnection(function(err, conn) {
        if (err) {
            callback(err, null, null);
        } else {
            // 进行查询语句的查询
            conn.query(sql, sqlparam, function(qerr, vals, fields) {
                conn.release(); //释放连接 
                callback(qerr, vals, fields); //事件驱动回调 
            });
        }
        pool.releaseConnection(conn);
    });
};

// 执行具有查询语句，没有查询参数的数据库查询
var query_noparam = function(sql, callback) {
    // 根据设置的数据库参数连接数据库
    pool.getConnection(function(err, conn) {
        if (err) {
            callback(err, null, null)
            pool.end(callback)
        } else {
            // 进行查询语句的查询
            conn.query(sql, function(qerr, vals, fields) {
                conn.release(); //释放连接 
                callback(qerr, vals, fields); //事件驱动回调 
                pool.end(callback)
            });
        }
    })
    
};

// 将方法query和query_noparam模块化，便于在其余文件中进行使用
exports.query = query;
exports.query_noparam = query_noparam;
