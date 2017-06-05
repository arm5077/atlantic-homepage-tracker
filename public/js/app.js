import * as d3 from 'd3';
import moment from 'moment-timezone'
import '../sass/styles.scss'


const preferred_order = ['lead', 'offlead', 'filmstrip', 'featured'];

// See if URL has a date parameter
var thisDate = getURLParameter('date') || moment().format("Y-MM-DD");

var dateParameter = (getURLParameter('date')) ? '?date=' + getURLParameter('date') : '';



var content = d3.select('#content');
var scale = d3.scaleTime()
  .domain([ moment(thisDate).tz('America/New_York').startOf('day').toDate(), moment(thisDate).tz('America/New_York').endOf('day').toDate() ])
  .range([0,100]);

content.append('div')
  .classed('headline', true)
  .html("The Atlantic homepage, as of ")
.append('input')
  .attr('type', 'date')
  .attr('value', thisDate )
  .attr('max', moment().format('Y-MM-DD'))
  .on('change', function(){
    window.location.href = '/?date=' + moment(d3.event.target.value).format('Y-MM-DD')
  })
  
  buildList();
  

function buildList(){
  
  d3.selectAll('.position').remove();
  
  // Get list of the latest
  d3.json('/api/day' + dateParameter, function(err, data){
    if(err) throw err;
  
    data.sort(function(a,b){ return a.slot - b.slot });
    data.sort(function(a,b){ return preferred_order.indexOf(a.name) - preferred_order.indexOf(b.name) });
  
    // Build position sections
    var position = content.selectAll('.position')
      .data(data).enter()
    .append('div')
      .classed('position', true)
  
    position.append('h1')
      .html(function(d){ return properCase(d.name) + ( (d.slot != 1) ? " " + d.slot : "" )})
  
    var story = position.selectAll('.story')
      .data(function(d){ return d.stories }).enter()
    .append('div')
      .classed('story', true)
  
    story.append('a')
      .classed('title', true)
      .text(function(d){ return d.title })
      .attr('target', 'blank')
      .attr('href', function(d){ return d.url })
  
    story.append('div')
      .classed('time-elapsed', true)
      .text(function(d){
        if( !d.end )
          d.end = moment().tz('America/New_York');
        var duration = moment.duration( moment(d.end).tz('America/New_York').diff( moment(d.start).tz('America/New_York') ))
        return lpad( Math.floor(duration.asHours())) + ":" + lpad(duration.minutes())  
      })
    
    var timeline = story.append('div')
      .classed('timeline', true)
    
    var segment = timeline.append('div')
      .classed('background-line', true)
    .append('div')
      .classed('segment', true)
      .style('left', function(d){  return scale( moment(d.start) ) + "%" })
      .style('width', function(d){ return scale( moment(d.end)) - scale(moment(d.start)) + '%' })
    
    timeline.selectAll('.label')
      .data(function(d){ return [d.start, d.end] }).enter()
    .append('div')
      .classed('label', true)
    .html(function(d){
      return moment(d).tz('America/New_York').format('h:mm')
    })
    .style('left', function(d){
      return scale(moment(d).tz('America/New_York')) + '%'
    })
    .classed('hidden', function(d){
      return scale(moment(d).tz('America/New_York')) < 0
    })
  
    // Add current-time scales
    position.append('div')
      .classed('current-time', true)
      .style('height', function(d){
        return this.parentNode.clientHeight + 'px'  
      })
    .append('div')
      .classed('line', true)
      .style('left', function(d){ 
        return scale( moment().tz("America/New_York").toDate() ) + '%' 
      })
    .append('div')
      .classed('label', true)
      .text( moment().tz('America/New_York').format('h:mm') )
    
  })
}  

function properCase(word){
  return word.slice(0,1).toUpperCase() + word.slice(1, word.length)
}

function lpad(number){
  return("00" + number).substr(-2,2)
}

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}