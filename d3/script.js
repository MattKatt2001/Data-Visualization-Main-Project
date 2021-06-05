"use strict"
//some helper functions:
function nestedMapToArray(dataset) {
    let output = [];
    let keys = Array.from(dataset.keys());
    let values = Array.from(dataset.values());
    if (values[0] instanceof Map) {
        for(let i = 0; i < keys.length; i++) {
            let mapExpanded = nestedMapToArray(values[i]);
            for(let j = 0; j < mapExpanded.length; j++) {
                let tempOutput = [];
                tempOutput.push(keys[i]);
                for(let k = 0; k < mapExpanded[j].length; k++) {
                    tempOutput.push(mapExpanded[j][k]);
                }
                output.push(tempOutput);
            }
            
        }
    }
    else {
        for(let i = 0; i < keys.length; i++) {
            let tempOutput = [];
            tempOutput.push(keys[i]);
            tempOutput.push(values[i]);
            output.push(tempOutput);
        }
    }
    return output;
}

function transpose(dataset) {
    let colNum = dataset[0].length;
    let output = [];
    for (let a = 0; a < colNum; a++) {
        let col = [];
        for(let i = 0; i < d.length; i++) {
            col.push(dataset[i][a]);
        }
        output.push(col);
    }
    return output;
}

function filterData(dataset, lambdaExpression) {
    return dataset.filter(lambdaExpression);
}

var filteredDataset; //global to pass to stack functions

//SVG should not be deleted as d3 needs it for transitions between graph types and displayed data
const fullHeight = 300;
const fullWidth = 700;

const xPadding = 60;
const yPadding = 20;

const chartWidth = fullWidth - 2*xPadding;
const chartHeight = fullHeight - 2*yPadding;

//creates the svg itself and the group structure
function createSVG() {
    var svgWrapper = d3.select("#svgWrapper");

    var svg = svgWrapper.append("svg").attr("width",fullWidth).attr("height",fullHeight).attr("id","svg");

    svg.append("g").attr("id", "background");

    svg.append("g").attr("id", "data");
    var data = svg.select("#data");

    data.append("g").attr("id", "highlight");
    data.append("g").attr("id", "paths");
    data.append("g").attr("id", "dots");

    data.append("clipPath")
    .attr("id", "graphClip")
    .append("rect")
    .attr("x", xPadding)
    .attr("y", yPadding)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

    svg.append("g").attr("id", "axis");

    svg.select("#axis").append("g").attr("id", "x");
    svg.select("#axis").append("g").attr("id", "y");
}
 
//reads in dataset, instaniates svg and buttons, creates initial graph.
function CreateVisualization(name) {
    var dataset;
    d3.csv("/data/"+name, function(d) {
        return {
            year: +d.Year,
            jurisdiction: d.Jurisdiction,
            category: d.Category,
            type: d.Type, 
            stream: d.Stream,
            management: d.Management,
            fate: d.Fate,
            tonnes: +d.Tonnes
        }
    }).then(function(data) {
        //removes 2018 as many things were changed in how data was recorded that year
        var dataset = filterData(data, function(dataValue) {
            return dataValue.year != 2018 //&& dataValue.fate != "Unknown" && dataValue.fate != "Energy recovery";
        });
        

        createSVG();

        setupRadioButtons(dataset);    

        drawBackground(filteredDataset);

        lineChart(dataset)
    });
}

//handles highlighting line when mouseover
function handleMouseOverLine(d, i) {
    var path = d.path[0]

    var data = d3.select('#' + path.id).attr('d');
    d3.select('#' + path.id).attr("stroke-width", 3);
    //from https://stackoverflow.com/questions/25384052/convert-svg-path-d-attribute-to-a-array-of-points
    var commands = data.split(/(?=[LMC])/);
    var pointArrays = commands.map(function(d){
        var pointsArray = d.slice(1, d.length).split(',');
        var pairsArray = [];
        for(var i = 0; i < pointsArray.length; i += 2){
            pairsArray.push([+pointsArray[i], +pointsArray[i+1]]);
        }
        return pairsArray;
    });

    var highlight = d3.select("#highlight");
    highlight
    .append("path")
    .style("opacity", 0.3)
    .attr("fill", d3.select('#' + path.id).attr('stroke'))
    .attr("stroke", function(d){ 
        return d3.select('#' + path.id).attr('stroke');
    })
    .attr("stroke-width", 1.5)
    .attr("clip-path", "url(#graphClip)")
    .attr("d", function() {
        var data = pointArrays;

        return d3.area()
		.x(function(d) {return d[0][0]})
		.y0(function(d) {return d[0][1]-7})
		.y1(function(d) {return d[0][1]+7})
        (data);

    });
}
//handles de-highlighting line when mouse 
function handleMouseOutLine(d) {
    var path = d.path[0]

    d3.select('#' + path.id).attr("stroke-width", 2.5);
    d3.select("#highlight").html("");
}

//updates the linechart with transitions when different data is displayed
function updateLineChart(dataset) {
    
    //list of categories
    var fate = d3.group(dataset, d => d.fate); 
    //categories with tons grouped by year
    var fateAndYears = d3.rollup(dataset, v => d3.sum(v, d => d.tonnes), d => d.fate, d => d.year);

    //scale calculation
    var xScale = d3.scaleLinear()
    .domain(d3.extent(dataset, function(d) {
        return d.year;
    }))
    .range([0,chartWidth]);

    var yScale = d3.scaleLinear()
    .domain([0, d3.max(fateAndYears, function(d) {
        return d3.max(Array.from(d[1].values()));
    })])
    .range([chartHeight, 0]);

    //color attribution
    var color = d3.scaleOrdinal()
    .domain(Array.from(fate.keys()))
    .range(d3.schemeSet1);

    //prepares axis
    var xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("d"));
    var yAxis = d3.axisLeft(yScale).ticks(12);

    //selected the dot groups
    var dotsg = d3.select("#dots").selectAll(".dot").data(fateAndYears)
    //selected the linedata
    var lineData = d3.select("#paths").selectAll("path").data(fateAndYears);

    //selected the circles in the dot groups
    var dotsEach = dotsg.selectAll("circle").data(function(d) {
        var arr = nestedMapToArray(d[1]);
        arr.forEach(function(d_) { d_.push(d[0]) })
        return arr
    })

    //gets a div reference
    var div = d3.select(".tooltip");

    //removes data that is not included
    lineData.exit().transition().duration(100).remove() //remove lines not in data

    dotsg.exit().selectAll("circle").transition().duration(100).remove() //removes all points from group

    //add lines
    lineData
    .enter()
    .append("path")
    .attr("clip-path", "url(#graphClip)")
    .attr("id",function(d, i) {
        return Array.from(fate.keys())[i].replace(/\s/g, '');
    })
    .attr("fill", "none")
    .attr("stroke", function(d){ 
        return color(d[0]) 
    })
    .attr("stroke-width", 2.5)
    .on("click", function(d) { handleMouseClickLine(d); })
    .on("mouseover", handleMouseOverLine)
    .on("mouseout", handleMouseOutLine);

    //add circles
    dotsEach
    .enter()
    .append("circle")
    .attr("val", function(d){
        return d[1];
    })
    .attr("fate", function(d){
        return d[2];
    })
    .attr("fill", function(d){
        return color(d[2]) 
    })
    .attr("stroke", function(d){
        return color(d[2]) 
    })
    .attr("fill-opacity", 0)
    .attr("r", 3)
    .on("mouseover", function(d, i) {
        d3.select(this).attr("r", 6).attr("fill-opacity", 0.3);

        div.transition()		
            .duration(200)		
            .style("opacity", .9);		
        div	.html(Number.parseFloat(d3.select(this).attr("val")/1000000).toPrecision(3) + "x10<sup>6</sup>")	
            .style("left", d.x + 5 +  "px")		
            .style("top", d.y  + "px");	
    })
    .on("mouseout", function(d, i) {
        d3.select(this).attr("r", 3).attr("fill-opacity", 0)
        div.transition()		
            .duration(200)		
            .style("opacity", 0);	
    }).attr("cx", function(d, i) {
        return xScale(d[0]) + xPadding; 
    })
    .attr("cy", function(d, i) {
        return yScale(d[1]) + yPadding; 
    });

    //data gets redefinied as new data has been added
    lineData = d3.select("#paths").selectAll("path").data(fateAndYears);
    dotsg = d3.select("#dots").selectAll(".dot").data(fateAndYears)
    dotsEach = dotsg.selectAll("circle").data(function(d) {
        var arr = nestedMapToArray(d[1]);
        arr.forEach(function(d_) { d_.push(d[0]) })
        return arr
    })

    //positions lines
    lineData
    .transition()
    .attr("id",function(d, i) {
        return Array.from(fate.keys())[i].replace(/\s/g, '');
    })
    .attr("d", function(d) {
        let vals = nestedMapToArray(d[1]);
        return d3.line()
        .x(function(d) {
            return xScale(d[0]) + xPadding; 
        })
        .y(function(d) {
            return yScale(d[1]) + yPadding; 
        })
        (vals);
    });

    //positions circles
    dotsg.selectAll("circle").data(function(d) {
        var arr = nestedMapToArray(d[1]);
        arr.forEach(function(d_) { d_.push(d[0]) })
        return arr
    }).transition()
    .attr("cx", function(d, i) {
        return xScale(d[0]) + xPadding; 
    })
    .attr("cy", function(d, i) {
        return yScale(d[1]) + yPadding; 
    });

    //axis
    d3.select("#axis").select("#x")
    .transition()
    .attr("transform", "translate(" + xPadding + ", " + (chartHeight + yPadding) + ")")
    .call(xAxis);

    d3.select("#axis").select("#y")
    .transition()
    .attr("transform", "translate("+xPadding+"," + yPadding +")")
    .call(yAxis);
    
}

//creates the linechart from selected data
function lineChart(dataset) {

    //list of categories
    var fate = d3.group(dataset, d => d.fate);
    //categories with tons grouped by year
    var fateAndYears = d3.rollup(dataset, v => d3.sum(v, d => d.tonnes), d => d.fate, d => d.year);

    //scale calculation
    var xScale = d3.scaleLinear()
    .domain(d3.extent(dataset, function(d) {
        return d.year;
    }))
    .range([0,chartWidth]);

    var yScale = d3.scaleLinear()
    .domain([0, d3.max(fateAndYears, function(d) {
        return d3.max(Array.from(d[1].values()));
    })])
    .range([chartHeight, 0]);

    //color attribution
    var color = d3.scaleOrdinal()
    .domain(Array.from(fate.keys()))
    .range(d3.schemeSet1);

    //prepares axis
    var xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("d"));
    var yAxis = d3.axisLeft(yScale).ticks(12);

    //appends the axis
    d3.select("#axis").select("#x")
    .attr("transform", "translate(" + xPadding + ", " + (chartHeight + yPadding) + ")")
    .call(xAxis);

    d3.select("#axis").select("#y")
    .attr("transform", "translate("+xPadding+"," + yPadding +")")
    .call(yAxis);

    //selected the linedata
    var lineData = d3.select("#paths").selectAll("path").data(fateAndYears);

    //creates a div for tooltip
    var div = d3.select("body").append("div")	
    .attr("class", "tooltip")				
    .style("opacity", 0);

    //creates a group for info circles
    d3.select("#dots")
    .selectAll("g.dot")
    .data(fateAndYears)
    .enter()
    .append("g")
    .attr("class", "dot");

    //selected dot groups
    var dotsg = d3.select("#dots").selectAll(".dot").data(fateAndYears)
    //selected the circles in the dot groups
    var dotsEach = dotsg.selectAll("circle").data(function(d) {
        var arr = nestedMapToArray(d[1]);
        arr.forEach(function(d_) { d_.push(d[0]) })
        return arr
    })

    //add lines
    lineData
    .enter()
    .append("path")
    .attr("clip-path", "url(#graphClip)")
    .attr("id",function(d, i) {
        return Array.from(fate.keys())[i].replace(/\s/g, '');
    })
    .attr("fill", "none")
    .attr("stroke", function(d){ 
        return color(d[0]) 
    })
    .attr("stroke-width", 2.5)
    .on("click", function(d) { handleMouseClickLine(d); })
    .on("mouseover", handleMouseOverLine)
    .on("mouseout", handleMouseOutLine);
    lineData = d3.select("#paths").selectAll("path").data(fateAndYears); //redefined to include new paths

    //creates appends circles
    dotsEach
    .enter()
    .append("circle")
    .attr("val", function(d){
        return d[1];
    })
    .attr("fate", function(d){
        return d[2];
    })
    .attr("fill", function(d){
        return color(d[2]) 
    })
    .attr("stroke", function(d){
        return color(d[2]) 
    })
    .attr("fill-opacity", 0)
    .attr("r", 3)
    .on("mouseover", function(d, i) {
        d3.select(this).attr("r", 6).attr("fill-opacity", 0.3);

        div.transition()		
            .duration(200)		
            .style("opacity", .9);		
        div	.html(Number.parseFloat(d3.select(this).attr("val")/1000000).toPrecision(3) + "x10<sup>6</sup>")	
            .style("left", d.x + 5 +  "px")		
            .style("top", d.y  + "px");	
    })
    .on("mouseout", function(d, i) {
        d3.select(this).attr("r", 3).attr("fill-opacity", 0)
        div.transition()		
            .duration(200)		
            .style("opacity", 0);	
    });

    //adjust lines
    lineData
    .attr("id",function(d, i) {
        return Array.from(fate.keys())[i].replace(/\s/g, '');
    })
    .attr("d", function(d) {
        let vals = nestedMapToArray(d[1]);
        return d3.line()
        .x(function(d) {
            return xScale(d[0]) + xPadding; 
        })
        .y(function(d) {
            return yScale(d[1]) + yPadding; 
        })
        (vals);
    });

    //positions circles
    dotsEach.enter().selectAll("circle")
    .attr("cx", function(d, i) {
        return xScale(d[0]) + xPadding; 
    })
    .attr("cy", function(d, i) {
        return yScale(d[1]) + yPadding; 
    });
}

//creates the function that runs when a radio button is clicked
function setupRadioButtons(startDataset) {
    const dataref = startDataset;
    var string = (document.querySelector('input[name="Stream"]:checked').value); // current check box

    //setup on change behaviour
    d3.selectAll("input[name='Stream']").on("change", function(){
        var string = this.value;
        filteredDataset = filterData(dataref, function(dataval) {
            return dataval.stream == string;
        })
        updateLineChart(filteredDataset)
    });

    //filters the dataset initally to so graph is drawn as just totals
    filteredDataset = filterData(dataref, function(dataval) {
        return dataval.stream == string;
    });
}

//draws the background currently so is a bit pointless
//also calls the drawing of linechart
function drawBackground() {
    var background = d3.select("#background");

    background.append("rect").attr("width",fullWidth).attr("height",fullHeight).attr("fill","lightgrey");
    background.append("rect").attr("width",chartWidth).attr("height",chartHeight).attr("x",xPadding).attr("y",yPadding).attr("fill","white");
}

//this is where the stacked area chart should be drawn
function handleMouseClickLine(d) {    
    var path = d.path[0]
    console.log("Edge clicked: " + path.id);
    
    //remove lines
    d3.selectAll("path").remove();

    d3.select("#dots").selectAll(".dot").selectAll("circle").remove()

    //add stacked area chart
  }


function init() {
   CreateVisualization("NWRCleaner.csv");
}

window.onload = init();