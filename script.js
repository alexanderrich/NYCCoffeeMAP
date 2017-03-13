var svg = d3.select("svg"),
    width = svg.attr("width"),
    height = svg.attr("height");

var coffeeStats = d3.map();

var path = d3.geoPath(d3.geoConicConformal()
                      .parallels([40 + 40 / 60, 41 + 2 / 60])
                      .scale(70000)
                      .rotate([74, -40 - 45 / 60]));

var x = d3.scaleLinear()
        .domain([1, 10])
        .rangeRound([600, 860]);

var color = d3.scaleThreshold()
        .domain([1,2,4,8,16,32,64,128])
        .range(d3.schemeBlues[9]);

// var g = svg.append("g")
//            .attr("class", "key")
//            .attr("transform", "translate(0,40)");

// g.selectAll("rect")
//  .data(color.range().map(function(d) {
//      d = color.invertExtent(d);
//      if (d[0] == null) d[0] = x.domain()[0];
//      if (d[1] == null) d[1] = x.domain()[1];
//      return d;
//  }))
//  .enter().append("rect")
//  .attr("height", 8)
//  .attr("x", function(d) { return x(d[0]); })
//  .attr("width", function(d) { return x(d[1]) - x(d[0]); })
//  .attr("fill", function(d) { return color(d[0]); });

// g.append("text")
//  .attr("class", "caption")
//  .attr("x", x.range()[0])
//  .attr("y", -6)
//  .attr("fill", "#000")
//  .attr("text-anchor", "start")
//  .attr("font-weight", "bold")
//  .text("Unemployment rate");

// g.call(d3.axisBottom(x)
//          .tickSize(13)
//          .tickFormat(function(x, i) { return i ? x : x + "%"; })
//          .tickValues(color.domain()))
//  .select(".domain")
//  .remove();

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
        .attr("fill", function(d) { return color(d.stats.total / d.stats.area); })
        .attr("d", path)
        .append("title")
        .text(function(d) { return d.stats.total / d.stats.area; });
}
