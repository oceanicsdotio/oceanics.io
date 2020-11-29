import React from "react"
import styled from "styled-components";
import {StyledCollection} from "./Collection";

import useBathysphereApi from "../hooks/useBathysphereApi";

const StyledError = styled.div`
    color: orange;
    text-align: center;
    border: 1px solid;
    margin: 0;
`;


/*
The catalog page is like a landing page to the api.

Routes from here correspond to entities and 
collections in the graph database.
*/
export default ({
    accessToken,
    url = "https://graph.oceanics.io/api/"
}) => {

    const {catalog} = useBathysphereApi({accessToken, url});
     
    return accessToken ? 
    catalog.flatMap(x => Object.entries(x)).map(([k, {name}]) => 
            <StyledCollection
                name={name}
                baseUrl={url}
                accessToken={accessToken} 
                key={k}
            />
        ) : 
        <StyledError>
            {"(!) No graph access token available"}
        </StyledError>
};
