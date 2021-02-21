import React, {useState, useEffect, useMemo} from "react"
import styled from "styled-components";
import {useStaticQuery, graphql} from "gatsby";

import Form from "./Form";
import Tags from "./Tags";
import Thing from "./Thing";
import Roster from "./Roster";
import Location from "./Location";

import useObjectStorage from "../hooks/useObjectStorage";
import useBathysphereApi from "../hooks/useBathysphereApi";

import {grey, pink} from "../palette";


/**
 * Convenience method to make the name usable as a page anchor
 */ 
const transformName = name => 
    name.toLowerCase().split(" ").join("-"); 


/**
 * Art and information for single tile feature. 
 * This is used to render documentation for the game.
 */
const TileInfo = ({
    tile: {
        name,
        description,
        group=[], 
        publicURL
    }, 
    className
}) =>
    <div className={className}>
        <h3>
            <a id={transformName(name)}/>
            {name}
        </h3>
        <img src={publicURL}/>
        <p>{description}</p>
        {group.length ? <>{"Becomes: "}<Tags group={group}/></> : null}
    </div>;


const StyledTileInfo = styled(TileInfo)`

    border-bottom: 0.1rem solid ${grey};

    & > * {
        font-size: inherit;
        font-family: inherit;
    }

    & > img {
        position: relative;
        image-rendering: crisp-edges;
        width: 6rem;
        height: 6rem;
    }  
`;
  

/**
The key is the Entity subclass. 
The props are the properties of the collection itself.

1. check that there is data stored in React state.
2. if not return an empty list
3. serialize the items, if any, and create a table within the outer list. 

 * The Storage component provides and interface to view
 * S3 object storage assets. 
 * The catalog page is like a landing page to the api.
* Assets are files, usually remote, in this case stored in 
 * S3 object storage. 
 * In S3 storage objects are grouped by prefix. In our system
 * this is interpreted as thematic or topological collections.
 * This is somewhat analogous to the STAC specificiation.
Routes from here correspond to entities and 
collections in the graph database.
 */
const Catalog = ({
    graph: {
        accessToken,
        url = "https://graph.oceanics.io/api/"
    },
    storage: {
        delimiter="/",
        target
    },
    team,
    className,
    locations,
}) => {
    /**
     * Options state object generated from API queries
     */ 
    const [options, setOptions] = useState([]);

    /**
     * List of collections to build selection from
     */ 
    const {catalog} = useBathysphereApi({accessToken, url});

    /**
     * S3 file system meta data
     */ 
    const fs = useObjectStorage({
        target: `${target}?delimiter=${delimiter}`
    });

    /**
     * Static query for tile metadata and icons.
     */
    const {
        oceanside: {tiles},
        icons: {nodes},
        bathysphere: {things}
    } = useStaticQuery(graphql`
        query {
            oceanside: allOceansideYaml(sort: {
                order: ASC,
                fields: [name]
            }) {
                tiles: nodes {
                    name
                    data
                    description
                    becomes
                }
            }
            icons: allFile(filter: { 
                sourceInstanceName: { eq: "assets" },
                extension: {in: ["gif"]}
            }) {
                nodes {
                    relativePath
                    publicURL
                }
            }
            bathysphere: allBathysphereYaml(filter: {
                kind: {
                    eq: "Things"
                } 
            }) {
                things: nodes {
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
        }
    `);

    /** 
     * Generate derived fields, and match metadata to asset files.
     * Memoize the results to prevent recalculating when the parent
     * page re-renders.
     */
    const sortedByName = useMemo(() => {
        
        const lookup = Object.fromEntries(
            nodes.map(({relativePath, publicURL})=>
                [relativePath, publicURL])
        );

        return tiles.map(
        ({name, becomes=[], data, ...x})=>{

            const group = (becomes || [])
                .map(x => 
                    tiles.filter(
                        ({name})=>
                            transformName(name) === transformName(x)
                    ).pop()
                );

            return {
                canonical: transformName(name), 
                group: group.map(({name}) => ({
                    link: `#${transformName(name)}`,
                    text: name
                })), 
                name,
                publicURL: lookup[data],
                ...x
            }
        })
        .sort((a, b) => {
            [a, b] = [a, b].map(({canonical}) => canonical);
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        })
    }, [tiles, nodes]);

    /**
     * Combine the datastores into a single set of options for
     * selecting between collections
     */
    useEffect(()=>{
        if (!fs || !catalog) return;

        setOptions([
            {key: "Features of Interest"}, 
            ...fs.collections, 
            ...catalog
        ].map(({key})=>key));

    }, [fs, catalog]);


    return <>
        <Form
            fields={[{
                type: "select",
                id: "Collections",
                options
            }]}
        />
        <Form
            fields={[{
                type: "select",
                id: "Assets",
                options: sortedByName.map(({name}) => name),
                onChange: (e) => {
                    location.hash = "#" + transformName(e.target.value);
                }
            }]}
        />
        {/* {things.map((props, ii) => 
            <Thing {...{
                key: `things-${ii}`,
                ...props
            }}/>
        )} */}
        {locations.map(({
            spec: {
                name
            },
            metadata: {
                capacity=null,
                home=false
            }  
        }, ii) => 
            <Location 
                key={`location-${ii}`}
                name={name}
            >
                <Roster 
                    team={home && team ? team : []} 
                    capacity={capacity}
                />
            </Location>
        )}
        {sortedByName.map((x, ii) => 
            <StyledTileInfo 
                key={`tile-${ii}`} 
                tile={x}
            />
        )}
    </> 
}; 

/**
 * Styled version of the Single day calendar view
 */
export const StyledCatalog = styled(Catalog)`

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


export default StyledCatalog;
