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

var express = require("express"); // Express web server framework
var request = require("request"); // "Request" library
var fetch = require("node-fetch");
var cors = require("cors");
var querystring = require("querystring");
var cookieParser = require("cookie-parser");
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");
const { access } = require("fs");
require("dotenv").config();
const env = "" + process.env.NODE_ENV;
let access_global;
let id_global;

// var client_id = env.REACT_APP_CLIENT_ID; // Your client id
// var client_secret = env.REACT_APP_CLIENT_SECRET; // Your secret
// var redirect_uri = env.REACT_APP_REDIRECT_URI; // Your redirect uri

var client_id = "ce055013e8034e8a85053bab3f3cacbc";
var client_secret = "0bcf07503bc64f9c829d3440da5bc6cc";
var redirect_uri = "http://localhost:8888/callback";

let user_id = "";

// hard code in env variables for now here

//console.log("client_id");
//console.log(env);
//console.log(client_id);

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = "spotify_auth_state";
const user_songs = new Set();
var app = express();

app
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser());

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope =
    "user-read-private user-read-email user-library-read playlist-read-private playlist-modify-private playlist-modify-private, playlist-modify";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/existingplaylist/:email", function (req, res) {

  var trackList = [];
  const songs = []
  
  async function postPlaylist(url, data, access_token){
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + access_token,
      },
      body: JSON.stringify(data)
    });
    return response.json()
  }
  

  async function getSongs(email, bool) {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await client.connect();
      const database = client.db("test");
      //console.log("log songs");
      let collection = database.collection("test");
      await collection.findOne({email: email})
        .then(data => {
          songs.push(data.songs)
          console.log("songs");
          console.log(songs);
          if(bool == true){
            //console.log(songs);
            let combined_songs = new Set(); 
            for(user of songs){
              for(user2 of songs){
                //console.log('user', user, 'user2', user2)
                if(user !== user2){
                  for(let i = 0; i < user.length; i++){
                    for(let y = 0; y < user2.length; y++){
                      if(user[i] == user2[y]){
                        combined_songs.add(user[i])
                      }
                    }
                  }
                }
              }
            };
            console.log("combined");
            console.log(combined_songs);
            let url = "https://api.spotify.com/v1/users/" + id_global + "/playlists"
            let data = {
              name: "396 Project Playlist",
              public: true,
              description: "Playlist made by Ben Blakeway-Webb and Roxy Wilcox's app."
            }
            postPlaylist(url, data, access_global)
            .then(data => {
              console.log("data")
              console.log(data)
              let playlist_id = data.id;
              let url = 'https://api.spotify.com/v1/playlists/' + playlist_id + '/tracks'
              let playlist_songs = []
              let i = 0
              for(x of combined_songs){
                if(i < 100){
                  playlist_songs.push(x)
                } 
                i += 1
              }
              console.log("playlist_songs");
              console.log(playlist_songs);
              let uris = {
                "uris": playlist_songs
              }
              postPlaylist(url, uris, access_global)
                .then(data => {
                  console.log(data)
                })
            })
          }
          client.close();
        })
        .catch(err => {
          console.log(err);
        })
      // let count = collection.count();
      // console.log(count);
    } finally {
      await client.close();
    }
  }

  var emailList = req.params.email.split(", ");
  var emailLength = emailList.length;
  let i = 0;
  for (let email of emailList) {
    let bool;
    if(i == emailLength - 1){
       bool =  true
    }else{
      bool = false
    }
    getSongs(email, bool)
    i +=1
  }

  // for getSongs, maybe the reason trackList doesn't have a length is because you're not awaiting the async function to return before we get length, maybe we call getSOngs with await next time and then work with the data

  //console.log('hi');
  //console.log(trackList);

  var user_email = emailList[0];

  // get emails from req params, parse them

  // get each persons songs from mongo with find()

  // toggle the authentication for whoever's doing it and publish the playlist to that account

  //console.log(req.params.email);
});

app.get("/callback", function (req, res) {
  //console.log("callback", res)

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

    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });


    try {
      await client.connect();
      const database = client.db("test");
      const date = new Date();
      let collect = user_id;
      const testItems = database.collection("test");
      // create a document to be inserted
      //songList = [];
      for (song of songs) {
        songsUri.add(song.track.uri);
      }
      let songList = Array.from(songsUri);
      //console.log(songList);
      const doc = {email: collect, songs: songList};
      const result = await testItems.insertOne(doc);
      console.log(
        `${result.insertedCount} documents were inserted with the _id: ${result.insertedId}`
      );
    } finally {
      await client.close();
    }
  }

  async function printCollections() {

    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });


    try {
      await client.connect();
      const database = client.db("test");
      const items = database.getCollectionNames();
      for (item of items) {
        console.log(database.getCollection(item).find());
      }
    } finally {
      await client.close();
    }
  }

  // if form not empty
  // insert into premade playlist with given name

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;
        console.log("token:", access_token)
        access_global = body.access_token;
        var options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };
        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          //console.log(body);
          var users_id = body.id;
          user_id = body.email;
          id_global = body.id;
          var options2 = {
            url: "https://api.spotify.com/v1/users/" + users_id + "/playlists",
            headers: { Authorization: "Bearer " + access_token },
            json: true,
          };
          request.get(options2, function (error, response, bodys) {
            //console.log(bodys);
            for (i in bodys.items) {
              //console.log(bodys.items[i]);
              var link = bodys.items[i].tracks.href;
              //console.log(link)
              var options3 = {
                url: link,
                headers: { Authorization: "Bearer " + access_token },
                json: true,
              };
              request.get(options3, function (error, response, body2) {
                //console.log("Playlist:", body2);
                //console.log(body2.items)
                for (each in body2.items) {
                  //console.log(each)
                  //console.log(body2.items[each].track.uri)
                  songsUri.add(body2.items[each].track.uri);
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
        res.redirect(
          "/#" +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token,
            })
        );
      } else {
        res.redirect(
          "/#" +
            querystring.stringify({
              error: "invalid_token",
            })
        );
      }
    });
  }
});

app.get("/refresh_token", function (req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token,
      });
    }
  });
});

console.log("Listening on 8888");
app.listen(process.env.PORT);