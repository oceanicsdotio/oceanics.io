import React, { useEffect, useState } from "react"
import styled from "styled-components";
import { navigate } from "gatsby"
import { Router } from "@reach/router"
import Layout, {StatefulButton}  from "../components/Layout";
import SEO from "../components/SEO";
import Map from "../components/Map";
import Table from "../components/Table";
import {queryBathysphere} from "../bathysphere";
import Canvas from "../components/Canvas";
import Storage from "../components/Storage";

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




export default (props) => {

    let accessToken = localStorage.getItem("accessToken");
    const baseUrl = "http://localhost:5000/api/";

    const [ showMap, setShowMap ] = useState(false);
    const [ showCatalog, setShowCatalog ] = useState(false);
    const [ showCanvas, setShowCanvas ] = useState(false);
    const [ showObjectStorage, setShowObjectStorage ] = useState(false);
    const [ state, setState ] = useState({
        catalog: [],
        entities: {},
        layers: [],
        style: {}
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

    const PrivateRoute = ({ component: Component, location, ...props }) => {
        useEffect(
            () => {if (!accessToken && location.pathname !== `/`) navigate(`/`)},
            [location]
        )
        return accessToken ? <Component {...props} /> : null
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

    const Collection = ({name, url, ...props}) => {
        /*
        The key is the Entity subclass. The props are the properties of the 
        collection itself.

        1. check that there is data stored in React state.
        2. if not return an empty list
        3. serialize the items, if any, and create a table within the outer list. 
        */
 
        let {entities} = state;
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
            
            let value;
            if (entities[name] && entities[name].length) {
                value = []
            } else {
                const response = await (await queryBathysphere(url, ":" + accessToken)).json();
                value = response.value;
                if (value === undefined) {
                    console.log("There was a problem fetching "+url, response);
                    localStorage.removeItem("accessToken");
                    accessToken = null;
                    navigate('/');
                }
            }

            setState({
                ...state,
                entities: {
                    ...entities,
                    [name]: value
                }
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
        (async () => {
            const style = await fetch("/style.json").then(r => r.json())
            const layerData = await fetch("/layers.json").then(r => r.json());
            const catalog = await queryBathysphere(baseUrl, ":" + accessToken).then(x => {return x.json()});
            if (catalog.value === undefined) {
                console.log("Error fetching catalog", catalog);
                localStorage.removeItem("accessToken");
                accessToken = null;
            } else {
                setState(state => ({
                    ...state,
                    catalog: catalog.value.map(x => Object.entries(x)).flat(),
                    layers: layerData,
                    style
                }));
            }
        })()
    }, []); 

    const Catalog = () => {
        return (
            
        <div>
            <hr/>
            <div>
            <StatefulButton 
                onClick={() => setShowCatalog(!showCatalog)} 
                active={showCatalog} 
                text={"Graph ↻"} 
                altText={"Graph ⤫"} 
            />

            <StatefulButton 
                onClick={() => setShowMap(!showMap)} 
                active={showMap} 
                text={"Map ↻"} 
                altText={"Map ⤫"} 
            />

            <StatefulButton 
                onClick={() => setShowCanvas(!showCanvas)} 
                active={showCanvas} 
                text={"Canvas ↻"} 
                altText={"Canvas ⤫"} 
            />

            <StatefulButton 
                onClick={() => setShowObjectStorage(!showObjectStorage)} 
                active={showObjectStorage} 
                text={"Objects ↻"} 
                altText={"Objects ⤫"} 
            />
            </div>
            {showCanvas?(
                <>
                <Canvas caption="Particles" dataType="Particles"/>
                {/* <Canvas caption="DataStream" dataType="DataStream"/>
                <Canvas caption="TriangularMesh" dataType="TriangularMesh"/>
                <Canvas caption="RectilinearGrid" dataType="RectilinearGrid"/>
                <Canvas caption="Cursor" dataType="Cursor"/>
                <Canvas caption="HexagonalGrid" dataType="HexagonalGrid"/> */}
                </>
            ):null}
            {!showMap && !showCatalog && !showObjectStorage && !showCanvas ? <StyledTip>↑ Select some data sources and sinks    to get started.</StyledTip> : null}
            {showMap ? <Map layers={state.layers} style={state.style}/> : null}
            {showCatalog ? state.catalog.map(([k, v]) => <Collection {...v}/>).flat() : null}
            {showObjectStorage ? <Storage /> : null}
            
        </div>
    )
    };

    return (
        <Layout>
            <SEO title="Situational awareness for a changing ocean" />
            <Router>
                <PrivateRoute path="/catalog/" component={Catalog} />
            </Router>
        </Layout>
    )
}
