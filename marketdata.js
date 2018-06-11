const rx = require('rxjs');
const { merge, share } = require('rxjs/operators');

// console.debug(`Market Data...`);
const STOCKS = [{
	ticker: 'AAPL',
	name: 'Apple Inc.',
	low: 50.35,
	high: 60.45,
	tickMillis: {
		low: 2000,
		high: 3000
	}
}, {
	ticker: 'GOOG',
	name: 'Google Inc.',
	low: 90.67,
	high: 120.34,
	tickMillis: {
		low: 1000,
		high: 2000
	}
}, {
	ticker: 'MSFT',
	name: 'Microsoft Inc.',
	low: 20.56,
	high: 34.23,
	tickMillis: {
		low: 3000,
		high: 4000
	}
}, {
	ticker: 'ORCL',
	name: 'Oracle Inc.',
	low: 65.10,
	high: 80.19,
	tickMillis: {
		low: 4000,
		high: 8000
	}
}, 
{
	ticker: 'YHOO',
	name: 'Yahoo Inc.',
	low: 20.10,
	high: 35.19,
	tickMillis: {
		low: 8000,
		high: 10000
	}
}
];

const randomNumberBetween = function(min, max, decimalPlaces = 0) {
	// return Math.floor(Math.random() * (max - min + 1) + min);
	// return decimal value
	let decimalValue = (Math.random() * (max - min)) + min;
	if (decimalPlaces === 0)
		return Number.parseInt(decimalValue.toFixed(decimalPlaces));
	else
		return Number.parseFloat(decimalValue.toFixed(decimalPlaces));
};

const getAllTickerPrices = function() {
	console.log(`getAllTickerPrices()`);
	const stocks = [];
	STOCKS.forEach(stock => {
		stock.price = randomNumberBetween(stock.low, stock.high, 2);
		stocks.push(stock);
	});
	return stocks;
};

const getTickerPriceFor = function(ticker) {
	console.log(`getTickerPriceFor(${ticker})`);
	const found = getAllTickerPrices().filter(stock => stock.ticker === ticker)[0];
	if (found)
		return found;
	else
		throw new Error(`Ticker ${ticker} Not found!`);
};

const initializeTickerStreamFor = function(ticker, shared = true) {
	console.log(`initializeTickerStreamFor(${ticker})`);
	try {
		const stock = getTickerPriceFor(ticker);
		const tickerStream = new rx.Observable(observer => {
		  let timeout = null;
		  // recursive to send a random price to the subscriber after a random tick delay
		  // we never send complete or error
		  (function nextValue() {
		    timeout = setTimeout(
		      () => {
						stock.price = randomNumberBetween(stock.low, stock.high, 2);
		        observer.next(stock);
		        nextValue();
		      },
					// tick every millis
		      randomNumberBetween(stock.tickMillis.low, stock.tickMillis.high) 
		    );
		  })();
		  // on unsubscribe
		  return () => clearTimeout(timeout);
		});
		return (shared === true) ? tickerStream.pipe(share()) : tickerStream;
	} catch (e) {
		return rx.throwError(e);
	}
};

const initializeTickerStreams = function (shared) {
	const streams = new Map();
	getAllTickerPrices().forEach(stock => {
		const stream = initializeTickerStreamFor(stock.ticker, shared);
		streams.set(stock.ticker, stream);
	});
	return streams;
};

console.log(`Creating Ticker streams...`);
const TICKERSTREAMS = initializeTickerStreams();
console.log(TICKERSTREAMS);

module.exports = {
	getTickerPriceFor: getTickerPriceFor,
	getAllTickerPrices: getAllTickerPrices,
	streamTickerPriceFor: function(ticker) {
		console.log(`streamTickerPriceFor(${ticker})`);
		if (TICKERSTREAMS.has(ticker)) {
			return TICKERSTREAMS.get(ticker);
		} 
		return rx.throwError(e);
	},
	streamAllTickerPrices: function() {
		console.log(`streamAllTickerPrices()`);
		return STOCKS.map(stock => this.streamTickerPriceFor(stock.ticker)).reduce((o1, o2) => o1.pipe(merge(o2)));
	}
}
