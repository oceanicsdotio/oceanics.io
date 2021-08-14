/**
 * React and friends
 */
import React, { FC, useMemo } from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Color palette
 */
import { pink, ghost, orange } from "../../palette";

/**
 * Typesetting
 */
import { rhythm } from "../../typography";

/**
 * YAML parser
 */
import YAML from "yaml";

/**
 * The NavBar is a <nav> element that displays links or buttons
 * as a horizontal bar with the current choise styled
 * prominently.
 */
export const NavBar = styled.nav`

    display: block;
    justify-content: space-between;
    text-align: left;
    color: ${ghost};
    margin-bottom: 0.5rem;
    padding: 0;

    & > * {
        display: inline;
        margin: 0.5rem;
        text-decoration: none;
        font-family: inherit;
        font-size: inherit;
    }

    & > button {
        color: ${pink};
        background: none;
        border: none;
        cursor: pointer;
    }
`;

/**
 * Internal link
 */
const SiteLink = styled.a`
    color: ${({color})=>color};
    font-size: x-large;
`;

/** 
 * Internal link, emphasized
 */
export const Title = styled.a`
    font-size: 2.5em;
    color: ${orange};
    margin: 0;
    padding: 0;
`;

type LinkType = {
    label: string,
    href: string
}

export type LayoutType = {
    children: any;
    className?: string;
    expand: boolean;
}

type StaticDataType = {
    title: string;
    site: LinkType[];
    footer: {
        links: LinkType[];
    };
    policy: string;
}


import LayoutData from "js-yaml-loader!./Layout.yml";

    
export const Layout: FC<LayoutType> = ({ 
    children,
    className,
}) => {

    const {
        title,
        policy,
    }: StaticDataType = LayoutData;

    const _policy = useMemo(
        () => policy.split("\n").filter((x: string) => x), []
    );

    return <div className={className}>
        <NavBar>
            <Title href={"/"}>{title}</Title>  
        </NavBar>
        <main>{children}</main>
        <footer>
            {_policy.map((text: string, ii: number) => <p key={`text-${ii}`}>{text}</p>)}
        </footer>
    </div>
};

export const StyledLayout = styled(Layout)`
    margin-left: auto;
    margin-right: auto;
    max-width: ${({expand}: LayoutType)=>expand?"100%":"65ch"};
    padding: ${rhythm(1.5)} ${rhythm(0.75)};

    & > main {
        height: auto;
        bottom: 0;
        padding-top: 1rem;
        padding-bottom: 1rem;
        border-top: none;
        border-bottom: 0.1rem solid ${ghost};
        border-radius: 1rem 1rem 0 0;
    }

    & footer {
        margin-top: 2rem;

        & a {
            color: ${ghost};
            display: block;
            font-size: large;
        }

        & p {
            font-size: smaller;
        }
    }
`;

export default StyledLayout;
