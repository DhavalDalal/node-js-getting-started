QuoteViewModel = function(name, ticker, low, high, price, change) {
	this.name = ko.observable(name);
	this.ticker = ko.observable(ticker);
	this.low = ko.observable(low);
	this.high = ko.observable(high);
	this.price = ko.observable(Number(price));
	this.change = ko.observable(Number(change));
	this.changeColor = ko.observable();
	this.glyphiconDirection = ko.observable();
	this.glyphiconColor = ko.observable();
};

QuoteViewModel.prototype.updateChange = function(oldPrice) {
	this.change(Number((oldPrice - this.price()) * -1).toFixed(2));
	this._updateChangeAttribs(oldPrice);
};

QuoteViewModel.prototype._updateChangeAttribs = function(oldPrice) {
	const currentPrice = this.price();
	if (oldPrice > currentPrice) {
		this.changeColor('danger');
		this.glyphiconDirection('glyphicon glyphicon-arrow-down');
		this.glyphiconColor('color: red');
		return;
	}

	if (oldPrice < currentPrice) {
		this.changeColor('success');
		this.glyphiconDirection('glyphicon glyphicon-arrow-up');
		this.glyphiconColor('color: green');
		return;
	}

	if (oldPrice === currentPrice) {
		this.changeColor('');
		this.glyphiconDirection('');
		this.glyphiconColor('');
		return;
	}
};
