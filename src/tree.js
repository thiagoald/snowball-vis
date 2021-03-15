import * as d3 from "d3";

const width = 954;

const createTree = (data) => {
  var tree = (data) => {
    const root = d3.hierarchy(data);
    root.dx = 10;
    root.dy = width / (root.height + 1);
    return d3.tree().nodeSize([root.dx, root.dy])(root);
  };
  const root = tree(data);

  let x0 = Infinity;
  let x1 = -x0;
  root.each((d) => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, x1 - x0 + root.dx * 2])
    .call(
      d3.zoom().on("zoom", function (event, d) {
        debugger;
        svg.attr(
          "transform",
          "translate(" + event.translate + ")" + " scale(" + event.scale + ")"
        );
      })
    );

  const g = svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("transform", `translate(${root.dy / 3},${root.dx - x0})`);

  const link = g
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(root.links())
    .join("path")
    .attr(
      "d",
      d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)
    );

  const node = g
    .append("g")
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

  node
    .append("circle")
    .attr("fill", (d) => (d.children ? "#555" : "#999"))
    .attr("r", 5)
    .on("click", function (e) {
      var thisCircle = d3.select(this);
      var d = thisCircle.data()[0];
      // d3.select("pre").text(JSON.stringify(d, null, " "));
      thisCircle.attr("fill", "green");
      // if (d.isActive) {
      // }
      // else {
      //     thisCircle.attr("fill", "red");
      // }
      // d.isActive = !d.isActive;
    });

  node
    .append("text")
    .attr("dy", "0.31em")
    .attr("x", (d) => (d.children ? -6 : 6))
    .attr("text-anchor", (d) => (d.children ? "end" : "start"))
    .text((d) => d.data.title)
    .clone(true)
    .lower()
    .attr("stroke", "white");

  return svg.node();
};

export { createTree };
