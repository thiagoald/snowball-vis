import React, { useEffect } from "react";
import { PapersContext } from "./App";
import * as d3 from "d3";

const Interactive = ({ papers }) => {
  const { d3Target } = PapersContext;
  const positions = useEffect(() => {});
  return (
    <svg>
      {papers.length &&
        papers.map((paper) => {
          <circle cx="" cy=""></circle>;
        })}
    </svg>
  );
};

export default Interactive;
