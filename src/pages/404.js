import React from "react";
import styled from "styled-components";

import Layout from "../components/Layout";
import SEO from "../components/SEO";

import dagan from "../../static/dagan-sprite.gif";


const StyledImage = styled.img`
    position: relative;
    display: block;
    margin-left: auto;
    margin-right: auto;
`;

export default ({
    location, 
}) => 
    <Layout location={location}>
        <SEO title={"404"}/>
        <p>{"You can't get there from here bub."}</p>
        <StyledImage src={dagan}/>
    </Layout>;