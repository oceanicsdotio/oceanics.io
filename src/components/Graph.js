import React, { useState, useEffect } from 'react';
import Entity from "../components/Entity";

export default (props) => {

    const [ state, setState ] = useState({
        token: {
            duration: null,
            token: null
        },
        catalog: [],
        display: {}
    });

    const baseUrl = "http://localhost:5000/api/"

    useEffect(() => {
      
        (async function () {
           
            fetch(baseUrl + "auth", {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'bathysphere@oceanics.io:n0t_passw0rd'
                }
            })
                .then(response => response.json())
                .then(token => {

                    fetch(baseUrl, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-cache',
                        headers: {
                            'Content-Type': 'application/json',
                            'authorization': ':' + token.token
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                            setState(state => ({
                                ...state,
                                token: token,
                                catalog: data.value.map(x => Object.entries(x)).flat()
                            }));
                        });   
                });
        })()
    
    }, []); 

    return (
        <div>
            <p>Your token is valid for {state.token.duration} seconds.</p>
            <p>You can access these collections:</p>
            <ol>
            {state.catalog.map(([k, v]) => {
                const props = {...v, key: k};
                return [<Entity {...props} />]
            }).flat()}
            </ol>
        </div>
    );

}