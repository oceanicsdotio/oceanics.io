import React from "react"
import styled from "styled-components";

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
        <h2>
            {query.toLocaleDateString(undefined, format)}
        </h2>
        <div>
            {children}
        </div>
    </div>
}

export const StyledCalendar = styled(Calendar)`
    width: 100%;
    padding: 0;
    margin: 0;

    & > h2 {
        align-content: center;
        margin: auto;
        display: flex;
        width: 100%;
    }
`;

export default StyledCalendar;
