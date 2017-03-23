/*
 * Requires:
 * d3.js
 * leaflet.js
 */

/*jslint browser: true*/
/*global d3, L*/

// use leaflet to grab tile map from carto
var map = new L.Map("map", {center: [40.7128, -74.0059], zoom: 11})
        .addLayer(new L.TileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
                                  {maxZoom: 16, minZoom: 10,
                                   attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'})),
    mapOverlay = d3.select(map.getPanes().overlayPane).append("svg"),
    mapOverlayGroup = mapOverlay.append("g").attr("class", "leaflet-zoom-hide"),
    // svg for pie graphs when mousing over zips
    mouseoverGraph = d3.select("#mouseovergraph"),
    // scales and colors for scale
    propScale = d3.scaleLinear().domain([.1, .8]).range([0, 7]),
    logScale = d3.scaleLog().base(2).domain([2, 100]).range([0, 7]),
    color = d3.scaleThreshold().domain(d3.range(0,8)).range(d3.schemeBlues[9]),
    scaleGroup = d3.select("#scale").append("g")
        .attr("class", "key")
        .attr("transform", "translate(20)"),
    // map (i.e., key-value pairs) to store coffee stats
    coffeeStats = d3.map();

// create colored rectangles on scale
scaleGroup.selectAll("rect")
    .data(color.range())
    .enter().append("rect")
    .attr("height", 8)
    .attr("x", function(d, i) {return 20*i;})
    .attr("width", function(d) { return 20; })
    .attr("fill", function(d) { return d; });

// create scale ticks
scaleGroup.call(d3.axisBottom(d3.scaleLinear().domain([0, 140]).range([20, 160]))
          .tickSize(13)
          .tickFormat(function(x, i) {return Math.ceil(logScale.invert(i)).toFixed();})
          .tickValues([0,20,40,60,80,100,120,140]))
    .select(".domain")
    .remove();

d3.queue()
    .defer(d3.json, "data/nyc-zip-code.json")
    .defer(d3.csv, "data/coffee_per_zip.csv", function(d) { coffeeStats.set(d.zip, d); })
    .await(ready);

function ready(error, zipJson) {
    if (error) throw error;
    var storeType = d3.select('input[name="storetype"]:checked').attr("value"),
        isProportion = d3.select('#proportion').property("checked"),
        isFixed = d3.select("#fixscale").property("checked"),
        transform = d3.geoTransform({point:
                                     function(x, y) {
                                         // Use Leaflet to implement a D3 geometric transformation.
                                         var point = map.latLngToLayerPoint(new L.LatLng(y, x));
                                         this.stream.point(point.x, point.y);}
                                    }),
        pathGenerator = d3.geoPath(transform),
        allPaths,
        pie,
        arc;

    // fill in default values for zip codes that don't appear in the data
    zipJson.features.forEach(function(feat) {
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

    allPaths = mapOverlayGroup.selectAll("path")
        .data(zipJson.features)
        .enter().append("path")
        .attr("class", function (d) {return "zip" + d.properties.ZIP; })
        .attr("fill", "#fff")
        .attr("d", pathGenerator)
            .style("opacity", 0.75)
  	    .on("mouseover",mouseover)
	      .on("mouseout",mouseout);

    d3.selectAll(".storetype").on("change", function () {
        storeType = this.value;
        updateFill();
    });
    d3.select("#proportion").on("change", function () {
        isProportion = this.checked;
        updateFill();
    });
    d3.select("#fixscale").on("change", function () {
        isFixed = this.checked;
        updateFill();
    });

    // moves the mouseover box whenever the mouse is moved.
    d3.select('html')
        .on('mousemove',
            function() {
		            var locs=d3.mouse(this);
		            locs[0]+=15;
		            locs[1]+=5;
		            d3.select("div.mouseover").style("margin-left", locs[0] + "px");
		            d3.select("div.mouseover").style("margin-top", locs[1] + "px");
            });

    setupMouseoverGraph();
    map.on("viewreset", reset);
    reset();
    updateFill();

    // build up the components for the mouse-over pie chart
    function setupMouseoverGraph () {
        var pieColor = d3.scaleOrdinal(["#00592D", "#F21F88", "#b2491E"]),
            textGroup,
            textGroupInfo,
            i;
        pie = d3.pie()
            .sort(null)
            .value(function(d) { return d.number; });
        arc = mouseoverGraph.append("g")
            .attr("transform", "translate(150, 100)")
            .selectAll(".arc")
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
            .style("fill", function (d) {return pieColor(d.data.name); });
        textGroup = mouseoverGraph.append("g")
                .attr("transform", "translate(4, 20)");
        textGroup.append("text")
            .attr("id", "zip")
            .style("font-size", "24px");
        textGroup.append("text")
            .attr("id", "total_number")
            .attr("y", 20);
        textGroup.append("text")
            .attr("id", "total_density")
            .attr("y", 40);
        textGroupInfo = [{'name': 'starbucks', 'text': 'Starbucks', 'offset': 20},
                             {'name': 'dunkin', 'text': 'Dunkin\' Donuts', 'offset': 90},
                             {'name': 'other', 'text': 'Other', 'offset': 160}];
        for (i = 0; i < 3; i++) {
            textGroup = mouseoverGraph.append("g")
                .attr("transform", "translate(270," + textGroupInfo[i]['offset'] + ")");
            textGroup.append("rect")
                .attr("x", -25)
                .attr("y", -14)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", pieColor(i));
            textGroup.append("text")
                .style("font-size", "18px")
                .text(textGroupInfo[i]['text']);
            textGroup.append("text")
                .attr("id", textGroupInfo[i]['name'] + "_number")
                .attr("y", 20)
                .text("xx shops");
            textGroup.append("text")
                .attr("id", textGroupInfo[i]['name'] + "_density")
                .attr("y", 40)
                .text("xx/mi²");
            textGroup.append("text")
                .attr("id", textGroupInfo[i]['name'] + "_prop")
                .attr("y", 40)
                .attr("x", 75)
                .text("100%");
        }
    }



    // interpolation function to animating pie chart transitions
    function arcTween(d) {
        var i = d3.interpolate(this._current, d),
            j = d3.interpolate(Math.sqrt(this._current.data.total)*10, Math.sqrt(d.data.total )* 10);
        this._current = i(0);
        return function(t) {
            return d3.arc().outerRadius(j(t)).innerRadius(0)(i(t));
        };
    }

    //function triggered on mousing over zip code
    function mouseover(d){
        var groups = ["total", "starbucks", "dunkin", "other"],
            // re-represent data for use in pie chart
	          pieStats = [{'name': 'Starbucks', 'number': d.stats['starbucks'], 'total': d.stats.total},
                        {'name': 'Dunkin\' Donuts', 'number': d.stats['dunkin'], 'total': d.stats.total},
                        {'name': 'Other', 'number': d.stats['other'], 'total': d.stats.total}],
            t = d3.transition().duration(500),
            i,
            number,
            density;
        d3.selectAll("." + d3.select(this).attr("class")).style("stroke", "#fff").style("stroke-width", "3px");
        arc.data(pie(pieStats))
            .select("path")
            .transition(t)
            .attrTween("d", arcTween);
        d3.select("#zip").text(d.stats['zip']);
        for (i = 0; i < 4; i++) {
            number = +d.stats[groups[i]];
            d3.select("#" + groups[i] + "_number")
                .text(number.toFixed() + " shop" + (number === 1 ? "" : "s"));
            density = number / d.stats['area'];
            d3.select("#" + groups[i] + "_density")
                .text((density > 10 ? density.toFixed() : density.toFixed(1)) + "/mi²");
            if (groups[i] !== "total") {
                d3.select("#" + groups[i] + "_prop")
                    .text((100 * d.stats[groups[i] + "_prop"]).toFixed() + "%");
            }
        }
	      d3.select(".mouseover").style("display","inline");
    }

    //function triggered on mouse moving out of zip code
    function mouseout(){
        d3.selectAll("." + d3.select(this).attr("class")).style("stroke", "").style("stroke-width", "0px");
	      d3.select(".mouseover").style("display","none");
    }

    // function triggered on changing store type or switching proportion/density or free/fixed scale
    function updateFill() {
        if (isProportion) {
            d3.select("#scaletitle").text("Proportion");
            if (isFixed) {
                propScale.domain([.1, .8]);
            } else {
                if (storeType == "starbucks") {
                    propScale.domain([.05, .4]);
                } else if (storeType == "dunkin") {
                    propScale.domain([.1, .8]);
                } else if (storeType == "other") {
                    propScale.domain([.1, .8]);
                } else if (storeType == "total") {
                    propScale.domain([.1, .8]);
                }
            }
            scaleGroup.selectAll(".tick")
                .select("text")
                .text(function(x, i) {return propScale.invert(i).toFixed(2).substr(1);});
            mapOverlayGroup.selectAll("path")
                .transition()
                .duration(500)
                .attr("fill", function(d) { return color(propScale(d.stats[storeType + "_prop"] || 0)); });
            mapOverlayGroup.selectAll("path")
                .select("title")
                .text(function(d) { return d.stats[storeType + "_prop"] || 0; });
        } else {
            d3.select("#scaletitle").text("Density");
            if (isFixed) {
                logScale.domain([2, 100]);
            } else {
                if (storeType == "starbucks") {
                    logScale.domain([2, 40]);
                } else if (storeType == "dunkin") {
                    logScale.domain([2, 20]);
                } else if (storeType == "other") {
                    logScale.domain([2, 60]);
                } else if (storeType == "total") {
                    logScale.domain([2, 100]);
                }
            }
            scaleGroup.selectAll(".tick")
                .select("text")
                .text(function(x, i) {return Math.ceil(logScale.invert(i)).toFixed();});
            mapOverlayGroup.selectAll("path")
                .transition()
                .duration(500)
                .attr("fill", function(d) { return color(logScale(Math.floor(d.stats[storeType] / d.stats.area) || 0)); });
            mapOverlayGroup.selectAll("path")
                .select("title")
                .text(function(d) { return d.stats[storeType] / d.stats.area || 0; });
        }
    }

    // function called after zooming in or out
    function reset() {
        var bounds = pathGenerator.bounds(zipJson),
            topLeft = bounds[0],
            bottomRight = bounds[1];
        mapOverlay.attr("width", bottomRight[0] - topLeft[0])
            .attr("height", bottomRight[1] - topLeft[1])
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");
        mapOverlayGroup.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
        allPaths.attr("d", pathGenerator);
    }
}

