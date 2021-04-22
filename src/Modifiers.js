import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import BootstrapTable from "react-bootstrap-table-next";
import { Dropdown, DropdownButton, Image } from "react-bootstrap";
import { makeD3, transitionToNewStyle } from "./Draw";
import { tabulate, wordsStyleModifier } from "./util";
import { radius } from "./constants";
import React, { useEffect, useState } from "react";

import * as d3 from "d3";

import "./css/modifiers.css";
import "react-bootstrap-table-next/dist/react-bootstrap-table2.min.css";

const transitionToNewRelevances = (papersSelection) => {
  if (d3.select("#relevanceCheckbox").property("checked")) {
    var maxCitations = 0;
    papersSelection.each((d, i, nodes) => {
      d.currentStyle["stroke-width"] = d.relevance * 10;
    });
    d3.selectAll("circle")
      .on("mouseenter", (event, datum) => {
        const existingConnections = [];
        const { incoming, outgoing } = datum.allConnections(
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER
        );
        incoming.concat(outgoing).forEach((conn) => {
          const existingPaper = papersSelection
            .data()
            .find((p) => p.id === conn.id);
          if (existingPaper !== undefined)
            existingConnections.push(existingPaper);
        });
        existingConnections.forEach((conn) => {
          d3.select(".papersGraph")
            .append("line")
            .attr("x1", datum.geometry.x)
            .attr("y1", datum.geometry.y)
            .attr("x2", conn.geometry.x)
            .attr("y2", conn.geometry.y)
            .style("stroke", "rgba(0,0,0,0.3)")
            // .style("stroke-dasharray", "5,5")
            .attr("origin", `${datum.id}`);
          d3.select(".papersGraph")
            .append("circle")
            .attr("cx", conn.geometry.x)
            .attr("cy", conn.geometry.y)
            .attr("r", radius / 2)
            .attr("class", "connection")
            .style("fill", "white")
            .style("stroke", "rgba(0,0,0,0.5)");
        });
      })
      .on("mouseout", (event, datum) => {
        d3.selectAll(`.papersGraph line`).each((d, i, nodes) => {
          const originId = d3.select(nodes[i]).attr("origin");
          if (!d3.select(`#paper${originId}`).classed("selected")) {
            d3.select(nodes[i]).remove();
          }
          d3.select(`.papersGraph`).selectAll(".connection").remove();
        });
      });
  } else {
    d3.selectAll("circle").each((d, i, nodes) => {
      d.currentStyle["stroke-width"] = 1;
    });
  }
};

const relevanceStyleModifier = (papers) => {
  setRelevances(papers);
  papers.forEach((paper) => {
    paper.currentStyle["stroke-width"] = paper.relevance * radius + 1;
  });
};

const setRelevances = (papers) => {
  var maxCitations = 0;
  papers.forEach((paper) => {
    const { incoming, outgoing } = paper.allConnections(
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER
    );
    paper.citationCount = 0;
    [].concat(incoming, outgoing).forEach((id) => {
      if (papers.find((p) => p.id === id) !== undefined)
        paper.citationCount += 1;
    });
    maxCitations = Math.max(maxCitations, paper.citationCount);
  });
  papers.forEach((paper) => {
    paper.relevance = paper.citationCount / maxCitations;
  });
};

const handleClickShowRelevance = (svgRef) => {
  if (d3.select("#relevanceCheckbox").property("checked")) {
    window.modifiers.relevance = ["on", relevanceStyleModifier];
  } else {
    window.modifiers.relevance = ["off", relevanceStyleModifier];
  }
  makeD3(svgRef, window.papers);
};

const handleClickAddFilter = (svgRef) => {
  addFilter(svgRef, {
    type: d3.select("#typeButton").node().textContent,
    text: d3.select("#filterText").node().value,
    active: false,
  });
  d3.select("#filterText").node().value = "";
};

const addFilter = (svgRef, filter) => {
  if (window.filters.find((f) => f.text === filter.text) === undefined) {
    window.filters.push(filter);
  }
  d3.select("#filtersTable").selectChild("tbody").remove();
  const rows = tabulate("#filtersTable", window.filters, ["type", "text"]);
  rows
    .data(window.filters)
    .append("td")
    .each((d, i, nodes) => {
      d3.select(nodes[i])
        .append("input")
        .attr("type", "checkbox")
        .property("checked", d.active)
        .on("click", (event, data) => {
          const checked = d3.select(event.target).property("checked");
          data.active = checked;
          makeD3(svgRef, window.papers);
        });
    });
};

const handleClickSort = (svgRef, sortingCriteria) => {
  const selection = d3.selectAll("#words tbody tr");
  var data = null;
  debugger;
  if (sortingCriteria === "words") {
    data = selection.data().sort((a, b) => a.words.localeCompare(b.words));
  } else if (sortingCriteria === "count") {
    data = selection.data().sort((a, b) => b.count - a.count);
  } else {
    data = selection.data().sort((a, b) => b.nPapers - a.nPapers);
  }
  selection.remove();
  const rows = tabulate("#words", data, ["words", "count", "nPapers"]);
  rows.append("td").each((d, i, nodes) => {
    d3.select(nodes[i])
      .append("input")
      .attr("type", "checkbox")
      .on("click", (event, data) => {
        const { stem, count } = data;
        if (d3.select(event.target).property("checked")) {
          window.selectedStems.push(stem);
        } else {
          window.selectedStems = window.selectedStems.filter((s) => s != stem);
        }
        if (window.selectedStems.length > 0) {
          window.modifiers.words = ["on", wordsStyleModifier];
        } else {
          window.modifiers.words = ["off", wordsStyleModifier];
        }
        makeD3(svgRef, window.papers);
      });
  });
};

const Modifiers = ({ properties }) => {
  const { svgRef } = properties;
  const [tableData, setTableData] = useState([
    { id: 1, name: "world" },
    { id: 2, name: "world" },
  ]);

  useEffect(() => {
    d3.select("input#filterText.form-control").on("keyup", function (event) {
      console.log(event);
      if (event.key === "Enter") {
        handleClickAddFilter(svgRef);
      }
    });
  }, []);

  return (
    <>
      <div id="tabs" className="collapsible">
        <Tabs defaultActiveKey="words">
          <Tab eventKey="words" title="Words Count" className="border-left tab">
            <Card.Body>
              <p className="tabMessage">
                All the words appearing in the abstracts of the papers shown.
                Select words to see distribution among papers.
              </p>
              <Table size="sm" id="selected" style={{ visibility: "hidden" }}>
                <thead>
                  <tr>
                    <th>Words</th>
                    <th># of Words</th>
                    <th># of Papers</th>
                    <th>Show?</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </Table>
              <Table size="sm" id="words" data-search="true">
                <thead>
                  <tr>
                    <th>
                      Words
                      <Image
                        src="sort.svg"
                        onClick={() => handleClickSort(svgRef, "words")}
                      />
                    </th>
                    <th>
                      # of Words
                      <Image
                        src="sort.svg"
                        onClick={() => handleClickSort(svgRef, "count")}
                      />
                    </th>
                    <th>
                      # of Papers
                      <Image
                        src="sort.svg"
                        onClick={() => handleClickSort(svgRef, "nPapers")}
                      />
                    </th>
                    <th>Show?</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </Table>
            </Card.Body>
          </Tab>
          <Tab eventKey="filters" title="Filters" className="border-left tab">
            <Card.Body>
              <p className="tabMessage">
                Only keep papers that match all of the filters below
              </p>
              <InputGroup id="filters" className="mb-3">
                <DropdownButton id="typeButton" title="Word">
                  <Dropdown.Item
                    as="button"
                    onClick={() => {
                      d3.select("#typeButton").text("Word");
                    }}
                  >
                    Word
                  </Dropdown.Item>
                </DropdownButton>
                <FormControl
                  id="filterText"
                  placeholder=""
                  aria-label=""
                  aria-describedby="basic-addon2"
                />
                <InputGroup.Append>
                  <Button
                    onClick={() => handleClickAddFilter(svgRef)}
                    variant="outline-secondary"
                  >
                    Add
                  </Button>
                </InputGroup.Append>
              </InputGroup>
              <Table id="filtersTable" size="sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Apply?</th>
                  </tr>
                </thead>
              </Table>
            </Card.Body>
          </Tab>
          <Tab
            eventKey="shared"
            title="Shared Words"
            className="border-left tab"
          >
            <Card.Body>
              <p className="tabMessage">Select papers to see shared words</p>
              <Table size="sm" id="sharedWords">
                <thead>
                  <tr>
                    <th>Word Group</th>
                    <th># of Words</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </Table>
            </Card.Body>
          </Tab>
          <Tab eventKey="other" title="Other" className="border-left tab">
            <Card
              className="border-0"
              //   style={{ height: "95vh", overflowY: "auto" }}
            >
              <Card.Body>
                <p className="tabMessage">Other options</p>
                <Form.Group controlId="formBasicCheckbox">
                  <Form.Check
                    type="checkbox"
                    id="relevanceCheckbox"
                    label="Show relevance (measured by number of connections to papers shown)"
                    style={{ marginLeft: "1rem", marginTop: "1rem" }}
                    onClick={() => handleClickShowRelevance(svgRef)}
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </div>
    </>
  );
};

export default Modifiers;
