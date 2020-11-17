import React, {useState, useEffect} from "react";
import styled from "styled-components";
import YAML from "yaml";
import Form from "./Form";
import SwaggerParser from "@apidevtools/swagger-parser";

const StyledInterface = styled.div`
    visibility: ${({hidden})=>hidden?"hidden":null}; 
`;

export default ({
    specUrl="https://bivalve.oceanics.io/api.yml",
    path="/{objectKey}",
    method="post"
}) => {

    const [apiSpec, setApiSpec] = useState(null);
    const [view, setView] = useState(null);

    useEffect(()=>{
        SwaggerParser.validate(specUrl, (err, api) => {
            if (err) console.error(err);
            else setApiSpec(api);
        });   
    },[]);

    useEffect(()=>{
        if (!apiSpec) return;

        const route = apiSpec.paths[path][method]

        // [{
        //     type: "email", 
        //     id: "email", 
        //     placeholder: "name@example.com", 
        //     required: true,
        // }, {
        //     type:"password", 
        //     id: "password",
        //     placeholder: "************", 
        //     required: true
        // }]

        const body = route.requestBody.content["application/json"].schema.properties.forcing.items.items;
        console.log(body);

        const params = route.parameters.concat(body)
            .map(({name, schema, required, ...props})=>{

                let type;
                let options = null;
                if ("enum" in schema) {
                    type = "select";
                    options = schema.enum;
                } else if (schema.type === "string") {
                    type = "text";
                } else if (schema.type === "number") {
                    type = "text";
                } 

                return Object({
                    id: name, 
                    type,
                    required,
                    options,
                });
            })

        setView(params);
    },[apiSpec]);

    const Header = ({info: {title, version}}) => <h2>
        {`${title}, v${version}`}
    </h2>;

    
    return <StyledInterface hidden={!apiSpec}>
        <Header info={apiSpec ? apiSpec.info : {}}/>
        <Form
            id={"bivalve-api"}
            fields={view ? view : null}
            actions={[{
                value: "POST"
            }]}
            
        />
    </StyledInterface>
}