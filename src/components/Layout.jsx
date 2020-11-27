import { rhythm } from "../typography";
import styled from "styled-components";
import { MDXProvider } from "@mdx-js/react";

import React, { useReducer }  from "react";
import { Link } from "gatsby";
import { pink, ghost, grey, blue } from "../palette";

// Shortcode components for MDX child rendering
import Noise from "./Noise";
import Lagrangian from "./Lagrangian";
import {StyledCaption} from "./Canvas";
import DataStream from "./DataStream";
import Particles from "./Particles";
import RectilinearGrid from "./RectilinearGrid";
import TriangularMesh from "./TriangularMesh";
import HexagonalGrid from "./HexagonalGrid";
import Model from "./Model";
import OceansideManual from "./OceansideManual";
import Rubric from "./Rubric";
import References, {Reference, Inline} from "./References";
import PDF from "./PDF";
import OpenApi from "./OpenApi";


const NavBar = styled.nav`
    display: block;
    justify-content: space-between;
    text-align: left;
    visibility: ${({hidden=false})=>hidden?"hidden":null};
    height: ${({hidden=false})=>hidden?"0":"auto"};
    border-radius: 1rem;
    border-bottom: 1px solid;
`;

const SiteTitle = styled(Link)`
    position: relative;
    color: #ccc;
    font-size: x-large;
    text-decoration: none;
    display: inline-block;
    margin: 0.5rem;
`;

const StyledLink = styled(Link)`
    text-decoration: none;
    color: ${pink};
    margin: 0.5rem;
    display: inline-block;
`;

const MinorLink = styled(Link)`
    display: block;
    color: ${ghost};
`;

const External = styled.a`
    text-decoration: none;
    color: ${({ok=true})=>ok ? blue : grey};
    margin: 0.5rem;
    display: inline-block;
`;

const Button = styled.button`
    color: ${pink};
    text-decoration: none;
    border: none;
    font-family: inherit;
    font-size: inherit;
    background: none;
    cursor: pointer;
`;

const Content = styled.main`
    height: auto;
    bottom: 0;
`;

const Footer = styled.footer`
    border-top: 1px dashed ${grey};
    margin-top: 1rem;
`;

const shortcodes = {
    Noise, 
    StyledCaption, 
    Lagrangian, 
    DataStream, 
    Particles, 
    RectilinearGrid, 
    TriangularMesh, 
    HexagonalGrid, 
    Model,
    OceansideManual,
    Rubric,
    Reference,
    References,
    Inline,
    PDF,
    OpenApi
};

const links = [
    {to: "/app", label: "App"},
    {to: "/oceanside", label: "Game"}
];

const apiLinks = [
    {href: "https://graph.oceanics.io", label: "Bathysphere"},
    {href: "https://bivalve.oceanics.io", label: "Bivalve"},
    {href: "https://www.oceanics.io", label: "Capsize", ok: false},
    {href: "https://www.oceanics.io", label: "Squall", ok: false},
];

export const Layout = ({ 
    children, 
    expand=false,
    className
}) => {

    const apiLabel = "APIs"
    const [hidden, showGutter] = useReducer(prev=>!prev, true);

    return <div className={className}>
        
        <NavBar>
            <SiteTitle to="/">{"Oceanics.io"}</SiteTitle>
            <Button onClick={showGutter}>
                {apiLabel}
            </Button>
            {links.map(({label, to}) =>  
                <StyledLink to={to}>{label}</StyledLink>
            )}
        </NavBar>

        <NavBar hidden={hidden}>
            {apiLinks.map(({label, href, ok}) => 
                <External href={href} ok={ok}>{label}</External>
            )}
        </NavBar>
        <Content>
            <MDXProvider components={shortcodes}>{children}</MDXProvider>
        </Content>
        <Footer>
            {[
                {to: "/references", label: "References"},
                {to: "/tags", label: "Tags"},
                {to: "/policy", label: "Policy"}
            ].map(({label, to}) => 
                <MinorLink key={label} to={to}>{label}</MinorLink>
            )}
        
            <p>
                {`Made with 🏴 in Maine`} <br/>
                {`No rights reserved, 2018-${new Date().getFullYear()}. `}
            </p>
        </Footer>
    </div>
};

export const StyledLayout = styled(Layout)`
    margin-left: auto;
    margin-right: auto;
    max-width: ${({expand})=>expand?"100%":rhythm(24)};
    padding: ${rhythm(1.5)} ${rhythm(0.75)};
`;

export default StyledLayout;