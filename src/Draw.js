import React from "react";
import * as d3 from "d3";
import {
  circleGrowDuration,
  radius,
  levelDistance,
  defaultStyle,
} from "./constants";
import { setPaperInfo } from "./util";
var natural = require("natural");
const wordToStem = natural.PorterStemmer.stem;

const applyFilters = (papers, filters) => {
  papers.forEach((paper) => {
    const show = filters
      .filter((f) => f.active)
      .every((f) => {
        if (f.type === "Word") {
          return (
            Object.keys(paper.stemDict).find((key) => {
              return key === wordToStem(f.text);
            }) !== undefined
          );
        } else {
          return true;
        }
      });
    if (show) {
      paper.currentStyle.visibility = "visible";
    } else {
      paper.currentStyle.visibility = "hidden";
    }
  });
  return papers;
};

const makeSharedWordsTable = () => {
  const papers = d3
    .selectAll("circle")
    .data()
    .filter((p) => p.selected);

  d3.selectAll("#sharedWords>tbody>*").remove();
  if (papers.length > 0) {
    var set = new Set(Object.keys(papers[0].stemDict));
    papers.slice(1).forEach((p) => {
      set = new Set(Object.keys(p.stemDict).filter((stem) => set.has(stem)));
    });
    var wordsCount = {};
    set.forEach((stem) => {
      wordsCount[stem] = 0;
      papers.forEach((p) => {
        if (p.stemDict[stem] !== undefined) {
          wordsCount[stem] += p.stemDict[stem].count;
        }
      });
    });
    d3.selectAll("#sharedWords")
      .selectChild("tbody")
      .selectAll("tr")
      .data(
        Array.from(set)
          .map((stem) => [
            Array.from(papers[0].stemDict[stem].words).toString(),
            wordsCount[stem],
          ])
          .sort((a, b) => b[1] - a[1])
      )
      .enter()
      .append("tr")
      .each((d, i, nodes) => {
        const tr = d3.select(nodes[i]);
        tr.append("td").text(d[0]);
        tr.append("td").text(d[1]);
      });
  }
};

const attachRectangleSelection = (svg) => {
  // Rectangle Selection
  svg.on("mousedown", (eventDown) => {
    if (eventDown.button === 0) {
      if (svg.select("#selectionRect").length !== 0) {
        svg.select("#selectionRect").remove();
      }
      const selectionRect = svg
        .append("rect")
        .attr("id", "selectionRect")
        .attr("x", eventDown.offsetX)
        .attr("y", eventDown.offsetY);
      const startX = eventDown.offsetX;
      const startY = eventDown.offsetY;
      window.selection = {
        x1: eventDown.offsetX,
        y1: eventDown.offsetY,
        x2: eventDown.offsetX,
        y2: eventDown.offsetY,
      };
      svg.on("mousemove", (eventMove) => {
        if (eventMove.offsetX <= startX) {
          selectionRect
            .attr("x", eventMove.offsetX)
            .attr("width", startX - eventMove.offsetX);
        } else {
          selectionRect
            .attr("width", eventMove.offsetX - startX)
            .attr("x", startX);
        }
        if (eventMove.offsetY <= startY) {
          selectionRect
            .attr("y", eventMove.offsetY)
            .attr("height", startY - eventMove.offsetY);
        } else {
          selectionRect
            .attr("height", eventMove.offsetY - startY)
            .attr("y", startY);
        }
        window.selection.x2 = eventMove.offsetX;
        window.selection.y2 = eventMove.offsetY;
      });
      svg.on("mouseup", (eventUp) => {
        selectionRect.remove();
        svg.on("mousemove", null);
        const x1 = window.selection.x1,
          x2 = window.selection.x2;
        const minX = Math.min(x1, x2),
          maxX = Math.max(x1, x2);
        const y1 = window.selection.y1,
          y2 = window.selection.y2;
        const minY = Math.min(y1, y2),
          maxY = Math.max(y1, y2);
        const area = (maxX - minX) * (maxY - minY);
        // debugger;
        if (area > (radius * 2) ** 2) {
          d3.selectAll("circle").each((d, i, nodes) => {
            if (
              d.geometry.x > minX &&
              d.geometry.x < maxX &&
              d.geometry.y > minY &&
              d.geometry.y < maxY
            ) {
              d.currentStyle["stroke"] = "rgba(255,0,0,0.5)";
              d.selected = true;
            } else if (!eventUp.shiftKey) {
              d.currentStyle["stroke"] = "rgba(0,0,0,0.5)";
              d.selected = false;
            }
            transitionToNewStyle(d3.select(nodes[i]), d, 0);
          });
        } else if (!eventUp.shiftKey) {
          d3.selectAll("circle").each((d, i, nodes) => {
            d.selected = false;
            d.currentStyle["stroke"] = "rgba(0,0,0,0.5)";
            transitionToNewStyle(d3.select(nodes[i]), d, 0);
          });
        }
        makeSharedWordsTable();
      });
    }
  });
};

const setStyle = (paperSelection, paperDatum) => {
  Object.keys(paperDatum.currentStyle).forEach((key) => {
    paperSelection.style(key, paperDatum.currentStyle[key]);
  });
};

const transitionToNewStyle = (paperSelection, paperDatum, duration = 300) => {
  const transition = paperSelection.transition().duration(duration);
  Object.keys(paperDatum.currentStyle).forEach((key) => {
    transition.style(key, paperDatum.currentStyle[key]);
  });
  return transition;
};

const applyStyleModifiers = (papers, modifiers) => {
  Object.keys(modifiers).forEach((k) => {
    const [state, modifier] = modifiers[k];
    if (state === "on") {
      return modifier(papers);
    } else {
      return papers;
    }
  });
};

const makeLevelText = (svgSelection, papers, levelNumber) => {
  var maxY = 0;
  if (papers.length > 0) {
    var levelTitle = `Level ${levelNumber}`;
    if (levelNumber === 0) {
      levelTitle = `Seeds`;
    }
    svgSelection
      .append("text")
      .text(levelTitle)
      .attr("x", papers[0].geometry.x - 2 * radius)
      .attr("y", papers[0].geometry.y)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .classed("noselect", true);
    svgSelection
      .append("text")
      .text(`(${papers.length})`)
      .attr("x", papers[0].geometry.x - 2 * radius)
      .attr("y", papers[0].geometry.y + levelDistance / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .classed("noselect", true);
    maxY = Math.max(...papers.map((p) => p.geometry.y));
  }
  return maxY;
};

const makeD3 = (svgRef, levelsUnfiltered, forceUpdate = false) => {
  const levels = levelsUnfiltered;
  levelsUnfiltered.forEach((papers) => {
    papers.forEach((p) => (p.currentStyle = { ...defaultStyle }));
    applyStyleModifiers(papers, window.modifiers);
    applyFilters(papers, window.filters);
  });
  const svg = d3.select(svgRef.current);
  var selection = null;

  var maxY = 0;
  // Remove all titles
  svg.selectAll("text").remove();
  if (forceUpdate) {
    d3.selectAll("circle").remove();
  }
  levels.forEach((papersInLevel, levelNumber) => {
    papersInLevel.forEach((p, i) => {
      p.setPosition(i, maxY + levelDistance, window.innerWidth * 0.5, true);
      p.circleID = p.id;
      p.selectionByWordCount = 0;
    });
    maxY = makeLevelText(svg, papersInLevel, levelNumber);
  });
  const allPapers = [].concat(...levels);
  selection = svg.selectAll("circle").data(allPapers, (d) => d.id);
  selection.join(
    (enter) => {
      const newEnter = enter
        .append("circle")
        .attr("cx", (d) => d.geometry.x)
        .attr("cy", (d) => d.geometry.y)
        .attr("id", (d) => `paper${d.circleID}`);
      newEnter.each((d, i, nodes) => {
        const paperSelection = d3.select(nodes[i]);
        setStyle(paperSelection, d);
        transitionToNewStyle(paperSelection, d).attr("r", (d) => d.geometry.r);
      });
      newEnter
        .on("mouseenter", (event, datum) => {
          const paperSelection = d3.selectAll(`#paper${datum.circleID}`);
          datum.currentStyle.stroke = "rgba(255,0,0,0.5)";
          transitionToNewStyle(paperSelection, datum, 20);
          if (
            !d3
              .selectAll("circle")
              .data()
              .some((d) => d.selected)
          ) {
            d3.select("#paperInfo").attr("class", "visible");
          setPaperInfo(datum);
          }
          if (window.paperInfoState === "hidden") {
            window.paperInfoState = "visible";
            d3.select("#paperInfoPlaceholder").attr("class", "hidden");
            d3.select("#paperInfo").attr("class", "visible");
          }
        })
        .on("mouseleave", (event, datum) => {
          d3.selectAll(`#from${datum.id}`).remove();
          const paperSelection = d3.selectAll(`#paper${datum.circleID}`);
          if (!datum.selected) {
            datum.currentStyle.stroke = "rgba(0,0,0,0.5)";
          }
          if (
            !d3
              .selectAll("circle")
              .data()
              .some((d) => d.selected)
          ) {
            d3.select("#paperInfo").attr("class", "hidden");
          }
          transitionToNewStyle(paperSelection, datum, 20);
        })
        .on("click", (event, datum) => {
          datum.selected = !datum.selected;
          if (datum.selected) {
            d3.select("#paperInfo").attr("class", "visible");
            setPaperInfo(datum);
          } else {
            datum.currentStyle.stroke = "rgba(0,0,0,0.5)";
          }
          transitionToNewStyle(d3.select(event.target), datum, 0);
          makeSharedWordsTable();
        });
      return newEnter;
    },
    (update) => {
      update
        .transition()
        .duration(500)
        .attr("cx", (d) => d.geometry.x)
        .attr("cy", (d) => d.geometry.y);
      update.each((d, i, nodes) => {
        transitionToNewStyle(d3.select(nodes[i]), d);
      });
      return update;
    },
    (exit) => {
      exit.each((d, i, nodes) => {
        const paperSelection = d3.select(nodes[i]);
        transitionToNewStyle(paperSelection, d).attr("r", 300);
      });
      return exit.remove();
    }
  );
  svg.attr("height", Math.max(maxY, window.innerHeight * 0.7));
};

export { makeD3, transitionToNewStyle, attachRectangleSelection };
