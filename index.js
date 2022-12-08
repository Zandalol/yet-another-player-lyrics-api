require('dotenv').config()
const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');
const cors = require('cors');
const p = require('phin');


const callAPI = async (title) => {
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
		return response.data.response.hits[0].result;
	} catch (error) {
		console.error(error);
	};
};


const getInfo = (obj) => {
	console.log(obj);
	return new Object({
		artist: {
			name: obj.primary_artist.name,
			image_url: obj.primary_artist.image_url,
			header_image_url: obj.primary_artist.header_image_url
		},
		featured_artists: obj.featured_artists,
		title: obj.title,
		title_with_featured: obj.title_with_featured,
		song_art_image_url: obj.song_art_image_url,
		song_art_image_thumbnail_url: obj.song_art_image_thumbnail_url,
		release_date_components: obj.release_date_components,
		release_date_for_display: obj.release_date_for_display,
		language: obj.language,
	})
};


const scrapeLyrics = async (url) => {
	const res = await p(url)
	try {
		const fullHTML = res.body

		const $ = cheerio.load(fullHTML)
		let lyrics = $('div.lyrics').text()

		/* genius.org serves two DOMs for its lyrics pages, the below
		   scrapes the second style (that does not contain a lyrics div) */

		if (!lyrics) {
			$('[class^=Lyrics__Container]').each((i, el) => {
				const html = $(el).html()
				const lined = html.replace(/<br\s*[\/]?>/gi, "\n")
				const stripped = lined.replace(/<[^>]+>/ig, '')
				const trimmed = stripped.trim()
				// console.log(stripped)
				lyrics += trimmed
			})
		}
		if (!lyrics || fullHTML.includes('Lyrics for this song have yet to be')) {
			console.log('Failed to capture lyrics or none present')
			if (fullHTML.includes('Burrr!'))
				console.log('could not find url ', url)
			return null
		}

		return lyrics
	}
	catch (e) {
		console.log(e)
		return null
	}
};


const app = express();
app.use(cors());

app.get("/lyrics", async (req, res) => {
	if (req.query.title) res.send(await scrapeLyrics(await callAPI(req.query.title)));
	else res.send(null);
});

app.get("/info", async (req, res) => {
	if (req.query.title) res.send(getInfo(await callAPI(req.query.title)))
	else res.send(null);
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
	console.log(`Listening on port ${port}\n`);
});


module.exports = app;
