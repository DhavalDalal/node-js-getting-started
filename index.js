const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000


const STOCKS = [
	{ticker: 'AAPL', name: 'Apple Inc.', low: 30.35, high: 60.45},
	{ticker: 'GOOG', name: 'Google Inc.', low: 90.67, high: 160.34},
	{ticker: 'MSFT', name: 'Microsoft Inc.', low: 20.56, high: 40.23},
	{ticker: 'ORCL', name: 'Oracle Inc.', low: 50.10, high: 90.19},
];

function randomNumberBetween(min, max, decimalPlaces) {
	// return int value
    // return Math.floor(Math.random() * (max - min + 1) + min);
	// return decimal value
	let decimalValue = Math.random() * (max - min + 1) + min;
    return decimalValue.toFixed(decimalPlaces);
}

function sendJson(response, statusCode, object) {
  response.setHeader('Content-Type', 'application/json');
  response.status(statusCode);  
  response.send(JSON.stringify(object));
}

function sendErrorJson(response, statusCode, errMessage) {
	sendJson(response, statusCode, { error: errMessage });
}

const server = express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
	//   .post('/stocks', (req, res) => {
	//   	console.info("Posting a new ticker", req.route.stack);
	// var stock = {ticker: req.params.ticker, name: req.params.name};
	// sendJson(res, 200, stock);
	//   })
  .get('/stocks', (req, res) => {
	  console.info("Getting all ticker prices...");
	  let stocksWithPrices = STOCKS.map(stock => {
		  stock.price = randomNumberBetween(stock.low, stock.high, 2);
		  return stock;
	  });
	  sendJson(res, 200, stocksWithPrices);
  })
  .get('/stocks/:ticker', (req, res) => {
	  let ticker = req.params.ticker;
	  console.info("Got Ticker Req Param = ", ticker);
	  let found = STOCKS.filter(stock => stock.ticker === ticker)[0];
	  if (found) {
		  found.price = randomNumberBetween(found.low, found.high, 2);
		  sendJson(res, 200, found);
	  } else
		  sendErrorJson(res, 404, 'Ticker ' + ticker + ' Not found!');
  })
  .get('/simulateException', (req, res, next) => {
	  const error = new Error('Oops! Something went wrong');
  	  console.error("Simulating Server Fail by Exception...", error);
	  // throw new Error('Oops! Something went wrong');
	  sendErrorJson(res, 503, error.message);
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

exports.stop = function stop() {
	server.close(() => console.log(`Shutdown server...`));
}