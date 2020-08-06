import React, { useState, useEffect, useRef } from "react";
import { StyledCanvas, loadRuntime } from "../components/Canvas";


const magnitude = (vec) => {
    return Math.sqrt(
        vec.map(x => x * x).reduce((a, b) => a + b, 0.0)
    )
};

const uniform = (a, b) => {
    return Math.random() * (b - a) + a;
};

export default ({ key, font = "12px Arial" }) => {

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [cursor, setCursor] = useState([0.0, 0.0]);
    const [particleSystem, setParticleSystem] = useState(null);

    const caption = "Particles";
    const count = 24;
    const dim = "xyz";
    const padding = 0.0;

    useEffect(loadRuntime(setRuntime), []);  // web assembly binaries

    useEffect(() => {
        /*
        Create particle system nad initialize the spring forces between them
        */

        if (!runtime) return;

        let particles = [];
        for (let ii = 0; ii < count; ii++) {
            particles.push({
                heading: [1.0, 0.0, 0.0],
                coordinates: "xyz".split('').map(
                    d => dim.includes(d) ? uniform(padding, 1.0 - padding) : 0.5
                ),
                velocity: [0.0, 0.0, 0.0],
                links: {}
            })
        }

        particles.forEach((p, ii) => {
            for (let jj = ii + 1; jj < count; jj++) {
                p.links[jj] = {
                    vec: p.coordinates.map((x, dd) => x - particles[jj].coordinates[dd]),
                    spring: new runtime.Spring(0.002, 0.0, 0.0, 0.25, 0.1, 1 / Math.log(count))
                };
            }
        });
        setParticleSystem(particles);

    }, []);


    useEffect(() => {
        /*
        If the WASM runtime has been loaded, get the size of the displayed canvas
        and draw the data structure that has been passed as a prop. 
        */

        if (!runtime) return;

        let requestId;
        let canvas = ref.current;

        const width = getComputedStyle(canvas).getPropertyValue('width').slice(0, -2);
        const height = getComputedStyle(canvas).getPropertyValue('height').slice(0, -2);
        const start = performance.now();
        const ctx = canvas.getContext("2d");
        
        const shape = [width, height, 200];

        const config = {
            fade: 0.0,
            count,
            zero: 0.0, // performance.now(),
            cursor: [0, 0, 0],
            padding,
            streamline: true,
            radius: 16,
            torque: 3.0,
            bounce: 0.2,
            depth: Math.min(width, height),
            control: 0.0,
            color: "#ff00ff",
            delta: {
                x: 0,
                y: 0,
                drag: 0.0,
                t: 0.0
            }
        };

        canvas.width = width;
        canvas.height = height;

        let particles = [];
        for (let ii = 0; ii < count; ii++) {
            particles.push({
                heading: [1.0, 0.0, 0.0],
                coordinates: "xyz".split('').map(
                    d => dim.includes(d) ? uniform(padding, 1.0 - padding) : 0.5
                ),
                velocity: [0.0, 0.0, 0.0],
                links: {}
            })
        }

        particles.forEach((p, ii) => {
            for (let jj = ii + 1; jj < count; jj++) {
                p.links[jj] = {
                    vec: p.coordinates.map((x, dd) => x - particles[jj].coordinates[dd]),
                    spring: new runtime.Spring(0.002, 0.0, 0.0, 0.25, 0.1, 1 / Math.log(count))
                };
            }
        });

        let frames = 0;
        (function render() {
            const time = performance.now() - start;
            
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#FFFFFF";

            runtime.clear_rect_blending(ctx, ...shape.slice(0, 2), `#00000077`);
            const { radius, fade, bounce, padding, cursor } = config;

            particles.forEach((props) => {

                let { velocity, coordinates, heading, links } = props;
                // const speed = magnitude(velocity);
                // const torque = cursor.map(item => item * config.torque * (0.5 - coordinates[2]));
                const [x, y, z] = coordinates;
                runtime.Agent.draw_agent(
                    ctx,
                    particles.length,
                    ...shape.slice(0, 2),
                    ...[x + Math.random() * 0.01, y + Math.random() * 0.01, z + Math.random() * 0.01],
                    ...heading.slice(0, 2),
                    fade,
                    Math.max((shape[2] - coordinates[2]) / shape[2] + 0.5, 0.0) * radius,
                    "#FFFFFF"
                );

                // if (links) {
                //     links = Object.entries(links).map((link, jj) => {
                //         const neighbor = particles[jj];
                //         const { spring, vec } = link;


                //         if (spring && vec) {
                //             const scale = spring.size(scale);
                //             if (spring.drop()) return;
                //             const dist = magnitude(vec);
                //             spring.update(dist);
                //             const force = spring.force();
                //             let scaled = [];
                //             let newLink = {
                //                 ...link,
                //                 vec: vec.map((k, index) => {
                //                     const delta = k / dist * force / particles.length;
                //                     velocity[index] += delta;
                //                     neighbor.velocity[index] -= delta;
                //                     const val = coordinates[index] - neighbor.coordinates[index];
                //                     scaled.push(val * scale);
                //                     return val;
                //                 }),
                //                 spring,
                //             };
                //             const start = coordinates.map((v, k) => v * shape[k] - scaled[k]);
                //             const end = neighbor.coordinates.map((v, k) => v * shape[k] + scaled[k]);
                //             try {
                //                 const grad = ctx.createLinearGradient(
                //                     ...start.slice(0, 2),
                //                     ...end.slice(0, 2)
                //                 );
                //                 grad.addColorStop(0, rgba(force, coordinates[2], fade));
                //                 grad.addColorStop(1, rgba(force, end[2], fade));
                //                 ctx.strokeStyle = grad;
                //             } catch (e) {
                //                 ctx.strokeStyle = "#FFFFFF";
                //             } finally {
                //                 ctx.globalAlpha = 1.0 / Math.log2(particles.length);
                //                 ctx.beginPath();
                //                 ctx.moveTo(...start.slice(0, 2));
                //                 ctx.lineTo(...end.slice(0, 2));
                //                 ctx.stroke();
                //             }
                //         }

                //     });
                // }

                // return ({
                //     coordinates: coordinates.map((X, kk) => {
                //         velocity[kk] += torque[kk];
                //         X += velocity[kk];
                //         if (X > 1.0 - padding) {
                //             X -= 2*(X - 1.0 - padding);
                //             velocity[kk] *= -bounce;
                //         } else if (X < padding) {
                //             X -= 2*(X - padding);
                //             velocity[kk] *= -bounce;
                //         }
                //         heading[kk] = speed > 0.00001 ? velocity[kk] / speed : heading[kk];
                //         return X
                //     }),
                //     heading, 
                //     velocity,
                //     links,
                // });
            });
            // frames = runtime.draw_fps(ctx, frames, time, "#77CCFF");
            // if (caption) runtime.draw_caption(ctx, caption, 0.0, height, "#77CCFF", font);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    });

    return <StyledCanvas id={key} ref={ref} />;
};