// const popover = (
//   <Popover id="popover-basic">
//     <Popover.Content>
//       Semantic Scholar only allows for <strong>100</strong> papers to be
//       requested within 5 minutes. After that, the counter is reset to{" "}
//       <strong>100</strong>.
//     </Popover.Content>
//   </Popover>
// );

// <OverlayTrigger trigger="click" placement="right" overlay={popover}>
//   <Button id="budgetButton" variant="info">
//     Paper Budget: {window.localStorage.scholarBudget}
//   </Button>
// </OverlayTrigger>;
// const setTimers = () => {
//     window.setInterval(() => {
//       window.localStorage.scholarBudget = papersBudget;
//     }, budgetResetTime);
//     window.setInterval(() => {
//       d3.select("#budgetButton")
//         .text(`Paper Budget: ${window.localStorage.scholarBudget}`)
//         .style(() => {
//           if (window.localStorage.scholarBudget === 0) {
//             return "background:rgba(255,0,0,0.5)";
//           } else {
//             return null;
//           }
//         });
//     }, budgetButtonPollTime);
//   };
