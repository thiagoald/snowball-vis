import React from "react";
import ReactDom from "react-dom";
import { SnowballApp } from "./App";
import "./css/index.css";

ReactDom.render(
  <React.StrictMode>
    <SnowballApp></SnowballApp>
  </React.StrictMode>,
  document.getElementById("root")
);
