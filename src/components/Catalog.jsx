import React from "react";
import styled from "styled-components";
import { useStaticQuery, graphql } from "gatsby";
import { pink } from "../palette";

/**
 * Form for login and in app navigation
 */
import Form from "./Form";

/**
 * Component that displays information about an Oceanside feature
 */
import TileInformation from "./TileInformation";

/**
 * Use bathysphere client
 */
import useBathysphereApi from "../hooks/useBathysphereApi";


/**
 * Login fields until openApi interface in complete
 */
import fields from "../data/login.yml";

const query = graphql`
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
            icons: nodes {
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
                        meters {
                            name
                            max
                            value
                            high
                            low
                        }
                    }
                }
            }
        }
        team: allBathysphereYaml(
            filter: {
                kind: { eq: "Agents" }
            }
        ) {
            team: nodes {
                spec { name }
            }   
        }
        locations: allBathysphereYaml(
            filter: {
                kind: { eq: "Locations" }
                metadata: {
                    fictional: { eq: true }
                }
            }
        ) {
            locations: nodes {
                kind
                metadata {
                    fictional
                    home
                    icon
                    capacity
                }
                spec { name }
            }   
        }
        tasks: allBathysphereYaml(
            filter: {
                kind: { eq: "Tasks" }
            }
        ) {
            tasksByLocation: group(field: metadata___Locations___name) {
                location: fieldValue
                nodes { 
                    spec { name }
                }
            }  
        }
    }`

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
const Catalog = ({className}) => {
   
    /**
     * Static query for tile metadata and icons.
     */
    const {
        oceanside: {tiles},
        icons: {icons},
        bathysphere: {things},
        locations: {locations}
    } = useStaticQuery(query);

    /**
     * List of collections to build selection from
     */ 
    const { 
        refresh, 
        login, 
        register, 
        options, 
        populate, 
        navigate, 
        sorted 
    } = useBathysphereApi({icons, tiles, things, locations});

    
    return <div className={className}>
        <Form 
            id={"login-dialog"} 
            callback={refresh}
            fields={fields}
            actions={[{
                value: "Login",
                onClick: login
            }, {
                value: "Signup",
                onClick: register
            }]}
        />

        <Form
            fields={[{
                type: "select",
                id: "collection",
                options: options,
                onChange: populate
            }]}
        />

        <Form
            fields={[{
                type: "select",
                id: "asset",
                options: sorted.map(({name}) => name),
                onChange: navigate
            }]}
        />

        {sorted.map((tile, ii) => 
            <TileInformation
                key={`tile-${ii}`} 
                tile={tile}
            />
        )}
    </div> 
}; 

/**
 * Styled version of the Single day calendar view
 */
const StyledCatalog = styled(Catalog)`

    display: ${({display})=>display};
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    overflow-x: hidden;

    width: auto;
    min-height: 100vh;
    bottom: 0;
    margin: 0.5rem;
    padding: 0;

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