import React, {useState, useEffect} from "react"
import PropTypes from "prop-types"

// Components
import { Helmet } from "react-helmet"
import { Link, graphql } from "gatsby"
let n = 128;

const magnitude = (vec) => {
  return Math.sqrt(
    vec.map(x => x*x).reduce((a, b) => a+b, 0.0)
  )
};

const uniform = (a, b) => {
  return Math.random() * (b - a) + a;
};

const spring = (n) => {
  return {
    k: 0.002, // spring constant
    x: 0.0, // displacement
    v: 0.0, // relative velocity
    l: 0.25, // zero position
    stop: 0.2,
    p: 1 / Math.log(n),
  }
};


const rgba = (x, z, fade) => {
  const color = x > 0.0 ? "255, 0, 0" : "0, 0, 255";
  const alpha = 1.0 - fade * z;
  return "rgba("+color+", "+alpha+")";
};

const prune = (group, ind) => {
  delete group[ind];
  for (let v of Object.values(group)) {
    delete v.links[ind]
  }
};

const extend = (group, ind) => {
  delete group[ind];
  for (let v of Object.values(group)) {
    delete v.links[ind]
  }
};


const group = (n, dim, pad, distribution=uniform) => {
  /*
  Create group of spatially-explicit entities connected by critically-damped springs
   */
  let e = [];
  for (let ii=0; ii<n; ii++) {

    e.push({
      heading: [
        0.0,
        0.0,
        0.0
      ],
      coordinates: [
        dim > 0 ? distribution(pad, 1.0 - pad) : 0.5,
        dim > 1 ? distribution(pad, 1.0 - pad) : 0.5,
        dim > 2 ? distribution(pad, 1.0 - pad) : 0.5
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
      e[ii].links[jj] = {
        vec: [0.0, 0.0, 0.0], // vector between entities
        spring: spring(n)
      };
      for (let kk=0; kk<3; kk++) {
        e[ii].links[jj].vec[kk] = e[ii].coordinates[kk] - e[jj].coordinates[kk];
      }
    }
  }
  return e;
};

//
// Array.from(document.getElementsByClassName("target"))
//   .forEach(function(element) {
//     element.addEventListener('mouseenter', () => {
//       if (!state.target.id || !state.target.active || state.target.id !== element.id) {
//         const rect = element.getBoundingClientRect();
//         state.target = {
//           active: true,
//           x: rect.x + rect.width / 2.0,
//           y: rect.y + rect.height / 2.0,
//           id: element.id
//         };
//         state.delta.x = 0.0;
//         state.delta.y = 0.0;
//         state.reticule.x = state.target.x;
//         state.reticule.y = state.target.y;
//       }
//
//     });
//   });

//
// addEventListener('mousedown', e => {
//   state.dragging = true;
//   state.delta.drag = 0.0;
//   state.zero = performance.now();
// });
//
// addEventListener('mouseup', e => {
//   state.dragging = false;
//   // console.log(performance.now() - state.zero);
//   if (performance.now() - state.zero < 400) {
//     state.depth = (state.depth + 1) % 3;
//     console.log("Depth", state.depth)
//   }
// });
//
// addEventListener('mousemove', e => {
//   let tu = e.clientX;
//   let tv =  e.clientY;
//   if (state.target.active) {
//     state.delta.x = state.cursor.u - state.reticule.x;
//     state.delta.y = state.cursor.v - state.reticule.y;
//     if (!state.dragging && Math.sqrt(state.delta.x * state.delta.x + state.delta.y * state.delta.y) > 48) {
//       state.target.active = false;
//     }
//   } else {
//     state.delta.drag += (tu - state.cursor.u);
//
//   }
//   state.cursor.u = tu;
//   state.cursor.v = tv;
//
// });

const ring = (ctx, radius) => {
  ctx.beginPath();
  ctx.arc(0,0, radius,0,Math.PI*2,true);
  ctx.stroke();
};

const ticks = (ctx, theta, n, a, b, indicator = 0) => {
  ctx.save();
  ctx.rotate(theta);
  for (let i=0; i<n; i++){
    ctx.beginPath();
    ctx.rotate(2*Math.PI / n);
    ctx.moveTo(a,0);
    ctx.lineTo((i === 0 ? b + indicator : b),0);
    ctx.stroke();
  }
  ctx.restore();
};

const keyring = (ctx, a, b, n) => {
  ctx.save();
  for (let i=0; i<n; i++){
    ctx.rotate(2*Math.PI / n);
    ctx.beginPath();
    ctx.arc(a,0, b,0,Math.PI*2,true);
    ctx.stroke();
  }
  ctx.restore();
};
//
// const cursor = () => {
//   const size = 128;
//   const canvas = document.createElement('canvas');
//   canvas.width = canvas.height = size;
//   const ctx = canvas.getContext('2d');
//   let time = performance.now() | 0.0;
//
//   ctx.clearRect(0,0, size, size);
//   ctx.translate(size / 2,size / 2);
//   ctx.scale(0.4,0.4);
//
//   ctx.lineWidth = 5;
//   ctx.lineCap = "round";
//
//   // Outer ring
//   ctx.strokeStyle = "#FF00FF77";
//   ring(ctx, size);
//   ticks(ctx, state.dragging ? state.delta.drag*0.005 : 0.0, 16, size-16, size-3);
//
//   // Inner ghost
//   ctx.strokeStyle =  state.dragging ? "#FFFFFF55" : "#FF00FF55";
//   ring(ctx, 32);
//
//   // Needle indicators
//   if (state.target.active) {
//     state.delta.x = state.cursor.u - state.reticule.x;
//     state.delta.y = state.cursor.v - state.reticule.y;
//     ctx.translate(-2.5*state.delta.x, -2.5*state.delta.y);
//
//     // Tasking capabilities
//     keyring(ctx, 80, 32, 6);
//
//   } else {
//     state.delta.x = state.cursor.u - state.reticule.x;
//     state.delta.y = state.cursor.v - state.reticule.y;
//     state.reticule.x += state.delta.x * 0.05;
//     state.reticule.y += state.delta.y * 0.05;
//     ctx.translate(-state.delta.x, -state.delta.y);
//   }
//
//   ctx.strokeStyle =  state.dragging ? "#FFFFFF77" : "#FF00FF77";
//   ring(ctx, 32);
//   ticks(ctx, time/-3000, 4, 32+3, 48, 16);
//
//   document.documentElement.style.cursor = 'url(' + canvas.toDataURL() + ') 64 64, auto';
// };



let state = {
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
  dragging: false,
  // cursor: {x: 0, y: 0},
  reticule: {x: 0, y: 0},
  delta: {
    x: 0,
    y: 0,
    drag: 0.0,
    t: 0.0
  },
  target: {
    active: false,
    x: null,
    y: null,
    id: null
  }
};

let particleGroup = group(n, 3, state.padding);
//
// canvas.addEventListener('mousedown', evt => {
//   let tu = evt.clientX/canvas.width - 0.5;
//   let tv = evt.clientY/canvas.height - 0.5;
//   state.cursor = [tu, tv, 0.0];
//   state.torque = magnitude(state.cursor) * state.control;
//   // state.queuePrune = true;
// });


const encode = (ctx, x, dx) => {
  const n = Math.ceil(Math.sqrt(x.length)) || 16;
  let imageData = ctx.createImageData(n, n);
  let data = imageData.data;
  for (let ii = 0; ii < n*n*4; ii += 4) {
    data[ii] = 255;
    data[ii+1] = 0;
    data[ii+2] = 0;
    data[ii+3] = 255;
  }
  return imageData
};


const ParticlesPage = ({
                    data: {
                      site: {
                        siteMetadata: { title },
                      },
                    },
                  }) => {


  const controls = ["radius", "padding", "bounce", "control", "streamline", "fade"];
  const background = "#cccccc"

  const render = () => {

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    ctx.lineWidth = 1;
    ctx.strokeStyle =  "#FFFFFF";
    ctx.font = "8px Arial";
    try {
      let series = [];
      let seriesMax = 0.0;
      controls.map(c => {
        const dom = document.getElementById(c);
        state[c] = isNaN(dom.valueAsNumber) ? dom.checked : dom.valueAsNumber;
      });

      if (!state.streamline) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.beginPath();
        ctx.globalAlpha = 1.0 / Math.log(n);
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = background;
        ctx.fill();
      }

      state.torque *= 0.5;
      state.energy = {
        kinetic: 0.0,
        potential: 0.0,
      };

      for (let ii=0; ii < n; ii++) {
        const [x, y, z] = particleGroup[ii].coordinates;
        const scale = (1.0 - 0.9*z) * state.radius;
        ctx.globalAlpha = 1.0 / Math.log2(particleGroup.length);


        for (let [jj, link] of Object.entries(particleGroup[ii].links)) {
          if (Math.random() > link.spring.p * (Math.sqrt(2) - link.spring.x) / Math.sqrt(2)) {
            continue;
          }

          // Calculate spring forces and adjust velocity
          let spring = link.spring;
          const d = magnitude(link.vec);
          spring.v = d - spring.x;
          spring.x = Math.max(d, spring.stop);
          state.energy.potential += 0.5 * spring.k * spring.x * spring.x;

          const f = - 2.0 * Math.sqrt(spring.k) * spring.v - spring.k * (spring.x - spring.l);
          const s =  scale / particleGroup[ii].links[jj].spring.x;

          link.vec = link.vec.map((k, index) => {
            const delta = k / d * f / particleGroup.length;
            particleGroup[ii].velocity[index] += delta;
            particleGroup[jj].velocity[index] -= delta;
            return particleGroup[ii].coordinates[index] - particleGroup[jj].coordinates[index];
          });

          // Links
          const [ax, ay] = [
            x * canvas.width - link.vec[0] * s,
            y * canvas.height - link.vec[1] * s
          ];

          const [bx, by, bz] = [
            particleGroup[jj].coordinates[0] * canvas.width + link.vec[0] * s,
            particleGroup[jj].coordinates[1] * canvas.height + link.vec[1] * s,
            particleGroup[jj].coordinates[2] * state.depth + link.vec[2] * s
          ];

          ctx.strokeStyle = (() => {
            const grad = ctx.createLinearGradient(ax, ay, bx, by);
            grad.addColorStop(0, rgba(f, z, state.fade));
            grad.addColorStop(1, rgba(f, bz, state.fade));
            return grad;
          })();

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        ctx.globalAlpha = (1.0 - state.fade*z)**2;
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
          particleGroup[ii].coordinates[0] * canvas.width,
          particleGroup[ii].coordinates[1] * canvas.height
        );
        ctx.lineTo(
          particleGroup[ii].coordinates[0] * canvas.width + particleGroup[ii].heading[0] * scale,
          particleGroup[ii].coordinates[1] * canvas.height + particleGroup[ii].heading[1] * scale
        );
        ctx.stroke();

        // Update positions
        let speed = magnitude(particleGroup[ii].velocity);
        state.energy.kinetic += 0.5*speed*speed;

        particleGroup[ii].coordinates = particleGroup[ii].coordinates.map((x, kk) => {
          particleGroup[ii].velocity[kk] += state.cursor[kk] * state.torque * (0.5 - z);
          x += particleGroup[ii].velocity[kk];
          if (x > 1.0 - state.padding) {
            x -= 2*(x - 1.0 - state.padding);
            particleGroup[ii].velocity[kk] *= -state.bounce;
          } else if (x < state.padding) {
            x -= 2*(x - state.padding);
            particleGroup[ii].velocity[kk] *= -state.bounce;
          }
          particleGroup[ii].heading[kk] = speed > 0.00001 ? particleGroup[ii].velocity[kk] / speed : particleGroup[ii].heading[kk];
          return x
        });

      }

      if (state.queuePrune) {
        prune(particleGroup, particleGroup.length-1);
        state.queuePrune = false;
        n -= 1;
        if (n === 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
      }

      let energy = state.energy.potential + state.energy.kinetic;
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

      state.frames += 1;
      ctx.font = "20px Arial";
      const fps = Math.floor(state.frames / 0.001 / (performance.now()-state.zero));
      ctx.fillText(fps+" fps", 0, 20);
    } catch (e) {

    }
    // cursor();
    window.requestAnimationFrame(render);
  };

  return(
  <div>
    <Helmet title={title} />
    <div>
      <h1>Particles</h1>

      <canvas id="canvas" height={300} width={300}>WebGl</canvas>

      <p>Reactor settings:</p>

      <div className="ui tools">
        <input title="Zone of exclusion at boundary" type="range" id="padding" name="padding" min="0" max="0.2" step="0.02"/>
        <label form={"padding"}>{"Padding"}</label>
      </div>

      <div className="ui tools">
        <input title="Radius of entities in pixels"
               type="range" id="radius" name="radius" min="4" max="64" value="16" step="4"/>
          <label form={"radius"}>{"Radius"}</label>
      </div>

      <div className="ui tools">
        <input title="Fraction of velocity lost to boundary"
               type="range" id="bounce" name="bounce" min="0.0" max="1.0" value="0.9" step="0.1"/>
          <label form={"bounce"}>{"Bounce"}</label>
      </div>

      <div className="ui tools">
        <input title="Magnitude of torque applied by mouse events"
               type="range" id="control" name="control" min="0.0" max="1.0" value="0.001" step="0.001"/>
          <label form={"control"}>{"Control"}</label>
      </div>

      <div className="ui tools">
        <input title="Alpha scale for z-dimension"
               type="range" id="fade" name="fade" min="0.0" max="1.0" value="0.1" step="0.05"/>
          <label form={"fade"}>{"Fade"}</label>
      </div>

      <div className="ui tools">
        <input title="Toggle frame blending"
               type="checkbox" id="streamline" name="streamline"/>
          <label form={"streamline"}>{"Streamline"}</label>
      </div>
    </div>
    {
      window.requestAnimationFrame(render)
    }
  </div>
)};

ParticlesPage.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
      }),
    }),
  }),
}

export default ParticlesPage

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
    }
`