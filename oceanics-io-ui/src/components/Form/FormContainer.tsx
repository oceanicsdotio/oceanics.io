/**
 * React and friends
 */
import React from "react"

/**
 * Component level styling
 */
import styled from "styled-components"

/**
 * Form component
 */
import Form from "./Form"

const FormBox = styled.div`
& * {
    font-size: 1.2rem;
}
`;

export const FormContainer = (props) => 
<FormBox>
    <Form {...props}/>
</FormBox>