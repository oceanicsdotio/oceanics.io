export default ({canvas: {width, height}, ctx, dim, padding, count}) =>{

    const shape = [width, height, 200];

    const [state, setState] = useState({
        particles: () => {
            const uniform = (a, b) => {
                return Math.random() * (b - a) + a;
            };
        
            let particles = [];
            for (let ii=0; ii<count; ii++) {
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
        },
        fade: 0.0,
        count: count,
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
        depth: Math.min(width, height),
        control: 0.0,
        color: "#ff00ff",
        delta: {
            x: 0,
            y: 0,
            drag: 0.0,
            t: 0.0
        }
    });

    return () => {
        ctx.lineWidth = 1;
        ctx.strokeStyle =  "#FFFFFF";
        clear_rect_blending(ctx, ...shape.slice(0, 2), `#00000077`);
        Object.assign(state, {
            torque: state.torque * 0.5,
            energy: {
                kinetic: 0.0,
                potential: 0.0,
            },
        });

        const {radius} = state;

        state.particles.forEach((_, index) => {
           
            let particle = state.particles[index];
            const {coordinates, links, heading, velocity} = particle;
            const scale = Math.max((shape[2] - coordinates[2])/shape[2] + 0.5, 0.0) * radius;
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
                const neighbor = state.particles[jj];
                const scale = link.spring.size(scale);
                
                if (link.spring.drop()) return;
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
            }
    
            const {bounce, padding} = state;
            const torque = state.cursor.map(item => item * state.torque * (0.5 - coordinates[2]));
            const {coordinates, heading, velocity} = particle;
            const speed = magnitude(velocity);
    
            particle.coordinates = coordinates.map((X, kk) => {
                velocity[kk] += torque[kk];
                X += velocity[kk];
                if (X > 1.0 - padding) {
                    X -= 2*(X - 1.0 - padding);
                    velocity[kk] *= -bounce;
                } else if (X < padding) {
                    X -= 2*(X - padding);
                    velocity[kk] *= -bounce;
                }
                heading[kk] = speed > 0.00001 ? velocity[kk] / speed : heading[kk];
                return X
            });
            particle.heading = heading;
            particle.velocity = velocity;
            
        });
    }
};