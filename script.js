var svg = d3.select("svg"),
    width = svg.attr("width"),
    height = svg.attr("height");

var coffeeStats = d3.map();

var path = d3.geoPath(d3.geoConicConformal()
                      .parallels([40 + 40 / 60, 41 + 2 / 60])
                      .scale(70000)
                      .rotate([74, -40 - 45 / 60]));

var xLogScale = d3.scaleLog()
        // .exponent(.5)
        .base(2)
        .domain([2, 120])
        .range([0, 7]);

var color = d3.scaleThreshold()
        .domain(d3.range(0,8))
        .range(d3.schemeBlues[9]);

var g = svg.append("g")
           .attr("class", "key")
           .attr("transform", "translate(20,40)");

g.selectAll("rect")
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

g.call(d3.axisBottom(d3.scaleLinear().domain([0, 140]).range([20, 160]))
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
    if (error) throw error;
    map.features.forEach(function(feat) {
        feat.stats = coffeeStats.get(feat.properties.ZIP) || {};
    });
    console.log(map);
    svg.append("g")
        .attr("class", "counties")
        .selectAll("path")
        .data(map.features)
        .enter().append("path")
        .attr("fill", function(d) { return color(xLogScale(Math.floor(d.stats.total / d.stats.area))); })
        .attr("d", path)
        .append("title")
        .text(function(d) { return d.stats.total / d.stats.area; });
}
