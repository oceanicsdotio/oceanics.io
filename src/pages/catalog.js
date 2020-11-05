
import React,  {useState} from "react"
import { graphql } from "gatsby";
import styled from "styled-components";
import { grey } from "../palette";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Storage from "../components/Storage";
import Catalog from "../components/Catalog";

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


export default ({
    location, 
    data:{
        site: {
            siteMetadata: {title}
        }
    }
}) => {
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

    const [token, loginCallback] = useState(null);
    const objectStorageApi = "https://oceanicsdotio.nyc3.digitaloceanspaces.com?delimiter=/";

    return (
        <Layout 
            location={location} 
            title={title}
            loginCallback={loginCallback}
        >
            <SEO title={"Ocean analytics as a service"} />

            <hr />
            <Catalog accessToken={token}/>
            <Storage target={objectStorageApi} />
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
  }
`
