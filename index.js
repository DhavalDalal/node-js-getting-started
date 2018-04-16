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

function sendJson(response, object) {
  response.setHeader('Content-Type', 'application/json');
  response.send(JSON.stringify(object));
}

function sendErrorJson(res, statusCode, errObject) {
	res.status(404);  
	sendJson(res, { error: errObject });
}

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/stocks', (req, res) => {
	  console.info("Getting all ticker prices...");
	  let stocksWithPrices = STOCKS.map(stock => {
		  stock.price = randomNumberBetween(stock.low, stock.high, 2);
		  return stock;
	  });
	  sendJson(res, stocksWithPrices);
  })
  .get('/stocks/:ticker', (req, res) => {
	  let ticker = req.params.ticker;
	  console.info("Got Ticker Req Param = ", ticker);
	  let found = STOCKS.filter(stock => stock.ticker === ticker)[0];
	  if (found) {
		  found.price = randomNumberBetween(found.low, found.high, 2);
		  sendJson(res, found);
	  } else 
		  sendErrorJson(res, 404, 'Ticker ' + ticker + ' Not found!');
  })
  .get('/simulateException', (err, req, res, next) => {
  	  console.info("Simulating Server Fail by Exception...");
	  // throw new Error('Oops! Something went wrong');
	  sendErrorJson(res, 500, new Error('Oops! Something went wrong'));
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
