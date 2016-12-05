var url = require('url');
var logger = require('../tools/logger');
var redis = require('../tools/redis');
var fetch = require('node-fetch');
var md5 = require('blueimp-md5');

var appkey = '4ebafd7c4951b366';
var secret = '8cb98205e9b2ad3669aad0fce12a4c13';
function getData(cid, res, type) {
    var sign = md5(`appkey=${appkey}&cid=${cid}&otype=json&quality=2&type=mp4${secret}`);
    var api = `https://interface.bilibili.com/playurl?cid=${cid}&appkey=${appkey}&otype=json&type=mp4&quality=2&sign=${sign}`;
    if (type === '1') {
        res.send(api);
    }
    else {
        fetch(api).then(
            response => response.text()
        ).then((data) => {
                res.send(data.replace(/http/g, 'https'));
            }
        ).catch(
            e => logger.error("Bilibilib Error: getting data", e)
        );
    }
}

module.exports = function (req, res) {
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    var query = url.parse(req.url,true).query;
    var aid = query.aid;
    var cid = query.cid;
    var type = query.type;

    if (cid) {
        logger.info(`Bilibili cid2video ${cid}, IP: ${ip}`);
        getData(cid, res, type);
    }
    else {
        redis.client.get(`bilibiliaid2cid${aid}`, function(err, reply) {
            if (reply) {
                logger.info(`Bilibili aid2video ${aid} form redis, IP: ${ip}`);
                getData(reply, res, type);
            }
            else {
                logger.info(`Bilibili aid2video ${aid} form origin, IP: ${ip}`);

                fetch(`http://www.bilibili.com/widget/getPageList?aid=${aid}`).then(
                    response => response.json()
                ).then((data) => {
                        redis.set(`bilibiliaid2cid${aid}`, data[0].cid);
                        getData(data[0].cid, res, type);
                    }
                ).catch(
                    e => logger.error("Bilibili aid2video Error: getting cid", e)
                );
            }
        });
    }
};