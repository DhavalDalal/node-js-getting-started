const { spawn } = require('child_process');
const request = require('request');
var test = require('tape');
var child = null;

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
    assert.end()
});

before("Starting the Application...", function (assert) {
  // before logic
  const env = Object.assign({}, process.env, {PORT: 5000});
  child = spawn('node', ['index.js'], {env});
  
  // when done call
  assert.end();
});

test("should return home page", function (assert) {
  // before logic & beforeEach has run
  request('http://127.0.0.1:5000', (error, response, body) => {
    // Successful response
    assert.equal(response.statusCode, 200);
    // Assert content checks
    assert.notEqual(body.indexOf("<title>Stock Prices Server</title>"), -1);
    assert.notEqual(body.indexOf("Getting Stock Prices"), -1);
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
	assert.equal(stocks.length, 4);
	const tickers = stocks.map(stock => stock.ticker);
	assert.deepEqual(tickers, ['AAPL', 'GOOG', 'MSFT', 'ORCL']);
    // Assert content checks
    assert.end();
  });
  // afterEach logic will run
});


after("Stopping The Application!", function (assert) {
    // after logic
    child.kill();
    // when done call
    assert.end();
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
