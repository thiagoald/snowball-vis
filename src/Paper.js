import React, { useContext } from "react";
import { PapersContext } from "./App";
import DropdownButton from "react-bootstrap/DropdownButton";
import Dropdown from "react-bootstrap/Dropdown";

const Paper = ({ data, relevantKeys }) => {
  const { removePaper } = useContext(PapersContext);
  return (
    <tr>
      {relevantKeys
        .map((key) => {
          if (key === "authors") {
            return <td key={key}>{extractAuthors(data[key])}</td>;
          } else {
            return <td key={key}>{data[key]}</td>;
          }
        })
        .concat([
          <td key={"remove"}>
            <button
              className="editbtn"
              onClick={() => removePaper(data.paperId)}
            >
              Remove
            </button>
          </td>,
        ])}
    </tr>
  );
};

const References = ({ children }) => {
  const { setId } = useContext(PapersContext);
  return (
    <DropdownButton id="dropdown-basic-button" title="Show">
      {children.map((child) => {
        return (
          <Dropdown.Item onClick={() => setId(child.paperId)}>
            {child.title}
          </Dropdown.Item>
        );
      })}
    </DropdownButton>
  );
};

const extractAuthors = (authors) => authors.map((author) => author.name).join();

export default Paper;
