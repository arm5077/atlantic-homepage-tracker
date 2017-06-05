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
  });

app.get('/api/today', function(req, res){ 

  console.log(moment().tz("America/New_York").startOf('day').format());
  var responseObject = [];

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
                  { $gte: [ '$$story.start', moment().tz("America/New_York").startOf('day').subtract(1, 'day').toDate() ] },
                  { $lte: [ '$$story.end', moment().tz("America/New_York").endOf('day').toDate() ] }
                ]                
              }
            }
          }
        }
      }
    ]
  ).toArray()
  .then(function(result){

    // Sort the stories from most recently published to oldest
    result.forEach( position => {
      position.stories.sort( (a,b) => b.start - a.start )
    })
    responseObject = result;  
  })
  .then(function(){
    // Only keep stories that were published today or haven't been taken off the site yet
    responseObject.forEach( position => {
      position.stories = position.stories.filter(story => {
        return !story.end || moment(story.end).tz("America/New_York").date() == moment().tz("America/New_York").date()
      })
    })
  })
  .then(function(){
    res.json(responseObject)
    
  });

})

app.use('/', express.static('public'))

app.listen(process.env.PORT || 3000, function(err){
  if( err ) throw err;
  console.log("Listening!")
})