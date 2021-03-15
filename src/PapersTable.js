import React from "react";
import Table from "react-bootstrap/Table";
import Paper from "./Paper";
import { v1 as uuid } from "uuid";

const PapersTable = ({ papers }) => {
  const relevantKeys = ["title", "venue", "year", "authors", "paperId"];
  return (
    <div>
      {papers.length && (
        <Table striped bordered hover>
          <thead>
            <tr>
              {relevantKeys
                .map((key) => <th key={key}>{key}</th>)
                .concat([<th key={"remove"}>Remove</th>])}
            </tr>
          </thead>
          <tbody>
            {papers.map((paper) => {
              return (
                <Paper
                  key={paper.paperId}
                  data={paper}
                  relevantKeys={relevantKeys}
                ></Paper>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export { PapersTable };
