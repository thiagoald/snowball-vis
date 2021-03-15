import React, { useEffect, useState, useRef, useContext } from "react";
import Form from "react-bootstrap/Form";
import Overlay from "react-bootstrap/Overlay";
import Tooltip from "react-bootstrap/Tooltip";
import ListGroup from "react-bootstrap/ListGroup";
import { PapersTable } from "./PapersTable";

const Seeds = ({ props }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [firstTooltip, setFirstTooltip] = useState(true);
  const tooltipTarget = useRef();
  const {
    tooltipDelay,
    handleIdChange,
    id,
    suggestion,
    suggestionMsg,
    isLoading,
    askAddPaper,
    addPaper,
    papers,
  } = props;

  useEffect(() => {
    setFirstTooltip(true);
  }, []);

  return (
    <>
      <h1>Seeds</h1>
      <Form.Group>
        <Form>
          <Form.Label>Paper ID</Form.Label>
          <>
            <Form.Control
              onClick={() => {
                if (firstTooltip) {
                  setShowTooltip(true);
                }
              }}
              onMouseOut={() => {
                if (firstTooltip) {
                  setTimeout(() => {
                    setShowTooltip(false);
                  }, tooltipDelay);
                  setFirstTooltip(false);
                }
              }}
              ref={tooltipTarget}
              type="text"
              onChange={handleIdChange}
              value={id}
            ></Form.Control>
            <Overlay
              target={tooltipTarget.current}
              show={showTooltip}
              placement="right"
            >
              {(props) => (
                <Tooltip id="overlay-example" {...props}>
                  ID of the new paper
                </Tooltip>
              )}
            </Overlay>
          </>
          <Form.Text className="text-muted">{suggestionMsg}</Form.Text>
        </Form>
      </Form.Group>
      {(isLoading || askAddPaper) && (
        <ListGroup>
          <ListGroup.Item>
            {isLoading && (
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            )}
            {askAddPaper && (
              <>
                {suggestion.title}{" "}
                <button onClick={() => addPaper()}>Add paper</button>
              </>
            )}
          </ListGroup.Item>
        </ListGroup>
      )}
      <div id="collapse1">
        {papers.length ? (
          <PapersTable papers={papers}></PapersTable>
        ) : (
          <p>No papers yet</p>
        )}
      </div>
    </>
  );
};

export { Seeds };
