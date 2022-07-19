var express = require('express');
var router = express.Router();
var mysql = require('../mysql.js');

router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/get_data', function(request, response) {
    var fetchSql = "select url,title,author,publish_date from "+ request.query.website +" where" +
    " title like '%"+ request.query.title + "%'" +
    " and content like '%"+request.query.content + "%'" +
    " and author like '%"+request.query.author + "%'" +
    " and publish_date like '%"+request.query.publish_time + "%'" + 
    " order by publish_date DESC;";
    console.log(fetchSql);
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        });
        response.write(JSON.stringify(result));
        response.end();
    });
});

router.get('/get_image', function(request, response) {
    var fetchSql = "select cast(date_format(publish_date,'%Y-%m-%d') as char) as new_publish_date,count(*) from "+
    request.query.website +" where title like '%" + 
    request.query.title  +"%' group by publish_date order by publish_date";
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        })
        var search = [];
        var the_count = [];
        console.log(result)
        for (var i = 0; i < result.length; i++) {
            search[i] = (result[i]['new_publish_date']).toString();
            the_count[i] = result[i]['count(*)'];
        }
        var tempt = [search,the_count]
        response.write(JSON.stringify(tempt));
        response.end()
    })
})

module.exports = router;