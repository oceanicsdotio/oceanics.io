import React from "react"
import styled from "styled-components";
import {pink} from "../palette";
import Thing from "./Thing";
import Roster from "./Roster";
import {TaskList} from "./Task";
import Location from "./Location";

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
    things,
    locations,
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
        {Object.entries(things).map(([name, props], ii) => 
            <Thing {...{
                name, 
                home,
                key: `things-${ii}`,
                ...props
            }}/>
        )}
        {locations.map(({tasks, things=null, capacity, icon=null, ...props}, ii) => 
            <Location 
                key={`location-${ii}`}
                icon={icon ? TileSet[icon] : null}
                {...props}
            >
                <Roster team={props.home && team ? 
                    [...(props.team || []), ...team]: 
                    []} capacity={capacity}/>
                {things ? <Things things={things} home={home}/> : null}
                <TaskList tasks={tasks} heading={"Tasks"}/>
            </Location>
        )}
        <Note/>
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
