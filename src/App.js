import React, { useRef, useEffect } from "react";
import "./bootstrap.min.css";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import InputGroup from "react-bootstrap/InputGroup";
import FormControl from "react-bootstrap/FormControl";
import * as d3 from "d3";
import Paper from "./Paper";
import PaperInfo from "./PaperInfo";
import Modifiers from "./Modifiers";
import {
  loadInitialPapers,
  getSnowball,
  loadStopWords,
  fillWordsTable,
  getPaper,
} from "./util";
import { url as baseURL } from "./constants";
import { makeD3, attachRectangleSelection } from "./Draw";

const setInitialWindowState = () => {
  window.stopwords = [];
  window.cache = [];
  window.selectedStems = [];
  window.nextButtonWorks = true;
  window.papers = [[]];
  window.filters = [];
  window.lastLaneStart = 0;
  window.currSnowballLevel = 0;
  window.nSelected = 0;
  window.modifiers = [];
  window.paperInfoState = "hidden";
  if (!window.localStorage.hasOwnProperty("scholarBudget")) {
    window.localStorage.scholarBudget = 100;
  }
};

const handleClickAddPapers = (svgRef) => {
  if (window.nextButtonWorks) {
    window.wordsToInclude = [];
    d3.select("#nextbuttonspinner").style("visibility", null);
    getSnowball(
      baseURL,
      window.papers.slice(-1)[0].map((p) => p.id),
      window.wordsToInclude
    ).then((papers) => {
      if (papers.length > 0) {
        window.papers.push(
          papers.filter((paper) => {
            return window.papers.every((level) => {
              return level.find((p) => p.id === paper.id) === undefined;
            });
          })
        );
      }
      d3.select("#nextbuttonspinner").style("visibility", "hidden");
      fillWordsTable(svgRef);
      attachRectangleSelection(d3.select(svgRef.current));
      makeD3(svgRef, window.papers);
    });
  }
};

const handleClickAddSeed = (svgRef) => {
  const id = d3.select("#seedId").node().value;
  if (window.papers[0].find((p) => p.id === id) === undefined) {
    d3.select("#loadPaperSpinner").attr("style", null);
    getPaper(baseURL, id).then((paper) => {
      if (paper !== null && !paper.hasOwnProperty("error")) {
        const newPaper = new Paper(paper);
        window.papers[0].push(newPaper);
        d3.select("#loadPaperSpinner").attr("style", "visibility:hidden");
        window.nextButtonWorks = true;
        d3.select("#nextbutton").attr("class", "btn btn-primary");
        makeD3(svgRef, window.papers);
        fillWordsTable(svgRef);
      } else {
        // TODO: Handle error
        d3.select("#loadPaperSpinner").attr("style", "visibility:hidden");
      }
    });
  }
  d3.select("#seedId").node().value = "";
};

const SnowballApp = () => {
  const svgRef = useRef();

  useEffect(() => {
    console.log("Rerendering SnowballApp");
  });

  useEffect(() => {
    setInitialWindowState();
    loadStopWords()
      .then((stopwords) => {
        window.stopwords = stopwords;
      })
      // .then(() => loadInitialPapers())
      // .then((initialPapers) => {
      //   window.papers = [initialPapers];
      // })
      // .then((stopwords) => {
      //   window.stopwords = stopwords;
      // })
      .then(() => {
        attachRectangleSelection(d3.select(svgRef.current));
        fillWordsTable(svgRef);
        makeD3(svgRef, window.papers);
        d3.select(window).on("resize", () => {
          makeD3(svgRef, window.papers);
        });
      });
  }, []);

  return (
    <div className="topLevel">
      <div id="paperInfoPlaceholder" className="visible">
        <p id="placeholderText">Hover over a paper to see information here!</p>
      </div>
      <PaperInfo></PaperInfo>
      <div id="overflowBox">
        <svg className="papersGraph" ref={svgRef}></svg>
      </div>
      <Button id="nextbutton" onClick={() => handleClickAddPapers(svgRef)}>
        More Papers
        <Spinner
          id="nextbuttonspinner"
          animation="border"
          role="status"
          style={{ visibility: "hidden" }}
        ></Spinner>
      </Button>
      <Modifiers properties={{ svgRef }}></Modifiers>
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
          className="highlight"
          autoFocus
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
    </div>
  );
};

export { SnowballApp };
