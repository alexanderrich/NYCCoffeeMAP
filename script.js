var mapSvg = d3.select("#map"),
    mouseOverGraph = d3.select("#mouseovergraph").append("g")
        .attr("transform", "translate(100, 100)");

var coffeeStats = d3.map();

var path = d3.geoPath(d3.geoConicConformal()
                      .parallels([40 + 40 / 60, 41 + 2 / 60])
                      .scale(70000)
                      .rotate([74, -40 - 45 / 60]));

var xLogScale = d3.scaleLog()
        .base(2)
        .domain([2, 100])
        .range([0, 7]);

var xPropScale = d3.scaleLinear()
        .domain([.1, .8])
        .range([0, 7]);

var color = d3.scaleThreshold()
        .domain(d3.range(0,8))
        .range(d3.schemeBlues[9]);

var pieColor = d3.scaleOrdinal(["#98abc5", "#8a89a6", "#7b6888"]);

var pie = d3.pie()
        .sort(null)
        .value(function(d) { return d.number; });

var pieLabel = d3.arc()
        .outerRadius(60)
        .innerRadius(60);

var axis = d3.select("#scale").append("g")
           .attr("class", "key")
           .attr("transform", "translate(20,40)");

axis.selectAll("rect")
    .data(color.range())
    .enter().append("rect")
    .attr("height", 8)
    .attr("x", function(d, i) {return 20*i;})
    .attr("width", function(d) { return 20; })
    .attr("fill", function(d) { return d; });

// g.append("text")
//  .attr("class", "caption")
//  .attr("x", xScale.range()[0])
//  .attr("y", -6)
//  .attr("fill", "#000")
//  .attr("text-anchor", "start")
//  .attr("font-weight", "bold")
//  .text("Unemployment rate");

axis.call(d3.axisBottom(d3.scaleLinear().domain([0, 140]).range([20, 160]))
       .tickSize(13)
       .tickFormat(function(x, i) {return Math.ceil(xLogScale.invert(i)).toFixed();})
       .tickValues([0,20,40,60,80,100,120,140]))
    .select(".domain")
    .remove();

d3.queue()
    .defer(d3.json, "data/nyc-zip-code.json")
    .defer(d3.csv, "data/coffee_per_zip.csv", function(d) { coffeeStats.set(d.zip, d); })
    .await(ready);

function ready(error, map) {
    var storeType = d3.select('input[name="storetype"]:checked').attr("value"),
        proportion = d3.select('#proportion').property("checked"),
        fixed = d3.select("#fixscale").property("checked");

    if (error) throw error;
    map.features.forEach(function(feat) {
        feat.stats = coffeeStats.get(feat.properties.ZIP) || {"zip": feat.properties.ZIP,
                                                              "dunkin": 0,
                                                              "other": 0,
                                                              "starbucks": 0,
                                                              "total": 0,
                                                              "dunkin_prop": 0,
                                                              "starbucks_prop": 0,
                                                              "other_prop": 0,
                                                              "total_prop": 1.0,
                                                              "area": 1};
    });
    mapSvg.append("g")
        .attr("id", "zoomgroup")
        .append("g")
        .attr("transform", "translate(-150) scale(1.1)")
        .attr("class", "zips")
        .selectAll("path")
        .data(map.features)
        .enter().append("path")
        .attr("class", function (d) {return "zip" + d.properties.ZIP})
        .attr("fill", "#fff")
        .attr("d", path)
  	    .on("mouseover",mouseover)
	      .on("mouseout",mouseout);

    d3.selectAll(".storetype").on("change", function () {
        storeType = this.value;
        updateFill();
    });

    d3.select("#proportion").on("change", function () {
        proportion = this.checked;
        updateFill();
    });

    d3.select("#fixscale").on("change", function () {
        fixed = this.checked;
        updateFill();
    });

    mapSvg.call(d3.zoom()
             .scaleExtent([1/2, 10])
             .on("zoom", zoomed));

    function zoomed() {
        mapSvg.select("#zoomgroup").attr("transform", d3.event.transform);
    }

    var arc = mouseOverGraph.selectAll(".arc")
            .data(pie([{'name': 'Starbucks', 'number': 1, 'total': 3},
                       {'name': 'Dunkin\' Donuts', 'number': 1, 'total': 3},
                       {'name': 'Other', 'number': 1, 'total': 3}]))
            .enter().append("g")
            .attr("class", "arc");

    arc.append("path")
        .attr("d", d3.arc()
              .outerRadius(10)
              .innerRadius(0))
        .each(function (d) {this._current = d; })
        .attr("fill", function (d) {return pieColor(d.data.name)});

    function arcTween(d) {
        var i = d3.interpolate(this._current, d),
            //FIGURE OUT INTERPOLATION FOR ARC SIZE
            j = d3.interpolate(Math.sqrt(this._current.data.total)*10, Math.sqrt(d.data.total )* 10);
        this._current = i(0);
        return function(t) {
            return d3.arc().outerRadius(j(t)).innerRadius(0)(i(t));
        };
    }

    function mouseover(d){
        d3.selectAll("." + d3.select(this).attr("class")).style("stroke", "#aaa").style("stroke-width", "2px");
	      var pieStats = [{'name': 'Starbucks', 'number': d.stats['starbucks'], 'total': d.stats.total},
                        {'name': 'Dunkin\' Donuts', 'number': d.stats['dunkin'], 'total': d.stats.total},
                        {'name': 'Other', 'number': d.stats['other'], 'total': d.stats.total}];

        mouseOverGraph.selectAll(".arc")
                .select("path")
                .data(pie(pieStats))
            .transition()
            .duration(500)
            .attrTween("d", arcTween);
	      d3.select(".mouseover").style("display","inline");
    }

    function mouseout(){
        d3.selectAll("." + d3.select(this).attr("class")).style("stroke", "").style("stroke-width", "0px");
	      d3.select(".mouseover").style("display","none");
    }

    // moves the mouseover box whenever the mouse is moved.
    d3.select('html') // Selects the 'html' element
        .on('mousemove', function()
            {
		        var locs=d3.mouse(this);	// get the mouse coordinates
		        // add some padding
		        locs[0]+=15;
		        locs[1]+=5;
		        d3.select("div.mouseover").style("margin-left", locs[0] + "px");
		        d3.select("div.mouseover").style("margin-top", locs[1] + "px");
        });

    function updateFill() {
        if (proportion) {
            if (fixed) {
                xPropScale.domain([.1, .8]);
            } else {
                if (storeType == "starbucks") {
                    xPropScale.domain([.05, .4]);
                } else if (storeType == "dunkin") {
                    xPropScale.domain([.1, .8]);
                } else if (storeType == "other") {
                    xPropScale.domain([.1, .8]);
                } else if (storeType == "total") {
                    xPropScale.domain([.1, .8]);
                }
            }
            axis.selectAll(".tick")
                .select("text")
                .text(function(x, i) {return xPropScale.invert(i).toFixed(2).substr(1);});
            mapSvg.selectAll("path")
                .transition()
                .duration(500)
                .attr("fill", function(d) { return color(xPropScale(d.stats[storeType + "_prop"] || 0)); });
            mapSvg.select(".zips").selectAll("path")
                .select("title")
                .text(function(d) { return d.stats[storeType + "_prop"] || 0; });
        } else {
            if (fixed) {
                xLogScale.domain([2, 100]);
            } else {
                if (storeType == "starbucks") {
                    xLogScale.domain([2, 40]);
                } else if (storeType == "dunkin") {
                    xLogScale.domain([2, 20]);
                } else if (storeType == "other") {
                    xLogScale.domain([2, 60]);
                } else if (storeType == "total") {
                    xLogScale.domain([2, 100]);
                }
            }
            axis.selectAll(".tick")
                .select("text")
                .text(function(x, i) {return Math.ceil(xLogScale.invert(i)).toFixed();});
            mapSvg.selectAll("path")
                .transition()
                .duration(500)
                .attr("fill", function(d) { return color(xLogScale(Math.floor(d.stats[storeType] / d.stats.area) || 0)); });
            mapSvg.select(".zips").selectAll("path")
                .select("title")
                .text(function(d) { return d.stats[storeType] / d.stats.area || 0; });
        }

    }
    updateFill();
}

