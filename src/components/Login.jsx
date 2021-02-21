import React, { useReducer }  from "react";
import styled from "styled-components";

import Form from "./Form";
import useBathysphereApi from "../hooks/useBathysphereApi";

import fields from "../data/login.yml";
import { ghost } from "../palette";


/**
* The login container handles authorization interactions with the
* backend.
*/
const Login = ({
    className, 
    onLogin=null,
}) => {
   
    const [credentials, refresh] = useReducer(
        (prev, event=null) => event ? Object({
                ...prev,
                [event.target.id]: event.target.value.trim()
            }) : prev,
        {
            email: "",
            password: "",
            apiKey:  "FL_fnXrKrRG1ae3VLpn2oAgeVZrVUn5kXJyTFDQ_1GlpC_xzXYJnU6SDz5stoS4wlts-t9qXljblUJzgK3FcIw",
            server: "https://graph.oceanics.io"
        }
    );

    const {accessToken} = useBathysphereApi(credentials);

    const form = {
        fields,
        actions: [{
            value: "You're krillin' it",
            onClick: () => {login({onLogin, ...credentials})}
        }, {
            value: "Register",
            onClick: () => {register(credentials)}
        }]
    };
       
    return <div 
        className={className} 
        hidden={!!accessToken}
    >     
        <Form 
            id={"login-dialog"} 
            callback={refresh}
            {...form}
        />
    </div>
       
};

const StyledLogin = styled(Login)`
    
    color: ${ghost};
    width: auto;
    height: auto;
    visibility: ${({hidden})=>hidden?"hidden":null};

    & > p {
        position: relative;
        width: 100%;
        font-size: smaller;
        margin-top: 1rem;
    }
`;

export default StyledLogin;
