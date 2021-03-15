import React from "react";

const Authors = ({ authors }) => {
  return authors.map((author) => author.name).join();
};

export default Authors;
