import React, {useState, useEffect} from "react"
import PropTypes from "prop-types"

// Components
import { graphql } from "gatsby"
import Layout from "../components/layout"
import SEO from "../components/seo"
import { rhythm } from "../utils/typography"
import { prune } from "../utils/reticule"


const controls = [
  {
    title: "Zone of exclusion at boundary",
    type: "range",
    id: "padding",
    name: "padding",
    min:"0",
    max: "0.2",
    defaultValue: "0.0",
    step: "0.02"
  }, {
    title: "Radius of entities in pixels",
    type: "range",
    id: "radius",
    name: "radius",
    min: "4",
    max: "64",
    defaultValue: "16",
    step: "4"
  }, {
    title: "Fraction of velocity lost to boundary",
    type: "range",
    id: "bounce",
    name: "bounce",
    min: "0.0",
    max: "1.0",
    defaultValue: "0.9",
    step: "0.1"
  },{
    title: "Magnitude of torque applied by mouse events",
    type: "range",
    id: "control",
    name: "control",
    min: "0.0",
    max:"1.0",
    defaultValue: "0.001",
    step: "0.001"
  }, {
    title: "Alpha scale for z-dimension",
    type: "range",
    id: "fade",
    name: "fade",
    min: "0.0",
    max: "1.0",
    defaultValue: "0.1",
    step: "0.05"
  },{
    title: "Toggle frame blending",
    type: "checkbox",
    id: "streamline",
    name: "streamline"
  }
];



class ParticleIndex extends React.Component {

  background = "#cccccc"

  constructor(props) {
    super(props);
    const dim = 3;
    const n = 128;

    let particles = [];
    const pad = state.padding;

    for (let ii=0; ii<n; ii++) {

      particles.push({
        heading: [
          0.0,
          0.0,
          0.0
        ],
        coordinates: [
          dim > 0 ? uniform(pad, 1.0 - pad) : 0.5,
          dim > 1 ? uniform(pad, 1.0 - pad) : 0.5,
          dim > 2 ? uniform(pad, 1.0 - pad) : 0.5
        ],
        velocity: [
          0.0,
          0.0,
          0.0
        ],
        links: {}
      });
    }

    for (let ii=0; ii<n; ii++) {
      for (let jj=ii+1; jj<n; jj++) {
        particles[ii].links[jj] = {
          vec: [0.0, 0.0, 0.0], // vector between entities
          spring: {
            k: 0.002, // spring constant
            x: 0.0, // displacement
            v: 0.0, // relative velocity
            l: 0.25, // zero position
            stop: 0.2,
            p: 1 / Math.log(n),
          }
        };
        for (let kk=0; kk<3; kk++) {
          particles[ii].links[jj].vec[kk] = particles[ii].coordinates[kk] -
            particles[jj].coordinates[kk];
        }
      }
    }

    this.setState({
      particles: particleGroup,
      count: n,
      energy: {
        kinetic: 0.0,
        potential: 0.0
      },
      zero: 0.0, // performance.now(),
      cursor: [0, 0, 0],
      padding: 0.0,
      streamline: false,
      radius: 16,
      torque: 0.0,
      bounce: 0.0,
      depth: 100, // Math.min(canvas.width, canvas.height),
      control: 0.0,
      queuePrune: false,
      color: "#ff00ff",
      frames: 0,
      delta: {
        x: 0,
        y: 0,
        drag: 0.0,
        t: 0.0
      }
    });
  }


  uiSlider = (lever) => {
    const key = lever.name;
    return (
      <div className={"ui tools"}>
        <input {...lever}/>
        <label form={key}>{key}</label>
      </div>
    )
  }

  draw = () => {

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    ctx.lineWidth = 1;
    ctx.strokeStyle =  "#FFFFFF";
    ctx.font = "8px Arial";
    try {
      let series = [];
      let seriesMax = 0.0;
      controls.map(c => {
        const dom = document.getElementById(c.id);
        this.state[c.id] = isNaN(dom.valueAsNumber) ? dom.checked : dom.valueAsNumber;
      });

      if (!state.streamline) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.beginPath();
        ctx.globalAlpha = 1.0 / Math.log(n);
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = this.background;
        ctx.fill();
      }

      this.state.torque *= 0.5;
      this.state.energy = {
        kinetic: 0.0,
        potential: 0.0,
      };

      for (let ii=0; ii < n; ii++) {
        const [x, y, z] = this.state.particles[ii].coordinates;
        const scale = (1.0 - 0.9*z) * this.state.radius;
        ctx.globalAlpha = 1.0 / Math.log2(this.state.particles.length);


        for (let [jj, link] of Object.entries(this.state.particles[ii].links)) {
          if (Math.random() > link.spring.p * (Math.sqrt(2) - link.spring.x) / Math.sqrt(2)) {
            continue;
          }

          // Calculate spring forces and adjust velocity
          let spring = link.spring;
          const d = magnitude(link.vec);
          spring.v = d - spring.x;
          spring.x = Math.max(d, spring.stop);
          this.state.energy.potential += 0.5 * spring.k * spring.x * spring.x;

          const f = - 2.0 * Math.sqrt(spring.k) * spring.v - spring.k * (spring.x - spring.l);
          const s =  scale / this.state.particles[ii].links[jj].spring.x;

          link.vec = link.vec.map((k, index) => {
            const delta = k / d * f / this.state.particles.length;
            this.state.particles[ii].velocity[index] += delta;
            this.state.particles[jj].velocity[index] -= delta;
            return this.state.particles[ii].coordinates[index] -
              this.state.particles[jj].coordinates[index];
          });

          // Links
          const [ax, ay] = [
            x * canvas.width - link.vec[0] * s,
            y * canvas.height - link.vec[1] * s
          ];

          const [bx, by, bz] = [
            this.state.particles[jj].coordinates[0] * canvas.width + link.vec[0] * s,
            this.state.particles[jj].coordinates[1] * canvas.height + link.vec[1] * s,
            this.state.particles[jj].coordinates[2] * this.state.depth + link.vec[2] * s
          ];

          ctx.strokeStyle = (() => {
            const grad = ctx.createLinearGradient(ax, ay, bx, by);
            grad.addColorStop(0, rgba(f, z, this.state.fade));
            grad.addColorStop(1, rgba(f, bz, this.state.fade));
            return grad;
          })();

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        ctx.globalAlpha = (1.0 - this.state.fade*z)**2;
        ctx.fillStyle = ctx.strokeStyle = "#FFFFFF";

        // Draw entity
        ctx.beginPath();
        ctx.arc(
          x * canvas.width,
          y * canvas.height,
          scale,
          0,
          Math.PI*2,
          true
        );
        ctx.stroke();

        // Draw heading
        ctx.beginPath();
        ctx.moveTo(
          this.state.particles[ii].coordinates[0] * canvas.width,
          this.state.particles[ii].coordinates[1] * canvas.height
        );
        ctx.lineTo(
          this.state.particles[ii].coordinates[0] * canvas.width + this.state.particles[ii].heading[0] * scale,
          this.state.particles[ii].coordinates[1] * canvas.height + this.state.particles[ii].heading[1] * scale
        );
        ctx.stroke();

        // Update positions
        let speed = magnitude(this.state.particles[ii].velocity);
        const {pad, bounce} = this.state;

        this.state.energy.kinetic += 0.5*speed*speed;

        this.state.particles[ii].coordinates = this.state.particles[ii].coordinates.map((x, kk) => {
          this.state.particles[ii].velocity[kk] += this.state.cursor[kk] * this.state.torque * (0.5 - z);
          x += this.state.particles[ii].velocity[kk];
          if (x > 1.0 - pad) {
            x -= 2*(x - 1.0 - pad);
            this.state.particles[ii].velocity[kk] *= -bounce;
          } else if (x < pad) {
            x -= 2*(x - pad);
            this.state.particles[ii].velocity[kk] *= -bounce;
          }
          this.state.particles[ii].heading[kk] = speed > 0.00001 ? this.state.particles[ii].velocity[kk] / speed : this.state.particles[ii].heading[kk];
          return x
        });

      }

      if (this.state.queuePrune) {
        prune(this.state.particles, this.state.particles.length-1);
        this.state.queuePrune = false;
        n -= 1;
        if (n === 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
      }

      let energy = this.state.energy.potential + this.state.energy.kinetic;
      seriesMax = Math.max(energy, seriesMax);
      series.push(energy);
      if (series.length > canvas.width) {
        series.shift();
      }
      if (series.length > 1) {

        ctx.strokeStyle = "#ff00ff";
        ctx.beginPath();
        ctx.moveTo(series.length-11, canvas.height - canvas.height*series[series.length-11]/seriesMax);
        for (let ii=series.length-10; ii<series.length; ii++) {
          ctx.lineTo(ii, canvas.height - canvas.height*series[ii]/seriesMax);
        }
        ctx.stroke();
      }

      this.state.frames += 1;
      ctx.font = "20px Arial";
      const fps = Math.floor(this.state.frames / 0.001 / (performance.now()-this.state.zero));
      ctx.fillText(fps+" fps", 0, 20);
    } catch (e) {

    }
    window.requestAnimationFrame(this.draw);
  }

  componentDidMount() {
    const canvas = document.getElementById('canvas');
    const { cursor, control } = this.state;
    canvas.addEventListener('mousedown', evt => {
      let tu = evt.clientX/canvas.width - 0.5;
      let tv = evt.clientY/canvas.height - 0.5;
      this.setState({
        cursor: [tu, tv, 0.0],
        torque: magnitude(cursor) * control
      })
      console.log("Mousedown");
    });
    window.requestAnimationFrame(this.draw);
  }

  render() {
    const { data } = this.props
    const siteTitle = data.site.siteMetadata.title

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title="Particles" />
        <article>
          <header>
            <h1 style={{marginTop: rhythm(1), marginBottom: 0, }}>
              {"Particles"}
            </h1>
          </header>

          <canvas id={"canvas"}>HTML 5 Canvas</canvas>
          <div>
            <p>{"Reactor settings:"}</p>
            {controls.map(this.uiSlider)}
          </div>

          <hr style={{ marginBottom: rhythm(1), }} />

          <footer />
        </article>
      </Layout>
    )
  }
}

ParticleIndex.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }),
    }),
  }),
}

export default ParticleIndex

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
    }
`