const { spawn } = require('child_process');
const request = require('request-promise');
var test = require('tape');
let child = null;

// before/after/beforeEach/afterEach based on
// https://github.com/substack/tape/issues/59
// Make sure the order of declarations of functions beforeEach,
// afterEach, before, test(s) and after are respected.
// Your tests are going to be between before and after.

const before = test
const after = test

var test = beforeEach(test, function before(assert) {
    // called before each thing
    assert.pass('Before Each Test');
    // when done call
    assert.end();
});

test = afterEach(test, function after(assert) {
    // called after each thing
    assert.pass('After Each Test');
    // when done call
    assert.end();
});

before("Starting the Application...", function (assert) {
  // before logic
  const env = Object.assign({}, process.env, {PORT: 5000});
  child = spawn('node', ['index.js'], {env});
  let calledOnce = false;
  child.stdout.on('data', (data) => {
    if (calledOnce === false) {
      calledOnce = true;
      console.info(`Server Started. ${data}`);
      // when done call
      assert.end();
    }
  });
});

test("should return home page", function (assert) {
  // before logic & beforeEach has run
  request('http://127.0.0.1:5000', (error, response, body) => {
    // Successful response
    assert.equal(response.statusCode, 200);
    // Assert content checks
    assert.notEqual(body.indexOf("<title>Stock Prices Server</title>"), -1);
    assert.notEqual(body.indexOf("Snapshot Stock Prices"), -1);
    assert.notEqual(body.indexOf("Realtime Stock Prices"), -1);
    assert.end();
  });
  // afterEach logic will run
});


test("Gets All Stocks", function (assert) {
  // before logic & beforeEach has run
  request('http://127.0.0.1:5000/stocks', (error, response, body) => {
    // Successful response
    assert.equal(response.statusCode, 200);
  	const stocks = JSON.parse(body);
	  assert.equal(stocks.length, 6);
	  const tickers = stocks.map(stock => stock.ticker);
	  assert.deepEqual(tickers, ['AAPL', 'AMZN', 'GOOG', 'MSFT', 'ORCL', 'YHOO']);
    // Assert content checks
    assert.end();
  });
  // afterEach logic will run
});

test("Gets A Stock by ticker", function (assert) {
  const options = {
    uri: 'http://127.0.0.1:5000/stocks/AAPL',
    method: 'GET',
    json: true // Automatically parses the JSON string in the response
  };
  request(options)
    .then(stock => {
      assert.equal(stock.ticker, 'AAPL');
      assert.equal(stock.name, 'Apple Inc.');
      assert.true(stock.price >= stock.low);
      assert.true(stock.price <= stock.high);
      assert.end();
    })
   .catch(error => {
      assert.fail('Should have got stock by Ticker code');
    });
});

test("Shouts when trying to obtain A Stock by unknown ticker", function (assert) {
  const options = {
    uri: 'http://127.0.0.1:5000/stocks/UNKNOWN',
    method: 'GET',
    json: true // Automatically parses the JSON string in the response
  };
  request(options)
    .then(stock => {
      assert.fail('Should NOT have got stock by UNKNOWN Ticker code');
    })
    .catch(error => {
      const response = error.response;
      assert.equal(response.statusCode, 404);
      assert.deepEqual(response.body, { error: 'Ticker UNKNOWN Not found!' });
      assert.end();
    });
});

after("Stopping The Application!", function (assert) {
    // after logic
    child.kill();
    child.on('exit', (code, signal) => {
      console.log(`Server Shutdown.  Exited with code ${code} and signal ${signal}`);
      // when done call
      assert.end();
    });
  });

function beforeEach(test, handler) {
    return function tapish(name, listener) {
        test(name, function (assert) {
            var _end = assert.end
            assert.end = function () {
                assert.end = _end
                listener(assert)
            }
            handler(assert)
        })
    }
}

function afterEach(test, handler) {
    return function tapish(name, listener) {
        test(name, function (assert) {
            var _end = assert.end
            assert.end = function () {
                assert.end = _end
                handler(assert)
            }
            listener(assert)
        })
    }
}
