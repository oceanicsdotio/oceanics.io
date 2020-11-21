import { rhythm } from "../typography";
import styled from "styled-components";
import { MDXProvider } from "@mdx-js/react";

import React, { useReducer }  from "react";
import { Link } from "gatsby";
import Login from "./Login";
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


const ListItem = styled.div`
    display: inline-block;
    margin-right: 1rem;
`;

const NavBar = styled.nav`
    display: block;
    justify-content: space-between;
    text-align: right;
    visibility: ${({hidden=false})=>hidden?"hidden":null};
    border-top: 1px dashed ${grey};
`;

const SiteTitle = styled(Link)`
    position: relative;
    color: #ccc;
    font-size: x-large;
    text-decoration: none;
`;

const StyledLink = styled(Link)`
    text-decoration: none;
    color: ${pink};
`;

const MinorLink = styled(Link)`
    display: block;
    color: ${ghost};
`;

const External = styled.a`
    text-decoration: none;
    color: ${({ok=true})=>ok ? blue : grey};
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
    PDF
};

const links = [
    {to: "/catalog", label: "Catalog"},
    {to: "/map", label: "Map"},
    {to: "/vessel", label: "Vessel"},
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
    className,
    loginCallback=null
}) => {

    const apiLabel = "APIs"
    const [hidden, showGutter] = useReducer(prev=>!prev, true);

    return <div className={className}>
        <SiteTitle to="/">{"Oceanicsdotio"}</SiteTitle> 
        <NavBar>
            {links.map(({label, to}) => 
                <ListItem key={label}>
                    <StyledLink to={to}>{label}</StyledLink>
                </ListItem>
            )}
            <ListItem key={apiLabel}>
                <Button onClick={()=>{showGutter()}}>
                    {apiLabel}
                </Button>
            </ListItem>
            <Login onSuccess={loginCallback}/>
            
        </NavBar>
        <NavBar hidden={hidden}>
            {apiLinks.map(({label, href, ok}) => 
                <ListItem key={label}>
                    <External href={href} ok={ok}>{label}</External>
                </ListItem>
            )}
        </NavBar>
        <main>
            <MDXProvider components={shortcodes}>{children}</MDXProvider>
        </main>
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