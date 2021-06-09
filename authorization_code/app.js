require('dotenv').config()

//import {songs} from '../public/index.html';

/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

 // mongodb connection
 const { MongoClient } = require("mongodb");
//  import * as mongodb from 'mongodb';
//  const MongoClient = mongodb.MongoClient; 
 // Replace the uri string with your MongoDB deployment's connection string.
 const uri =
   "mongodb+srv://bbwrgw:1549!hehe@cluster0.aikdg.mongodb.net?retryWrites=true&writeConcern=majority";
 
 const client = new MongoClient(uri, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
 });
 
 // async function run() {
 //   try {
 //     await client.connect();
 
 //     const database = client.db("test");
 //     const movies = database.collection("test");
 
 //     // Query for a movie that has the title 'Back to the Future'
 //     const query = { title: "hi" };
 //     const movie = await movies.findOne(query);
 
 //     console.log(movie);
 //   } finally {
 //     // Ensures that the client will close when you finish/error
 //     await client.close();
 //   }
 // }




var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var fetch = require("node-fetch");
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
require("dotenv").config();
const env = "" + process.env.NODE_ENV;

// var client_id = env.REACT_APP_CLIENT_ID; // Your client id
// var client_secret = env.REACT_APP_CLIENT_SECRET; // Your secret
// var redirect_uri = env.REACT_APP_REDIRECT_URI; // Your redirect uri


let user_id = "";


// hard code in env variables for now here

console.log("client_id");
//console.log(env);
//console.log(client_id);

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';
const user_songs = new Set();
var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-library-read playlist-read-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/login/:email', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-library-read playlist-read-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  let songs = [];
  let songsUri = new Set();
  const getData = async (url, access_token, callback) => {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + access_token,
      },
    });
    //turning the response into the usable data
    const data = await response.json();
    songs = songs.concat(data.items);
    //now do whatever your want with this data.
    //console.log(data);
    //console.log("Songs", songs);
    if (data.next !== null) {
      //console.log("recursive fetch", data.next);
      getData(data.next, access_token, callback);
    } else {
      callback(songs);
    }
  };


  // THIS IS WHERE TO POPULATE THE DATABSE WITH THE SONGS

  // if form empty
  async function run(songs) {
    try {
      await client.connect();
      const database = client.db("test");
      const date = new Date();
      let collect = user_id + date.getMinutes() + date.getDay();
      const testItems = database.collection(collect);
      // create a document to be inserted
      //songList = [];
      for(song of songs){
        songsUri.add(song.track.uri)
      }
      let songList = Array.from(songsUri);
      //console.log(songList);
      const doc = { songList: songList };
      const result = await testItems.insertOne(doc);
      console.log(
        `${result.insertedCount} documents were inserted with the _id: ${result.insertedId}`,
      );
      
    } finally {
      await client.close();
    }
  }

  async function printCollections(){
    try {
      await client.connect();
      const database = client.db("test");
      const items = database.getCollectionNames();
      for (item of items) {
        console.log(database.getCollection(item).find());

      }
    }
    finally {
      await client.close();
    }
  };
    
  

  // if form not empty
  // insert into premade playlist with given name

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };
        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          //console.log(body);
          var users_id = body.id;
          user_id = body.email;
          var options2 = {
            url: 'https://api.spotify.com/v1/users/' + users_id + '/playlists',
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
          };
          request.get(options2, function(error, response, bodys){
            //console.log(bodys);
            for(i in bodys.items){
              //console.log(bodys.items[i]);
              var link = bodys.items[i].tracks.href;
              //console.log(link)
              var options3 = {
                url: link,
                headers: {'Authorization':'Bearer ' + access_token},
                json: true
              }
              request.get(options3, function(error, response, body2){
                //console.log("Playlist:", body2);
                //console.log(body2.items)
                for(each in body2.items){
                  //console.log(each)
                  //console.log(body2.items[each].track.uri)
                  songsUri.add(body2.items[each].track.uri)
                }
              });
            }
          });
        });
        getData(
          "https://api.spotify.com/v1/me/tracks?limit=50",
          access_token,
          run
        );
        // printCollections();

        
       

        



        // var options = {
        //   url: 'https://api.spotify.com/v1/me/tracks',
        //   headers: { 'Authorization': 'Bearer ' + access_token },
        //   json: true
        // };
        // request.get(options, function(error, response, body){
        //   //console.log(body.items);
        //   body.items.forEach(song => {
        //     user_songs.add(song.track.id)
        //     //console.log(song.track.name)
        //   });
        //   //console.log("Done")
        //   //console.log(user_songs)
        // });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});



console.log('Listening on 8888');
app.listen(process.env.PORT||8888);