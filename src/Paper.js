import * as d3 from "d3";
import { radius, circleContainer, xShift, defaultStyle } from "./constants";
var natural = require("natural");
var tokenizer = new natural.WordTokenizer();
const wordToStem = natural.PorterStemmer.stem;

const notInStopwords = (word) => {
  console.log([word, window.stopwords.find((sw) => word === sw) === undefined]);
  return window.stopwords.find((sw) => word === sw) === undefined;
};

class Paper {
  constructor(
    data,
    snowballLevel = 0,
    serializableKeys = [
      "snowballLevel",
      "incoming",
      "outgoing",
      "geometry",
      "selected",
      "circleID",
      "selectionByWordCount",
      "stemDict",
      "parent",
    ]
  ) {
    for (const key of Object.keys(data)) {
      this[key] = data[key];
    }
    this.snowballLevel = snowballLevel;
    this.incoming = null;
    this.outgoing = null;
    this.geometry = null;
    this.circleID = null;
    this.selected = false;
    this.selectionByWordCount = 0;
    this.stemDict = {};
    this.parent = null;
    this.serializableKeys = serializableKeys;
    this.citationCount = 0;
    this.currentStyle = { ...defaultStyle };
    if (this.paperAbstract !== null) {
      tokenizer.tokenize(this.paperAbstract).forEach((word) => {
        if (notInStopwords(word)) {
          const stem = wordToStem(word);
          const lowerWord = word.toLowerCase();
          if (this.stemDict[stem] !== undefined) {
            this.stemDict[stem].count += 1;
            this.stemDict[stem].words.add(lowerWord);
          } else {
            this.stemDict[stem] = {};
            this.stemDict[stem].count = 1;
            this.stemDict[stem].words = new Set([lowerWord]);
          }
        }
      });
    }
  }

  serializable() {
    const serializablePaper = {};
    Object.getOwnPropertyNames(this).forEach((property) => {
      if (this.serializableKeys.indexOf(property) < 0) {
        serializablePaper[property] = this[property];
      }
    });
    return serializablePaper;
  }

  setID(iLevel, iPos) {
    if (this.circleID === null) this.circleID = `${iLevel}-${iPos}`;
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

  allConnections(
    maxIn = Number.MAX_SAFE_INTEGER,
    maxOut = Number.MAX_SAFE_INTEGER
  ) {
    return {
      incoming: this.incomingConnections(maxIn),
      outgoing: this.outgoingConnections(maxOut),
    };
  }

  setPosition(index, maxY, laneLength = laneLength, forceRecalc = false) {
    const circlesPerLane = Math.floor((laneLength - xShift) / circleContainer);
    if (forceRecalc || this.geometry === null) {
      this.geometry = {};
      const row = Math.floor(index / circlesPerLane);
      const column = index % circlesPerLane;
      this.geometry.x = xShift + radius + column * circleContainer;
      this.geometry.y = maxY + 2 * radius + row * circleContainer;
      this.geometry.r = radius;
      return this.geometry;
    } else {
      return this.geometry;
    }
  }
  createConnections(allPapers) {
    const { incoming, outgoing } = this.allConnections();
    incoming.concat(outgoing).forEach((paper) => {
      console.log(paper.title);
      const id = paper.id;
      const conn = allPapers.find((p) => p.id === id);
      if (conn !== undefined) {
        d3.select("svg")
          .append("line")
          .attr("id", `from${paper.circleID}`)
          .attr("x1", paper.geometry.x)
          .attr("y1", paper.geometry.y)
          .attr("x2", conn.x)
          .attr("y2", conn.y)
          .attr("style", "stroke:black;pointer-events:none");
        d3.select("svg")
          .append("circle")
          .attr("id", `from${paper.circleID}`)
          .attr("r", paper.geometry.r)
          .attr("cx", paper.geometry.x)
          .attr("cy", paper.geometry.y)
          .attr("style", "fill:blue;stroke:white;pointer-events:none");
      }
    });
  }
}

export default Paper;
