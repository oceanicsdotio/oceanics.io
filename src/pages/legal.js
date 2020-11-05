import React from "react";
import { graphql } from "gatsby";
import Layout from "../components/Layout";
import SEO from "../components/SEO";

export default ({
    location, 
    data: {
        site: {
            siteMetadata: {title}
        }
    }
}) => {

    return (
        <Layout location={location} title={title}>
            <SEO title={"Legal"} />
            <h1>Legal</h1>
            <hr />

            <h2>Privacy</h2>
            
            <h3>Data we collect</h3>

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


            <h3>Uses of your data</h3>

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

            <h3>Your rights</h3>
            <p>
            All users can see, edit, or delete their personal information at any time.
            If you have an account on this site you can request to export data we hold about you,
            including data you have provided to us. You can also request we erase personal data we hold about you.
            </p>

            <h3>How we protect data</h3>

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
            <hr/>
            <h2>Code of Conduct</h2>
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
            <hr/>
            <h2>Accessibility</h2>
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
};


export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
    }
`
