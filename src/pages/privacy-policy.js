import React from "react"
import { graphql } from "gatsby"

import Layout from "../components/Layout"
import SEO from "../components/seo"

class PrivacyPolicy extends React.Component {
  render() {
    const { data } = this.props
    const siteTitle = data.site.siteMetadata.title

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title={"Privacy policy"}/>

        <h1>Privacy policy</h1>
        <hr/>

        <h2>Data we collect</h2>

        <p>
          Our website address is <a>https://www.oceanics.io</a>. When you visit our site,
          your IP address and browser user agent string may be collected.
          We do not run screen or navigation tracking, but we do retain all requests made to our APIs.
          This is also true of all subdomains, including <a>https://graph.oceanics.io</a>.
        </p>

        <p>
          If you have an account and log in, we set a temporary cookie to determine if your browser accepts cookies.
          This contains no personal data and is discarded when you close your browser.
          We save your login information for two days and your screen display choices for a year.
          If you log out, login cookies are removed.
        </p>

        <p>
          This site includes embedded content (e.g. videos, images) from other websites, which behaves
          as if you visit that website.
          These websites may collect data about you, use cookies,
          embed additional third-party tracking, and monitor your interaction with that embedded content.
        </p>


        <h2>Uses of your data</h2>

        <p>
          We do not share your data, nor use it for automated decision-making and/or profiling.
          We do generate anonymous metrics to guide research activity.
        </p>

        <p>
          Products generated through this project include training materials, open source code and software,
          derived data sets, trained models, simulation results, and primary sensor observations.
        </p>
        <p>
          Depending on uses of infrastructure by industry partners, proprietary or business data may be exposed to risk.
          If improperly configured, the private networking and security between nodes could provide ingress for
          attacks into enterprise networks. Data could also be destroyed accidentally or maliciously.
        </p>

        <h2>Your rights</h2>
        <p>
          All users can see, edit, or delete their personal information at any time.
          If you have an account on this site you can request to export data we hold about you,
          including data you have provided to us. You can also request we erase personal data we hold about you.
        </p>

        <h2>How we protect data</h2>

        <p>
          We manage risk by implementing good security practices, and backing up critical assets and repositories.
          We take precautions in preserving privacy and confidentiality through controlled access, and strong
          authorization methods.
        </p>

        <p>
          Routes of network ingress and egress are monitored and logged.
          Nodes communicate over an encrypted virtual private network.
          Partner organizations and individuals have access to managed services through a limited interface,
          which does not directly access databases and servers.
        </p>

        <p>
          Physical security is maintained by placing devices in locked enclosures or spaces where appropriate.
          Networked systems are tracked in real-time and self-report anomalies in position and conditions.
        </p>

      </Layout>
    )
  }
}

export default PrivacyPolicy

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
    }
`
