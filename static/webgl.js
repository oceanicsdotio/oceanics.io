let gl = null;
let canvas = null;
let currentRotation = [0, 1];
let currentScale = [1.0, 1.0];
let vertexArray;
let vertexBuffer;
let vertexWidth;
let vertexCount;
let uScalingFactor;
let uOverlayColor;
let uRotationVector;
let aVertexPosition;
let paused = false;

let FLAG_COLOR = [1.0, 0.0, 1.0, 1.0];
let previousTime = 0.0;


function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}

function show_pos(canvas, message) {
    let p = Tree.ancestor(canvas, "card");
    let e;
    for (let i = 0; i < p.childNodes.length; i++) {
        e = p.childNodes[i];
        if (e.class == "text") {
            break;
        }
    }

    if (!e) {
        e = document.createTextNode(message);
        e.text = message;
        e.class = "text";
        p.appendChild(e);
    }
    else {
        e.text = message;
    }
}

function add_listener(canvas) {
    canvas.addEventListener('mousemove', function(evt) {
        let mousePos = getMousePos(canvas, evt);
        let message = 'Mouse position: ' + mousePos.x + ',' + mousePos.y;
        console.log(message);show_pos(canvas, message);}, false);
}

function start(p, points, hh) {

    for (let i = 0; i < p.childNodes.length; i++) {
        let e = p.childNodes[i];
        if (e.class === "gl-canvas") {
            e.parentNode.removeChild(e);
            break;
        }
    }


    canvas = document.createElement("canvas");
    add_listener(canvas);

    canvas.id = "gl-canvas";
    canvas.class = "gl-canvas";
    canvas.width = hh*20;
    p.appendChild(canvas);

    let init_scale = 1.0;
    gl = canvas.getContext("webgl2");
    program = compileProgram("vertex-shader", "fragment-shader");

    currentRotation = [0, 1];
    currentScale = [init_scale, init_scale];

    vertexWidth = 2;

    //const data = await runModel();
    vertexArray = make_vertex_array(random_series(points));
    vertexCount = vertexArray.length/vertexWidth;
    vertexBuffer = bind_vertex_buffer(vertexArray);

    draw();
}


function random_series(np) {
    let result = [];
    for (let ii = 0; ii < np; ii++) {
        result.push((2*Math.random() - 1))
    }
    return result
}

function make_vertex_array(series) {

    let vertices = [];
    let points = series.length;
    let newval;

    for (let ii=0; ii < points; ii++) {
        newval = series[ii];
        vertices.push( 2*ii/(points-1) - 1 ); // x
        vertices.push( newval ); // y
    }
    return new Float32Array(vertices);
}

function bind_vertex_buffer(data) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
}

function compileProgram(vertex, fragment) {

    const shaders = [
        {type: gl.VERTEX_SHADER, id: vertex},
        {type: gl.FRAGMENT_SHADER, id: fragment}
    ];

    let program = gl.createProgram();
    shaders.forEach(function(desc) {
        let shader = compile(desc.id, desc.type);
        if (shader) { gl.attachShader(program, shader); }
    });

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.log("Error linking shader program:");
        console.log(gl.getProgramInfoLog(program));
    }
    return program;
}

function compile(id, type) {
    let code = document.getElementById(id).firstChild.nodeValue;
    let shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`);
        console.log(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function apply_scale(scale, label) {
    let uniform = gl.getUniformLocation(program, label);
    gl.uniform2fv(uniform, scale);
}

function apply_color(color, label) {
    let uniform = gl.getUniformLocation(program, label);
    gl.uniform4fv(uniform, color);
}

function draw_array(buffer, color, position_label) {
    apply_scale(currentScale, "uScalingFactor");
    apply_color(color, "uOverlayColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let position = gl.getAttribLocation(program, position_label);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, vertexWidth, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, vertexCount);
}


function draw() {

    let currentAngle = 0.0;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    //gl.clearColor(0.0, 0.0, 0.0, 0.0);
    //gl.clear(gl.COLOR_BUFFER_BIT);

    let radians = currentAngle * Math.PI / 180.0;
    currentRotation[0] = Math.sin(radians);
    currentRotation[1] = Math.cos(radians);

    gl.useProgram(program);
    uRotationVector = gl.getUniformLocation(program, "uRotationVector");
    gl.uniform2fv(uRotationVector, currentRotation);


    let color = [0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 0.5*Math.random() + 0.5, 1.0];

    draw_array(vertexBuffer, color, "aVertexPosition");

}

function animate(points) {

    let currentAngle = 0.0;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    //gl.clearColor(0.15, 0.15, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let radians = currentAngle * Math.PI / 180.0;
    currentRotation[0] = Math.sin(radians);
    currentRotation[1] = Math.cos(radians);

    gl.useProgram(program);
    uRotationVector = gl.getUniformLocation(program, "uRotationVector");
    gl.uniform2fv(uRotationVector, currentRotation);

    draw_array(vertexBuffer, FLAG_COLOR, "aVertexPosition");

    window.requestAnimationFrame(
        function(currentTime) {
            if (!paused) {
                vertexArray = make_vertex_array(random_series(points));
                vertexBuffer = bind_vertex_buffer(vertexArray);
                previousTime = currentTime;
                draw(points);
            }
        }
    );
}
