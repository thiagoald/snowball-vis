import React, { useRef, createContext, useEffect, useState } from "react";
import { Seeds } from "./Seeds";
import "./bootstrap.min.css";
import "./index.css";
import SplitterLayout from "react-splitter-layout";
import fetch from "node-fetch";
import * as d3 from "d3";

const url = "https://api.semanticscholar.org/v1/paper/";
const idExample = "0796f6cd7f0403a854d67d525e9b32af3b277331";
const idLength = idExample.length;
const PapersContext = createContext();
const tooltipDelay = 500;

const laneLength = 300;
const radius = 5;
const distance = radius;
const circleContainer = 2 * radius + 2 * distance;
const circlesPerLane = Math.floor(laneLength / circleContainer);

const setPositions = (papers) => {
  papers.forEach((p, i) => {
    const row = Math.floor(i / circlesPerLane);
    const column = i % circlesPerLane;
    const lane = p.snowballLevel;
    p.x = lane * laneLength + 2 * radius + column * circleContainer;
    p.y = (row + 1) * circleContainer;
    console.log(`p.x=${p.x} p.y=${p.y}`);
    p.r = radius;
    console.log(`${p.paperId} | ${i}`);
  });
  debugger;
};

const makeD3 = (svgRef, papers, snowballLevel) => {
  const svg = d3
    .select(svgRef.current)
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight / 2);
  // Set papers positions
  for (let i = 0; i <= snowballLevel + 1; i++) {
    svg
      .append("line")
      .attr("x1", i * laneLength)
      .attr("y1", 0)
      .attr("x2", i * laneLength)
      .attr("y2", window.innerHeight / 2)
      .attr("style", "stroke:rgb(0,0,0);stroke-width:2;stroke-dasharray:4");
  }
  svg
    .selectAll("circles")
    .data(papers, (d) => d.paperId)
    .join("circle")
    .attr("r", (d) => d.r)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("id", (d) => `paper${d.paperId}`)
    .on("mouseover", (event, datum) => {
      console.log(event);
      d3.selectAll(`#paper${datum.paperId}`).attr("style", "fill:green");
      // svg
      //   .append("text")
      //   .attr("x", event.clientX)
      //   .attr("y", event.clientX)
      //   .text("hello");
    })
    .on("mouseout", (event, datum) => {
      d3.selectAll(`#paper${datum.paperId}`).attr("style", "fill:black");
    })
    .on("click", (event, datum) => {
      d3.select(`#paper${datum.paperId}`).attr("style", "fill:green");
    });
};

const SnowballApp = () => {
  const defaultSuggestion = `ID too short should have ${idLength} characters`;
  const [id, setId] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionMsg, setSuggestionMsg] = useState("");
  const [askAddPaper, setAskAddPaper] = useState(false);
  const [papers, setPapers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedPapers, setCachedPapers] = useState([]);
  const [currSnowballLevel, setCurrSnowballLevel] = useState(0);
  const svgRef = useRef();
  const fileRef = useRef();

  useEffect(() => {
    loadPapers();
  }, []);

  useEffect(() => {
    makeD3(svgRef, papers, currSnowballLevel);
  }, [papers, currSnowballLevel]);

  useEffect(() => {
    paperIdChanged();
  }, [id]);

  const paperFound = (paper) => {
    setSuggestion(paper);
    setAskAddPaper(true);
    setIsLoading(false);
    updateCache(paper);
  };

  const getPaper = (id, found, notFound = () => {}) => {
    const newPaper = cachedPapers.find((p) => p.paperId == id);
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
            console.log(reason);
            return new Promise((resolve, reject) => resolve(reason));
          }
        );
      });
    }
  };

  const getNextLevel = () => {
    const idsToFetch = [].concat(...papers.map((p) => getConnectedIDs(p)));
    const promises = idsToFetch.map((id) => {
      return getPaper(
        id,
        (newPaper) => {
          newPaper.snowballLevel = currSnowballLevel + 1;
          setCachedPapers((cachedPapers) => [...cachedPapers, newPaper]);
          return newPaper;
        },
        () => {
          console.log("ERROR!");
        }
      );
    });
    setCurrSnowballLevel(currSnowballLevel + 1);
    Promise.all(promises).then((newPapers) => {
      console.log("newPapers");
      console.log(newPapers);
      // TODO: Filter new papers
      setPositions(newPapers);
      setPapers((papers) => papers.concat(newPapers));
    });
  };

  const paperIdChanged = () => {
    if (id.length === idLength) {
      setIsLoading(true);
      setAskAddPaper(false);
      // Local search
      const newPaper = cachedPapers.find((p) => p.paperId == id);
      if (newPaper !== undefined) {
        paperFound(newPaper);
      } else {
        // Web search
        getPaper(id, paperFound, () => {
          setSuggestionMsg("Paper not found");
          setIsLoading(false);
        });
      }
    } else if (id.length > idLength) {
      setId(id.slice(0, idLength));
      setIsLoading(false);
      setAskAddPaper(false);
    } else {
      // Wrong length
      setSuggestionMsg(
        `ID too short (should have ${idLength} characters instead of ${id.length})`
      );
      setIsLoading(false);
      setAskAddPaper(false);
    }
  };

  const removePaper = (id) => {
    console.log(`ID: ${id}`);
    setPapers((papers) => papers.filter((p) => p.paperId !== id));
  };

  const loadPapers = () => {
    fetch("cache.json")
      .then((req) => req.json())
      .then((newCache) => setCachedPapers(newCache));
    fetch("initialPapers.json")
      .then((req) => req.json())
      .then((initialPapers) => {
        initialPapers.forEach((p) => {
          p.snowballLevel = 0;
        });
        setPositions(initialPapers);
        setPapers(initialPapers);
      });
  };

  const handleIdChange = (e) => {
    const newId = e.target.value;
    setId(newId);
  };

  const updateCache = (newPaper) => {
    if (cachedPapers.find((p) => p.paperId == newPaper.paperId) === undefined) {
      setCachedPapers([...cachedPapers, newPaper]);
    }
  };

  const addPaper = () => {
    if (papers.find((p) => p.paperId === suggestion.paperId) !== undefined) {
      setSuggestionMsg("Paper already in list of seeds");
    } else if (suggestion !== null) {
      setPapers([...papers, suggestion]);
      setId("");
      setSuggestion(null);
      setAskAddPaper(false);
      setSuggestionMsg("Insert a new ID");
    }
  };

  const loadPapersToCache = () => {
    const file = document.getElementById("file").files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const cachedPapers = JSON.parse(event.target.result);
      setCachedPapers(cachedPapers);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="container">
      <PapersContext.Provider value={{ removePaper, setId, suggestion }}>
        <div className="d3">
          <svg ref={svgRef}></svg>
          <button onClick={getNextLevel}>Next Level</button>
        </div>
        <div className="seeds">
          <Seeds
            props={{
              tooltipDelay,
              handleIdChange,
              id,
              suggestion,
              suggestionMsg,
              isLoading,
              askAddPaper,
              addPaper,
              papers,
            }}
          ></Seeds>
        </div>
        <div className="cache">
          <a
            href={
              "data:text/json;charset=utf-8," +
              encodeURIComponent(JSON.stringify(cachedPapers))
            }
            download={`cache (${new Date(Date.now()).toString()}).json`}
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
              onChange={loadPapersToCache}
            />
          </label>
          <p>Number of papers in cache: {cachedPapers.length}</p>
        </div>
      </PapersContext.Provider>
    </div>
  );
};

const getConnectedIDs = (paper, maxChildren = 5) => {
  // TODO: Fix maxChildren

  // Get list of children's IDs
  const allIDs = [];
  if (paper.hasOwnProperty("inCitations")) {
    paper.inCitations
      .concat(paper.outCitations)
      .slice(0, maxChildren)
      .forEach((id) => {
        allIDs.push(id);
      });
  } else if (paper.hasOwnProperty("citations")) {
    paper.citations
      .concat(paper.references)
      .slice(0, maxChildren)
      .forEach((el) => {
        allIDs.push(el.paperId);
      });
  }
  return allIDs;
};

export { SnowballApp, PapersContext };
