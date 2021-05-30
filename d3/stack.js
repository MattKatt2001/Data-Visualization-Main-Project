

var StackKeys = [];

function StackedData(dataset) {
	stackdata = [];
	
	var fate = d3.group(dataset, d => d.fate); // group data
	var fatearray = Array.from(d3.rollup(dataset, v => d3.sum(v, d => d.tonnes), d => d.year, d => d.fate)); // array the rollup data	
	//each array entry is a map, convert to array and use dat to build new array for stack
	//console.log(fatearray);
	
	//clear the stack keys
	StackKeys = [];
	//build and array with the keys to use fo the stack in VisualiseStack
	keyarray = Array.from(fatearray[0][1]);
	//console.log(keyarray);
	for (i = 0; i < keyarray.length; i++) {
  	StackKeys.push(keyarray[i][0]);
  
		}
	// console.log(StackKeys);

fatearray.forEach(function(x){
		var tmparray = Array.from(x[1]);
	
		var obj = {"year" : x[0]}; // initialise the stack JSON series with year value
		//iterate through each year and add to JSON series
		for (i = 0; i < tmparray.length; i++){
		var t = {[tmparray[i][0]] : tmparray[i][1],}
		var tmpobj = Object.assign(obj, t);
		
		}
		
		//	console.log(tmpobj);
		//	console.log(StackKeys);
    
	stackdata.push(tmpobj) // build array for stack with the JSON series
	});

}



function visualiseStackedData(stackdata) {

	var fullWidth = 700, fullHeight = 300;
	var xpadding = 60, ypadding = 20;
	var width = fullWidth - 2*xpadding;
    var height = fullHeight - 2*ypadding;
			
	var svg = d3.select("#svgWrapper")
				.append("svg")
				.attr("width", fullWidth)
				.attr("height", fullHeight)
				.append("g");

	

	//add the background boxes
	
	svg.append("g").attr("id", "background");
	var background = svg.select("#background");	
	background.append("rect").attr("width",fullWidth).attr("height",fullHeight).attr("fill","lightgrey");
    background.append("rect").attr("width",width).attr("height",height).attr("x",xpadding).attr("y",ypadding).attr("fill","white");
		
	
	// X Axis definition
	var xScale = d3.scaleLinear()
				.domain([d3.min(stackdata, function(d) { return d.year;}), d3.max(stackdata, function(d) {return d.year;})]) // min and max
				.range([0, width]); // how much of the svg area are you using
				
	//Y axis definition
	var yScale = d3.scaleLinear()
				.range([height+ypadding, ypadding]);						
	svg.append("g")
		.attr("transform", "translate("+ xpadding +"," + (height+ypadding) + ")")
		.call(d3.axisBottom(xScale).ticks(9).tickFormat(d3.format("d")));
	
	// now create a stack "stack", define the keys and stack the data
	var stack = d3.stack()
 				//.keys(["Disposal", "Recycling", "Unknown", "Energy recovery", "Long-term storage"]);
 				//.keys(["Disposal", "Energy recovery", "Recycling"]);
 				 .keys(StackKeys);

 	var colors = ["red", "blue", "green", "purple", "orange"];
 	
    
 	var sData = stack(stackdata);
 	//console.log(sData);
 	
 	//now that we have the stacked data we can determine the Y scale limits
 	yScale.domain([0, d3.max(sData[sData.length-1], function (d) {return d[1]})]);
 		svg.append("g")
		.attr("transform", "translate("+ xpadding +", 0)")
		.call(d3.axisLeft(yScale));
		
var area = d3.area()
		.x(function(d) {return xScale(d.data.year) + xpadding;})
		.y0(function(d) {return yScale(d[0]);})
		.y1(function(d) {return yScale(d[1]);});
		
	
	var series = svg.selectAll("g.series")
		.data(sData) 
		.enter().append("g")
		.attr("class", "series");
		
	series.append("path")
		.style("fill", function(d,i) {return colors[i];})
		.attr("d", function(d) {return area(d);});
	


}


