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

//main code:
function DrawGraph(name) {
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
        console.log(data);
        //removes 2018 as many things were changed in how data was recorded that year
        var dataset = filterData(data, function(dataValue) {
            return dataValue.year != 2018
        });
        setupRadioButtons(dataset);
        
        visualiseData(dataset);
    });
}

function RemoveVisualization() {
    d3.select("#svgWrapper").html("");
}


function setupRadioButtons(startDataset) {
    const dataref = startDataset;
    d3.selectAll("input[name='Stream']").on("change", function(){
        RemoveVisualization();
        var string = this.value;
        visualiseData(filterData(dataref, function(dataval) {
            return dataval.stream == string;
        }))
    });
}

function filterData(dataset, lambdaExpression) {
    return dataset.filter(lambdaExpression);
}


function visualiseData(dataset) {
    var fate = d3.group(dataset, d => d.fate);
    var fateAndYears = d3.rollup(dataset, v => d3.sum(v, d => d.tonnes), d => d.fate, d => d.year);

    var svgWrapper = d3.select("#svgWrapper");

    var fullWidth = 700;
    var fullHeight = 300;
    const svg = svgWrapper.append("svg").attr("width",fullWidth).attr("height",fullHeight).attr("id","svg");

    var xpadding = 60;
    var ypadding = 20;

    var width = fullWidth - 2*xpadding;
    var height = fullHeight - 2*ypadding;

    svg.append("g").attr("id", "background");
    svg.append("g").attr("id", "data");
    svg.append("g").attr("id", "axis");
    svg.select("#axis").append("g").attr("id", "x");
    svg.select("#axis").append("g").attr("id", "y");

    var background = svg.select("#background");
    var axis = svg.select("#axis");
    var data = svg.select("#data");

    background.append("rect").attr("width",fullWidth).attr("height",fullHeight).attr("fill","lightgrey");
    background.append("rect").attr("width",width).attr("height",height).attr("x",xpadding).attr("y",ypadding).attr("fill","white");

    var xScale = d3.scaleLinear()
    .domain(d3.extent(dataset, function(d) {
        return d.year;
    }))
    .range([0,width]);

    var yScale = d3.scaleLinear()
    .domain([0, d3.max(fateAndYears, function(d) {
        //console.log(d[0])
        //console.log(d3.max(Array.from(d[1].values())))
        return d3.max(Array.from(d[1].values()));
    })])
    .range([height, 0]);

    var res = Array.from(fate.keys());

    var color = d3.scaleOrdinal()
    .domain(res)
    .range(d3.schemeSet3);

    data
    .selectAll(".line")
    .data(fateAndYears)
    .enter()
    .append("path")
        .attr("fill", "none")
        .attr("stroke", function(d){ 
            return color(d[0]) 
        })
        .attr("stroke-width", 1.5)
        .attr("d", function(d) {
            let vals = nestedMapToArray(d[1]);

            return d3.line()
            .x(function(d) {
                return xScale(d[0]) + xpadding; 
            })
            .y(function(d) {
                return yScale(d[1]) + ypadding; 
            })
            (vals);

        });
    
    var xAxis = d3.axisBottom(xScale).ticks(8);
    var yAxis = d3.axisLeft(yScale).ticks(12);

    axis.select("#x")
    .attr("transform", "translate(" + xpadding + ", " + (height + ypadding) + ")")
    .call(xAxis);

    axis.select("#y")
    .attr("transform", "translate("+xpadding+"," + ypadding +")")
    .call(yAxis);

}
function init() {
    
    DrawGraph("NWRCleaner.csv");
}

window.onload = init();