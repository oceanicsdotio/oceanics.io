import React from "react";
import { RedocStandalone } from 'redoc';

import { pink, green, orange, shadow, ghost, purple, red } from "../palette";

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
      brand: {
        success: '#e6eef8',
        warning: '#fcf9e9',
        danger: '#fce9ed',
        attention: '#ebfbe9',
      },
      responses: {
        success: {
          color: theme => theme.colors.success.main,
          backgroundColor: shadow,
        },
        error: {
          color: theme => theme.colors.error.main,
          backgroundColor: shadow,
        },
        redirect: {
          color: '#ffa500',
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
        put: '#9b708b',
        options: '#d3ca12',
        patch: '#e09d43',
        delete: '#e27a7a',
        basic: '#999',
        link: pink,
        head: '#c167e4',
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
      width: '240px',
    },
  
    typography: {
      fontSize: '14px',
      lineHeight: '1.5em',
      fontWeightRegular: '400',
      fontWeightBold: '600',
      fontWeightLight: '300',
      fontFamily: 'Roboto, sans-serif',
      headings: {
        fontFamily: theme => theme.typography.fontFamily,
        fontWeight: '600',
      },
      heading1: {
        fontSize: '1.85714em',
        fontWeight: '600',
        fontFamily: theme => theme.typography.fontFamily,
        lineHeight: theme => theme.typography.lineHeight,
        color: theme => theme.colors.primary.main,
        capitalize: true,
      },
      heading2: {
        fontSize: '1.57143em',
        fontWeight: '600',
        color: theme => theme.colors.text.primary,
        fontFamily: theme => theme.typography.fontFamily,
        lineHeight: theme => theme.typography.lineHeight,
        capitalize: false,
      },
      heading3: {
        fontSize: '1.27em',
        fontWeight: '600',
        color: theme => theme.colors.text.primary,
        fontFamily: theme => theme.typography.fontFamily,
        lineHeight: theme => theme.typography.lineHeight,
        capitalize: false,
      },
      rightPanelHeading: {},
      code: {
        fontSize: '14px',
        fontFamily: 'Courier, monospace',
        fontWeight: theme => theme.typography.fontWeightRegular,
        color: '#e53935',
        backgroundColor: 'rgba(38, 50, 56, 0.04)',
        wrap: false,
      },
      links: {
        color: theme => theme.colors.primary.main,
        visited: theme => theme.typography.links.color,
        // hover: ({ typography }) => lighten(0.2, typography.links.color),
      },
    },
    rightPanel: {
      backgroundColor: shadow,
      width: '40%',
      textColor: ghost,
    },
    codeSample: {
      backgroundColor: "#000",
    },
    schema: {
      nestedBackground: '#fafafa',
      linesColor: '#cc0',
      defaultDetailsWidth: '75%',
      typeNameColor: theme => theme.colors.text.secondary,
      typeTitleColor: theme => theme.schema.typeNameColor,
      requireLabelColor: theme => theme.colors.error.main,
      labelsTextSize: '0.9em',
      nestingSpacing: '1em',
      arrow: {
        size: '1.1em',
        color: theme => theme.colors.text.secondary,
      },
    },
    codeBlock: {
      backgroundColor: '#000',
      tokens: {},
    },
  };

export default () => {
    return <RedocStandalone 
        specUrl={"api.yml"}
        options={{
            nativeScrollbars: true,
            theme: defaultTheme
        }}
    />
}