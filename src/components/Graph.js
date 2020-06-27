import React, { useState, useEffect } from 'react';
import Table from "../components/Table";


const TaskingCapabilities = (props) => {

    const {entities} = props;
    const order = "name";

    const _implicitSchema = entities.map(e => {
        return new Set(Object.keys(e).filter(key => !key.includes("@")))
    }).reduce(
        (acc, current) => new Set([...acc, ...current])
    );

    let priority = [];
    ["uuid", "name"].forEach(key => {
        if (_implicitSchema.delete(key)) {
            priority.push(key);
        }
    });

    
    return (
        <Table 
            order={order} 
            schema={priority.concat(Array.from(_implicitSchema)).map(x => {return {label: x, type: "string"}})} 
            records={entities}
        />
    );
};


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

        return await fetch(uri, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            }
        });
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
        const collection = await (await queryBathysphere(url, ":" + state.token.token)).json();
        let entities = state.entities;
        entities[name] = collection.value;
        
        setState({
            ...state,
            entities: entities
        });
    }


    const Collection = (key, props) => {
        /*
        The key is the Entity subclass. The props are the properties of the 
        collection itself.

        1. check that there is data stored in React state.
        2. if not return an empty list
        3. serialize the items, if any, and create a table within the outer list. 
        */

        const entities = (
            state.entities.hasOwnProperty(props.name) ? state.entities[props.name] : []
        );

        const {name, ...newProps} = props;
        
        return (
            <>
            <h3 onClick={() => {onClickHandler(props)}}>{name}</h3>
            <p>{serialize(newProps)}</p>
            {entities.length ? <TaskingCapabilities entities={entities}/> : <></>}
            <hr/>
            </>
        )
    };

    useEffect(() => {
        (async function () {
            const token = await (await queryBathysphere(baseUrl + "auth", auth)).json();
            const catalog = await (await queryBathysphere(baseUrl, ":" + token.token)).json();
            setState(state => ({
                ...state,
                token: token,
                catalog: catalog.value.map(x => Object.entries(x)).flat()
            }));
        })()
    }, []); 

    return (
        <div>
            <h2>Geospatial graph</h2>
            {state.catalog.map(([k, v]) => [Collection(k, v)]).flat()}
        </div>
    );

}