var StackKeys = [];
var SGraphTitle = "";
function prepareResetButton() {} //leave out
// called from handleMouseClickLine 500
function GraphStacked(cat_type, filteredDataset) {
  d3.selectAll("input[name='Stream']").on("click", function() {
    returnToLine();
  }); // set the click on radiobutton behaviour
  StackedData(cat_type, filteredDataset);
  visualiseStackedData(stackdata);
}

// a funtion to manage the return to the line graph plots
function returnToLine() {
  d3.select("#svgWrapper").html("")
  createSVG();
  //setupRadioButtons(dataset);
  drawBackground(filteredDataset);
  lineChart(filteredDataset)
} // end of returnToLine

function chartTitle(fate) {
  //Create Chart SGraphTitle
  var origin_string = (document.querySelector('input[name="Stream"]:checked').value); // current check box
  // expand the shorthand/acronym value to the full description
  if (origin_string == "MSW") {
    origin_string = "Minicipal"
  } else if (origin_string == "C&D") {
    origin_string = "Construction & Demolition"
  } else if (origin_string == "C&I") {
    origin_string = "Commercial & Industrial"
  }
  SGraphTitle = origin_string + " : " + fate;
} // end of chartTitle


function StackedData(fate, dataset) {
  stackdata = []; // clear Stackdata because we "push" value into stackdata Array we need to clear before we build
  StackKeys = []; //clear the stack keys

  //this replaces spaces so fate values match in comparator
  if (fate == "Energyrecovery") {
    fate = "Energy recovery";
  } else if (fate == "Long-termstorage") {
    fate = "Long-term storage";
  } // end of if fate

  //filter dataset according to fate received
  var fate_stack = (filterData(dataset, function(dataval) {
    return dataval.fate == fate
  }));
  //create array of maps based on fate filtered data
  var catarray = Array.from(d3.rollup(fate_stack, v => d3.sum(v, d => d.tonnes), d => d.year, d => d.category)); // array the rollup data
  //console.log(catarray);
  StackKeys = Array.from(catarray[0][1].keys()); // load StackKeys from catarray locatio [0][1]

  //dynamically build the stackdata array for use with D3 stack
  for (x = 0; x < catarray.length; x++) {
    var tmpmap = catarray[x][1];
    //	console.log(tmpmap);

    var yr = {
      "year": catarray[x][0]
    }; // initialise the stack JSON series with year value
    //iterate through the Stack keys  and get values add to JSON series
    for (i = 0; i < StackKeys.length; i++) {
      var tmpval = tmpmap.get(StackKeys[i]);
      if (tmpval == null) {
        tmpval = 0;
      } // we should use the StackKeys against the map and set any "undefined" to 0
      stackdata.push(Object.assign(yr, {
        [StackKeys[i]]: tmpval / 1000,
      }))

      // it's longer but clearer to assign to var t then as object into tmpobj (could be done in single line above)
      //var t = {[StackKeys[i]] : tmpval / 1000,}
      //var tmpobj = Object.assign(obj, t);
      //stackdata.push(tmpobj) // build array for stack with the JSON series
    } // end of for i < StackKeys loop
  } // end of for x < catarray loop

  // build and display ChartTitle
  chartTitle(fate);

} // end of StackedData function





function visualiseStackedData(stackdata) {

  d3.select("#svgWrapper").html("") // clear old SVG

  // Set the parameters for the SVG area
  var fullWidth = 900,
    fullHeight = 600;
  var xpadding = 80,
    ypadding = 40;
  var width = fullWidth - 2 * xpadding;
  var height = (fullHeight - 2 * ypadding) - 10;

  var svg = d3.select("#svgWrapper")
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", fullHeight)
    .append("g");

  //add the background boxes
  svg.append("g").attr("id", "background");
  var background = svg.select("#background");
  background.append("rect").attr("width", fullWidth).attr("height", fullHeight).attr("fill", "lightgrey");
  background.append("rect").attr("width", width).attr("height", height).attr("x", xpadding - 20).attr("y", ypadding).attr("fill", "white");

  // now create a stack "stack", define the keys and stack the data
  var stack = d3.stack().keys(StackKeys); // stack keys
  var sData = stack(stackdata);

  // color palette
  var color = d3.schemeSet3;
  // var color = ["#4db8ff", "#ff471a", "#b3b3cc", "#3d3d5c", "#44cc00", "#ff751a", "#c44dff", "#1f1f2e", "#998033", "#ffff00", "#ff33ff"];

  // X Axis definition
  var xScale = d3.scaleLinear()
    .domain([d3.min(stackdata, function(d) {
      return d.year;
    }), d3.max(stackdata, function(d) {
      return d.year;
    })]) // min and max
    .range([0, (width)]);

  //Y axis definition
  var yScale = d3.scaleLinear()
    .domain([0, d3.max(sData[sData.length - 1], function(d) {
      return d[1]
    })])
    .range([height + ypadding, ypadding]);
  // add the axis
  svg.append("g")
    .attr("transform", "translate(" + (xpadding - 20) + ", 0)")
    .call(d3.axisLeft(yScale))
  svg.append("g")
    .attr("transform", "translate(" + (xpadding - 20) + "," + (height + ypadding) + ")")
    .call(d3.axisBottom(xScale).ticks(9).tickFormat(d3.format("d")));

  var area = d3.area()
    .x(function(d) {
      return xScale(d.data.year) + (xpadding - 20);
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
    .attr("class", "series")
    .attr("id", function(d) {
      return "area" + d.key.slice(0, 5);
    }) // slice to 5 characters to avoid spaces and special chars
    .attr("stroke-width", .5)
    .attr("stroke", "black"); // end of Var series

  series.append("path")
    .style("fill", function(d, i) {
      return color[i]
    })
    .attr("d", function(d) {
      return area(d);
    }); // end of series append

  BuildLegend();

  function BuildLegend() {
    // build legend
    for (p = 0; p < StackKeys.length; p++) {
      lx = fullWidth - (xPadding + 30);
      ly = (ypadding + 10) + (25 * p);

      svg.append('rect')
        .attr('x', lx)
        .attr('y', ly)
        .attr('width', 15)
        .attr('height', 15)
        .attr("id", function(d) {
          return StackKeys[p].slice(0, 5);
        }) // slice the id down to 5 characters, avaids the spaces and special chars
        //  	.attr('stroke', 'black')
        .attr('fill', color[p])

        .on("mouseover", function(d) {
          d3.selectAll(".series").transition().duration(100).attr("fill-opacity", .1)
          d3.select("#area" + this.id).transition().duration(10).attr("fill-opacity", 1).attr("stroke-width", 1.5).attr("stroke", "blue")
          d3.select(this).transition().duration(100).attr("fill-opacity", .4)

          // sData[9].key.slice(0,5) // how to get the key from each series in sData, match to (this.id)
          // sData[0][0].data.year // how to get the year from the sData

          for (c = 0; c < sData.length; c++) { // match key to this.id
            if (this.id == sData[c].key.slice(0, 5)) {
              //now we know which catagory sData[c]
              //loop through years, values and plot_points
              for (cd = 0; cd < sData[c].length; cd++) { //now get cd (cdata)
                // sData[c][cd].data.year; // retrieves the year use as cx
                // sData[c][cd][1]; // get the circle plot point for y (this is the cumulative)
                // sData[c][cd].data[sData[c].key]; // get value of key for value label.  wrapp JSON var in []

                //now add the circle dots
                svg.append("circle")
                  .attr("class", "circbub") // give it a class so we can selectAll to remove
                  .attr("cx", function(d) {
                    return xScale(parseInt(sData[c][cd].data.year));
                  })
                  .attr("cy", function(d) {
                    return yScale(sData[c][cd][1]);
                  })
                  .attr("transform", "translate(" + (xpadding - 20) + ", 0)")
                  .attr("r", 3)
                  .attr("stroke", "blue")
                  .style("fill", "white")
                  .attr("fill-opacity", .5)

                // now add the value above the bubble
                svg.append('text')
                  .attr("class", "circtxt") // give it a class so we can selectAll to remove
                  .attr('x', function(d) {
                    return xScale(parseInt(sData[c][cd].data.year));
                  })
                  .attr('y', function(d) {
                    return yScale(sData[c][cd][1]);
                  })
                  .attr("transform", "translate(" + (xpadding - 20) + ", -5)")
                  .style("text-anchor", "middle")
                  .style("font-size", "10px")
                  .style("fill", "black")
                  .text((sData[c][cd].data[sData[c].key]).toFixed(0))
                //add faint cotted lines vertically up to the value
                svg.append('line')
                  .attr("class", "lnv")
                  .style("stroke", "grey")
                  .style("stroke-width", .3)
                  .style("stroke-dasharray", ("3, 3"))
                  .attr("x1", function(d) {
                    return xScale(parseInt(sData[c][cd].data.year));
                  })
                  .attr("y1", height + ypadding)
                  .attr("x2", function(d) {
                    return xScale(parseInt(sData[c][cd].data.year));
                  })
                  .attr("y2", function(d) {
                    return yScale(sData[c][cd][1]);
                  })
                  .attr("transform", "translate(" + (xpadding - 20) + ", 0)")

              } // end of for loop to add circle and text to line
            } // end of if this id match to sData key
          } // end of for sData length loop
        }) // end of mouseover function

        .on("mouseout", function(d) {
          d3.selectAll(".series").transition().duration(100).attr("fill-opacity", 1).attr("stroke-width", .5).attr("stroke", "black")
          d3.selectAll(".circbub").transition().duration(50).remove()
          d3.selectAll(".circtxt").transition().duration(50).remove()
          d3.selectAll(".lnv").transition().duration(50).remove()
          d3.select(this).attr("fill-opacity", 1)
        }) // end of mouseout function

      //add the key Legend
      svg.append('text')
        .attr('x', lx + 19)
        .attr('y', ly + 12)
        .style("text-anchor", "left")
        .style("font-size", "8px")
        .style("fill", "black")
        .text(StackKeys[p])
    } // end of legend for loop
  } // end of build Legend function

  //add mouseover function to .Series (Graph)
  series.on("mouseover", function(d) {
    d3.selectAll(".series").attr("fill-opacity", .1)
    d3.select(this).attr("fill-opacity", 1).attr("stroke-width", 1.5).attr("stroke", "blue")

    for (c = 0; c < sData.length; c++) { // match key to this.id
      if (this.id.slice(4, 9) == sData[c].key.slice(0, 5)) {
        for (cd = 0; cd < sData[c].length; cd++) { //now get cd (cdata)

          d3.select(this).append("svg:title").text(sData[c].key)
          var kk = sData[c].key; // key used to select in mouseover function
          var pp = (sData[c][cd][1]); //plot point value for ID and tooltip
          //add dots
          svg.append("circle")
            .attr("class", "dots_graph") // give it a class so we can selectAll to remove
            .attr("id", pp.toFixed(0))
            .attr("cx", function(d) {
              return xScale(parseInt(sData[c][cd].data.year));
            })
            .attr("cy", function(d) {
              return yScale(sData[c][cd][1]);
            })
            .attr("transform", "translate(" + (xpadding - 20) + ", 0)")
            .attr("r", 4)
            .attr("stroke", "blue")
            .style("fill", "white")
            .on("mouseover", function(d) {
              d3.select(this).style("fill", "blue").append("svg:title").text(parseInt(d3.select(this).attr("id")).toLocaleString())
              d3.select(this).transition().duration(110).attr("fill-opacity", 1)
              d3.selectAll(".series").attr("fill-opacity", .1)
              d3.select("#area" + kk.slice(0, 5)).attr("fill-opacity", 1).attr("stroke-width", 1.5).attr("stroke", "blue")

              var xpp = d3.select(this).attr('cx');
              var ypp = d3.select(this).attr('cy');

              svg.append('line')
                .attr("class", "ln_graph")
                .style("stroke", "grey")
                .style("stroke-width", .5)
                .style("stroke-dasharray", ("3, 3"))
                .attr("x1", xpp)
                .attr("y1", function(d) {
                  return yScale(parseInt(0));
                })
                .attr("x2", xpp)
                .attr("y2", ypp)
                .attr("transform", "translate(" + (xpadding - 20) + ", 0)")

              svg.append('line')
                .attr("class", "ln_graph")
                .style("stroke", "grey")
                .style("stroke-width", .5)
                .style("stroke-dasharray", ("3, 3"))
                .attr("x1", function(d) {
                  return xScale(parseInt(2006));
                })
                .attr("y1", ypp)
                .attr("x2", xpp)
                .attr("y2", ypp)
                .attr("transform", "translate(" + (xpadding - 20) + ", 0)")
            }) // end of mouseover
            .on("mouseout", function(d) {
              d3.selectAll(".dots_graph").transition().duration(80).remove()
              d3.selectAll(".ln_graph").remove()
            }) // end of mouseout function

          // now add the value above the bubble
          svg.append('text')
            .attr("class", "txt_graph") // give it a class so we can selectAll to remove
            .attr('x', function(d) {
              return xScale(parseInt(sData[c][cd].data.year));
            })
            .attr('y', function(d) {
              return yScale(sData[c][cd][1]);
            })
            .attr("transform", "translate(" + (xpadding - 20) + ", -5)")
            .style("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "black")
            .text((sData[c][cd].data[sData[c].key]).toFixed(0))


          svg.append('line')
            .attr("class", "ln_graph")
            .style("stroke", "grey")
            .style("stroke-width", .3)
            .style("stroke-dasharray", ("3, 3"))
            .attr("x1", function(d) {
              return xScale(parseInt(sData[c][cd].data.year));
            })
            .attr("y1", height + ypadding)
            .attr("x2", function(d) {
              return xScale(parseInt(sData[c][cd].data.year));
            })
            .attr("y2", function(d) {
              return yScale(sData[c][cd][1]);
            })
            .attr("transform", "translate(" + (xpadding - 20) + ", 0)")

        } // end of for loop to add circle and text to line
      } // end of if this id match to sData key
    } // end of for sData length loop
  }) // end of mouseover function

  // add a mouseout function to .series (graph)
  series.on("mouseout", function(d) {
    d3.selectAll(".series").attr("fill-opacity", 1).attr("stroke-width", .5).attr("stroke", "black")
    d3.selectAll(".dots_graph").transition().duration(80).remove()
    d3.selectAll(".txt_graph").remove()
    d3.selectAll(".ln_graph").remove()
  }) // end of mouseout function

  // axis labels
  svg.append("text") // text label for the x axis
    .style("text-anchor", "middle")
    .style("font-size", "18px")
    .style("fill", "black")
    .attr("transform", "translate(" + fullWidth / 2 + ", " + (fullHeight - 10) + ")")
    .text("Time (Year)");

  svg.append("text") // information label
    .style("text-anchor", "left")
    .style("font-size", "10px")
    .style("fill", "black")
    .attr("transform", "translate(" + (fullWidth - 250) + ", " + (fullHeight - 10) + ")")
    .text("** Hover over Chart or Legend for more information");

  svg.append("text") // text label for the Y axis
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "black")
    .attr("transform", "translate(17, " + fullHeight / 2 + ") rotate(270)")
    .text("Tonnes (,000's)");

  // Chart Title
  svg.append("text")
    .style("text-anchor", "middle")
    .style("font-size", "24px")
    .style("fill", "black")
    .attr("transform", "translate(" + ((fullWidth / 2) - 20) + ", 30)")
    .attr("id", "title")
    .text(SGraphTitle);

} // end of Visualise function
