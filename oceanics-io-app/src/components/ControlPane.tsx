/**
 * React and friends.
 */
import React, { useState, useEffect, RefObject, FC } from "react";

/**
 * Icon rendering
 */
import TileInformation from "oceanics-io-ui/build/components/Layout/TileInformation";

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

type TileType = {
    data: string;
    spriteSheet: string;
    name: string;
    value: number;
    probability: number;
    cost: number;
    becomes: string[];
    dialog: string;
    description: string;
    anchorHash?: string;
};

type ControlType = {
    className?: string;
    search: string;
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
    search, 
    worker: {worker},
    static: {
        oceanside: {tiles},
        icons: {icons},
    }
}) => {
    /**
    * Sorted items to render in interface
    */
    const [ sorted, setSorted ] = useState<unknown[]|null>(null);

    /**
    * Use Web worker to do sorting
    */
    useEffect(() => {
        if (!!(worker.current??false)) worker.current.sorted({icons, tiles}).then(setSorted);
    }, [ worker ]);

    /**
     * Clean up worker
     */
    useEffect(() => {
        if (!!((worker.current??false) && sorted)) worker.current.terminate();
    }, [ sorted ]);


    return <div className={className}>
        <img className={"logo"} src={"/dagan-mad.gif"}/>
        {(sorted||[]).map((tile) => <TileInformation key={tile.anchorHash} tile={tile} search={search}/>)}
    </div>
}


export default ControlPane;