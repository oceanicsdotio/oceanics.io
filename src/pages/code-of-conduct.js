import React from "react"
import { graphql } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"

class NotFoundPage extends React.Component {
  render() {
    const { data } = this.props
    const siteTitle = data.site.siteMetadata.title

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title={"Code of conduct"}/>
        <h1>Code of conduct</h1>
        <hr/>

        <h2>Public works</h2>
        <p>
          Adapted from <a>https://github.com/codeforamerica/codeofconduct</a>
        </p>

        <p>
          We value full expression of identity, and diversity in ideas, skills, and contributions regardless of
          technical or domain knowledge. Members and participants are encouraged to invite questions,
          listen as much as they speak, and adopt a “yes/and” over a “no/but” mentality.
        </p>

        <p>
          We provide an environment free from discrimination or harassment.
          We’ll engage an external mediator if there is disagreement in what constitutes harassment.
          If you or someone else are harassed in-person or online, contact a project member,
          and we will take action to resolve the situation safely. If you cannot reach a mediator,
          you should remove yourself from the situation or notify an appropriate emergency response agency.
        </p>

        <h2>Practice accessibility</h2>
        <p>
          It is our explicit goal to make data and tools more Accessible.
          This is not an end state, but an intentional development process.
          That takes work and cooperation, so we welcome all feedback from users.
        </p>
        <p>
          Web services conform to or derive from Open Geospatial Consortium (OGC) and OSGeo standards.
        </p>
        <p>
          Environmental data are available in industry- and web-standard formats including NetCDF, WaterML,
          GeoJSON, PNG and GeoTIFF.
        </p>
        <p>
          Analyses and products follow a standardized but flexible structure for doing and sharing data science work.
        </p>
        <p>
          We use modern practices and tools for collaborative development.
        </p>
        <p>
          Raw data from sensors, satellites and models are backed-up in a redundant data lake.
        </p>
        <p>
          Derived data are staged in databases for ready use in web services.
        </p>
        <p>
          Data are published along with documentation of the methodology,
          and trained models made available through algorithm marketplaces.
        </p>
        <p>
          Proprietary and provisional data are not be accessible to other users,
          and are not be archived beyond the term of the project.
        </p>
        <p>
          Aggregated data products based on proprietary data are made public.
          There is no “exclusive or validation” period for data—publishing is an ongoing and active process central to the project.
        </p>
        <p>
          All documentation is publicly available without requiring a sign up.
        </p>
        <p>
          Information is conveyed in both visual and written forms.
        </p>

      </Layout>
    )
  }
}

export default NotFoundPage

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
    }
`
