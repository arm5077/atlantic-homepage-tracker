require('dotenv').config();
const MongoClient = require('mongodb').MongoClient,
  cheerio = require('cheerio'),
  async = require('async'),
  request = require('request'),
  moment = require('moment-timezone');
  
var $ = null, 
  db = null;
  
var positions = [
  {
    name: 'lead',
    selector: 'a.c-hp-lead__link'
  },
  {
    name: 'filmstrip',
    selector: 'h3 a.c-hp-filmstrip__link'
  },
  {
    name: 'offlead',
    selector: '.c-hp-offlead__link--hed'
  },
  {
    name: 'featured',
    selector: '.c-hp-featured__link'
  }
]  

// Connect to Mongo database
var client = MongoClient.connect( process.env.MONGODB_URI || 'mongodb://localhost:27017/homepageTracker')
  .then(function(database){
    db = database;
    return db.collection('positions')
  })

// Begin main waterfall loop
async.series([
  // Grab the Atlantic's homepage
  function(nextStep){
    request.get('https://theatlantic.com', function(err, res, body){
      if( err ) throw err;
      $ = cheerio.load(body)
      return nextStep();
      
    })
  },
  
  // Loop through areas of interest and query against Mongo
  function(nextStep){
    async.each(positions, function(position, nextPosition){
      
      // Some of these positions have different spots, so we need to loop through them too
      async.eachOf( $(position.selector), function(subposition, i, nextSubposition){

        // Query database for latest headline attached to position);
        client.then(function(collection){
            return collection.aggregate(
            [
              {
                $match: { name: position.name, slot: i+1 },
              },
              {
                $project: { 
                  name: 1,
                  start: 1,
                  slot: 1,
                  stories: {
                    $filter: {
                      input: '$stories',
                      as: 'story',
                      cond: {
                        $not: '$$story.end'
                      }
                    }
                  }
                }
              }
            ]
          ).toArray();
        })
        .then(function(matches){
          // If no results, insert new record
          // (This really should only happen once)
          if( matches.length == 0){
            client.then(function(collection){
              collection.insert({ 
                'name': position.name,
                'slot': i+1,
                'stories': [
                  {
                    title: $(subposition).text().trim(),
                    url: $(subposition).attr('href'),
                    start: moment().tz('America/New_York').toDate()
                  }
                ]
              }, function(err, result){
                if(err) throw err;
                console.log(`Inserted new '${position.name}' object...`)
                return nextSubposition()
              })
            })
          }
          else {
            // OK, this position already exists... let's see if the last headline recorded matches what's still on the site
            var headlineMatch = false;
            async.eachSeries( matches[0].stories, function(match, nextMatch){
              // If they match, let's continue
              if(match.url == $(subposition).attr('href')){
                headlineMatch = true;
                return nextMatch();
              }
              // If they don't match, this fella is out of date! let's end him
              client.then(function(collection){
                 collection.update(
                  { name: position.name, 
                    slot: i+1, 
                    'stories.url': match.url, 
                    'stories.start': match.start 
                  },
                  { $set: { 'stories.$.end': moment().tz('America/New_York').toDate() } }
                )
              }).then(function(){
                console.log(`Put a lid on ${match.title}!`);
                return nextMatch();
              })
            }, 
            // Now that that's over with, let's check and see if a headline match was found. If not, we'll drop this bad boy in.
            function(){
              if(headlineMatch)
                return nextSubposition()
                
              client.then(function(collection){
                collection.update({
                  'name': position.name,
                  'slot': i+1
                }, 
                {
                  $push: {
                    stories: {
                      title: $(subposition).text().trim(),
                      url: $(subposition).attr('href'),
                      start: moment().tz('America/New_York').toDate()
                    }
                  }
                })
              })
              .then(function(){
                console.log(`Added ${ $(subposition).text().trim() } to ${position.name}-${ i+1 }`)
                return nextSubposition();
              })
            

            })   
          }
        })
        .catch(function(err){
          throw err;
        })
      }, nextPosition)
    }, nextStep)
  }
], function(err){
  if(err) throw err
  console.log("I'm done!")
  db.close();
})