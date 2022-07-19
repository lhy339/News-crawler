var fs = require('fs');
var myRequest = require('request');
var myCheerio = require('cheerio');
var myIconv = require('iconv-lite');
require('date-utils');
var mysql = require('../mysql.js');

var source_name = "中国新闻网";
var myEncoding = "utf-8";
var seedURL = 'http://www.chinanews.com/';
var seedURL_format = "$('a')";
var keywords_format = " $('meta[name=\"keywords\"]').eq(0).attr(\"content\")";
var title_format = "$('title').text()";
var date_format = "$('#pubtime_baidu').text()";
var author_format = "$('#editor_baidu').text()";
var content_format = "$('.left_zw').text()";
var desc_format = " $('meta[name=\"description\"]').eq(0).attr(\"content\")";
var source_format = "$('#source_baidu').text()";
var url_reg = /\/(\d{4})\/(\d{2})-(\d{2})\/(\d{7}).shtml/;
var regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/

var headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
}

function request(url, callback) {
    var options = {
        url: url,
        encoding: null,
        headers: headers,
        timeout: 10000
    }
    myRequest(options, callback)
};

seedget();

function seedget() {
    request(seedURL, function(err, res, body) {
        var html = myIconv.decode(body, myEncoding);
        var $ = myCheerio.load(html, { decodeEntities: true });
        var seedurl_news;

        try {
            seedurl_news = eval(seedURL_format);
        } catch (e) { console.log('url列表所处的html块识别出错:' + e) };
        seedurl_news.each(function(i, e) {
            var myURL = "";
            try {
                var href = "";
                href = $(e).attr("href");
                if (href == undefined) return;
                if (href.toLowerCase().indexOf('http://') >= 0) myURL = href;
                else if (href.toLowerCase().indexOf('https://') >= 0) myURL = href;
                else if (href.startsWith('//')) myURL = 'http:' + href;
                else myURL = seedURL.substr(0, seedURL.lastIndexOf('/') + 1) + href;

            } catch (e) { console.log('识别种子页面中的新闻链接出错：' + e) }

            if (!url_reg.test(myURL)) return;

            var fetch_url_Sql = 'select url from cnw where url=?';
            var fetch_url_Sql_Params = [myURL];
            mysql.query(fetch_url_Sql, fetch_url_Sql_Params, function(qerr, vals, fields) {
                if (vals.length > 0) {
                    console.log('URL duplicate!')
                } else newsGet(myURL);
            });
        });
    });
};

function newsGet(myURL) {
    request(myURL, function(err, res, body) { 
        var html_news = myIconv.decode(body, myEncoding); 
        var $ = myCheerio.load(html_news, { decodeEntities: true });
        myhtml = html_news;
        var fetch = {};

        fetch.title = "";
        fetch.content = "";
        fetch.publish_date = (new Date()).toFormat("YYYY-MM-DD");
        fetch.url = myURL;
        fetch.source_name = source_name;
        fetch.source_encoding = myEncoding;
        fetch.crawltime = new Date();

        if (keywords_format == "") fetch.keywords = source_name;
        else fetch.keywords = eval(keywords_format);

        if (title_format == "") fetch.title = ""
        else fetch.title = eval(title_format);

        if (date_format != "")
            fetch.publish_date = regExp.exec(fetch.publish_date)[0];
        fetch.publish_date = fetch.publish_date.replace('年', '-')
        fetch.publish_date = fetch.publish_date.replace('月', '-')
        fetch.publish_date = fetch.publish_date.replace('日', '')
        fetch.publish_date = new Date(fetch.publish_date).toFormat("YYYY-MM-DD");

        if (author_format == "") fetch.author = source_name;
        else fetch.author = eval(author_format);

        if (content_format == "") fetch.content = "";
        else fetch.content = eval(content_format).replace("\r\n" + fetch.author, ""); 

        if (source_format == "") fetch.source = fetch.source_name;
        else fetch.source = eval(source_format).replace("\r\n", "");

        fetch.desc = fetch.title;

        var fetchAddSql = 'INSERT INTO cnw(url,source_name,source_encoding,title,' +
            'keywords,author,publish_date,crawltime,content) VALUES(?,?,?,?,?,?,?,?,?)';
        var fetchAddSql_Params = [fetch.url, fetch.source_name, fetch.source_encoding,
            fetch.title, fetch.keywords, fetch.author, fetch.publish_date,
            fetch.crawltime.toFormat("YYYY-MM-DD HH24:MI:SS"), fetch.content
        ];

        mysql.query(fetchAddSql, fetchAddSql_Params, function(qerr, vals, fields) {
            if (qerr) {
                console.log('error');
            }
            else{
                console.log('URL:' + fetch.url)
            }
        });
    });
}