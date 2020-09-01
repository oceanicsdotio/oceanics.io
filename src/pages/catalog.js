
import React, { useEffect, useState } from "react"
import { graphql } from "gatsby";
import styled from "styled-components";

import { queryBathysphere } from "../bathysphere";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { StatefulButton }  from "../components/Layout";
import Map from "../components/Map";
import Table from "../components/Table";
import DataStream from "../components/DataStream";
import Particles from "../components/Particles";
import RectilinearGrid from "../components/RectilinearGrid";
import TriangularMesh from "../components/TriangularMesh";
import HexagonalGrid from "../components/HexagonalGrid";
import Storage from "../components/Storage";
import Codex from "../components/Codex";
import Lagrangian from "../components/Lagrangian";
import Noise from "../components/Noise";
import Model from "../components/Model";

const DB_NAME = "indexed-db-testing";
const DB_VERSION = 2;
const DB_STORE = "bathysphere";


const StyledTip = styled.div`
    color: orange;
    text-align: center;
    &:hover {
        animation: scroll 0.1s linear 3;
        @keyframes scroll {
            0% {text-indent: 0%;}
            25% {text-indent: 1%;}
            50% {text-indent: 3%;}
            75% {text-indent: 2%;}
            100% {text-indent: 1%;}
        }
    }
`;

const StyledCaret = styled.div`
    display: inline-block;
    margin: 5px;
`;

const StyledCaretActive = styled.div`
    display: inline-block;
    transform: rotate(90deg);
    margin: 5px;
`;

const StyledHighlight = styled.div`
    display: inline-block;
    font-size: smaller;
    padding: 5px;
    color: #666666;
    border-radius: 5px;
    padding: 3px;
`;


export default ({data: {allMarkdownRemark: {edges}, site: {siteMetadata: {title}}}, location}) => {
    
    
    const [accessToken, setAccessToken] = useState(null);
    const [baseUrl, setBaseUrl] = useState("http://localhost:5000/api/");
    const [catalog, setCatalog] = useState([]);
    const [mapData, setMapData] = useState(null);
    const [entities, setEntities] = useState({});

    const [ visibility, setVisibility ] = useState({
        map: false,
        graph: false,
        rectilinearGrid: false,
        triangularMesh: false,
        hexGrid: false,
        objectStorage: false,
        codex: false,
        dataStream: true,
        particles: false,
        lagrangian: false,
        noise: false,
        model: false
    });



    function openDatabase({callback, ...args}) {

        let request = indexedDB.open(DB_NAME, DB_VERSION); // IDBOpenDBRequest
        let db;

        request.onerror = (event) => {
            console.log(event);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            callback({db, ...args});
        };

        request.onblocked = (_) => {
            console.log("Close other open tabs to allow database upgrade");
        };

        // only implemented in recent browsers
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            let objectStore;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                objectStore = db.createObjectStore(DB_STORE, { keyPath: "url" });
            } else {
                objectStore = request.transaction.objectStore(DB_STORE);
            }

            // objectStore.createIndex("value", "value", { unique: false });

        };
    }


    const deleteObservation = ({key}) => {
        db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).delete(key);
    };


    const getObservations = () => {
        db
            .transaction(DB_STORE, "readwrite")
            .objectStore(DB_STORE)
            .openCursor()
            .onsuccess = (event) => {
                let cursor = event.target.result;
                if (cursor) {
                    console.log([cursor.key, cursor.value]);
                    cursor.continue();
                }
            };
    };

    const searchObservations = (indexName, value = null, bounds = null) => {

        const direction = "next"; // "prev", "nextunique", "prevunique"
        const returnValue = true;

        if (value === null ? bounds !== null : bounds === null) {
            throw Error("ValueError");
        }
        let keyRange;
        if (bounds) {
            const [lower, upper] = bounds;
            keyRange = IDBKeyRange.bound(lower, upper, false, false); // inclusive
        }

        if (value !== null) {
            keyRange = IDBKeyRange.only(value);
        }

        const index = db.transaction(DB_STORE).objectStore(DB_STORE).index(indexName);
        let cursorRequest = returnValue ?
            index.openCursor(keyRange, direction) : index.openKeyCursor(keyRange, direction);

        cursorRequest.onsuccess = (event) => {
            let cursor = event.target.result;
            if (cursor) {
                console.log([cursor.key, cursor[returnValue ? "value" : "primaryKey"]]);
                cursor.continue();
            }
        };
    };


    const serialize = (obj) => {

        if (obj.hasOwnProperty("@iot.id")) {
            Object.keys(obj).forEach(k => {
                if (k.includes("@")) {
                    delete obj[k];
                }
            });
        }

        return Object.entries(obj).map(
            ([k, v]) => {
                let val = v instanceof Object ? serialize(v) : v;
                return [k, v].join(": ");
            }
        ).join(", ")
    };

    const Collection = ({name, url}) => {
        /*
        The key is the Entity subclass. The props are the properties of the 
        collection itself.

        1. check that there is data stored in React state.
        2. if not return an empty list
        3. serialize the items, if any, and create a table within the outer list. 
        */
 
        const [highlight, setHighlight] = useState(false);

        const table = {
            records: (
                (entities.hasOwnProperty(name) & entities[name] !== undefined)  ? 
                entities[name] : []),
            order: "name"
        };


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
            

        const onClickHandler = async () => {
            
            let value = [];
            if (!(entities[name] && entities[name].length)) {
                const response = await (await queryBathysphere(url, ":" + accessToken)).json();
                value = response.value;
                if (value === undefined) {
                    console.log("There was a problem fetching "+url, response);
                    localStorage.removeItem("accessToken");
                    setAccessToken(null);
                    navigate('/');
                }
            }

            setEntities({
                ...entities,
                [name]: value
            });
        };


        return (
            <>
            <h3 
                onMouseEnter={() => {
                    setHighlight(true);
                }}
                onMouseLeave={() => {
                    setHighlight(false);
                }}
            >
                {`${name.replace(/([a-z](?=[A-Z]))/g, '$1 ')} `} 
                {table.records.length ? `(${table.records.length})`: null} 
                {table.records.length ? <StyledCaretActive>➤</StyledCaretActive> : <StyledCaret>➤</StyledCaret>}
                {highlight ? (
                    <StyledHighlight>
                        <StatefulButton 
                            onClick={onClickHandler} 
                            active={table.records.length} 
                            text={"↻"} 
                            altText={"⤫"}
                        />
                        {url}
                    </StyledHighlight>
                ) : null}
            </h3>
            {table.records.length ? <Table {...table}/> : null}
            </>
        )
    };


    useEffect(() => {
        /*
        Get the last saved access token from the Local Storage API and put it in React State.
        This will be used to authenticate API data requests, and to attribute added data.
        */
        setAccessToken(localStorage.getItem("accessToken"));
    }, []);

    useEffect(() => {
        /*
        If access token is set in React state, use it to get the catalog index from Bathysphere
        */
        if (accessToken) {
            (async () => {
                const catalogData = await queryBathysphere(baseUrl, ":" + accessToken).then(x => {return x.json()});
                if (catalogData.value === undefined) {
                    console.log("Error fetching catalog", catalogData);
                    localStorage.removeItem("accessToken");
                    setAccessToken(null);
                } else {
                    setCatalog(catalogData.value.map(x => Object.entries(x)).flat());
                }
            })()   
        }
    }, [accessToken]);

    
    useEffect(() => {
        /*
        Fetch static configuration data for using Mapbox. This includes JSON descriptions
        of the map style, and the data layers. 
        */
        (async () => {
            setMapData({
                style: await fetch("/style.json").then(r => r.json()),
                layers: await fetch("/layers.json").then(r => r.json())
            });
        })();
    }, []); 
    
    
    return (
      <Layout location={location} title={title}>
        <SEO title="Ocean analytics as a service" />
    
        <hr/>
        <div>
            {Object.keys(visibility).map((text, key)=>{
                const displayText = text;
                return <StatefulButton 
                    key={key}
                    onClick={() => setVisibility({...visibility, [text]: !visibility[text]})} 
                    active={visibility[text]} 
                    text={`${displayText} ↻`} 
                    altText={`${displayText} ⤫`}  
                />
            }
            )}
        </div>
        {!Object.values(visibility).some(x => x) ? <StyledTip>↑ Select some data sources and sinks to get started.</StyledTip> : null}
        {(visibility.map && mapData) ? <Map {...mapData}/> : null}
        {visibility.lagrangian ? <Lagrangian res={1000} source={"/wind.png"} metadataFile={"/wind.json"}/> : null}
        {visibility.noise ? <Noise source={"/wind.png"}/> : null}
        {visibility.codex ? <Codex edges={edges} token={accessToken} baseUrl={baseUrl}/>:null}
        {visibility.dataStream ? <DataStream/> : null}
        {visibility.particles ? <Particles/> : null}
        {visibility.rectilinearGrid ? <RectilinearGrid/> :null }
        {visibility.triangularMesh ? <TriangularMesh/> : null }
        {visibility.hexGrid ? <HexagonalGrid/> : null }
        {visibility.graph ? catalog.map(([k, v]) => <Collection {...v} key={k}/>).flat() : null}
        {visibility.objectStorage ? <Storage /> : null}
        {visibility.model ? <Model /> : null}
        
      </Layout>
    )
};


export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            tags
            description
          }
        }
      }
    }
  }
`
