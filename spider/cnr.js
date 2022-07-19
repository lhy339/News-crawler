var fs = require('fs')
var request = require('request')
var iconv = require('iconv-lite')
var cheerio = require('cheerio')
require('date-utils')
var mysql = require('../mysql.js')
var schedule = require('node-schedule')

var source_name = "中国广播网"
var seedURL = 'http://www.cnr.cn/'
var Encode = 'gbk'
var URL_format = "$('a')"
var title_format = "$('.article-header > h1').text()"
var author_format = "$('.editor').text()"
var date_format = "$('.source > span').text()"
var content_format = "$('.article-body > div').text()"
var source_format = "$('.source > span').text()"
var url_reg = /\/(\d{8})\/t(\d{8})_(\d{9}).shtml/
var regExp = /((\d{4}|\d{2})(\-|\/|\.)\d{1,2}\3\d{1,2})|(\d{4}年\d{1,2}月\d{1,2}日)/

var headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'}

function myrequest(url, callback) {
    var options = {
        url: url,
        encoding: null,
        headers: headers,
        timeout: 10000
    }
    request(options, callback)
}

var rule = new schedule.RecurrenceRule()
rule.hour = [0,2,4,6,8,10,12,14,16,18,20,22]
rule.minute = 0
rule.second = 0

get_info()

function get_info(){
    myrequest(seedURL, function (err, res, body) {
        if (!err && res.statusCode == 200) {
            seed_html = iconv.decode(body, Encode)

            var $ = cheerio.load(seed_html, { decodeEntities: true })

            var html_URL
            try {
                html_URL = eval(URL_format)
            } catch (error) {
                console.log("获取种子页面中的链接出现错误：" + error)
            }
            
            html_URL.each(function (index, body) {
                try {
                    var whole_URL = ""
                    var href = ""
                    href = $(body).attr("href")

                    if (typeof (href) == "undefined") {
                        return true
                    }
                    if (href.toLowerCase().indexOf('http://') >= 0 || href.toLowerCase().indexOf('https://') >= 0) whole_URL = href;
                    else if (href.startsWith('//')) whole_URL = 'http:' + href
                    else whole_URL = seedURL + href

                    if (!url_reg.test(whole_URL)) return
                    else{
                        var fetch_url_Sql = 'select * from cnr where url=?'
                        var fetch_url_Sql_Params = [whole_URL]
                        mysql.query(fetch_url_Sql, fetch_url_Sql_Params, function(err, result) {
                            if (err) console.log(err)
                            if (result.length > 0) {
                                console.log('URL duplicate!')
                            } else {
                                newsGet(whole_URL)
                            }
                        })
                    }

                } catch (error) {
                    console.log("获取页面网址出现错误：" + error)
                }
            })
        }
    })
}

function newsGet(whole_URL) {
    myrequest(whole_URL, function (err, res, body) {
        if (!err && res.statusCode == 200) {
            html_content = iconv.decode(body, Encode)
            var $ = cheerio.load(html_content, { decodeEntities: false })
            var fetch = {}

            fetch.title = ""
            fetch.content = ""
            fetch.publish_date = (new Date()).toFormat("YYYY-MM-DD")
            fetch.url = whole_URL
            fetch.source_name = source_name
            fetch.source_encoding = Encode
            fetch.crawltime = new Date()

            if (title_format == "") fetch.title = ""
            else fetch.title = eval(title_format)

            if (date_format != "") {
                fetch.publish_date = eval(date_format)
                if (fetch.publish_date != null){
                    fetch.publish_date = fetch.publish_date.replace(/\s/g, "")
                }
            }
            fetch.publish_date = regExp.exec(fetch.publish_date)[0];
            fetch.publish_date = fetch.publish_date.replace('年', '-')
            fetch.publish_date = fetch.publish_date.replace('月', '-')
            fetch.publish_date = fetch.publish_date.replace('日', '')
            fetch.publish_date = new Date(fetch.publish_date).toFormat("YYYY-MM-DD")

            if (author_format == "") fetch.author = source_name   
            else {
                fetch.author = eval(author_format)
                if (fetch.author != null){
                    fetch.author = fetch.author.replace(/\s/g, "")
                }
            }

            if (content_format == "") fetch.content = ""
            else {
                fetch.content = eval(content_format)
                if (fetch.content != null){
                    fetch.content = fetch.content.replace(/\s/g, "")
                }
            }

            if (source_format == "") fetch.source = source_name
            else fetch.source = eval(source_format).split(" ")[1].split(":")[1]

            var fetchAddSql = 'INSERT INTO cnr(url,source_name,source_encoding,title,' +
            'source,author,publish_date,crawltime,content) VALUES(?,?,?,?,?,?,?,?,?)'

            var fetchAddSql_Params = [fetch.url, fetch.source_name, fetch.source_encoding,
                fetch.title, fetch.source, fetch.author, fetch.publish_date,
                fetch.crawltime.toFormat("YYYY-MM-DD HH24:MI:SS"), fetch.content
            ]

            mysql.query(fetchAddSql, fetchAddSql_Params, function(err, result) {
                if (err) {
                    console.log('error')
                }
                else{
                    console.log('URL:' + fetch.url)
                }
            })
        }
    })
}