const express = require("express");
const cors = require('cors');
const axios = require('axios');
const geohash = require('geo-hash');
const mime = require('mime');
const port = process.env.PORT || 3000;

let app = express();

app.use(cors());

const apiKey = 'kUfiRPVWAEqAP2o4qO9BrLKaA1mj0RZk';

app.get('/suggestAttractions', (req, res) => {
    const keyword = req.query.keyword;
    let url = `https://app.ticketmaster.com/discovery/v2/suggest?apikey=${apiKey}&keyword=${keyword}`;
    axios.get(url)
        .then(function (response) {
            console.log(response.data);
            res.send(response.data); // send it to the frontend
        })
        .catch(function (error) {
            console.log(error);
            res.send(error);
        });
});

app.get('/searchEvents', (req, res) => {
    // console.log(req.query)
    const keyword = req.query.keyword;
    const radius = req.query.radius;
    const segmentId = req.query.segmentId;
    const lat = req.query.lat;
    const lng = req.query.lng;
    const geoPoint = geohash.encode(lat, lng, 7); // latitude: any, longitude: any, precision: any
    axios.get(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&keyword=${keyword}&radius=${radius}&segmentId=${segmentId}&geoPoint=${geoPoint}`)
        .then(response => {
            console.log(response.data);
            res.send(response.data); // send it to the frontend
        })
        .catch(error => {
            console.log(error);
            res.send(error);
        });
});

app.get('/eventDetails', (req, res) => {
    const eventId = req.query.eventId;
    axios.get(`https://app.ticketmaster.com/discovery/v2/events/?apikey=${apiKey}&id=${eventId}`)
        .then(response => {
            console.log(response.data);
            res.send(response.data); // send it to the frontend
        })
        .catch(error => {
            console.log(error);
            res.send(error);
        });
});

app.get('/venueDetails', (req, res) => {
    const keyword = req.query.keyword;
    axios.get(`https://app.ticketmaster.com/discovery/v2/venues/?apikey=${apiKey}&keyword=${keyword}`)
        .then(response => {
            console.log(response.data);
            res.send(response.data); // send it to the frontend
        })
        .catch(error => {
            console.log(error);
            res.send(error);
        });
});

// spotify
var SpotifyWebApi = require('spotify-web-api-node');
var clientId = 'f17b44a3764746d2bdd3c74f2c7f2c01',
    clientSecret = 'f1e3d57440674dd2897c8cd8b8a9122c';

// Create the api object with the credentials
var spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret
});

app.get('/spotifyAccessToken', (req, res) => {
    // Retrieve an access token.
    spotifyApi.clientCredentialsGrant().then(
        function (data) {
            console.log('The access token expires in ' + data.body['expires_in']);
            console.log('The access token is ' + data.body['access_token']);

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
            res.send(data.body['access_token']);
        },
        function (err) {
            console.log('Something went wrong when retrieving an access token', err);
        }
    );
});

app.get('/searchArtists', (req, res) => {
    // pass in keyword
    const keyword = req.query.keyword;
    const accessToken = req.query.accessToken;
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.searchArtists(keyword)
        .then(function (data) {
            // console.log('Search artists by ' + keyword + ': ');
            console.log(data.body.artists.items);
            let artists = JSON.stringify(data.body.artists.items); // convert to JSON string
            res.send(JSON.stringify(artists)); // convert to string
        }, function (err) {
            console.error(err);
        });
});

app.get('/getArtistAlbums', (req, res) => {
    const id = req.query.id;
    const accessToken = req.query.accessToken;
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.getArtistAlbums(
        id,
        { limit: 3 },
    )
        .then(function (data) {
            console.log(data.body);
            let albums = JSON.stringify(data.body); // convert to JSON string
            res.send(JSON.stringify(albums)); // convert to string
        }, function (err) {
            console.error(err);
        });
})

app.use('/', express.static('frontend/dist/frontend'));

// for testing locally
app.listen(port, (req, resp) => {
    console.log('express api is running now on port ' + port);
});
