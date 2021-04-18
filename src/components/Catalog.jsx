import React from "react";
import styled from "styled-components";
import { pink } from "../palette";

/**
 * Form for login and in app navigation
 */
import Form from "./Form";

/**
 * Use bathysphere client
 */
import useBathysphereApi from "../hooks/useBathysphereApi";


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
     * List of collections to build selection from
     */ 
    const { login } = useBathysphereApi();
    
    return <div className={className}>
        <Form 
            id={"register-dialog"}
            fields={[{
                type: "email",
                id: "email",
                placeholder: "name@example.com",
                required: true
            }]}
            actions={[{
                value: "Login",
                type: "button",
                onClick: login
            }]}
        />
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

    & h2 {
        display: block;
        font-size: larger;
        font-family: inherit;
        width: fit-content;
        margin: auto;
        padding: 0;

        & button {
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