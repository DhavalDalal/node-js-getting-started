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
	sendJson(response, statusCode, {
		error: errMessage
	});
}

function isSecure(req) {
	return req.headers['x-forwarded-proto'] === 'https';
}

function useSecureProtocolIfRequired(req, protocol) {
	if (protocol === undefined) {
		return req.protocol;
	}
	return isSecure(req) ? protocol.replace(':', 's:') : protocol;
	console.log(`Modified Protocol = ${modifiedProtocol}`);
}

function fullUrl(req, protocol) {
	return url.format({
		protocol: useSecureProtocolIfRequired(req, protocol),
		host: req.get('host'),
		pathname: req.originalUrl,
		slashes: true
	});
}

let app = express()
	.use(express.json())
	.use(express.static(__dirname + '/public'))
	//This is important for /public to work in links and script tags
	.use('/public', express.static(__dirname + '/public'))
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
	// req.body.variable_name for 'Content-Type: application/x-www-form-urlencoded'
	// sendJson(res, 200, stock);
	//   })
	.get('/stocks', (req, res) => {
		console.info("Got req for all ticker prices...");
        marketdata.getAllTickerPrices()
            .then(result => sendJson(res, 200, result))
            .catch(error => sendErrorJson(res, 404, error.message));
	})
	.get('/stocks/realtime', (req, res) => {
		console.info("Got Realtime req for all ticker prices...");
		res.render('pages/realtime', {
			req: fullUrl(req),
			realtimeReq: fullUrl(req, 'ws:')
		});
	})
	.get('/stocks/realtime/:ticker', (req, res) => {
		let ticker = req.params.ticker;
		console.info(`Got Realtime req for ${ticker}...`);
		res.render('pages/realtime', {
			req: fullUrl(req),
			realtimeReq: fullUrl(req, 'ws:')
		});
	})
	.get('/stocks/:ticker', (req, res) => {
		let ticker = req.params.ticker;
		console.info(`Got req for ${ticker}...`);
		marketdata.getTickerPriceFor(ticker)
		  .then(result => sendJson(res, 200, result))
		  .catch(error => sendErrorJson(res, 404, error.message));
	})
	.get('/simulateException', (req, res, next) => {
		const error = new Error('Oops! Something went wrong');
		console.error("Simulating Server Fail by Exception...", error);
		// throw new Error('Oops! Something went wrong');
		sendErrorJson(res, 503, error.message);
	})
	.get('/config', async (req, res) => {
		console.info("Got Configuration req...");
    const configData = await marketdata.getConfigurationData();
		res.render('pages/config', {
  			req: fullUrl(req),
  			realtimeReq: fullUrl(req, 'ws:'),
        configData: configData
		});
	})
	.get('/config/resetRequestCounter', (req, res) => {
		console.info("Got req for all ticker prices...");
        marketdata.resetTotalRequests()
            .then(result => sendJson(res, 200, result))
            .catch(error => sendErrorJson(res, 500, error.message));
	})
    .post('/config/updateRefreshEveryRequest', (req, res) => {
	  	console.info("Updating Refresh Every Request value", req.route.stack);
		const refresh_stocks_every_requests = req.body.refresh_stocks_every_requests;
		if (refresh_stocks_every_requests === undefined) {
			const error = new Error("Correct Request_example => { 'refresh_stocks_every_requests' : 20 }");
			sendErrorJson(res, 400, error.message);
		} else {
			marketdata.updateRefreshRequestCount(refresh_stocks_every_requests)
				.then(result => sendJson(res, 200, result))
				.catch(error => sendErrorJson(res, 500, error.message));
		}		
	});

const http = require('http');
const httpServer = http.createServer();

// Mount the app here
httpServer.on('request', app);
const wsServer = require('./websocket-server');
// Start WebSocketServer and mount it on httpServer
// so they listen on the same port.
wsServer.start({
	server: httpServer
});

const PORT = process.env.PORT || 5000
	// Let us start our server
httpServer.listen(PORT, () => console.log(`Listening on ${ PORT }`));

exports.stop = function stop() {
	httpServer.close(() => console.log(`Shutdown server...`));
}
