import { useEffect, useState } from "react";

/**
The catalog page is like a landing page to the api.

Routes from here correspond to entities and 
collections in the graph database.

If access token is set in React state, use it to get the catalog index from Bathysphere
*/
export default ({
    accessToken,
    url = "https://graph.oceanics.io/api/"
}) => {
   
    
    const [catalog, setCatalog] = useState([]);

    useEffect(() => {
        if (!accessToken) return;
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
                console.log("Fetch error:", collection)
            } else {
                setCatalog(data.value);
            }
        })()   
    }, [accessToken]);

    return {catalog};
};
