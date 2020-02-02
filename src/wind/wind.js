export const programWrapper = (gl, program) => {
    let wrapper = {program: program};
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES); i++) {
        let attribute = gl.getActiveAttrib(program, i);
        wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name);
    }
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
        let uniform = gl.getActiveUniform(program, i);
        wrapper[uniform.name] = gl.getUniformLocation(program, uniform.name);
    }
    return wrapper;
};


export const createTexture = (gl, filter, data, width, height) => {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    if (data instanceof Uint8Array) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};

const bindTexture = (gl, texture, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
};

const createBuffer = (gl, data) => {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
};

const bindAttribute = (gl, buffer, attribute, numComponents) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
};

const bindFramebuffer = (gl, framebuffer, texture) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    if (texture) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    }
};


const getColorRamp = (colors) => {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    canvas.width = 256;
    canvas.height = 1;

    let gradient = ctx.createLinearGradient(0, 0, 256, 0);
    for (let stop in colors) {
        gradient.addColorStop(+stop, colors[stop]);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
};

const makeTextures = (gl, props, init, img) => {
    return {
        screen: createTexture(gl, gl.NEAREST, new Uint8Array(props.width * props.height * 4), props.width, props.height),
        back: createTexture(gl, gl.NEAREST, new Uint8Array(props.width * props.height * 4), props.width, props.height),
        state: createTexture(gl, gl.NEAREST, init, props.res, props.res),
        previous: createTexture(gl, gl.NEAREST, init, props.res, props.res),
        color: createTexture(gl, gl.LINEAR, getColorRamp(props.colors), 16, 16),
        uv: createTexture(gl, gl.LINEAR, img)
    }
};

export const shaders = async () => {
    return {
        draw: {
            frag: await fetch('glsl/draw-fragment.glsl').then(r => r.text()),
            vert: await fetch('glsl/draw-vertex.glsl').then(r => r.text())
        },
        quad: {
            vert: await fetch('glsl/quad-vertex.glsl').then(r => r.text())
        },
        screen: {
            frag: await fetch('glsl/screen-fragment.glsl').then(r => r.text())
        },
        update: {
            frag: await fetch('glsl/update-fragment.glsl').then(r => r.text())
        },
        triangle: {
            frag: await fetch('glsl/triangle-fragment.glsl').then(r => r.text()),
            vert: await fetch('glsl/triangle-vertex.glsl').then(r => r.text())
        }


    }
};

export function renderLoop(gl, data, img, programs, props) {

    let particleIndices = [];
    for (let i = 0; i < props.res * props.res; i++) {
        particleIndices.push(i);
    }

    let buffers = {
        quad: createBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])),
        frame: gl.createFramebuffer(),
        index: createBuffer(gl, new Float32Array(particleIndices))
    };

    let particleState = new Uint8Array(props.res * props.res * 4);
    for (let i = 0; i < particleState.length; i++) {
        particleState[i] = Math.floor(Math.random() * 256); // randomize the initial particle positions
    }
    let textures = makeTextures(gl, props, particleState, img);



    const wind = () => {
        {
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.STENCIL_TEST);

            bindTexture(gl, textures.uv, 0);
            bindTexture(gl, textures.state, 1);

            bindFramebuffer(gl, buffers.frame, textures.screen);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            gl.useProgram(programs.screen.program);
            bindAttribute(gl, buffers.quad, programs.screen.a_pos, 2);
            bindTexture(gl, textures.back, 2);
            gl.uniform1i(programs.screen.u_screen, 2);
            gl.uniform1f(programs.screen.u_opacity, props.opacity);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        {
            gl.useProgram(programs.draw.program);

            bindAttribute(gl, buffers.index, programs.draw.a_index, 1);
            bindTexture(gl, textures.color, 2);

            gl.uniform1i(programs.draw.u_wind, 0);
            gl.uniform1i(programs.draw.u_particles, 1);
            gl.uniform1i(programs.draw.u_color_ramp, 2);

            gl.uniform1f(programs.draw.u_particles_res, props.res);
            gl.uniform2f(programs.draw.u_wind_min, props.data.uMin, props.data.vMin);
            gl.uniform2f(programs.draw.u_wind_max, props.data.uMax, props.data.vMax);

            gl.drawArrays(gl.POINTS, 0, props.res * props.res);

        }

        {
            bindFramebuffer(gl, null);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.useProgram(programs.screen.program);
            bindAttribute(gl, buffers.quad, programs.screen.a_pos, 2);
            bindTexture(gl, textures.screen, 2);
            gl.uniform1i(programs.screen.u_screen, 2);
            gl.uniform1f(programs.screen.u_opacity, 1.0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.disable(gl.BLEND);
        }

        {
            let temp = textures.back;
            textures.back = textures.screen;
            textures.screen = temp;

        }

        {

            bindFramebuffer(gl, buffers.frame, textures.previous);
            gl.viewport(0, 0, props.res, props.res);

            gl.useProgram(programs.update.program);

            bindAttribute(gl, buffers.quad, programs.update.a_pos, 2);

            gl.uniform1i(programs.update.u_wind, 0);
            gl.uniform1i(programs.update.u_particles, 1);

            gl.uniform1f(programs.update.seed, Math.random());
            gl.uniform2f(programs.update.u_wind_res, props.data.width, props.data.height);
            gl.uniform2f(programs.update.u_wind_min, props.data.uMin, props.data.vMin);
            gl.uniform2f(programs.update.u_wind_max, props.data.uMax, props.data.vMax);
            gl.uniform1f(programs.update.speed, props.speed);
            gl.uniform1f(programs.update.drop, props.drop);
            gl.uniform1f(programs.update.bump, props.bump);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        {
            let temp2 = textures.state;
            textures.state = textures.previous;
            textures.previous = temp2;
        }
    };

    function render() {


        wind();
        requestAnimationFrame(render);
    }
    render();
}

