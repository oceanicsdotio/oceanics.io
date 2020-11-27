import React, {useReducer, useState}  from "react";
import styled from "styled-components";
import Form from "./Form";
import {ghost} from "../palette";
import useBathysphereAuth from "../hooks/useBathysphereAuth";
import fields from "../../static/login.yml";


/*
The login container handles authorization interactions with the
backend.

Available interface depends on whether user is registering
or returning.
*/
const Login = ({
    className
}) => {
   
    const {token, login, register} = useBathysphereAuth({});

    const [data, refresh] = useReducer(
        (prev, event=null) => {
            return event ? {
                ...prev,
                [event.target.id]: event.target.value.trim()
            } : prev
        },
        {
            email: "",
            password: ""
        }
    );

    const form = {
        fields,
        actions: [{
            value: "Discover data",
            onClick: () => login(data)
        }, {
            value: "Register instead",
            onClick: () => register(data)
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
