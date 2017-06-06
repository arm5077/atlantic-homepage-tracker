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

app.get('/api/day', function(req, res){ 
  var responseObject = [];

  // Check to see if a date was specified 
  if( req.query.date )
    daySelected = moment.tz(req.query.date, "America/New_York").toDate()
  else 
    daySelected = moment().tz('America/New_York').toDate()


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
                $or: [
    /*              {
                    $not: [
                      {
                        $ifNull: ['$$story.end', false]
                      }
                      
                    ]
                  },*/
                  {
                    $and: [
                      { $gte: [ '$$story.start', moment(daySelected).tz("America/New_York").startOf('day').subtract(3, 'day').toDate() ] },
                      { $lte: [ '$$story.end', moment(daySelected).tz("America/New_York").endOf('day').add(3, 'day').toDate() ] }
                    ]                
                  }
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
        return (moment(story.start).tz('America/New_York').isBefore( moment(daySelected).tz('America/New_York').endOf('day') )
          && moment(story.end || moment() ).tz('America/New_York').isAfter( moment(daySelected).tz('America/New_York').startOf('day') ))
        || ( moment(daySelected).tz('America/New_York').startOf('day').isBefore( moment(story.end || moment() ).tz('America/New_York') )
          && moment(daySelected).tz('America/New_York').endOf('day').isAfter( moment(story.start).tz('America/New_York') ))
          
        
        /*return !story.end || 
          moment(story.end).tz("America/New_York").date() == (daySelected).tz("America/New_York").date() || 
          moment(story.start).tz("America/New_York").date() == (daySelected).tz("America/New_York").date()*/
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