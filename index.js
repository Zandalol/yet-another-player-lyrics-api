require('dotenv').config()
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const chromium = require('chrome-aws-lambda');


const getURL = async (title) => {
	try {
		const response = await axios({
			method: 'GET',
			headers: {
				'Authorization': 'Bearer ' + process.env.API_KEY,
				'Accept-Encoding': 'application/json'
			},
			baseURL: 'https://api.genius.com/',
			url: 'search',
			params: {
				'q': title
			}
		});
		return response.data.response.hits[0].result.url;
	} catch (error) {
		console.error(error);
	};
};


const scrapeLyrics = async (url) => {
	const browser = await chromium.puppeteer.launch({
		args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
		defaultViewport: chromium.defaultViewport,
		executablePath: await chromium.executablePath,
		headless: true,
		ignoreHTTPSErrors: true,
	});

	const page = await browser.newPage();
	await page.setRequestInterception(true);
	page.on('request', (req) => {
		if (req.resourceType() == 'font' || req.resourceType() == 'image') {
			req.abort();
		}
		else {
			req.continue();
		}
	});
	await page.goto(url);

	const selector = `div[data-lyrics-container="true"]`
	await page.waitForSelector(selector);
	const lyrics = await page.$$eval(selector, arrayOfDivs => arrayOfDivs.map(div => div.innerText));

	await browser.close();

	return lyrics;
};


const app = express();
app.use(cors());

app.get("/", async (req, res) => {
	res.send(await scrapeLyrics(await getURL('дао')));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
	console.log(`Listening on port ${port}\n`);
});


module.exports = app;
