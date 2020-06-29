import React, { useState, useEffect } from 'react';
import Table from "../components/Table";
import {queryBathysphere} from "../utils/bathysphere";


const TaskingCapabilities = (props) => {

    const {entities, schema} = props;
    const order = "name";

    return (
        <Table 
            order={order} 
            schema={schema} 
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
        (async () => {
            const token = await queryBathysphere(baseUrl + "auth", auth).then(x => {return x.json()});
            const catalog = await queryBathysphere(baseUrl, ":" + token.token).then(x => {return x.json()});
            setState(state => ({
                ...state,
                token: token,
                catalog: catalog.value.map(x => Object.entries(x)).flat(),
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