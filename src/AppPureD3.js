import React, { useRef, createContext, useEffect, useState } from "react";
import "./bootstrap.min.css";
import "./index.css";
// import SplitterLayout from "react-splitter-layout";
import Card from "react-bootstrap/Card";
import Accordion from "react-bootstrap/Accordion";
import ListGroup from "react-bootstrap/ListGroup";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import InputGroup from "react-bootstrap/InputGroup";
import FormControl from "react-bootstrap/FormControl";
import { Dropdown, DropdownButton } from "react-bootstrap";
import fetch from "node-fetch";
import * as d3 from "d3";
import { v1 as uuid } from "uuid";
import { create } from "d3";
var natural = require("natural");
const tokenizer = new natural.WordTokenizer();

const url = "https://api.semanticscholar.org/v1/paper/";
const xShift = 100;
const radius = 10;
const distance = radius;
const circleContainer = 2 * radius + 2 * distance;
const levelDistance = 30;
const laneLength = 0.5 * window.innerWidth;

class Paper {
  constructor(data, snowballLevel, svgRef) {
    for (const key of Object.keys(data)) {
      this[key] = data[key];
    }
    this.snowballLevel = snowballLevel;
    this.incoming = null;
    this.outgoing = null;
    this.geometry = null;
    this.selected = false;
    this.id = null;
    this.selectionByWordCount = 0;
    this.stemDict = {};
    this.parent = null;
    if (this.abstract !== null) {
      tokenizer.tokenize(this.abstract).forEach((word) => {
        const stem = natural.PorterStemmer.stem(word);
        const lowerWord = word.toLowerCase();
        if (this.stemDict[stem] !== undefined) {
          this.stemDict[stem].count += 1;
          this.stemDict[stem].words.add(lowerWord);
        } else {
          this.stemDict[stem] = {};
          this.stemDict[stem].count = 0;
          this.stemDict[stem].words = new Set([lowerWord]);
        }
      });
    }
  }

  serializable() {
    const serializablePaper = {};
    Object.getOwnPropertyNames(this).forEach((property) => {
      if (
        [
          "snowballLevel",
          "incoming",
          "outgoing",
          "geometry",
          "selected",
          "id",
          "selectionByWordCount",
          "stemDict",
          "parent",
        ].indexOf(property) < 0
      ) {
        serializablePaper[property] = this[property];
      }
    });
    return serializablePaper;
  }

  setID(iLevel, iPos) {
    if (this.id === null) this.id = `#${iLevel}|${iPos}`;
  }

  incomingConnections(maxIncoming = Number.MAX_SAFE_INTEGER) {
    if (this.incoming === null) {
      if (this.hasOwnProperty("inCitations")) {
        return this.inCitations.slice(0, maxIncoming);
      } else if (this.hasOwnProperty("citations")) {
        return this.citations.slice(0, maxIncoming);
      } else {
        return [];
      }
    } else {
      return this.incoming;
    }
  }

  outgoingConnections(maxOutgoing = Number.MAX_SAFE_INTEGER) {
    if (this.outgoing === null) {
      if (this.hasOwnProperty("outCitations")) {
        return this.outCitations.slice(0, maxOutgoing);
      } else if (this.hasOwnProperty("references")) {
        return this.references.slice(0, maxOutgoing);
      } else {
        return [];
      }
    } else {
      return this.outgoing;
    }
  }

  allConnections(maxIn = 2, maxOut = 2) {
    return {
      incoming: this.incomingConnections(maxIn),
      outgoing: this.outgoingConnections(maxOut),
    };
  }

  setPosition(index, maxY, laneLength = 300, forceRecalc = false) {
    const circlesPerLane = Math.floor(laneLength / circleContainer);
    if (forceRecalc || this.geometry === null) {
      this.geometry = {};
      const row = Math.floor(index / circlesPerLane);
      const column = index % circlesPerLane;
      this.geometry.x = xShift + radius + column * circleContainer;
      this.geometry.y = maxY + 2 * radius + row * circleContainer;
      this.geometry.r = radius;
      console.log(`${this.paperId} | ${index}`);
      //   maxY = Math.max(maxY, this.geometry.y);
      return this.geometry;
    } else {
      return this.geometry;
    }
  }
}

const frequentWords = (papers) => {
  return [].concat(
    ...papers.map((p) => {
      if (p.abstract) {
        return tokenizer
          .tokenize(p.abstract)
          .map((word) => word.toLowerCase())
          .map((word) => [word, natural.PorterStemmer.stem(word)]);
      } else {
        return [];
      }
    })
  );
};

const createConnections = (paper, allPapers) => {
  // FIXME: allConnections returns papers instead of IDs
  const { incoming, outgoing } = paper.allConnections();
  incoming.concat(outgoing).forEach((id) => {
    const conn = allPapers.find((p) => p.paperId === id);
    if (conn !== undefined) {
      d3.select("svg")
        .append("line")
        .attr("id", `from${paper.paperId}`)
        .attr("x1", paper.x)
        .attr("y1", paper.y)
        .attr("x2", conn.x)
        .attr("y2", conn.y)
        .attr("style", "stroke:black;pointer-events:none");
      d3.select("svg")
        .append("circle")
        .attr("id", `from${paper.paperId}`)
        .attr("r", paper.r)
        .attr("cx", paper.x)
        .attr("cy", paper.y)
        .attr("style", "fill:blue;stroke:white;pointer-events:none");
    }
  });
};

const removeConnections = (paper) => {
  d3.selectAll(`#from${paper.paperId}`).remove();
};

const setPaperInfo = (datum) => {
  d3.select("#title").text(`${datum.title}`);
  d3.select("#title").attr("href", `${datum.url}`);
  d3.select("#year").text(`(${datum.year})`);
  d3.select("#abstract").text(`${datum.abstract}`);
  // datum.authors.forEach((author))
  d3.select("#authors")
    .selectAll("a")
    .data(datum.authors)
    .join((enter) =>
      enter
        .append("a")
        .attr("href", (d) => d.url)
        .attr("target", "_blank")
        .attr("class", "list-group-item")
        .text((d) => d.name)
    );
};

const makeD3 = (svgRef, levels) => {
  console.log("making d3");
  const svg = d3.select(svgRef.current);
  var selection = null;

  var maxY = 0;
  // Remove all titles
  svg.selectAll("text").remove();
  levels.forEach((papers, levelNumber) => {
    papers.forEach((p, i) => {
      p.setPosition(i, maxY + levelDistance, laneLength);
      p.setID(levelNumber, i);
    });
    svg
      .append("text")
      .text(`Level #${levelNumber}`)
      .attr("x", papers[0].geometry.x - 2 * radius)
      .attr("y", papers[0].geometry.y)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central");
    svg
      .append("text")
      .text(`(${papers.length})`)
      .attr("x", papers[0].geometry.x - 2 * radius)
      .attr("y", papers[0].geometry.y + levelDistance / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central");
    maxY = Math.max(...papers.map((p) => p.geometry.y));
    console.log(`maxY: ${maxY}`);
  });
  const allPapers = [].concat(...levels);
  selection = svg.selectAll("circle").data(allPapers, (d) => d.id);
  selection.join(
    (enter) => {
      const newEnter = enter
        .append("circle")
        .attr("cx", (d) => d.geometry.x)
        .attr("cy", (d) => d.geometry.y)
        .attr("id", (d) => `paper${d.paperId}`)
        .attr("class", "paper out")
        .attr("style", (d) => {
          if (d.selectionByWordCount > 0) {
            return "fill:rgba(255,0,0,0.5)";
          } else {
            return null;
          }
        })
        .on("mouseenter", (event, datum) => {
          console.log(event);
          if (!datum.selected) {
            // createConnections(datum, allPapers);
            d3.selectAll(`#paper${datum.paperId}`).attr("class", "paper in");
          }
          if (!window.nSelected) {
            setPaperInfo(datum);
          }
          if (window.paperInfoState === "hidden") {
            window.paperInfoState = "visible";
            d3.select("#paperInfoPlaceholder").attr("class", "hidden");
            d3.select("#paperInfo").attr("class", "visible");
          }
        })
        .on("mouseleave", (event, datum) => {
          if (!datum.selected) {
            d3.selectAll(`#from${datum.paperId}`).remove();
            d3.selectAll(`#paper${datum.paperId}`).attr("class", "paper out");
          }
        })
        .on("click", (event, datum) => {
          console.log(`Click ${event}`);
          datum.selected = !datum.selected;
          // d3.selectAll(`#paper${datum.paperId}`).attr(
          //   "class",
          //   "paper selected"
          // );
          // if (!datum.selected) {
          //   // removeConnections(datum);
          // } else {
          //   d3.selectAll(`#from${datum.paperId}`).remove();
          //   d3.selectAll(`#paper${datum.paperId}`).attr(
          //     "class",
          //     "paper selected"
          //   );
          // }
          // // TODO: Keep connections if clicked
          // // d3.select(this).attr("style", "fill:green");
          // // setPaperData(JSON.stringify(datum.title, null, 10));
        });
      newEnter
        .transition()
        .duration(300)
        .attr("r", (d) => d.geometry.r);
      return newEnter;
    },
    (update) => {
      // TODO: Do something if updates
      return update;
    },
    (exit) => exit.remove()
  );
  svg.attr("height", Math.max(maxY, window.innerHeight * 0.7));
};

const loadPapers = (svgRef) => {
  return fetch("initialPapers.json")
    .then((req) => req.json())
    .then((initialPapers) => {
      initialPapers.forEach((p) => {
        p.snowballLevel = 0;
      });
      window.papers[0] = initialPapers.map((data) => new Paper(data));
      window.maxY = 0;
      makeD3(svgRef, window.papers);
    });
};

const loadCache = () => {
  return fetch("cache.json")
    .then((req) => req.json())
    .then((newCache) => (window.cache = newCache.map((p) => new Paper(p))));
};

const loadStopWords = () => {
  return fetch("nltk_stopwords.json")
    .then((req) => req.json())
    .then((stopwords) => (window.stopwords = stopwords));
};

const getPaper = (id, found, notFound = () => {}) => {
  // const newPaper =
  //   window.cache[Math.floor(Math.random() * (window.cache.length - 1))];
  const newPaper = window.cache.find((p) => p.paperId == id);
  if (newPaper !== undefined) {
    return new Promise((resolve, reject) => resolve(found(newPaper)));
  } else {
    return new Promise((resolve, reject) => {
      fetch(`${url}${id}`).then(
        (response) => {
          if (response.status == 200) {
            response.json().then((json) => {
              return resolve(found(json));
            });
          } else {
            return resolve(notFound());
          }
        },
        (reason) => {
          console.log(`Reason: ${reason}`);
          return new Promise((resolve, reject) => resolve(reason));
        }
      );
    });
  }
};

const getNextLevel = (papers) => {
  var papersToFetch = [];
  papers.forEach((p) => {
    const { incoming, outgoing } = p.allConnections(2, 2);
    console.log(`Connections: ${incoming.length} ${outgoing.length}`);
    papersToFetch = papersToFetch.concat(incoming).concat(outgoing);
    papersToFetch.forEach((pToFetch) => (pToFetch.parent = p));
  });
  const promises = papersToFetch.map((paperToFetch) => {
    return getPaper(
      paperToFetch.paperId,
      (newPaper) => {
        // FIXME: Fix snowball level
        newPaper.snowballLevel = 0;
        if (!window.cache.find((p) => p.paperId === newPaper.paperId)) {
          window.cache.push(new Paper(newPaper));
        }
        return newPaper;
      },
      () => {
        paperToFetch.snowballLevel = 0;
        if (!window.cache.find((p) => p.paperId === paperToFetch.paperId)) {
          window.cache.push(new Paper(paperToFetch));
        }
        return paperToFetch;
      }
    );
  });
  window.currSnowballLevel = 1;
  return Promise.all(promises);
};

const handleClick = (papers, lastLevelPapers) => {
  return getNextLevel(lastLevelPapers).then(
    (fetchedPapers) => {
      const inPapers = (p, ps) => {
        return ps.map((p) => p.paperId).includes(p.paperId);
      };
      const newPapers = fetchedPapers.filter(
        (p) => !inPapers(p, [].concat(...papers))
      );
      // TODO: Filter new papers
      window.papers.push(newPapers.map((p) => new Paper(p)));
      fillWordsTable();
    },
    (reason) => console.log("Fetching failed!")
  );
};

const handleLoadCache = () => {
  const file = document.getElementById("file").files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    const cachedPapers = JSON.parse(event.target.result);
    window.cache = cachedPapers.map((p) => new Paper(p));
  };
  reader.readAsBinaryString(file);
};

const createCacheLink = () => {
  var cacheLink = document.getElementById("cacheLink");
  cacheLink.setAttribute(
    "href",
    `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(window.cache.map((p) => p.serializable()))
    )}`
  );
};

const tabulate = (tableSelector, data, columns) => {
  const table = d3.select(tableSelector),
    tbody = table.append("tbody");

  // create a row for each object in the data
  var rows = tbody
    .selectAll("tr")
    .data(data, (d) => d.word)
    .enter()
    .append("tr");

  // create a cell in each row for each column
  var cells = rows
    .selectAll("td")
    .data(function (row) {
      return columns.map(function (column) {
        return { column: column, value: row[column] };
      });
    })
    .join((enter) =>
      enter.append("td").text(function (d) {
        return d.value;
      })
    );

  rows
    .append("input")
    .attr("type", "checkbox")
    .on("click", (event, data) => {
      const { stem } = data;
      if (!data.hasOwnProperty("selected")) data.selected = false;
      if (!data.selected) {
        d3.selectAll(".paper")
          .data()
          .forEach((d) => {
            if (d.stemDict[stem] !== undefined) {
              d.selectionByWordCount += 1;
            }
          });
      } else {
        d3.selectAll(".paper")
          .data()
          .forEach((d) => {
            if (d.stemDict[stem] !== undefined) {
              d.selectionByWordCount -= 1;
            }
          });
      }
      d3.selectAll(".paper").attr("style", (d) => {
        if (d.selectionByWordCount > 0) {
          return "fill:rgba(255,0,0,0.5)";
        } else {
          return "";
        }
      });
      data.selected = !data.selected;
    });

  return table;
};

const fillWordsTable = () => {
  const allWords = frequentWords([].concat(...window.papers));
  const stemHistogram = {};
  allWords.forEach((element) => {
    const [word, stem] = element;
    if (stemHistogram[stem]) {
      stemHistogram[stem].frequency += 1;
      stemHistogram[stem].words.add(word);
    } else {
      stemHistogram[stem] = { frequency: 1, words: new Set([word]) };
    }
  });
  window.stopwords.forEach((stopword) => {
    delete stemHistogram[stopword];
  });
  const sortedWords = Object.keys(stemHistogram)
    .map((key) => {
      return {
        stem: key,
        frequency: stemHistogram[key].frequency,
        words: Array.from(stemHistogram[key].words),
      };
    })
    .sort((a, b) => a.frequency - b.frequency)
    .reverse();
  d3.select("#words").selectChild("tbody").remove();
  tabulate("#words", sortedWords, ["words", "frequency"]);
};

const handleClickAddSeed = (svgRef) => {
  const paperFound = (p) => {
    const newPaper = new Paper(p);
    window.cache.push(newPaper);
    window.papers[window.papers.length - 1].push(newPaper);
    makeD3(svgRef, window.papers);
    fillWordsTable();
    d3.select("#loadPaperSpinner").attr("style", "visibility:hidden");
    window.nextButtonWorks = true;
    d3.select("#nextbutton").attr("class", "btn btn-primary");
  };
  const id = d3.select("#seedId").node().value;
  d3.select("#seedId").node().value = "";
  d3.select("#loadPaperSpinner").attr("style", null);
  // Local search
  const newPaper = window.cache.find((p) => p.paperId == id);
  if (newPaper !== undefined) {
    console.log("Paper found!");
    paperFound(newPaper);
  } else {
    // Web search
    getPaper(
      id,
      (newPaper) => {
        paperFound(newPaper);
      },
      () => {
        console.log("Paper not found!");
        d3.select("#loadPaperSpinner").attr("style", "visibility:hidden");
      }
    );
  }
};

const handleClickAddFilter = () => {
  d3.select("#filter");
  window.filters.push();
};

const SnowballApp = () => {
  const svgRef = useRef();
  const fileRef = useRef();

  useEffect(() => {
    console.log("Rerendering SnowballApp");
  });

  useEffect(() => {
    window.nextButtonWorks = false;
    d3.select("#nextbutton").attr("class", "btn btn-primary disabled");
    window.papers = [[]];
    window.filters = [];
    loadCache()
      // .then(loadPapers(svgRef))
      .then(() => loadStopWords())
      .then(() => {
        document.getElementsByClassName(
          "cacheSize"
        )[0].childNodes[0].innerText = `Number of papers in cache: ${window.cache.length}`;
        window.lastLaneStart = 0;
        window.currSnowballLevel = 0;
        window.nSelected = 0;
        window.paperInfoState = "hidden";
        // makeD3(svgRef, window.papers);
        fillWordsTable();
      });
  }, []);
  return (
    <div className="topLevel">
      <div id="paperInfoPlaceholder" className="visible">
        <p id="placeholderText">Hover over a paper to see information here!</p>
      </div>
      <Card id="paperInfo" className="hidden">
        <Card.Title>
          <a href="" id="title" target="_blank">
            Title
          </a>
          <div id="year"></div>
        </Card.Title>
        <Card.Text id="abstract">Abstract</Card.Text>
        <Card.Title>Authors</Card.Title>
        <ListGroup variant="flush">
          <ListGroup.Item id="authors"></ListGroup.Item>
        </ListGroup>
      </Card>
      <div id="overflowBox">
        <svg className="papersGraph" ref={svgRef}></svg>
      </div>
      <Button
        id="nextbutton"
        onClick={() => {
          if (window.nextButtonWorks) {
            handleClick(
              window.papers,
              window.papers[window.papers.length - 1]
            ).then(() => {
              console.log("window.cache");
              console.log(window.cache);
              makeD3(svgRef, window.papers);
              console.log(window.papers);
              console.log(`# of levels: ${window.papers.length}`);
              console.log(`Cache: ${window.cache.length}`);
              document.getElementsByClassName(
                "cacheSize"
              )[0].childNodes[0].innerText = `Number of papers in cache: ${window.cache.length}`;
            });
          }
        }}
      >
        Include Citations and References
      </Button>
      <div id="accordion">
        <Accordion defaultActiveKey="0">
          <Card>
            <Card.Header>
              <Accordion.Toggle as={Button} variant="link" eventKey="0">
                Word Frequency
              </Accordion.Toggle>
            </Card.Header>
            <Accordion.Collapse eventKey="0">
              <Card.Body>
                <Table size="sm" id="words">
                  <thead>
                    <th>Words</th>
                    <th>Frequency</th>
                    <th>Select?</th>
                  </thead>
                  <tbody></tbody>
                </Table>
              </Card.Body>
            </Accordion.Collapse>
          </Card>
          <Card>
            <Card.Header>
              <Accordion.Toggle as={Button} variant="link" eventKey="1">
                Filters
              </Accordion.Toggle>
            </Card.Header>
            <Accordion.Collapse eventKey="1">
              <Card.Body>
                <InputGroup id="filters" className="mb-3">
                  <DropdownButton id="typeButton" title="Word">
                    <Dropdown.Item
                      as="button"
                      onClick={() => {
                        d3.select("#typeButton").text("Year");
                      }}
                    >
                      Year
                    </Dropdown.Item>
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
                      onClick={() => {
                        window.filters.push({
                          type: d3.select("#typeButton").node().textContent,
                          text: d3.select("#filterText").node().value,
                        });
                        d3.select("#filtersTable")
                          .selectChild("tbody")
                          .remove();
                        tabulate("#filtersTable", window.filters, [
                          "type",
                          "text",
                        ]);
                        console.log(window.filters);
                      }}
                      variant="outline-secondary"
                    >
                      Add
                    </Button>
                  </InputGroup.Append>
                </InputGroup>
                <Table id="filtersTable" size="sm">
                  <thead>
                    <th>Type</th>
                    <th>Value</th>
                  </thead>
                </Table>
              </Card.Body>
            </Accordion.Collapse>
          </Card>
        </Accordion>
      </div>
      <InputGroup id="seedsInput" className="mb-3">
        <Spinner
          id="loadPaperSpinner"
          animation="border"
          role="status"
          style={{ visibility: "hidden" }}
        ></Spinner>
        <FormControl
          id="seedId"
          placeholder="New Seed ID"
          aria-label="New Seed ID"
          aria-describedby="basic-addon2"
        />
        <InputGroup.Append>
          <Button
            onClick={() => handleClickAddSeed(svgRef)}
            variant="outline-secondary"
          >
            Add
          </Button>
        </InputGroup.Append>
      </InputGroup>
      <div className="cache hidden">
        <a
          onClick={createCacheLink}
          onLoad={createCacheLink}
          id="cacheLink"
          download="cache.json"
        >
          Save Cache
        </a>
        <br></br>
        <label>
          Load Cache
          <input
            id="file"
            ref={fileRef}
            type="file"
            onChange={handleLoadCache}
          />
        </label>
        <div className="cacheSize">
          <p>Number of papers in cache: 0</p>
        </div>
      </div>
    </div>
  );
};

export { SnowballApp };
