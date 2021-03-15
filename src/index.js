import React from "react";
import ReactDom from "react-dom";
import "./index.css";
import { SnowballApp } from "./App";

ReactDom.render(
  <React.StrictMode>
    <SnowballApp></SnowballApp>
  </React.StrictMode>,
  document.getElementById("root")
);
