
import { rhythm } from "../typography";
import styled from "styled-components";
import { MDXProvider } from "@mdx-js/react";

import React  from "react";
import { Link} from "gatsby";
import Login from "./Login";
import {pink, blue} from "../palette";

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


const StyledLayout = styled.div`
    margin-left: auto;
    margin-right: auto;
    max-width: ${rhythm(24)};
    padding: ${rhythm(1.5)} ${rhythm(0.75)};
`;

const StyledListItem = styled.div`
    display: inline-block;
    margin-right: 1rem;
`;

const StyledNavBar = styled.nav`
    display: block;
    width: 100%;
    justify-content: space-between;
    text-align: right;
    margin-bottom: 1.45rem;
`;

const StyledSiteTitle = styled(Link)`
    position: relative;
    color: #ccc;
    font-size: x-large;
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
    {href: "https://graph.oceanics.io", external: true, label: "API"},
    {to: "/catalog", label: "Catalog"},
    {to: "/map", label: "Map"},
    {to: "/oceanside", label: "Game"},
    {to: "/tags", label: "Tags"},
    {to: "/legal", label: "Legal"}
];


export default ({ children }) => {

    return (
        <StyledLayout>
            <StyledSiteTitle to="/">
                {"Oceanicsdotio"}
            </StyledSiteTitle> 
            <StyledNavBar>
                {links.map(({
                    label, 
                    external=false, 
                    ...props
                }) => 
                    <StyledListItem key={label}>
                        {
                            external ? 
                            <a {...props}>{label}</a> : 
                            <Link {...props}>{label}</Link>
                        }
                    </StyledListItem>
                )}
                <Login />
            </StyledNavBar>
            <main>
                <MDXProvider components={shortcodes}>
                    {children}
                </MDXProvider>
            </main>
            <footer>
                <hr/>
                <p>
                    {`Copyleft 2018-${new Date().getFullYear()}. `}
                    {`No rights reserved. `}
                </p>
            </footer>
        </StyledLayout>
    )
};