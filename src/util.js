import { stopwordsFile, initialPapersFile, url as baseURL } from "./constants";
import { makeD3, transitionToNewStyle } from "./Draw";
import Paper, { tokenizer, wordToStem } from "./Paper";
import * as d3 from "d3";
import fetch from "node-fetch";

const createJSONDownloadLink = (id, json) => {
  var node = document.getElementById(id);
  node.setAttribute(
    "href",
    `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(json))}`
  );
};

const loadInitialPapers = () => {
  return fetch(initialPapersFile)
    .then((req) => req.json())
    .then((initialPapers) => {
      return Promise.resolve(initialPapers.map((p) => new Paper(p)));
    });
};

const loadStopWords = () => {
  return fetch(stopwordsFile).then((req) => req.json());
};

const makeParamsList = (params) => {
  var paramsStr = "";
  params.forEach((p, i) => {
    paramsStr += `${p}`;
    if (i !== params.length - 1) paramsStr += ",";
  });
  return paramsStr;
};

const getPaper = (baseURL, id) => {
  return fetch(`${baseURL}/paper?id=${id}`).then((res) => res.json());
};

const getSnowball = (
  baseURL,
  ids,
  wordsToInclude,
  minYear = Number.MIN_SAFE_INTEGER,
  maxPapers = 50
) => {
  const idsStr = makeParamsList(ids);
  const wordsToIncludeStr = makeParamsList(wordsToInclude);
  const urlToFetch =
    `${baseURL}/snowball?ids=${idsStr}` +
    `&include=${wordsToIncludeStr}` +
    `&minYear=${minYear}` +
    `&maxPapers=${maxPapers}`;
  console.debug(urlToFetch);
  return fetch(urlToFetch)
    .then(
      (req) => req.json(),
      (error) => Promise.resolve([])
    )
    .then((papers) => {
      return papers.map((p) => new Paper(p));
    });
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

  return rows;
};

const wordsStyleModifier = (papers) => {
  papers.forEach((paper) => {
    papers.forEach((p) => {
      p.color = 0;
      window.selectedStems.forEach((s) => {
        if (p.stemDict[s]) {
          p.color += 1;
        }
      });
    });
    const maxCount = Math.max(
      ...papers.map((p) => {
        return window.selectedStems
          .map((s) => {
            if (p.stemDict[s]) {
              return 1;
            } else {
              return 0;
            }
          })
          .reduce((a, b) => a + b, 0);
      })
    );
    papers.forEach((p) => {
      if (maxCount !== 0)
        p.currentStyle.fill = d3.interpolateOrRd(p.color / maxCount);
      else p.currentStyle.fill = "rgba(0,0,0,0)";
    });
  });
};

const addWordsCheckboxes = (svgRef, rowsSelection, stemsChecked) => {
  rowsSelection.append("td").each((d, i, nodes) => {
    d3.select(nodes[i])
      .append("input")
      .attr("type", "checkbox")
      .attr("checked", () => {
        if (stemsChecked.find((s) => s === d.stem) === undefined) {
          return null;
        } else {
          return "true";
        }
      })
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

const fillWordsTable = (svgRef, sortedBy = "stem") => {
  const stemsChecked = [];
  d3.selectAll("#words tbody tr").each((d, i, nodes) => {
    if (d3.select(nodes[i]).select("input").property("checked")) {
      stemsChecked.push(d.stem);
    }
  });
  const stemHistogram = {};
  [].concat(...window.papers).forEach((paper) => {
    Object.keys(paper.stemDict).forEach((stem) => {
      if (stemHistogram[stem]) {
        stemHistogram[stem].count += paper.stemDict[stem].count;
        stemHistogram[stem].nPapers += 1;
        paper.stemDict[stem].words.forEach((word) =>
          stemHistogram[stem].words.add(word)
        );
      } else {
        stemHistogram[stem] = {};
        stemHistogram[stem].count = paper.stemDict[stem].count;
        stemHistogram[stem].words = paper.stemDict[stem].words;
        stemHistogram[stem].nPapers = 1;
      }
    });
  });
  var sortedWords = Object.keys(stemHistogram).map((key) => {
    return {
      stem: key,
      count: stemHistogram[key].count,
      nPapers: stemHistogram[key].nPapers,
      words: "".concat(
        ...Array.from(stemHistogram[key].words).map((w) => " " + w.toString())
      ),
    };
  });
  if (sortedBy === "count") {
    sortedWords = sortedWords.sort((a, b) => b.count - a.count);
  } else if (sortedBy === "nPapers") {
    sortedWords = sortedWords.sort((a, b) => b.nPapers - a.nPapers);
  } else if (sortedBy === "stem") {
    sortedWords = sortedWords.sort((a, b) => a.stem.localeCompare(b.stem));
  } else {
    const sortedWordsChecked = [];
    const sortedWordsNotChecked = [];
    sortedWords.forEach((w) => {
      if (stemsChecked.find((s) => s === w.stem) !== undefined) {
        sortedWordsChecked.push(w);
      } else {
        sortedWordsNotChecked.push(w);
      }
    });
    sortedWords = sortedWordsChecked
      .sort((a, b) => b.nPapers - a.nPapers)
      .concat(sortedWordsNotChecked);
  }
  d3.select("#words").selectChild("tbody").remove();
  const rows = tabulate("#words", sortedWords, ["words", "count", "nPapers"]);
  addWordsCheckboxes(svgRef, rows, stemsChecked);
};

const setAuthors = (selection) => {
  return selection
    .attr("href", (d) => `https://www.semanticscholar.org/author/${d.ids[0]}`)
    .attr("target", "_blank")
    .attr("class", "list-group-item")
    .text((d) => d.name);
};

const setPaperInfo = (datum) => {
  d3.select("#title").text(`${datum.title}`);
  d3.select("#title").attr("href", `${datum.s2Url}`);
  d3.select("#year").text(`(${datum.year})`);
  var newAbstract = datum.paperAbstract.slice();
  const wordsToHighlight = new Set();
  tokenizer.tokenize(datum.paperAbstract).forEach((token) => {
    if (
      window.selectedStems.find((w) => w === wordToStem(token)) !== undefined
    ) {
      wordsToHighlight.add(token);
    }
  });
  Array.from(wordsToHighlight).forEach((word) => {
    newAbstract = newAbstract.replace(word, `<strong>${word}</strong>`);
  });
  d3.select("#abstract").html(`${newAbstract}`);
  d3.select("#authors")
    .selectAll("a")
    .data(datum.authors)
    .join(
      (enter) => setAuthors(enter.append("a")),
      (update) => setAuthors(update)
    );
};

export {
  loadInitialPapers,
  loadStopWords,
  getSnowball,
  getPaper,
  fillWordsTable,
  tabulate,
  createJSONDownloadLink,
  setPaperInfo,
  wordsStyleModifier,
};
