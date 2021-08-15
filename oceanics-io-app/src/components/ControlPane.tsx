/**
 * React and friends.
 */
import React, { useState, useEffect, RefObject, FC } from "react";

/**
 * Icon rendering
 */
import TileInformation, {TileType} from "oceanics-io-ui/build/components/Layout/TileInformation";

/**
 * Query for icons and info
 */
// export const staticQuery = graphql`
//     query {
//         oceanside: allOceansideYaml(sort: {
//             order: ASC,
//             fields: [queryString]
//         }
//         filter: {
//             name: {ne: "Land"}
//         }) {
//             tiles: nodes {
//                 name
//                 data
//                 description
//                 becomes,
//                 queryString,
//                 dialog
//             }
//         }
//         icons: allFile(filter: { 
//             sourceInstanceName: { eq: "assets" },
//             extension: {in: ["gif"]}
//         }) {
//             icons: nodes {
//                 relativePath
//                 publicURL
//             }
//         }
//     }
// `;


type ControlType = {
    className?: string;
    query: object;
    static: {
        oceanside: {
            tiles: TileType[];
        };
        icons: {
            icons: {
                icons: unknown[];
            };
        };
    };
    worker: {
        worker: RefObject<unknown>;
    }
};

const ControlPane: FC<ControlType> = ({
    className,
    query, 
    worker: {worker},
    static: {
        oceanside: {tiles},
        icons: {icons},
    }
}) => {
    /**
    * Sorted items to render in interface
    */
    const [ sorted, setSorted ] = useState<TileType[]>([]);

    /**
    * Use Web worker to do sorting
    */
    useEffect(() => {
        // @ts-ignore
        if (worker.current) worker.current.sorted({icons, tiles}).then(setSorted);
    }, [ worker ]);

    /**
     * Clean up worker
     */
    useEffect(() => {
        // @ts-ignore
        if (worker.current) worker.current.terminate();
    }, [ sorted ]);


    return <div className={className}>
        <img className={"logo"} src={"/dagan-mad.gif"}/>
        {(sorted||[]).map(({tile}: TileType) => 
            <TileInformation key={tile.anchorHash} tile={tile} query={query}/>)}
    </div>
}


export default ControlPane;