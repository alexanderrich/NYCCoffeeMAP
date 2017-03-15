var svg = d3.select("#map");



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
        feat.stats = coffeeStats.get(feat.properties.ZIP) || {};
    });
    svg.append("g")
        .attr("id", "zoomgroup")
        .append("g")
        .attr("transform", "translate(-150) scale(1.1)")
        .attr("class", "zips")
        .selectAll("path")
        .data(map.features)
        .enter().append("path")
        .attr("fill", "#fff")
        .attr("d", path)
        .append("title");

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

    svg.call(d3.zoom()
             .scaleExtent([1/2, 10])
             .on("zoom", zoomed));

    function zoomed() {
        svg.select("#zoomgroup").attr("transform", d3.event.transform);
    }

    updateFill();

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
            svg.selectAll("path")
                .transition()
                .duration(500)
                .attr("fill", function(d) { return color(xPropScale(d.stats[storeType + "_prop"] || 0)); });
            svg.select(".zips").selectAll("path")
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
            svg.selectAll("path")
                .transition()
                .duration(500)
                .attr("fill", function(d) { return color(xLogScale(Math.floor(d.stats[storeType] / d.stats.area) || 0)); });
            svg.select(".zips").selectAll("path")
                .select("title")
                .text(function(d) { return d.stats[storeType] / d.stats.area || 0; });
        }

    }
}

