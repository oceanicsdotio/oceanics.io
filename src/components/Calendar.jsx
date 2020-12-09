import React from "react"
import styled from "styled-components";
import {useStaticQuery, graphql} from "gatsby";
import {pink} from "../palette";
import Thing from "./Thing";
import Roster from "./Roster";
import {TaskList} from "./Task";
import Location from "./Location";
import {TileSet} from "../hooks/useOceanside";
import Note from "./Note";

/**
This is a service meant to enable automatic reminders and scheduling assistance. 

It maintains a local record of upcoming operations. This includes the missions for vessels, personnel responsibly for that action, and locations.

Features:
1. Allow input from pre-populated items
2. Display next N days
3. Send e-mail or text reminders with SendGrid
4. Allow recipients to adjust personal settings (optional)
*/

const ThingsQuery = graphql`
 query {
    things: allBathysphereYaml(
        filter: {
            kind: {
                eq: "Things"
            } 
        }
    ) {
        nodes {
            apiVersion
            metadata {
                icon
            }
            kind
            spec {
                name
                description
                properties {
                    home
                    capacity
                    tanks {
                        name
                        capacity
                        level
                    }
                }
            }
        }
    }
}`;

const Calendar = ({
    offset,
    team,
    className,
    locations,
    tasks,
    format = { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
    }
}) => {

    const data = useStaticQuery(ThingsQuery);
    const things = data.things.nodes;

    const today = new Date();
    const query = 
        offset ? 
        new Date(today.setDate(today.getDate()+offset)) : 
        today;

    return <div className={className}>
        <h2>{query.toLocaleDateString(undefined, format)}</h2>
        {things.map((props, ii) => 
            <Thing {...{
                key: `things-${ii}`,
                ...props
            }}/>
        )}
        {locations.map(({
            spec: {
                name
            },
            metadata: {
                capacity=null, 
                icon=null,
                home=false
            }  
        }, ii) => 
            <Location 
                key={`location-${ii}`}
                icon={icon ? TileSet[icon] : null}
                name={name}
            >
                <Roster 
                    team={home && team ? team : []} 
                    capacity={capacity}
                />
                <TaskList 
                    tasks={tasks[name]} 
                    heading={"Tasks"}
                />
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
