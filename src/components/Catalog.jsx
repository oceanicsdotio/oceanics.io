import React, { useEffect, useState } from "react"
import styled from "styled-components";
import {StyledCollection} from "../components/Collection";

const StyledError = styled.div`
    color: orange;
    text-align: center;
    border: 1px solid;
    margin: 0;
`;

export default ({
    accessToken = null,
    baseUrl = "https://graph.oceanics.io/api/"
}) => {
    /*
    The catalog page is like a landing page to the api.

    Routes from here correspond to entities and 
    collections in the graph database.
    */
    
    const [catalog, setCatalog] = useState([]);

    useEffect(() => {
        /*
        If access token is set in React state, use it to get the catalog index from Bathysphere
        */
        if (!accessToken) return;
        (async () => {
        
            const catalogData = await fetch(baseUrl, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `:${accessToken}`
                }
            })
                .then(response => response.json());
                    
            if (catalogData.value === undefined) {
                console.log("Error fetching catalog", catalogData)
            } else {
                setCatalog(catalogData.value.flatMap(x => Object.entries(x)));
            }
        })()   
    }, [accessToken]);

     
    return accessToken ? 
        catalog.map(([k, {name}]) => 
            <StyledCollection
                name={name}
                baseUrl={baseUrl}
                accessToken={accessToken} 
                key={k}
            />
        ) : 
        <StyledError>
            {"(!) No graph access token available"}
        </StyledError>
};

// const DB_NAME = "indexed-db-testing";
// const DB_VERSION = 2;
// const DB_STORE = "bathysphere";


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
