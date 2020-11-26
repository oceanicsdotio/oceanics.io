
import React, { useState, useReducer } from "react"
import { graphql } from "gatsby";
import styled from "styled-components";
import SEO from "../components/SEO";
import Storage from "../components/Storage";
import Catalog from "../components/Catalog";

import Map from "../components/Map";
import style from "../../static/style.yml";
import layers from "../../static/layers.yml";

import Roster from "../components/Roster";
import {Things} from "../components/Thing";
import {TileSet} from "../components/Oceanside";
import {Locations} from "../components/Location";
import DataStream from "../components/DataStream";

import {v4 as uuid4} from "uuid";

const dateFormat = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
};

const things = {
    "R/V Lloigor": {
        icon: TileSet["boat"],
        capacity: 2,
        tanks: [{
            name: "starboard aft"
        },
        {
            name: "port aft",
            level: 4,
        },
        {
            name: "starboard forward",
            level: 5.5,
        },
        {
            name: "port forward",
            level: 8.75,
        }]
    },
    "Sealab": {
        icon: TileSet["laboratory"],
        home: "Farm",
        capacity: 6
    }
};

const defaultTeam = [
    "HP Lovecraft",
    "Mary Shelley",
    "Arthur Machen",
]

const locations = [{
    name: "Wharf",
    icon: TileSet["wharf"],
    home: true,
    capacity: 4,
    tasks: ["do a thing", "fix me"]
}, {
    name: "Farm",
    icon: TileSet["fish"],
    tasks: ["harvest"]
}];


const Application = styled.div`
    display: grid;
    grid-gap: 5px;
    grid-template-columns: 3fr 4fr;
    grid-auto-rows: minmax(50px, auto);
    margin: 0;
    padding: 0;
    height: 100vh;
    width: auto;
    overflow-y: hidden;
`;


const ColumnContainer = styled.div`
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    bottom: 0;
    overflow-x: hidden;
    margin: 0;
    padding: 0;
`;

// guess where things should be by default
const home = locations.filter(({home=false}) => home).pop().name;

const Day = ({
    date, 
    children,
    format = dateFormat,
    className = "Day"
}) => 
    <div className={className}>
        <h2>
            {date.toLocaleDateString(undefined, format)}
        </h2>
        <div>
            {children}
        </div>
    </div>;

const DayContainer = styled(Day)`
    width: 100%;
    padding: 0;
    margin: 0;
`;

const daysFromToday = (day) => {
    const today = new Date();
    return new Date(today.setDate(today.getDate()+day));
}

/*
This is a test service meant to enable automatic reminders and scheduling assistance.

The service maintains a record of upcoming operations. 

This includes the missions for vessels, personnel responsibly for that action, and the location
of the actions. There are many features that can be added, but this is a minimal effort.

Requirements:
1. Allow input from pre-populated items
2. Display next 7 days
3. Send e-mail or text reminders with SendGrid
4. Allow recipients to adjust personal settings (optional)

*/
  
const RotateSelection = styled.div`
    align-content: center;
    width: 100%;
    display: flex;
`;

const Header = styled.h1`
    margin: auto;
    margin-bottom: 2rem;
    border-bottom: 1px solid;
    border-radius: 2rem;
    font-size: larger;
    font-family: inherit;
`;

const Nav = styled.button`
    background: none;
    border: none;
    font-size: large;
    cursor: pointer;
    margin: 0.5rem;
    font-family: inherit;
`;


const Mission = ({team, things, home}) => {
    return <>

    <h2>{"Daylight"}</h2>
    <DataStream />

    <h2>{"Team"}</h2>
    <Roster team={team} />

    <h2>{"Things"}</h2>
    <Things 
        things={things}
        home={home}
    />

    
    </>
};


const Schedule = ({days, team, home, locations}) => {
    return [...Array(days).keys()]
            .map(daysFromToday)
            .map(date => 
                <DayContainer 
                    date={date}     
                    team={team}
                    key={uuid4()}
                >
                    <Locations 
                        team={team} 
                        home={home}
                        locations={locations}
                    />
                </DayContainer>
            )
};


const NavHeader = ({prev, next, children, onPrev, onNext}) => {
    return <RotateSelection>
        <Header >
            <Nav onClick={onPrev}>{`< ${prev}`}</Nav>
                {children}
            <Nav onClick={onNext}>{`${next} >`}</Nav>
        </Header>
    </RotateSelection>
}

const Tools = styled.div`
    padding: 3rem;
`;

export default ({
    location, 
    data:{
        site: {
            siteMetadata: {title}
        }
    },
    days,
    team = defaultTeam
}) => {
   

    const objectStorageApi = "https://oceanicsdotio.nyc3.digitaloceanspaces.com?delimiter=/";
    const tools = {
        Mission: <Mission {...{team, home, things}}/>,
        Schedule: <Schedule {...{days, team, home, locations}}/>,
        Assets: <Storage target={objectStorageApi}/>,
        Catalog: <Catalog accessToken={token}/>
    };

    const [view, setView] = useReducer(
        (prev, back=false)=> back ?
            [prev[prev.length-1], ...prev.slice(0, prev.length-1)] :
            [...prev.slice(1, prev.length), prev[0]]
        ,
        Object.keys(tools)
    );
    const [token, loginCallback] = useState(null);

    return <>
        <SEO title={"Ocean analytics as a service"} />
        <Application>

            <ColumnContainer 
                row={0} 
                column={0}
            >
                <Tools>
                    <NavHeader 
                        prev={view[view.length-1]} 
                        next={view[1]}
                        onPrev={()=>{setView(true)}}
                        onNext={()=>{setView()}}
                    >
                        {view[0]}
                    </NavHeader>
                    {tools[view[0]]}
                </Tools>
            </ColumnContainer>

            <ColumnContainer 
                row={0} 
                column={1}
            >
                <Map 
                    style={style} 
                    layers={layers} 
                    accessToken={'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q'}
                />
            </ColumnContainer>
        </Application>
    </>
};


export const pageQuery = graphql`
 query {
    site {
      siteMetadata {
        title
      }
    }
  }
`

 /*
    The catalog page is like a landing page to the api.

    Routes from here correspond to entities and 
    collections in the graph database.
    */

    // function openDatabase({callback, ...args}) {

    //     let request = indexedDB.open(DB_NAME, DB_VERSION); // IDBOpenDBRequest
    //     let db;

    //     request.onerror = (event) => {
    //         console.log(event);
    //     };

    //     request.onsuccess = (event) => {
    //         db = event.target.result;
    //         callback({db, ...args});
    //     };

    //     request.onblocked = (_) => {
    //         console.log("Close other open tabs to allow database upgrade");
    //     };

    //     // only implemented in recent browsers
    //     request.onupgradeneeded = (event) => {
    //         db = event.target.result;
    //         let objectStore;
    //         if (!db.objectStoreNames.contains(DB_STORE)) {
    //             objectStore = db.createObjectStore(DB_STORE, { keyPath: "url" });
    //         } else {
    //             objectStore = request.transaction.objectStore(DB_STORE);
    //         }

    //         // objectStore.createIndex("value", "value", { unique: false });

    //     };
    // }


    // const deleteObservation = ({key}) => {
    //     db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).delete(key);
    // };


    // const getObservations = () => {
    //     db
    //         .transaction(DB_STORE, "readwrite")
    //         .objectStore(DB_STORE)
    //         .openCursor()
    //         .onsuccess = (event) => {
    //             let cursor = event.target.result;
    //             if (cursor) {
    //                 console.log([cursor.key, cursor.value]);
    //                 cursor.continue();
    //             }
    //         };
    // };

    // const searchObservations = (indexName, value = null, bounds = null) => {

    //     const direction = "next"; // "prev", "nextunique", "prevunique"
    //     const returnValue = true;

    //     if (value === null ? bounds !== null : bounds === null) {
    //         throw Error("ValueError");
    //     }
    //     let keyRange;
    //     if (bounds) {
    //         const [lower, upper] = bounds;
    //         keyRange = IDBKeyRange.bound(lower, upper, false, false); // inclusive
    //     }

    //     if (value !== null) {
    //         keyRange = IDBKeyRange.only(value);
    //     }

    //     const index = db.transaction(DB_STORE).objectStore(DB_STORE).index(indexName);
    //     let cursorRequest = returnValue ?
    //         index.openCursor(keyRange, direction) : index.openKeyCursor(keyRange, direction);

    //     cursorRequest.onsuccess = (event) => {
    //         let cursor = event.target.result;
    //         if (cursor) {
    //             console.log([cursor.key, cursor[returnValue ? "value" : "primaryKey"]]);
    //             cursor.continue();
    //         }
    //     };
    // };


    // openDatabase({callback: ({db}) => {
    //     let objStore = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE);
    //     let request = objStore.openCursor(url);

    //     request.onsuccess = (event) => {
    //         let cursor = event.target.result;
    //         if (cursor) {
    //             cursor.update(value);
    //         } else {
    //             objStore.add(value)
    //         }
    //     };

    //     request.onerror = (event) => {
    //         throw Error(event.target);
    // };}});




// const DB_NAME = "indexed-db-testing";
// const DB_VERSION = 2;
// const DB_STORE = "bathysphere";


// const serialize = (obj) => {

//     if (obj.hasOwnProperty("@iot.id")) {
//         Object.keys(obj).forEach(k => {
//             if (k.includes("@")) {
//                 delete obj[k];
//             }
//         });
//     }

//     return Object.entries(obj).map(
//         ([k, v]) => {
//             let val = v instanceof Object ? serialize(v) : v;
//             return [k, v].join(": ");
//         }
//     ).join(", ")
// };
