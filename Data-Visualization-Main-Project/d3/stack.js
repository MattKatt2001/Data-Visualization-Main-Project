"use strict"

var stackdata = []; //used in graph stacked
var StackKeys = [];
var SGraphTitle = "";

function cleanSackedAreaChart() { //remove all appended svg elements appart from axis here
  d3.select("#paths").selectAll(".series").attr("opacity", 1).transition().duration(250).remove().attr("opacity", 0)
  d3.select("#madness").selectAll("*").remove();
  d3.select("#title").attr("opacity", 1).transition().duration(250).remove().attr("opacity", 0).on("end", function() {
    d3.select("#titles").append("text")
    .attr("id", "title")
    .style("text-anchor", "middle")
    .style("font-size", "24px")
    .style("fill", "black")
    .attr("transform", "translate(" + (xPadding + 0.5*chartWidth) + ", 30)")
    .text("Waste By Disposal Method");
  });
  d3.select("#legend").selectAll("text").attr("opacity", 1).transition().duration(250).remove().attr("opacity", 0)
  d3.select("#legend").selectAll("rect").attr("opacity", 1).transition().duration(250).remove().attr("opacity", 0)
  d3.select("#legendMsg").remove()
}

function prepareResetButton() { 
  d3.select("#reset").transition().duration(250).style("opacity",1); // show button

  d3.select("#reset").on("click", function() {

    d3.select(this).style("opacity",0);

    d3.select(this).on("click", null);

    lineView = true;
    
    cleanSackedAreaChart()

    setTimeout(() => { updateLineChart(filteredDataset); }, 350); //allow time for transitions to finish

  })
}


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

// called from handleMouseClickLine 500
function GraphStacked(cat_type, filteredDataset) {
  StackedData(cat_type, filteredDataset);
  visualiseStackedData(stackdata);
}

function StackedData(fate, dataset) {
  stackdata = []; // clear Stackdata because we "push" value into stackdata Array we need to clear before we build

  //this is temporary until we receive the correct fate from the calling function
  if (fate == "Energyrecovery") {
    fate = "Energy recovery";
  } else if (fate == "Long-termstorage") {
    fate = "Long-term storage";
  } // end of if

  chartTitle(fate);

  //filter dataset according to fate received
  var fate_stack = (filterData(dataset, function(dataval) {
    return dataval.fate == fate
  }));
  //create array of maps based on fate filtered data
  var catarray = Array.from(d3.rollup(fate_stack, v => d3.sum(v, d => d.tonnes), d => d.year, d => d.category)); // array the rollup data

  StackKeys = Array.from(catarray[0][1].keys()); // load StackKeys from catarray locatio [0][1]

  //dynamically build the stackdata array for use with D3 stack
  for (var x = 0; x < catarray.length; x++) {
    var tmpmap = catarray[x][1];

    var yr = {
      "year": catarray[x][0]
    }; // initialise the stack JSON series with year value
    //iterate through the Stack keys  and get values add to JSON series
    for (var i = 0; i < StackKeys.length; i++) {
      var tmpval = tmpmap.get(StackKeys[i]);
      if (tmpval == null) {
        tmpval = 0;
      } // we should use the StackKeys against the map and set any "undefined" to 0

      stackdata.push(Object.assign(yr, {
        [StackKeys[i]]: tmpval / 1000,
      }))
    }
  }
}

function visualiseStackedData(stackdata) {

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
    .range([0, (chartWidth)]);

  //Y axis definition
  var yScale = d3.scaleLinear()
    .domain([0, d3.max(sData[sData.length - 1], function(d) {
      return d[1]
    })])
    .range([chartHeight + yPadding, yPadding]);

  var yScaletemp = d3.scaleLinear()
    .domain([0, d3.max(sData[sData.length - 1], function(d) {
      return d[1]
    })])
    .range([chartHeight, 0]);
    //appends the axis
  d3.select("#y").selectAll(".tick").transition().duration(250).attr("opacity", 0)
  d3.select("#axis").select("#y").transition().duration(250)
    .call(d3.axisLeft(yScaletemp));

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

  var series = d3.select("#paths").selectAll(".series")
    .data(sData)
    .enter().append("g")
    .attr("class", "series")
    .attr("id", function(d) {
      return "area" + d.key.slice(0, 5);
    }) // slice to 5 characters to avoid spaces and special chars
    .attr("stroke-width", .5)
    .attr("stroke", "black")
    .attr("clip-path", "url(#graphClip)"); // end of Var series

  series.append("path")
    .style("fill", function(d, i) {
      return color[i]
    })
    .attr("d", function(d) {
      return area(d);
    })
    .attr("stroke", function(d, i) {
      return color[i]
    })
    .attr("stroke-width", .75)
    .attr("id", "path");
  //	.attr("stroke-opacity", .2)

  function BuildLegend() {

    // build legend
    for (var p = 0; p < StackKeys.length; p++) {
      var lx = fullWidth - LegendWidth - xPadding + 10;
      var ly = (yPadding + 10) + (25 * p);
  
      d3.select("#legend").append('rect')
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
  
          for (var c = 0; c < sData.length; c++) { // match key to this.id
            if (this.id == sData[c].key.slice(0, 5)) {
              //now we know which catagory sData[c]
              //loop through years, values and plot_points
              for (var cd = 0; cd < sData[c].length; cd++) { //now get cd (cdata)
                // sData[c][cd].data.year; // retrieves the year use as cx
                // sData[c][cd][1]; // get the circle plot point for y (this is the cumulative)
                // sData[c][cd].data[sData[c].key]; // get value of key for value label.  wrapp JSON var in []
  
                //now add the circle dots
                d3.select("#madness").append("circle")
                  .attr("class", "circbub") // give it a class so we can selectAll to remove
                  .attr("cx", function(d) {
                    return xScale(parseInt(sData[c][cd].data.year));
                  })
                  .attr("cy", function(d) {
                    return yScale(sData[c][cd][1]);
                  })
                  .attr("transform", "translate(" + (xPadding) + ", 0)")
                  .attr("r", 3)
                  .attr("stroke", "blue")
                  .style("fill", "white")
                  .attr("fill-opacity", .5)
  
                // now add the value above the bubble
                d3.select("#madness").append('text')
                  .attr("class", "circtxt") // give it a class so we can selectAll to remove
                  .attr('x', function(d) {
                    return xScale(parseInt(sData[c][cd].data.year));
                  })
                  .attr('y', function(d) {
                    return yScale(sData[c][cd][1]);
                  })
                  .attr("transform", "translate(" + (xPadding) + ", -5)")
                  .style("font-family", "arial")
                  .style("text-anchor", "middle")
                  .style("font-size", "10px")
                  .style("fill", "black")
                  .text((sData[c][cd].data[sData[c].key]).toFixed(0))
                //add faint cotted lines vertically up to the value
                d3.select("#madness").append('line')
                  .attr("class", "lnv")
                  .style("stroke", "grey")
                  .style("stroke-width", .3)
                  .style("stroke-dasharray", ("3, 3"))
                  .attr("x1", function(d) {
                    return xScale(parseInt(sData[c][cd].data.year));
                  })
                  .attr("y1", chartHeight + yPadding)
                  .attr("x2", function(d) {
                    return xScale(parseInt(sData[c][cd].data.year));
                  })
                  .attr("y2", function(d) {
                    return yScale(sData[c][cd][1]);
                  })
                  .attr("transform", "translate(" + (xPadding) + ", 0)")
  
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
      d3.select("#legend").append('text')
        .attr('x', lx + 19)
        .attr('y', ly + 12)
        .style("text-anchor", "left")
        .style("font-size", "8px")
        .style("font-family", "arial")
        .style("fill", "black")
        .text(StackKeys[p])
    } // end of legend for loop
  } // end of build Legend function

  // build legend
  BuildLegend();
  
  series.on("mouseover", function(d) {
    d3.selectAll(".series").attr("fill-opacity", .1)
    d3.select(this).attr("fill-opacity", 1).attr("stroke-width", 1.5).attr("stroke", "blue")

    for (var c = 0; c < sData.length; c++) { // match key to this.id
      if (this.id.slice(4, 9) == sData[c].key.slice(0, 5)) {
        for (var cd = 0; cd < sData[c].length; cd++) { //now get cd (cdata)
          //add dots
          d3.select("#madness").append("circle")
            .attr("class", "dots_graph") // give it a class so we can selectAll to remove
            .attr("cx", function(d) {
              return xScale(parseInt(sData[c][cd].data.year));
            })
            .attr("cy", function(d) {
              return yScale(sData[c][cd][1]);
            })
            .attr("transform", "translate(" + (xPadding) + ", 0)")
            .attr("r", 3)
            .attr("stroke", "blue")
            .style("fill", "white")
            .on("mouseover", function(d) {
              d3.select(this).style("fill", "blue").append("svg:title").text(parseInt(d3.select(this).attr("id")).toLocaleString())
              d3.select(this).transition().duration(110).attr("fill-opacity", 1)
              d3.selectAll(".series").attr("fill-opacity", .1)
              d3.select("#area" + kk.slice(0, 5)).attr("fill-opacity", 1).attr("stroke-width", 1.5).attr("stroke", "blue")

              var xpp = d3.select(this).attr('cx');
              var ypp = d3.select(this).attr('cy');

              d3.select("#madness").append('line')
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

              d3.select("#madness").append('line')
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
          d3.select("#madness").append('text')
            .attr("class", "txt_graph") // give it a class so we can selectAll to remove
            .attr('x', function(d) {
              return xScale(parseInt(sData[c][cd].data.year));
            })
            .attr('y', function(d) {
              return yScale(sData[c][cd][1]);
            })
            .attr("transform", "translate(" + (xPadding) + ", -5)")
            .style("font-family", "arial")
            .style("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "black")
            .text((sData[c][cd].data[sData[c].key]).toFixed(0))

            d3.select("#madness").append('line')
            .attr("class", "ln_graph")
            .style("stroke", "grey")
            .style("stroke-width", .3)
            .style("stroke-dasharray", ("3, 3"))
            .attr("x1", function(d) {
              return xScale(parseInt(sData[c][cd].data.year));
            })
            .attr("y1", chartHeight + yPadding)
            .attr("x2", function(d) {
              return xScale(parseInt(sData[c][cd].data.year));
            })
            .attr("y2", function(d) {
              return yScale(sData[c][cd][1]);
            })
            .attr("transform", "translate(" + (xPadding) + ", 0)")

        } // end of for loop to add circle and text to line
      } // end of if this id match to sData key
    } // end of for sData length loop
  }) // end of mouseover function

  // add a mouseout function to .series (graph)
  series.on("mouseout", function(d) {
    d3.selectAll(".series").attr("fill-opacity", 1).attr("stroke-width", .5).attr("stroke", "black")
    d3.selectAll(".dots_graph").remove()
    d3.selectAll(".txt_graph").remove()
    d3.selectAll(".ln_graph").remove()
  }) // end of mouseout function
  // axis labels

  /*
  d3.select("#legend").append("text") // text label for the x axis
    .style("text-anchor", "middle")
    .style("font-family", "arial")
    .style("font-size", "20px")
    .style("fill", "black")
    .attr("transform", "translate(" + (xPadding + 0.5*chartWidth) + ", " + (fullHeight - 7) + ")")
    .attr("id", "title")
    .text("Time (Year)");
  */

  d3.select("#titles").append("text") // information label
  .attr("id", "legendMsg")
    .style("text-anchor", "left")
    .style("font-family", "arial")
    .style("font-size", "10px")
    .style("fill", "black")
    .attr("transform", "translate(" + (fullWidth - 200) + ", " + (fullHeight - 10) + ")")
    .text("** Hover over Legend for more information");

    /*
    d3.select("#legend").append("text") // text label for the Y axis
    .style("text-anchor", "middle")
    .style("font-family", "arial")
    .style("font-size", "14px")
    .style("fill", "black")
    .attr("transform", "translate(17, " + fullHeight / 2 + ") rotate(270)")
    .text("Tonnes (,000's)");
    */

  // Chart Title
  d3.select("#titles")
  .append("text") // text label for the x axis
    .attr("id","title")
    .style("text-anchor", "middle")
    .style("font-family", "arial")
    .style("font-size", "24px")
    .style("fill", "black")
    .attr("transform", "translate(" + (xPadding + 0.5*chartWidth) + ", 30)")
    .text(SGraphTitle);
} // end of Visualise function