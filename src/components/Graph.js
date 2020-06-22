import React, { useState, useEffect } from 'react';


export default (props) => {

    const baseUrl = "http://localhost:5000/api/";
    const auth = "bathysphere@oceanics.io:n0t_passw0rd";

    const [ state, setState ] = useState({
        token: {
            duration: null,
            token: null
        },
        catalog: [],
        entities: {}
    });

    const queryBathysphere = async (uri, auth) => {

        const response = await fetch(uri, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });
        return await response.json();
    };

    const serialize = (obj) => {

        let uuid;
        let selfLink;

        if (obj.hasOwnProperty("@iot.id")) {
            Object.keys(obj).forEach(k => {
                if (k.includes("@")) {
                    delete obj[k];
                }
            });
        }

        return Object.entries(obj).map(
            ([k, v]) => {
                let val = v instanceof Object ? serialize(v) : v;
                return [k, v].join(": ");
            }
        ).join(", ")
    }

    const onClickHandler = async (props) => {
        const {url, name} = props;
        const collection = await queryBathysphere(url, ":" + state.token.token);
        let entities = state.entities;
        entities[name] = collection.value;
        
        setState({
            ...state,
            entities: entities
        });
    }


    const Collection = (key, props) => {

        const entities = state.entities.hasOwnProperty(props.name) ? 
            state.entities[props.name] : [];

        return (
            <>
            <li key={key} onClick={() => {onClickHandler(props)}}>
                {serialize(props)}
                <ul>{entities.map(obj => <><li key={obj.uuid}>{serialize(obj)}</li><hr/></>)}</ul>
            </li>
            <hr/>
            </>
        )
    };

    useEffect(() => {
        (async function () {
            const token = await queryBathysphere(baseUrl + "auth", auth);
            const catalog = await queryBathysphere(baseUrl, ":" + token.token);
            setState(state => ({
                ...state,
                token: token,
                catalog: catalog.value.map(x => Object.entries(x)).flat()
            }));
        })()
    }, []); 

    return (
        <div>
            <h2>Geospatial graph interface</h2>
            <p>Your token is valid for {state.token.duration} seconds.</p>
            <p>You can access these collections:</p>
            <ol>
            {state.catalog.map(([k, v]) => [Collection(k, v)]).flat()}
            </ol>
        </div>
    );

}