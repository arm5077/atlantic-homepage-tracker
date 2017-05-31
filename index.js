require('dotenv').config()

const express = require('express'),
  moment = require('moment-timezone'),
  MongoClient = require('mongodb').MongoClient;

app = express();

// Connect to Mongo database
var db = null
MongoClient.connect( process.env.MONGODB_URI || 'mongodb://localhost:27017/homepageTracker')
  .then(function(result){
    db = result
   
    db.collection('positions').find().forEach(function(element){
      element.stories.forEach(function(story, i){
        element.stories[i].newStart = moment(story.start).tz('America/New_York').toDate()
        element.stories[i].newEnd = moment(story.end).tz('America/New_York').toDate()
      })
      console.log(element)
      db.collection('positions').save(element)
    })

  });

app.get('/', function(req, res){ 

  console.log(moment().tz("America/New_York").startOf('day').format());

  db.collection('positions').aggregate(
    [
      {
        $match: {},
      },
      {
        $project: { 
          name: true,
          slot: true,
          stories: { 
            $filter: {
              input: '$stories',
              as: "story",
              cond: { 
                $and: [
                  { $gte: [ '$$story.newStart', moment().tz("America/New_York").startOf('day').toDate() ] }/*,
                  { $lte: [ '$$story.end', moment().tz("America/New_York").endOf('day').format() ] }*/
                ]                
              }
            }
          }

        }
      }
    ]
  ).toArray()
  .then(function(result){
    res.json(result)
  });

})

app.listen(3000, function(err){
  if( err ) throw err;
  console.log("Listening!")
})