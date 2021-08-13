/**
 * React and friends
 */
import React, { FC, useReducer, useMemo, ChangeEvent } from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Load static data
 */
// @ts-ignore
import PageData from "js-yaml-loader!./Rubric.yml";

/**
 * Compile tie type checking
 */
type EvaluationArea = {
    name: string;
    description: string;
    merits: string[];
};
type PageType = {
    groups: EvaluationArea[];
};
interface IRubric {
    className?: string;
    groups: EvaluationArea[];
};

/**
 * Reducer convenience functions
 */
const reduceChecked = (acc: number, e: ChangeEvent<HTMLInputElement>) => 
    acc + (e.target.checked ? 1 : -1);
const reduceCount = (acc: number, cur: EvaluationArea) => 
    acc + cur.merits.length;

/**
 * A Rubric is a collection of true/false statements in which an affirmative is 
 * considered good (merits). 
 * 
 * This style is used to try to focus on positive traits that could be present
 * in an evaluated thing, rather than on hunting for negatives. 
 * The score element keeps track of the total number selected, and the setter 
 * is passed to child checkbox inputs to update the current score. 
 */
const Rubric: FC<IRubric> = ({className}) => {
    /**
     * Unpack page data.
     */
    const {groups}: PageType = PageData;

    /**
     * Accumulating total merits across all categories
     */ 
    const possible = useMemo(
        () => groups.reduce(reduceCount, 0), 
        [groups]
    );

    /**
     * Update our score based on checked state change.
     */
    const [score, dispatchScore] = useReducer(reduceChecked, 0);

    /**
     * Score display
     */
    const percentage: number = useMemo(
        () => Math.ceil(100*score/possible), 
        [score, possible]
    );
   
    return <div className={className}>
        <span id="score">
            {`You selected ${score} of ${possible} possible merits (${percentage}%).`}
        </span>
        {groups.map(({name, merits, description}: EvaluationArea) => 
            <div key={name}>
                <h3>{name}</h3>
                {description}
                {merits.map((merit: string) => 
                    <div key={merit}>
                        <input type={"checkbox"} onChange={dispatchScore}/>
                        <p>{merit}</p>
                    </div>  
                )}
            </div>    
        )}
    </div>
};

const StyledRubric = styled(Rubric)`
    & > div {
        display: block;
        & div {
            display: flex;
            justify-content: left;
        }
    }
    & input {
        margin-right: 0.5em;
    }
    & #score {
        border: 0.1rem orange solid;
        border-radius: 0.5rem;
        padding: 5px;
        color: orange;
    }
`;

export default StyledRubric;