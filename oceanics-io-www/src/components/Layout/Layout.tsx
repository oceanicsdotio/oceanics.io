import React from "react";
import styled from "styled-components";
import Typography from "typography";

/**
 * Color palette and typesetting
 */
import { pink, ghost, orange } from "../../palette";

import PageData from "./PageData.json";
import GlobalStyle from "./GlobalStyle";

const {rhythm} = new Typography({});

/**
 * The NavBar is a <nav> element that displays links or buttons
 * as a horizontal bar with the current choice styled
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
 * Internal link, emphasized
 */
export const Title = styled.a`
    font-size: 2.5em;
    color: ${orange};
    margin: 0;
    padding: 0;
`;

export interface ILayout {
    className?: string,
    title: string,
    HeadComponent: Element,
    description: string,
    children: JSX.Element,
}

export const Layout = ({ 
    children,
    className,
    title,
    description,
    HeadComponent
}: ILayout) => {
    
    return <div className={className}>
        <GlobalStyle />
        <HeadComponent>
             <title>{`${PageData.title} | ${title}`}</title>
             <meta name="description" content={description} />
         </HeadComponent>
        <NavBar>
            <Title href={"/"}>{title}</Title>  
        </NavBar>
        <main>
            {children}
        </main>
        <footer>
            {PageData.policy.split("\n").filter((x: string) => x).map((text: string) => <p key={text}>{text}</p>)}
        </footer>
    </div>
};

export const StyledLayout = styled(Layout)`
    margin-left: auto;
    margin-right: auto;
    max-width: 65ch;
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

    & > footer {
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
