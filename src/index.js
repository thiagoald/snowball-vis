import React from "react";
import ReactDom from "react-dom";
import { SnowballApp } from "./AppPureD3";
import "./index.css";

ReactDom.render(
  <React.StrictMode>
    <SnowballApp></SnowballApp>
  </React.StrictMode>,
  document.getElementById("root")
);
