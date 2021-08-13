/**
 * React and friends
 */
 import React from 'react';

 /**
  * Base component
  */
 import References from "./References";
 import "../../styles/global.css";
import "../../styles/theme.css";

 /**
  * Storybook Interface
  */
 export default {
   component: References,
   title: 'References/References',
 }
 
 /**
  * Base case
  * 
  * @param {*} args 
  * @returns 
  */
 const Template = (args) => <References {...args} />;
 
 /**
  * Default test case
  */
 export const Example = Template.bind({});
 Example.args = {
    heading: "References", references: [{
    authors: ["Keeney NR", "Keeney NR"],
    year: 2000,
    title: "A blah about blah",
    journal: "Cybernetics",
    volume: "50",
    hash: undefined,
    pageRange: [90, 110],
 }]};