/**
 * React and friends
 */
import React, { FC } from "react";
import styled from "styled-components";

/**
 * Color palette and typesetting
 */
import { pink, ghost, orange } from "../../palette";
import { rhythm } from "../../typography";

// import PageData from "./PageData.json";
import GlobalStyle from "./GlobalStyle";

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
 * Internal link, emphasized
 */
export const Title = styled.a`
    font-size: 2.5em;
    color: ${orange};
    margin: 0;
    padding: 0;
`;

export interface ILayout {
    children: any;
    className?: string;
    expand: boolean;
    title: string;
    policy: string;
    HeadComponent: FC;
    description: string;
    site: {
        title: string;
    }
}
    

export const Layout: FC<ILayout> = ({ 
    children,
    className,
    title,
    description,
    site,
    policy,
    HeadComponent
}) => {
    return <div className={className}>
        <GlobalStyle />
        <HeadComponent>
             <title>{`${title} | ${site.title}`}</title>
             <meta name="description" content={description} />
             <meta property="og:type" content="website" />
             <meta property="og:title" content={title} />
             <meta property="og:description" content={description} />
             <meta property="og:site_name" content={site.title} />
             <meta property="twitter:card" content="summary" />
             <meta property="twitter:title" content={title} />
             <meta property="twitter:description" content={description} />
         </HeadComponent>
        <NavBar>
            <Title href={"/"}>{title}</Title>  
        </NavBar>
        <main>
            {children}</main>
        <footer>
            {policy.split("\n").filter((x: string) => x).map((text: string) => <p key={text}>{text}</p>)}
        </footer>
    </div>
};

export const StyledLayout = styled(Layout)`
    margin-left: auto;
    margin-right: auto;
    max-width: ${({expand})=>expand?"100%":"65ch"};
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
