import React from "react"
import { Link, graphql } from "gatsby"
import mapboxgl from 'mapbox-gl';
import Layout from "../components/layout"
import SEO from "../components/seo"


mapboxgl.accessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';

class Map extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      lng: 5,
      lat: 34,
      zoom: 2
    };
  }

  componentDidMount() {

    const map = new mapboxgl.Map({
      container: this.mapContainer,
      style: {
        "version": 8,
        "name": "Dark",
        "sources": {
          "mapbox": {
            "type": "vector",
            "url": "mapbox://mapbox.mapbox-streets-v8"
          }
        },
        "sprite": "mapbox://sprites/mapbox/dark-v10",
        "glyphs": "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
        "layers": [
          {
            "id": "background",
            "type": "background",
            "paint": {"background-color": "#222"}
          }, {
            "id": "water",
            "source": "mapbox",
            "source-layer": "water",
            "type": "fill-extrusion",
            "paint": {
              "fill-extrusion-color": "#050707",
              "fill-extrusion-height": 50.0,
              "fill-extrusion-base": 0.0
            }
          }, {
            "id": "cities",
            "source": "mapbox",
            "source-layer": "place_label",
            "type": "symbol",
            "layout": {
              "text-field": "{name_en}",
              "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                4, 9,
                6, 12
              ]
            },
            "paint": {
              "text-color": "#969696",
              "text-halo-width": 2,
              "text-halo-color": "rgba(0, 0, 0, 0.85)"
            }
          }
        ]
      },
      center: [this.state.lng, this.state.lat],
      zoom: this.state.zoom
    });

    map.on('move', () => {
      this.setState({
        lng: map.getCenter().lng.toFixed(4),
        lat: map.getCenter().lat.toFixed(4),
        zoom: map.getZoom().toFixed(2)
      });
    });
  }

  render() {
    const { data } = this.props;
    const siteTitle = data.site.siteMetadata.title;
    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title="Discover data" />
        <div>
          <div ref={el => this.mapContainer = el} className='mapContainer' />
        </div>
      </Layout>
    )
  }
}

export default Map

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
    }
`