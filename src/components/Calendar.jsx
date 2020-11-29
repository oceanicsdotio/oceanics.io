import React from "react"
import styled from "styled-components";
import {pink} from "../palette";

/**
This is a service meant to enable automatic reminders and scheduling assistance. 

It maintains a local record of upcoming operations. This includes the missions for vessels, personnel responsibly for that action, and locations.

Features:
1. Allow input from pre-populated items
2. Display next N days
3. Send e-mail or text reminders with SendGrid
4. Allow recipients to adjust personal settings (optional)
*/

const Calendar = ({
    offset,
    className,
    children,
    format = { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
    }
}) => {

    const today = new Date();
    const query = 
        offset ? 
        new Date(today.setDate(today.getDate()+offset)) : 
        today;

    return <div className={className}>
        <h2>{query.toLocaleDateString(undefined, format)}</h2>
        {children}
    </div>
};


/**
 * Styled version of the Single day calendar view
 */
export const StyledCalendar = styled(Calendar)`

    align-content: center;
    display: block;

    & > h2 {
        display: block;
        font-size: larger;
        font-family: inherit;
        width: fit-content;
        margin: auto;
        padding: 0;

        & > button {
            background: none;
            color: ${pink};
            border: none;
            font-size: large;
            cursor: pointer;
            margin: 0.5rem;
            font-family: inherit;
        }
    }
`;

export default StyledCalendar;
