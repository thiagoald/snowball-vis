const xShift = 100;
const radius = 10;
// const url = "https://api.semanticscholar.org/v1/paper/";
const url = "http://localhost:5001";
const distance = radius;
const circleContainer = 2 * radius + 2 * distance;
const levelDistance = 30;
const laneLength = 0.5 * window.innerWidth;
const circleGrowDuration = 300;
const budgetResetTime = 5 * 60 * 1000;
const papersBudget = 100;
const budgetButtonPollTime = 500;
const defaultStyle = {
  fill: "rgba(255,255,255,1)",
  stroke: "rgba(0,0,0,0.5)",
  "stroke-width": 1,
};
const stopwordsFile = "nltk_stopwords.json";
const initialPapersFile = "initialPapers.json";

export {
  xShift,
  radius,
  url,
  distance,
  circleContainer,
  levelDistance,
  laneLength,
  circleGrowDuration,
  budgetResetTime,
  papersBudget,
  budgetButtonPollTime,
  defaultStyle,
  stopwordsFile,
  initialPapersFile,
};
