import React from "react"
import { graphql } from "gatsby"

import SEO from "../components/seo"
import Canvas from "../components/Canvas"


export default class extends React.Component {

    render() {

        return (
            <>
                <SEO title={"Graphics Demo"} />
                <Canvas />
            </>
        )   
    }
}

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`


