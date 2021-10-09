const http = require('http');
const https = require('https');
const querystring = require('querystring');
const url = require('url');

function request(options) {
  if (typeof options === 'string') {
    options = {
      url: options,
    };
  }
  let client;
  if (options.url) {
    client = options.url.startsWith('http:') ? http : https;
    const requrl = url.parse(options.url);
    options.host = requrl.hostname;
    options.port = requrl.port;
    if (!options.port) {
      options.port = options.url.startsWith('http:') ? 80 : 443;
    }
    options.path = requrl.path;
    delete options.url;
  }
  if (!client) {
    client = options.port === 80 ? http : https;
  }
  let { postData } = options;
  if (postData) {
    if (typeof postData !== 'string') {
      postData = querystring.stringify(postData);
    }
    delete options.postData;
    if (!options.headers) {
      options.headers = {};
    }
    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/x-wwww-form-urlencoded';
    }
    if (!options.headers['Content-Length']) {
      options.headers['Content-Length'] = postData.length;
    }
  }
  if (!options.method) {
    options.method = 'GET';
  }
  const proxyServer =
    options.proxy ||
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY;
  if (proxyServer) {
    try {
      delete options.proxy;
      if (client === https) {
        const HttpsProxyAgent = require('https-proxy-agent');
        options.agent = new HttpsProxyAgent(proxyServer);
      } else {
        const HttpProxyAgent = require('http-proxy-agent');
        options.agent = new HttpProxyAgent(proxyServer);
      }
      if (!options.headers) {
        options.headers = {};
      }
      options.headers['Proxy-Connections'] = 'keep-alive';  
    } catch (ex) {
      console.log('EDOCKCORE:RequestProxyError:', ex);
    }
  }

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let result = '';
      res.on('data', (chunk) => {
        result += chunk;
      });
      res.on('end', () => {
        try {
          const obj = JSON.parse(result);
          resolve(obj);
        } catch (err) {
          resolve(result);
        }
      });
      res.on('error', (err) => reject(err));
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

module.exports = request;
