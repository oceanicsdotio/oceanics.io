import { createGlobalStyle } from "styled-components";
import Typography from "typography";
import { ghost, orange } from "../palette";
const {rhythm} = new Typography({});

const GlobalStyle = createGlobalStyle`
    body {
        & * {
            box-sizing: border-box;
        }
        
        background: #000000;
        color: ${ghost};
        font-family: monospace;
        padding: ${rhythm(1.5)} ${rhythm(0.75)};
    }

    nav, main, footer {
        margin-left: auto;
        margin-right: auto;
        max-width: 65ch;
        display: block;
    }

    nav {
        & a {
            font-size: 2rem;
            color: ${orange};
            margin-left: 0;
            padding-left: 0;
            display: inline;
        }
    }

    main {
        height: auto;
        bottom: 0;
        padding-top: 1rem;
        padding-bottom: 1rem;
        border-radius: 1rem 1rem 0 0;
    }

    footer {
        margin-top: 2rem;
        text-align: justify;
    }
`;

export default GlobalStyle;