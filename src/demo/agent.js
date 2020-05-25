import {draw_caption, draw_fps, Cursor, clear_rect_blending, Spring, Agent} from "./space.js";
import {magnitude, rgba, uniform} from "./cadet.js";

//
// const addMouseEvents = (e) => {
//
//
//     const mouse_events = (elementId, type="mousemove") => {
//         let canvas = document.getElementById(elementId);
//         canvas.addEventListener(type,  (event) => {
//             const extent = canvas.getBoundingClientRect();
//             mouse_move(event.clientX, event.clientY)
//         });
//     };
//
//
//     addEventListener('mousedown', e => {
//         state.dragging = true;
//         state.delta.drag = 0.0;
//         state.zero = performance.now();
//     });
//
//     addEventListener('mouseup', e => {
//         state.dragging = false;
//         // console.log(performance.now() - state.zero);
//         if (performance.now() - state.zero < 400) {
//             state.depth = (state.depth + 1) % 3;
//             console.log("Depth", state.depth)
//         }
//     });
//

//
//
//     const drag = (text) => {
//
//         let div = document.createElement("div");
//         div.className = "card";
//         let handle = document.createElement("div");
//         handle.className = "cardheader";
//
//         let pos1 = div.style.left;
//         let pos2 = div.style.top;
//         let pos3 = 0;
//         let pos4 = 0;
//
//         handle.onmousedown = (e) => {
//             pos3 = e.clientX;
//             pos4 = e.clientY;
//             document.onmouseup = () => {
//                 // stop moving when mouse button is released:
//                 document.onmouseup = null;
//                 document.onmousemove = null;
//             };
//             document.onmousemove = (e) => {
//                 pos1 = pos3 - e.clientX;
//                 pos2 = pos4 - e.clientY;
//                 pos3 = e.clientX;
//                 pos4 = e.clientY;
//                 div.style.top = (div.offsetTop - pos2) + "px";
//                 div.style.left = (div.offsetLeft - pos1) + "px";
//             };
//         };
//
//         div.appendChild(handle);
//         let content = document.createElement("p");
//         content.textContent = text;
//         div.appendChild(content);
//         document.body.appendChild(div);
//     };
// };


export const CursorLoop = (props) => {
    /*
    Draw an animated reticule cursor using Rust/WebAssembly.
     */
    const {canvas, ctx, caption, font} = props;
    const {height, width} = canvas;

    let frames = 0;
    let state = {
        x: null,
        y: null,
        dx: 0.0,
        dy: 0.0,
        drag: false,
    };


    canvas.addEventListener('mousemove', e => {

        const rect = e.target.getBoundingClientRect();

        Object.assign(state, {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
    });


    const render = () => {
        const time = (performance.now() | 0.0) - props.start;
        //
        // Object.assign(state, {
        //     dx: state.dx += 0.1*(state.x - state.dx),
        //     dy: state.dy += 0.1*(state.y - state.dy)
        // });

        Cursor.draw(ctx, width, height, time, state.x, state.y, state.dx, state.dy, "#FF00FFCC");
        frames = draw_fps(ctx, frames, time, "#FFFFFFFF");
        draw_caption(ctx, caption, 0.0, height, "#CCCCCC", font);
        requestAnimationFrame(render);
    };
    render();
};


const Group = (n, dim, padding) => {

    let particles = [];
    for (let ii=0; ii<n; ii++) {
        particles.push({
            heading: [0.0, 0.0, 0.0],
            coordinates: "xyz".split('').map(
                d => dim.includes(d) ? uniform(padding, 1.0 - padding) : 0.5
            ),
            velocity: [0.0, 0.0, 0.0],
            links: {}
        })
    }

    particles.forEach((p, ii) => {
        for (let jj=ii+1; jj<n; jj++) {
            p.links[jj] = {
                vec: p.coordinates.map((x, dd) => x - particles[jj].coordinates[dd]),
                spring: new Spring(0.002, 0.0, 0.0, 0.25, 0.1, 1 / Math.log(n))
            };
        }
    });
    return particles;
};


export const Particles = (props) =>{

    const {canvas, ctx, dim, padding, n} = props;
    const shape = [canvas.width, canvas.height, 200];

    let state = {
        particles: Group(n, dim, padding),
        fade: 0.0,
        count: n,
        energy: {
            kinetic: 0.0,
            potential: 0.0
        },
        zero: 0.0, // performance.now(),
        cursor: [0, 0, 0],
        padding: padding,
        streamline: true,
        radius: 16,
        torque: 0.0,
        bounce: 0.2,
        depth: Math.min(canvas.width, canvas.height),
        control: 0.0,
        color: "#ff00ff",
        delta: {
            x: 0,
            y: 0,
            drag: 0.0,
            t: 0.0
        }
    };

    const clampPosition = (particle, speed, bounce, pad, torque) => {

        let {coordinates, heading, velocity} = particle;

        coordinates = coordinates.map((X, kk) => {
            velocity[kk] += torque[kk];
            X += velocity[kk];
            if (X > 1.0 - pad) {
                X -= 2*(X - 1.0 - pad);
                velocity[kk] *= -bounce;
            } else if (X < pad) {
                X -= 2*(X - pad);
                velocity[kk] *= -bounce;
            }
            heading[kk] = speed > 0.00001 ? velocity[kk] / speed : heading[kk];
            return X
        });

        particle.coordinates = coordinates;
        particle.heading = heading;
        particle.velocity = velocity;
    };


    const queryNeighbor = (link, particle, neighbor, scale) => {


        if (link.spring.drop()) return;
        const {coordinates, velocity} = particle;
        // const neighbor = state.particles[jj];

        const dist = magnitude(link.vec);

        link.spring.update(dist);


        const f = link.spring.force();
        state.energy.potential += link.spring.potential_energy();

        let scaled = [];
        Object.assign(link, {
            vec: link.vec.map((k, index) => {
                const delta = k / dist * f / state.particles.length;
                velocity[index] += delta;
                neighbor.velocity[index] -= delta;
                const val = coordinates[index] - neighbor.coordinates[index];
                scaled.push(val * scale);
                return val;
            }),
        });


        const start = coordinates.map((v, k) => v * shape[k] - scaled[k]);
        const end = neighbor.coordinates.map((v, k) => v * shape[k] + scaled[k]);

        try {
            const grad = ctx.createLinearGradient(
                ...start.slice(0, 2),
                ...end.slice(0, 2)
            );
            grad.addColorStop(0, rgba(f, coordinates[2], state.fade));
            grad.addColorStop(1, rgba(f, end[2], state.fade));
            ctx.strokeStyle = grad;
        } catch (e) {
            ctx.strokeStyle = "#FFFFFF";
        } finally {
            ctx.globalAlpha = 1.0 / Math.log2(state.particles.length);
            ctx.beginPath();
            ctx.moveTo(...start.slice(0, 2));
            ctx.lineTo(...end.slice(0, 2));
            ctx.stroke();
        }
    };

    const updateParticle = (state, index, shape) => {

        let particle = state.particles[index];
        const {coordinates, links, heading} = particle;
        const scale = Math.max((shape[2] - coordinates[2])/shape[2] + 0.5, 0.0) * state.radius;
        const speed = magnitude(particle.velocity);
        state.energy.kinetic += 0.5*speed*speed;

        Agent.draw_agent(
            ctx,
            state.particles.length,
            ...shape.slice(0, 2),
            ...coordinates,
            ...heading.slice(0, 2),
            state.fade,
            scale,
            "#FFFFFF"
        );

        for (let [jj, link] of Object.entries(links)) {
            queryNeighbor(link, particle, state.particles[jj], link.spring.size(scale));
        }

        clampPosition(
            particle,
            speed,
            state.bounce,
            state.padding,
            state.cursor.map(item => item * state.torque * (0.5 - coordinates[2]))
        );
    };


    const render = () => {

        ctx.lineWidth = 1;
        ctx.strokeStyle =  "#FFFFFF";
        clear_rect_blending(ctx, ...shape.slice(0, 2), `#00000077`);
        draw_caption(ctx, "Agents simulation", 0.0, shape[1], "#CCCCCC", "12px Arial");

        const t = (performance.now() | 0.0) - props.start;

        Object.assign(state, {
            torque: state.torque * 0.5,
            energy: {
                kinetic: 0.0,
                potential: 0.0,
            },
            frames: draw_fps(ctx, state.frames, t, "#FFFFFF")
        });

        state.particles.forEach((_, index) => updateParticle(state, index, shape));
        requestAnimationFrame(render);
    };

    render();
};