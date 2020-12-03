import React, { useReducer }  from "react";
import styled from "styled-components";
import Form from "./Form";
import { ghost } from "../palette";
import useBathysphereAuth from "../hooks/useBathysphereAuth";
import fields from "../../static/login.yml";


/*
The login container handles authorization interactions with the
backend.

*/
const Login = ({
    className, 
    onLogin=null,
}) => {
   
    const {token, login, register} = useBathysphereAuth();

    const [data, refresh] = useReducer(
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

    const form = {
        fields,
        actions: [{
            value: "You're krillin' it",
            onClick: () => {login({onLogin, ...data})}
        }, {
            value: "Register",
            onClick: () => {register(data)}
        }]
    };
       
    return <div 
        className={className} 
        hidden={!!token}
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
        margin-top: 10px;
    }
`;

export default StyledLogin;
