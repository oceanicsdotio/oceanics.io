import React from "react"
import { Link, graphql } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"
// import init, {panic_hook} from "../utils/space.js";
// import {DataStreamLoop} from "../utils/stream.js";
// import {Particles, CursorLoop} from "../utils/agent.js";
// import {RenderingContext, LagrangianParticles} from '../utils/cadet.js';
// import {TriangularMeshLoop, RectilinearGridLoop, PixelData, HexagonalGrid} from "../utils/tessellate.js";


export default class extends React.Component {

    render(props) {
        const { data } = this.props;
        const siteTitle = data.site.siteMetadata.title;
       
        return (
            <Layout location={this.props.location} title={siteTitle}>
                <SEO title={"Demo"} />
                <h1>Placeholder</h1>
            </Layout>
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


