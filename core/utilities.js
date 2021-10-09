const _ = require('lodash');
const _fs = require('fs');
const _path = require('path');
const _https = require('https');
const requestLib = require('request');
const _request = requestLib.defaults({jar: requestLib.jar(), strictSSL: false});
const _nodeUtil = require('util');
const moment = require('moment');
const crypto = require('crypto');
const request = require('request');

let _logentries = process.env.LOGENTRIES_TOKEN ? require('node-logentries').logger({ token: process.env.LOGENTRIES_TOKEN }) : null;

const s3 = require('s3');
const s3config = require('../config/s3.json');
const s3client = s3.createClient(s3config);
const s3headers = {
    'Content-Type': 'image/jpg',
    'x-amz-acl': 'public-read'
};

const Utils = {};
module.exports = exports = Utils;

Utils.logNamespace = null;
Utils.isLogentries = false;

Utils.access = (o /*bject*/ , p /*ath*/ , s /*pliter*/ ) => (Array.isArray(p) ? p : p.split(s || '.')).reduce((xs, x) => (xs && xs[x]) ? xs[x] : null, o);

Utils.isFalse = Utils.isDisableENV = function(env) {
    switch (env) {
        case 0:
        case '0':
        case false:
        case 'false':
        case 'FALSE':
        case null:
        case 'null':
        case 'NULL':
        case undefined:
        case 'undefined':
        case 'UNDEFINED':
        case 'no':
        case 'NO':
            return true;
        default:
            return false;
    }
}

Utils.isTrue = Utils.isEnableENV = function(env) {
    switch (env) {
        case 1:
        case '1':
        case true:
        case 'true':
        case 'TRUE':
        case 'yes':
        case 'YES':
            return true;
        default:
            if (Utils.isDisableENV(env)) return false;
            if (typeof env === 'string' && env.length > 0) return true;
            return false;
    }
}

Utils.myIP = function(callback) {
    _request({ method: 'GET', url: 'http://httpbin.org/ip', timeout: 30e3 }, function(err, response, body) {
        return callback(err, Utils.parseJSON(body));
    });
}

Utils.isBase64 = function(str) {
    return !str ? false : (Buffer.from(str, 'base64').toString('base64') === str);
}

Utils.encrypt = function(secret_key, str) {
    try {
        if (!str || !secret_key) return null;

        var cipher = crypto.createCipher('aes-128-ecb', secret_key);

        var chunks = [];
        chunks.push(cipher.update(str.toString("binary"), 'binary', 'binary'))
        chunks.push(cipher.final('binary'));

        var txt = chunks.join("");
        txt = new Buffer(txt, "binary").toString("base64");

        return txt;
    } catch (ex) {
        Utils.log('Utils.encrypt', ex);
        return null;
    }
}

Utils.decrypt = function(secret_key, str64) {
    try {
        if (!str64 || !secret_key) return null;

        var decipher = crypto.createDecipher('aes-128-ecb', secret_key);

        var chunks = [];
        chunks.push(decipher.update(new Buffer(str64, "base64").toString("binary"), 'binary', 'binary'));
        chunks.push(decipher.final('binary'));
        var txt = chunks.join("");
        txt = new Buffer(txt, "binary").toString("utf-8");

        return txt;
    } catch (ex) {
        Utils.log('Utils.decrypt', ex);
        return null;
    }
}

Utils.randomUA = function() {
    // 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36';

    return [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/',
        Utils.random(900, 100), '.', Utils.random(90, 10),
        ' (KHTML, like Gecko) Chrome/', Utils.random(10, 70), '.', 0, '.', Utils.random(9000, 1000), '.', Utils.random(90, 10),
        ' Safari/', Utils.random(900, 100), '.', Utils.random(90, 10)
    ].join('');
}

Utils.randomStr = function(length, chars) {
    chars = chars || 'abcdefghkmnpqrstuvwxyzABCDEFHKMNPQRSTUVWXYZ12345789'

    var charsLength = chars.length;
    if (charsLength > 256) {
        return ('Second argument should not have more than 256 characters otherwise unpredictability will be broken');
    }

    var randomBytes = require('crypto').randomBytes(length);
    var result = new Array(length);

    var cursor = 0;
    for (var i = 0; i < length; i++) {
        cursor += randomBytes[i];
        result[i] = chars[cursor % charsLength];
    }

    return result.join('');
}

Utils.getLastestModifiedFile = function(rgW, rgB) {
    rgW = rgW ? new RegExp(rgW) : null;
    rgB = rgB ? new RegExp(rgB) : null;

    const walkSync = (dir, list = []) => {
        _fs.readdirSync(dir).forEach(file => {
            let tmp = _path.join(dir, file);
            let isDir = _fs.statSync(tmp).isDirectory();

            if (rgB && rgB.test(tmp)) return;
            if (!isDir && rgW && !rgW.test(tmp)) return;

            list = isDir ? walkSync(tmp, list) : list.concat(tmp);
        });
        return list;
    }

    let last = { path: null, time: 0 };
    walkSync(_path.join(__dirname, '..')).forEach(fp => {
        let t = _fs.statSync(fp).mtime.getTime();
        last = t < last.time ? last : { path: fp, time: t };
    });

    last.time = new Date(last.time)

    Utils.log('LastestModifiedFile:', last);
}

Utils.isWin = function() {
    return /^win/.test(process.platform);
}

Utils.isLinux = function() {
    return /^linux/.test(process.platform);
}

Utils.isJSON = function(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

Utils.parseProxy = function(str) {
    if (!str) return null;

    var words = str.split(':');
    var ip = '',
        port = '',
        username = '',
        password = '';
    if (words.length >= 2 && ~str.indexOf(':AUTH:')) {
        var proxyAuth = str.split(':AUTH:')[1];

        if (proxyAuth) {
            var auth = proxyAuth.split(':');
            username = auth[0];
            password = auth[1];
        }
    }

    return { ip: words[0], port: words[1], username: username, password: password };
}

Utils.findProp = function(obj, name) {
    var res;
    if (_.has(obj, name)) {
        return [obj[name]];
    }
    res = [];
    _.forEach(obj, function(v) {
        if (_.isObject(v) && (v = Utils.findProp(v, name)).length) {
            return res.push(v);
        }
    });
    return _.flatten(res);
};

Utils.shuffle = function(o) {
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

Utils.s_equal = function(val1, val2, delta) {
    return Math.abs(parseInt(val1, 10) - parseInt(val2, 10)) < delta;
}

Utils.u_equal = function(val1, val2, delta) {
    return parseInt(val1, 10) - parseInt(val2, 10) >= delta;
}

Utils.o_equal = function(val1, val2, delta) {
    return parseInt(val2, 10) - parseInt(val1, 10) >= delta;
}

Utils.download = function(url, filepath, cb) {
    var { URL } = require('url');
    var options = new URL(url);

    options = {
        hostname: options.hostname,
        port: options.port || 443,
        path: options.pathname,
        search: options.search,
        method: 'GET',
        headers: {
            'Authorization': process.env.APIKEY,
            'Dyno-ID': process.env.DYNO_ID || 'DYNO_ID',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'
        }
    }

    Utils.log('options', options)

    var file = _fs.createWriteStream(filepath);
    var request = _https.request(options, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb || undefined);
        });
    })

    request.on('error', function(err) {
        _fs.unlink(filepath);
        cb && cb(err);
    });

    request.end();
}

Utils.upload = function(filepath) {
    return Utils.upload2(filepath, filepath);
}

Utils.upload2 = function(filepath, remotepath) {

    return Utils.upload3(filepath, remotepath, { 'x-amz-acl': 'public-read' });
}

Utils.upload3 = function(filepath, remotepath, header) {
    try {
        // Utils.log('S3_UPLOAD:', remotepath);

        if (filepath.indexOf('.jpg') > 0) {
            var filepathHTML = filepath.replace('.jpg', '.html');
            var remotepathHTML = remotepath.replace('.jpg', '.html');

            if (_fs.existsSync(filepathHTML)) {
                // s3client.upload(filepathHTML, remotepathHTML, header);
                s3client.uploadFile({
                    localFile: filepathHTML,
                    s3Params: {
                        Bucket: s3config.bucket,
                        Key: remotepathHTML,
                        ACL: 'public-read',
                    },
                });
            }
        }

        if (_fs.existsSync(filepath)) {
            return s3client.uploadFile({
                localFile: filepath,
                s3Params: {
                    Bucket: s3config.bucket,
                    Key: remotepath,
                    ACL: 'public-read',
                },
            });
        }
    } catch (ex) {
        console.log('Utils.upload3.EX', ex);
    }
}

Utils.handle = function(err) {
    if (Utils.isUnDefOrNull(err)) {
        return false;
    } else {
        if (Utils.isString(err))
            Utils.log('ERROR:', err);
        else
            try {
                Utils.log('ERROR:', JSON.stringify(err));
            } catch (ex) { Utils.log(ex); }
        return true;
    }
}

Utils.ping = function(url, proxy, callback) {
    console.log('URL, PROXY:', url, proxy);
    var option = {
        method: 'GET',
        uri: url,
    };

    if (proxy && Utils.isString(proxy)) option.proxy = proxy;
    console.time('PING');
    _request(option, function(error, response, body) {
        console.timeEnd('PING');
        console.log('ERROR', error, 'STATUS', response ? response.statusCode : 0, 'BODY.LENGTH', body ? body.length : 0);

        return callback && callback();
    });
}

var _ticHash = {};
Utils.toc = function(clock) {
    return clock ? console.log(clock) : {};
}

Utils.tic = function(key, clock) {
    console.log('tic', key, new Date());

    var hash = clock || _ticHash;

    var t = Number(hash[key]);
    hash[key] = new Date().getTime();

    if (!t) return 0;

    return hash[key] - t;
}

Utils.tac = function(key, clock) {
    var hash = clock || _ticHash;

    return process.hrtime(hash[key]);
}

Utils.memory = function() {
    var mem = process.memoryUsage().rss / 1024 / 1024;
    return mem;
}

Utils.titleCase = function(str) {
    return str.replace(/\w\S*/g, function(txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

Utils.camelCase = function(str) {
    return str
        .replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
        .replace(/\s/g, '')
        .replace(/^(.)/, function($1) { return $1.toLowerCase(); });
}

Utils.random = function(max, min) {
    return Math.floor((Math.random() * max) + (min || 0));
}

Utils.randomin = function(list, fnCondition) {
    var len = list.length;

    var idx = Math.floor((Math.random() * len));

    if (!fnCondition) return idx;

    var ele = list[idx];
    var countFail = 0;

    while (!fnCondition(ele)) {
        countFail++;

        if (countFail == len) return null;

        idx = (idx + 1) % len;

        ele = list[idx];
    }

    return idx;
}

Utils.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
}

Utils.isFn = Utils.isFunc = function(obj) {
    return (!Utils.isUnDef(obj) && typeof obj == 'function');
}

Utils.isStr = Utils.isString = function(obj) {
    return (!Utils.isUnDef(obj) && typeof obj == 'string');
}

Utils.isUnDef = function(obj) {
    return (typeof obj === 'undefined');
}

Utils.isNUD = Utils.isUnDefOrNull = function(obj) {
    return (typeof obj === 'undefined' || obj == null);
}

Utils.isNum = function(obj) {
    return !Utils.isNUD(obj) && ((obj - parseFloat(obj) + 1) >= 0);
}

Utils.getFnParamNames = function(func) {
    var STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
    var ARGUMENT_NAMES = /([^\s,]+)/g;

    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null)
        result = [];
    return result;
}

Utils.tryCatch = Utils.trySafe = function() {
    var args = [].splice.call(arguments, 0, arguments.length);
    var fn = args.splice(0, 1);

    if (typeof fn[0] !== 'function') {
        Utils.log('Utils.tryCatch:E_FIRST_PARAM_ISNT_FUNC');
        return null;
    }

    try {
        return fn[0].apply(fn[0], args);
    } catch (ex) {
        Utils.log('Utils.tryCatch:', ex);
        return null;
    }
}

Utils.tryCatchSilent = Utils.trySafeSilent = function() {
    var args = [].splice.call(arguments, 0, arguments.length);
    var fn = args.splice(0, 1);

    if (typeof fn[0] !== 'function') {
        Utils.log('Utils.tryCatch:E_FIRST_PARAM_ISNT_FUNC');
        return null;
    }

    try {
        return fn[0].apply(fn[0], args);
    } catch (ex) {
        return null;
    }
}

var writeLog = function(args) {
    if (args.length <= 0)
        return;

    var regexs = [
        /,?\s*\\?[\"\']?passPay\\?[\"\']?:?\s?\\?[\"\'][^\"\']+\\?[\"\']/gi,
        /,?\s*\\?[\"\']?passBook\\?[\"\']?:?\s?\\?[\"\'][^\"\']+\\?[\"\']/gi,
    ];

    for (var i = args.length - 1; i >= 0; i--) {
        if (!args[i]) continue;

        var arg = args[i].toString();
        if (arg === '[object Object]')
            arg = '[Object]: ' + _nodeUtil.inspect(args[i]).replace(/\n/g, '').replace(/\s+/g, ' ').replace(/\:\s+/g, ':').replace(/,\s+/g, ',', { depth: 7, colors: true });
        for (var j = regexs.length - 1; j >= 0; j--) {
            arg = arg.replace(regexs[j], '');
        };
        args[i] = arg.replace(/\{\,/g, '{').replace(/\,\}/g, '}').replace(/\,+}/g, ',');
    };

    if (Utils.isLogentries) {
        if (Utils.isNUD(Utils.logNamespace)) {
            // console.log('_logentries_1');
            _logentries.info(args.join ? args.join(' ') : args);
        } else {
            // console.log('_logentries_2', Utils.logNamespace, args);
            _logentries.info(Utils.logNamespace.toUpperCase() + ': ' + (args.join ? args.join(' ') : args));
        }
    }

    var text = Utils.isWin() ? [new Date().toTimeString().split(' ')[0] + ':'].concat(args) : args;

    console.log.apply(console, text);
}

Utils.log = function() {
    var args = [].splice.call(arguments, 0, arguments.length);
    return writeLog(args);
}

for (let i = 0; i < 10; i++) {
    Utils['log' + i] = function() {
        var logargs = [].splice.call(arguments, 0, arguments.length);
        logargs = Array(i).fill(' ').join('').concat(logargs);

        return writeLog(logargs);
    }
}

Utils.logD = function() {
    var isDoIt = false;

    if (process.env.PORT) {
        if (process.env.UTILS_DEBUG)
            isDoIt = true;
    } else {
        isDoIt = true;
    }

    if (Utils.isEnableENV(process.env.NO_LOGD)) isDoIt = false;

    if (isDoIt) {
        var args = [].splice.call(arguments, 0, arguments.length);
        writeLog(args);
        //console.log.apply(console, args);
    }
}

Utils.endLog = function() {
    _logentries?.end();
}

Utils.setLogToken = function(token) {
    console.log('Utils.setLogToken', token);
    _logentries = null;
    _logentries = require('node-logentries').logger({token});
}

Utils.formatMoney = function(n, c, d, t) {
    c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

Utils.parseMoney = function(str, isFloat) {

    var isDot = true;

    var cIdx = str.lastIndexOf(',');
    var dIdx = str.lastIndexOf('.');
    var pPart = '';

    if (cIdx >= 0) {
        pPart = str.substr(cIdx + 1);

        if (pPart.length < 3)
            isDot = false;
        else
            isDot = true;
    }

    if (dIdx >= 0) {
        pPart = str.substr(dIdx + 1);

        if (pPart.length < 3)
            isDot = true;
        else
            isDot = false;
    }

    console.log('pPart', pPart);
    console.log('isDot', isDot);
    if (isDot)
        str = str.replace(/,/g, '');
    else
        str = str.replace(/\./g, '');

    console.log('newStr', str);

    if (isFloat) {
        str = str.replace(/,/g, '.');
        return parseFloat(str);
    }

    return parseInt(str);
};

Utils.json = Utils.toJSON = Utils.toJson = function(obj) {
    var seen = [];
    return JSON.stringify(obj, function(key, val) {
        if (typeof val == "object") {
            if (seen.indexOf(val) >= 0)
                return;
            seen.push(val);
        }
        return val;
    }, 4);
}

Utils._reviverISODate = function(key, value) { // new Date().toISOString() = "2015-12-16T09:17:06.307Z"
    var a;
    if (typeof value === 'string') {
        a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
        if (a) {
            return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
        }
    }
    return value;
}

Utils.parseJSON = function(obj, reviver) {
    try {
        if (!obj) return null;

        switch (typeof obj) {
            case 'object':
                return obj;
            case 'string':
                return reviver ? JSON.parse(obj.trim(), reviver) : JSON.parse(obj.trim());
            default:
                return null;
        }
    } catch (ex) {
        // console.log(ex + '\nObject is not valid JSON string:', obj);
        return null;
    }
}

Utils.strJSON = function(obj, replacer, space) {
    if (!obj)
        return null;

    return JSON.stringify(obj, replacer, space);
}

Utils.keyJSON = function(obj) {
    var key = Utils.strJSON(obj).toString();

    key = key.replace(/(\{|\}|\"|\\|\:|\,)/gi, '');

    return key;
}

Utils.replaceAll = function(find, replace, str) {
    var escapeRegExp = function(string) {
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

Utils.parseHerokuLog = function(data) {
    var words = data.toString().split(' ');

    var time = null;
    if (words.length > 0)
        time = new Date(words[0]);

    var hash = { time: time };
    for (var i = words.length - 1; i >= 0; i--) {
        if (words[i].indexOf('=') < 0)
            continue;

        var val = words[i].split('=');
        hash[val[0]] = val[1];
    };

    return hash;
}

Utils.checkVal = function(hash, key, max) {
    if (!hash[key])
        return true;

    if (parseFloat(hash[key]) > max)
        return false;

    return true;
}

Utils.randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

Utils.genDob = (ageMin, ageMax, format) => {
    let dob = Utils.randomDate(moment().add(ageMax * -1, 'y').toDate(), moment().add(ageMin * -1, 'y').toDate());
    return moment(dob).utcOffset(420).format(format);
}

Utils.zeroPadding = function(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

Utils.toBase64 = (str) => {
    console.log('toBase64', str)

    if (typeof Buffer.from === "function") {
    // Node 5.10+
        base64Str = Buffer.from(str).toString("base64"); // Ta-da
    } else {
        // older Node versions, now deprecated
        base64Str = new Buffer(str).toString("base64"); // Ta-da
    }
    console.log('toBase64 result', base64Str);
    return base64Str;
}

Utils.base64To = (b64string) => {
    console.log('base64To', b64string)
    let buf = null;
    if (typeof Buffer.from === "function") {
    // Node 5.10+
        buf = Buffer.from(b64string, 'base64').toString(); // Ta-da
    } else {
        // older Node versions, now deprecated
        buf = new Buffer(b64string, 'base64').toString(); // Ta-da
    }
    console.log('base64To result', buf)
    return buf
}
Utils.encrypt = (secret_key, str) => {
    try {
        if (!str || !secret_key) return null;

        var cipher = crypto.createCipher('aes-128-ecb', secret_key);

        var chunks = [];
        chunks.push(cipher.update(str.toString("binary"), 'binary', 'binary'))
        chunks.push(cipher.final('binary'));

        var txt = chunks.join("");
        txt = new Buffer(txt, "binary").toString("base64");

        return txt;
    } catch (ex) {
        console.log('Utils.encrypt', ex);
        return null;
    }
}

Utils.decrypt = (secret_key, str64) => {
    try {
        if (!str64 || !secret_key) return null;

        var decipher = crypto.createDecipher('aes-128-ecb', secret_key);

        var chunks = [];
        chunks.push(decipher.update(new Buffer(str64, "base64").toString("binary"), 'binary', 'binary'));
        chunks.push(decipher.final('binary'));
        var txt = chunks.join("");
        txt = new Buffer(txt, "binary").toString("utf-8");

        return txt;
    } catch (ex) {
        console.log('Utils.decrypt', ex);
        return null;
    }
}

Utils.buildSHAkey = () => {

    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'sect239k1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    console.log('{ privateKey, publicKey }', { privateKey, publicKey });

    return { privateKey, publicKey };
}

Utils.createSign = (privateKey, opts) => {
    const sign = crypto.createSign(opts.type);
    sign.write(opts.data);
    sign.end();
    const signature = sign.sign(privateKey, opts.encode);
    console.log("signature", signature);
    return signature;
}

Utils.verifySign = (publicKey, opts) => {
    const verify = crypto.createVerify(opts.type);
    verify.write(opts.data);
    verify.end();
    let result = verify.verify(publicKey, opts.signature, opts.encode);
    console.log('verify', result);

    return result;
}

Utils.cryptENV = (crypt_key) => {
    if (!crypt_key || !process.env.CRYPT_KEY) return;
    var env = _fs.readFileSync('.env', 'utf8')
    if (!env) return { code: 'EREADFILEENV' }
    var result = Utils.encrypt(crypt_key || process.env.CRYPT_KEY, env);
    if (!result) return { code: 'EENCRYPT' }
    _fs.writeFileSync('.env.encrypt', result, 'utf8');
    console.log('cryptENV success')
    return { code: 'SUCCESS' }
}

Utils.decryptENV = (crypt_key) => {
    if (!crypt_key || !process.env.CRYPT_KEY) return;
    var env = _fs.readFileSync('.env.encrypt', 'utf8')
    if (!env) return { code: 'EREADFILEENV' }
    var result = Utils.decrypt(crypt_key || process.env.CRYPT_KEY, env);
    if (!result) return { code: 'EENCRYPT' }
    _fs.writeFileSync('.env2', result, 'utf8');
    console.log('decryptENV success')
    return { code: 'SUCCESS' }
}

Utils.defaultCallback = (err, result) => {
    console.log('DEFAULT_CALLBACK', err, JSON.stringify(result));
}