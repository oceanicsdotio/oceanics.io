/**
 * React and friends.
 */
import React, { useState, useEffect } from "react";

/**
 * Fetch site data.
 */
import { useStaticQuery, graphql } from "gatsby";
 
import TileInformation from "../components/TileInformation";

import useWasmWorkers from "../hooks/useWasmWorkers";


/**
 * Query for icons and info
 */
const staticQuery = graphql`
    query {
        oceanside: allOceansideYaml(sort: {
            order: ASC,
            fields: [queryString]
        }
        filter: {
            name: {ne: "Land"}
        }) {
            tiles: nodes {
                name
                data
                description
                becomes,
                queryString,
                dialog
            }
        }
        icons: allFile(filter: { 
            sourceInstanceName: { eq: "assets" },
            extension: {in: ["gif"]}
        }) {
            icons: nodes {
                relativePath
                publicURL
            }
        }
    }
`;


export default ({search}) => {

    /**
     * Get icon static data
     */
    const {
        oceanside: {tiles},
        icons: {icons}
    } = useStaticQuery(staticQuery);
   
    /**
    * Sorted items to render in interface
    */
    const [ sorted, setSorted ] = useState(null);

    /**
     * Make a worker
     */
    const { worker } = useWasmWorkers();

    /**
    * Use Web worker to do sorting
    */
    useEffect(()=>{
        if (worker.current) worker.current.sorted({icons, tiles}).then(setSorted);
    }, [ worker ]);

    /**
     * Clean up worker
     */
    useEffect(() => {
        if (sorted) console.log({sorted, icons, tiles});
        if (worker.current && sorted) worker.current.terminate();
    }, [ sorted ]);


    return <>
        <img className={"logo"} src={"/dagan-mad.gif"}/>
        {(sorted||[]).map(tile => <TileInformation key={tile.anchorHash} tile={tile} search={search}/>)}
    </>
}