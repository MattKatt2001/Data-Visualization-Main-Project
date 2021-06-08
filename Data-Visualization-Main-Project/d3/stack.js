var StackKeys = [];
var SGraphTitle = "";



function StackedData(fate, dataset) {

  // d3.selectAll("input[name='Stream']").on("change", function() {
  //	returntoline();});
  d3.selectAll("input[name='Stream']").on("click", function() {
    returntoline();
  });

  stackdata = []; // clear Stackdata

  //this is temporary until we receive the correct fate from the calling function
  if (fate == "Energyrecovery") {
    fate = "Energy recovery";
  } else if (fate == "Long-termstorage") {
    fate = "Long-term storage";
  } // end of if

  //Create Chart SGraphTitle
  var origin_string = (document.querySelector('input[name="Stream"]:checked').value); // current check box
  if (origin_string == "MSW") {
    origin_string = "Minicipal"
  } else if (origin_string == "C&D") {
    origin_string = "Construction & Demolition"
  } else if (origin_string == "C&I") {
    origin_string = "Commercial & Industrial"
  }

  SGraphTitle = origin_string + " : " + fate;

  //filter dataset according to fate received
  var fate_stack = (filterData(dataset, function(dataval) {
    return dataval.fate == fate
  }));
  //create array of maps based on fate filtered data
  var catarray = Array.from(d3.rollup(fate_stack, v => d3.sum(v, d => d.tonnes), d => d.year, d => d.category)); // array the rollup data
  //console.log(catarray);
  StackKeys = []; //clear the stack keys
  StackKeys = Array.from(catarray[0][1].keys()); // load StackKeys from catarray locatio [0][1]

  //dynamically build the stackdata array for use with D3 stack
  for (x = 0; x < catarray.length; x++) {
    var tmparray = Array.from(catarray[x][1]);
    var tmpmap = catarray[x][1];

    var obj = {
      "year": catarray[x][0]
    }; // initialise the stack JSON series with year value
    //iterate through the Stack keys  and get values add to JSON series
    for (i = 0; i < StackKeys.length; i++) {
      tmpval = tmpmap.get(StackKeys[i]);
      //console.log(tmpval);
      if (tmpval == null) {
        tmpval = 0;
      } // we should use the StackKeys against the map and set any "undefined" to 0
      var t = {
        [StackKeys[i]]: tmpval / 1000,
      }
      var tmpobj = Object.assign(obj, t);
    }
    stackdata.push(tmpobj) // build array for stack with the JSON series
    //	console.log(stackdata);
  }
}


// a funtion to manage the return to the line graph data
function returntoline() {
  
  d3.select("#svgWrapper").html("")

} // end of returntoline

function visualiseStackedData(stackdata) {

  d3.select("#svgWrapper").html("") // clear old SVG

  var svg = d3.select("#svgWrapper")
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", fullHeight)
    .append("g");

  //add the background boxes
  svg.append("g").attr("id", "background");
  var background = svg.select("#background");
  background.append("rect").attr("width", fullWidth).attr("height", fullHeight).attr("fill", "lightgrey");
  background.append("rect").attr("width", chartWidth).attr("height", chartHeight).attr("x", xPadding).attr("y", yPadding).attr("fill", "white");


  // now create a stack "stack", define the keys and stack the data
  var stack = d3.stack().keys(StackKeys); // stack keys
  var sData = stack(stackdata);
  //console.log(sData);

  var color = ["#4db8ff", "#ff471a", "#b3b3cc", "#3d3d5c", "#44cc00", "#ff751a", "#c44dff", "#1f1f2e", "#998033", "#ffff00", "#ff33ff"];
  // var color = d3.scaleOrdinal().range(d3.schemeSet1);

  // X Axis definition
  var xScale = d3.scaleLinear()
    .domain([d3.min(stackdata, function(d) {
      return d.year;
    }), d3.max(stackdata, function(d) {
      return d.year;
    })]) // min and max
    .range([0, (chartWidth)]);

  //Y axis definition
  var yScale = d3.scaleLinear()
    .domain([0, d3.max(sData[sData.length - 1], function(d) {
      return d[1]
    })])
    .range([chartHeight + yPadding, yPadding]);
  // add the axis
  svg.append("g")
    .attr("transform", "translate(" + (xPadding) + ", 0)")
    .call(d3.axisLeft(yScale))
  svg.append("g")
    .attr("transform", "translate(" + (xPadding) + "," + (chartHeight + yPadding) + ")")
    .call(d3.axisBottom(xScale).ticks(9).tickFormat(d3.format("d")));

  var area = d3.area()
    .x(function(d) {
      return xScale(d.data.year) + (xPadding);
    })
    .y0(function(d) {
      return yScale(d[0]);
    })
    .y1(function(d) {
      return yScale(d[1]);
    });

  var series = svg.selectAll("g.series")
    .data(sData)
    .enter().append("g")
    .attr("class", "series");

  series.append("path")
    //.style("fill", function(d){return color(d[0])})
    .style("fill", function(d, i) {
      return color[i]
    })
    .style("fill-opacity", 0.4)
    .attr("d", function(d) {
      return area(d);
    })
    .attr("stroke", function(d, i) {
      return color[i]
    })
    .attr("stroke-width", .75)
    .attr("id", "path");
  //	.attr("stroke-opacity", .2)


  // build legend
  for (p = 0; p < StackKeys.length; p++) {
    //	var color = d3.scaleOrdinal().range(d3.schemeSet1);
    lx = fullWidth - LegendWidth - xPadding + 10;
    ly = (yPadding + 10) + (25 * p);

    svg.append('rect')
      .attr('x', lx)
      .attr('y', ly)
      .attr('width', 15)
      .attr('height', 15)
      //  	.attr('stroke', 'black')
      .attr('fill', color[p])
      .on("mouseover", function(d) {
        d3.select(this).attr("fill-opacity", .2);
      })
      //	.on("mouseover", function(d) {d3.select(this).style("fill", "red");})
      //	d3.select(this).style("stroke", "green");
      .on("mouseout", function(d) {
        d3.select(this).attr("fill-opacity", 1);
      })
      //.on("mouseout", function(d) {d3.select(this).style("fill", function(d){return color(d[0])})
      //	d3.select(this).style("stroke", "black");
      .on("click", function() {
        returntoline();
      })

    svg.append('text')
      .attr('x', lx + 19)
      .attr('y', ly + 12)
      .style("text-anchor", "left")
      .style("font-size", "10px")
      .style("fill", "black")
      .text(StackKeys[p])
  } // end of legend for loop


  // axis labels
  svg.append("text") // text label for the x axis
    .style("text-anchor", "middle")
    .style("font-size", "18px")
    .style("fill", "black")
    .attr("transform", "translate(" + (xPadding + 0.5*chartWidth) + ", " + (fullHeight - 7) + ")")
    .text("Year");
    

 svg.append("text") // text label for the Y axis
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "black")
    .attr("transform", "translate(17, " + fullHeight / 2 + ") rotate(270)")
    .text("Tonnes (000's)");
    


  // Chart Title
  svg.append("text") // text label for the x axis
    .style("text-anchor", "middle")
    .style("font-size", "24px")
    .style("fill", "black")
    .attr("transform", "translate(" + (xPadding + 0.5*chartWidth) + ", 30)")
    .text(SGraphTitle);
    






} // end of function
