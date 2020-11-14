import React, {useState, useEffect, useReducer} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import {grey, pink} from "../palette";
import Table from "./Table";


export const Highlight = styled.div`
    display: block;
    font-size: smaller;
    padding: 5px;
    color: ${grey};
    border-radius: 3px;
    padding: 3px;
    visibility: ${({hidden})=>hidden?"hidden":null};
`;

Highlight.propTypes = {
    hidden: PropTypes.bool.isRequired
}


export const Button = styled.button`
    height: auto;
    border: solid 1px;
    margin: 0;
    border-radius: 5px;
    color: ${pink};
    text-decoration: none;
`;

/**
The key is the Entity subclass. 
The props are the properties of the collection itself.

1. check that there is data stored in React state.
2. if not return an empty list
3. serialize the items, if any, and create a table within the outer list. 
*/
const Collection = ({
    name, 
    baseUrl,
    accessToken
}) => {
   
    const [expand, toggleExpand] = useReducer((prev, state=null)=>
        state!==null?state:!prev,
        false
    );
    const [entities, setEntities] = useState(null);
    const url = baseUrl + name;

    useEffect(()=>{
        (async () => {
            const collection = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `:${accessToken}`
                }
            })
                .then(response => response.json());
                    
            if (collection.value === undefined) {
                console.log("Error fetching collection", collection)
            } else {
                console.log(collection);
                setEntities(collection.value);
            }
        })()
    },[]);

    return <div>
        <h3 
            onMouseEnter={() => {toggleExpand(true)}}
            onMouseLeave={() => {toggleExpand(false)}}
        >
            {`${name.replace(/([a-z](?=[A-Z]))/g, '$1 ')} `} 
            {entities && entities.length ? `(${entities.length})`: null} 
           
            <Highlight hidden={!expand}>
                <Button>
                    {`${entities ? "⤫" : "↻"} ${url}`}
                </Button>
            </Highlight>
        </h3>
        <Table records={entities}/>
    </div>
};

export default Collection;

export const StyledCollection = styled(Collection)`
    overflow: scroll;
    max-height: 50%;
`;