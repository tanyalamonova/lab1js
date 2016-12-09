var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');

var counter = 0;
var baseUrl = 'http://mosigra.ru'; // without ending slash
var globalInternalUrlList = [];
var globalEmailList = [];


function addInternalUrlList(internalUrlList) {
	globalInternalUrlList = globalInternalUrlList.concat(internalUrlList);
	globalInternalUrlList = _.uniq(globalInternalUrlList);
}

function getNextInternalUrl() {
	if (counter < 10) {
		var nextInternalUrl = globalInternalUrlList[counter];
		counter++;
		return nextInternalUrl || null;
	} else {
		return null;
	}
}

function addEmailList(emailList) {
	globalEmailList = globalEmailList.concat(emailList);
	globalEmailList = _.uniq(globalEmailList);
}

function getProtocol(url) {
	var result = url.split('://');

	if (result instanceof Array && result.length > 1) {
		return result[0];
	} else {
		return null;
	}
}

function getDomain(url) {
	var result = /https?:\/\/((?:[\w\d-]+\.)+[\w\d]{2,})/i.exec(url);
	return result ? result[1] : null;
}

function getEmailListFromHrefList(hrefList) {
	return hrefList
		.filter(function(item) {
			return /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/ig.exec(item);
		})
		.map(function(item) {
			return item.replace('mailto:', '');
		});
}

function getInternalUrlListFromHrefList(hrefList) {
	var internalProtocol = getProtocol(baseUrl);
	var internalDomain = getDomain(baseUrl);

	var internalUrlList = hrefList
		.filter(function(item) {
			if (item.indexOf('//') === 0) {
				item = internalProtocol + item;
			}

			var domain = getDomain(item);

			if (domain) {
				return domain === internalDomain;
			} else {
				return item.indexOf('/') === 0;
			}
		})
		.map(function(item) {
			var domain = getDomain(item);
			return domain ? item : baseUrl + item;
		});

	return _.uniq(internalUrlList);
}

function processUrl(url) {
	return new Promise(function(resolve) {
		request(url, function (error, response, body) {

			if (error || !body) {
				resolve();
			}

			var $ = cheerio.load(body);
			var hrefList = [];
			$('a[href]').each(function() {
				var href = $(this).attr('href');
				hrefList.push(href);
			});

			var emailList = getEmailListFromHrefList(hrefList);
			var internalUrlList = getInternalUrlListFromHrefList(hrefList);

			addInternalUrlList(internalUrlList);
			addEmailList(emailList);

			resolve();

		});
	});
}

function doStep() {
	var nextInternalUrl = getNextInternalUrl();

	if (nextInternalUrl) {
		processUrl(nextInternalUrl).then(doStep);
	} else {
		console.log('Email list:');
		globalEmailList.forEach(function(item) {
			console.log(item);
		})
	}
}

addInternalUrlList([baseUrl + '/']);
doStep();
