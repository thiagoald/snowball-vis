import React from "react";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";

const PaperInfo = () => {
  return (
    <Card id="paperInfo" className="hidden">
      <Card.Title>
        <a href="" id="title" target="_blank">
          Title
        </a>
        <div id="year"></div>
      </Card.Title>
      <Card.Text id="abstract">Abstract</Card.Text>
      <Card.Title>Authors</Card.Title>
      <ListGroup variant="flush">
        <ListGroup.Item id="authors"></ListGroup.Item>
      </ListGroup>
    </Card>
  );
};

export default PaperInfo;
