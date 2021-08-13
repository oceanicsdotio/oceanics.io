/**
 * React and friends
 */
 import React from 'react';

 /**
  * Base component
  */
 import Reference from "./Reference";
 import "../../styles/global.css";
import "../../styles/theme.css";

 /**
  * Storybook Interface
  */
 export default {
   component: Reference,
   title: 'References/Reference',
 }
 
 /**
  * Base case
  * 
  * @param {*} args 
  * @returns 
  */
 const Template = (args) => <Reference {...args} />;
 
 /**
  * Default test case
  */
 export const Example = Template.bind({});
 Example.args = {
    authors: ["Keeney NR", "Keeney NR"],
    year: 2000,
    title: "A blah about blah",
    journal: "Cybernetics",
    volume: "50",
    hash: undefined,
    pageRange: [90, 110],
 };