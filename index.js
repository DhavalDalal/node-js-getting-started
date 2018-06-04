const express = require('express')
const path = require('path');
const url = require('url');
const marketdata = require('./marketdata');

function sendJson(response, statusCode, object) {
  response.setHeader('Content-Type', 'application/json');
  response.status(statusCode);  
  response.send(JSON.stringify(object));
}

function sendErrorJson(response, statusCode, errMessage) {
	sendJson(response, statusCode, { error: errMessage });
}

function isSecure(req){
  return req.headers['x-forwarded-proto'] === 'https';
}

function fullUrl(req, protocol) {
  const modifiedProtocol = isSecure(req) ? protocol.replace(':', 's:') : protocol;
  console.log(`Modified Protocol = ${modifiedProtocol}`);
  return url.format({
    protocol: modifiedProtocol || req.protocol,
    host: req.get('host'),
    pathname: req.originalUrl,
    slashes:true
  });
}

let app = express()
  .use(express.static(__dirname + '/public'))
  //This is important for /public to work in links and script tags
  .use('/public',  express.static(__dirname + '/public')) 
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => {
    res.render('pages/index', {
      req: fullUrl(req), 
      realtimeReq: fullUrl(req, 'ws:')
    });
  })
	//   .post('/stocks', (req, res) => {
	//   	console.info("Posting a new ticker", req.route.stack);
	// var stock = {ticker: req.params.ticker, name: req.params.name};
	// sendJson(res, 200, stock);
	//   })
  .get('/stocks', (req, res) => {
	  console.info("Getting all ticker prices...");
	  sendJson(res, 200, marketdata.getAllTickerPrices());
  })
  .get('/stocks/realtime', (req, res) => {
 	   console.info("Getting all Realtime ticker prices...");
     res.render('pages/realtime', {
       req: fullUrl(req), 
       realtimeReq: fullUrl(req, 'ws:')
     });
   })
   .get('/stocks/realtime/:ticker', (req, res) => {
 	  let ticker = req.params.ticker;
     console.info("Got Realtime Ticker Req Param = ", ticker);
     res.render('pages/realtime', {
       req: fullUrl(req), 
       realtimeReq: fullUrl(req, 'ws:')
     });
   })
  .get('/stocks/:ticker', (req, res) => {
	  let ticker = req.params.ticker;
	  console.info("Got Ticker Req Param = ", ticker);
    try {
      let found = marketdata.getTickerPriceFor(ticker);
      sendJson(res, 200, found);
    } catch(e) {
		  sendErrorJson(res, 404, e.message);    
    }
  })
  .get('/simulateException', (req, res, next) => {
	  const error = new Error('Oops! Something went wrong');
  	console.error("Simulating Server Fail by Exception...", error);
	  // throw new Error('Oops! Something went wrong');
	  sendErrorJson(res, 503, error.message);
  });
  
const http = require('http');
const httpServer = http.createServer();

// Mount the app here
httpServer.on('request', app);
const WebSocketServer = require('ws').Server;
  
// initialize the WebSocket server instance
const wss = new WebSocketServer({
  server : httpServer
});

wss.getUniqueID = function () {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};


wss.on('connection', (ws, req) => {
    // console.info(ws);
    ws.id = wss.getUniqueID();
    wss.clients.forEach(client => console.log(`New Connection ClientID: ${client.id}`));
    const reqURL = url.parse(req.url, true);
    console.log(`Path = ${reqURL.pathname}`);
    //connection is up, let's add a simple simple event
    ws.on('message', message => {
      console.log(`client [${ws.id}] => server: ${message}`);
      if (message === 'subscribe') {
        console.log(`Path = ${reqURL.pathname}`);
        console.log(`Path Basename  = ${path.basename(reqURL.pathname)}`);
        let ticker = path.basename(reqURL.pathname);
        const marketDataObservable = (ticker === 'realtime') ? 
                marketdata.streamAllTickerPrices() : marketdata.streamTickerPriceFor(ticker);
        ws.marketdataSubscription = marketDataObservable.subscribe(stock => {
          const data = JSON.stringify(stock);
          console.log(`server => client [${ws.id}]: ${data}`);
          ws.send(data);
        }, error => {
          console.error(`server => client [${ws.id}]: ${error.message}`);
          ws.send(error.message);
        });
        return;
      }

      if (message === 'unsubscribe') {
        console.log(`unsubscribing client [${ws.id}]`);
        ws.marketdataSubscription.dispose();
        ws.send(`server => client [${ws.id}]: unsubscribed`);
        return;
      }
    });

    ws.on('close', closeMessage => {
      console.log(`client [${ws.id}] closed: ${closeMessage}`);
    });
    //send immediately a feedback to the incoming connection
    ws.send('Hi there, I am a WebSocket server');
});

const PORT = process.env.PORT || 5000
// Let us start our server
httpServer.listen(PORT, () => console.log(`Listening on ${ PORT }`));

exports.stop = function stop() {
	httpServer.close(() => console.log(`Shutdown server...`));
}
