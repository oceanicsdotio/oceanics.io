import React from "react";
import { RedocStandalone } from 'redoc';
import styled from "styled-components";

import "../styles/redoc.css";

import { pink, green, orange, shadow, ghost, purple, red, yellow, slate, blue } from "../palette";

export const defaultTheme = {
    spacing: {
      unit: 5,
      sectionHorizontal: theme => theme.spacing.unit * 8,
      sectionVertical: theme => theme.spacing.unit * 8,
    },
    breakpoints: {
      xs: 0,
      small: '550px',
      medium: '900px',
      large: '1200px',
    },
    colors: {
      primary: {
        main: pink,
        light: ghost,
        dark: purple,
        contrastText: shadow,
      },
      success: {
        main: green,
        light: green,
        dark: green,
        contrastText: shadow,
      },
      error: {
        main: red,
        light: red,
        dark: red,
        contrastText: shadow,
      },
      warning: {
        main: orange,
        // light: ({ colors }) => lighten(colors.tonalOffset, colors.warning.main),
        // dark: ({ colors }) => darken(colors.tonalOffset, colors.warning.main),
        contrastText: shadow,
      },
      text: {
        primary: ghost,
        secondary: pink,
      },
      responses: {
        success: {
          color: green,
          backgroundColor: shadow,
        },
        error: {
          color: red,
          backgroundColor: shadow,
        },
        redirect: {
          color: orange,
          backgroundColor: shadow,
        },
        info: {
          color: '#87ceeb',
          backgroundColor: shadow,
        },
      },

      http: {
        get: green,
        post: orange,
        put: slate,
        options: yellow,
        patch: blue,
        delete: red,
        basic: pink,
        link: pink,
        head: purple,
      },
      navbar: {
        main: ghost,
        contrastText: pink,
      },
      footer: {
        main: ghost,
        contrastText: pink,
      },
    },
  
    menu: {
      backgroundColor: shadow,
      width: '260px',
    },

    tocPanel: {
      width: '100%',
    },
  
    typography: {
      fontSize: '1em',
      lineHeight: '1.5em',
      fontWeightRegular: '400',
      fontWeightBold: '600',
      fontWeightLight: '300',
      fontFamily: 'Arial, sans-serif',
      headings: {
        fontWeight: theme => theme.typography.fontWeightRegular,
      },
      heading1: {
        fontSize: '1.85714em',
        fontWeight: theme => theme.typography.fontWeightRegular,
        color: ghost,
        capitalize: true,
      },
      heading2: {
        fontSize: '1.57143em',
        fontWeight: theme => theme.typography.fontWeightRegular,
        color: ghost,
        capitalize: false,
      },
      heading3: {
        fontSize: '1.27em',
        fontWeight: theme => theme.typography.fontWeightRegular,
        color: ghost,
        capitalize: false,
      },
      rightPanelHeading: {},
      code: {
        fontSize: '1em',
        fontFamily: 'Courier, monospace',
        fontWeight: theme => theme.typography.fontWeightRegular,
        color: pink,
        backgroundColor: shadow,
        wrap: false
      },
      links: {
        color: pink,
        visited: pink,
        hover: pink,
      },
    },
    rightPanel: {
      backgroundColor: shadow,
      width: '50%',
      textColor: pink,
    },
    codeSample: {
      backgroundColor: shadow,
    },
    schema: {
      nestedBackground: shadow,
      linesColor: pink,
      defaultDetailsWidth: '85%',
      typeNameColor: pink,
      typeTitleColor: pink,
      requireLabelColor: pink,
      labelsTextSize: '1em',
      nestingSpacing: '1em',
      arrow: {
        size: '1em',
        color: pink,
      },
    },
    codeBlock: {
      backgroundColor: shadow,
      tokens: {},
    },
  };

const Spec = styled(RedocStandalone)`
    background-color: ${pink};
`;

export default () => {
    return <Spec 
        specUrl={"api.yml"}
        // options={{
        //     nativeScrollbars: true,
        //     theme: defaultTheme
        // }}
    />
}