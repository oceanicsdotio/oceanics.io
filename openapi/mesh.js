vertexShaderCode=
'attribute vec3 ppos;'+
'attribute vec4 pcolor;'+
'varying mediump vec4 face_color;'+
'uniform mat4 mvp;'+
'void main(void) {'+
'  gl_Position = mvp * vec4(ppos.x, ppos.y, ppos.z, 1.0);'+
'  gl_PointSize = 2.0;'+  // Inserted in part 6
'  face_color = pcolor;'+
'}';

fragmentShaderCode=
'varying mediump vec4 face_color;'+
'void main(void) {'+
'  gl_FragColor = face_color;'+
'}';

var gl = null;
var program;
var running = true;
var aspectRatio;
var vertices;
var colors;

function start() {
    var canvas = document.getElementById('glcanvas');
    try {gl = canvas.getContext('experimental-webgl');}
    catch(e) {alert('Exception catched in getContext: '+e.toString());return;}
    if(!gl) {alert('Unable to menu Web GL query');return;}

    // Creates fragment shader (returns white color for any position)
    var fshader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fshader, fragmentShaderCode);
    gl.compileShader(fshader);
    if (!gl.getShaderParameter(fshader, gl.COMPILE_STATUS))
    {alert('Error during fragment shader compilation:\n' + gl.getShaderInfoLog(fshader)); return;}

    // Creates vertex shader (converts 2D point position to coordinates)
    var vshader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vshader, vertexShaderCode);
    gl.compileShader(vshader);
    if (!gl.getShaderParameter(vshader, gl.COMPILE_STATUS))
    {alert('Error during vertex shader compilation:\n' + gl.getShaderInfoLog(vshader)); return;}

    // Creates program and links shaders to it
    program = gl.createProgram();
    gl.attachShader(program, fshader);
    gl.attachShader(program, vshader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    {alert('Error during program linking:\n' + gl.getProgramInfoLog(program));return;}

    // Validates and uses program in the GL query
    //gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS))
    {alert('Error during program validation:\n' + gl.getProgramInfoLog(program));return;}
    gl.useProgram(program);

    updateObject();

    aspectRatio = canvas.width / canvas.height;
    setInterval("draw();", 40);
}



function assign(name, data, width) {

    const normalize = false;
    const stride = 0;
    const offset = 0;
    const type = gl.FLOAT

    var attribute = gl.getAttribLocation(program, name);
    if(attribute == -1){alert('Error retrieving '+name+' address');return;}

    var buffer = gl.createBuffer();

    gl.enableVertexAttribArray(attribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.vertexAttribPointer(attribute, width, type, normalize, stride, offset);
}

// Updates object with global parameters
function updateObject() {

    //var obj = makeTorus(1.0, 0.25, 1)
    var obj = makeTriangle();
    vertices = obj.vertices;
    assign('pcolor', obj.colors, 4);
    assign('ppos', obj.vertices, 3);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    const indices = [0,  1,  2, 0,  2,  3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


}


function rotate(axis, delta) {

    var ax = parseInt(document.getElementById(axis).innerHTML, 10);
    ax = (ax + parseInt(document.getElementById(delta).value, 10) + 360) % 360;
    document.getElementById(axis).innerHTML = ax.toString();
    ax *= 2*Math.PI/360;
    return ax
}

function draw() {
    if(!running || !gl) {return;}

    var ax = rotate('ax', 'dx')
    var ay = rotate('ay', 'dy')
    var az = rotate('az', 'dz')
    var ox = 0.0;
    var oy = 0.0;
    var oz = 0.0;
    var s = 0.75;
    var d = 3.0;
    var f = 2.0;
    var n = -1.0;

    var amvp = gl.getUniformLocation(program, "mvp"); // address of current transform
    if(amvp == -1) {alert('Error during uniform address retrieval');running=false;return;}
    var mat = getTransformationMatrix(ox, oy, oz, ax, ay, az, s, d, f, n, aspectRatio);
    gl.uniformMatrix4fv(amvp, false, mat); // bind new transform
    gl.clearColor(0.15, 0.15, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    var mesh = document.getElementById('mesh').value;
    var rendering = document.getElementById('rendering').value;   // Gets rendering parameter(s) from the HTML page
    var glrender = window.eval('gl.'+rendering);

    //gl.drawArrays(glrender, 0, vertices.length/3);
    const triangles = 2;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(glrender, triangles*3, type, offset);
    gl.flush();
}

// Returns a transformation matrix as a flat array with 16 components
function getTransformationMatrix(ox, oy, oz, rx, ry, rz, s, d, f, n, ar) {

    var cx = Math.cos(rx), sx = Math.sin(rx);
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var cz = Math.cos(rz), sz = Math.sin(rz);
    var A=d;
    var B=(n+f+2*d)/(f-n);
    var C=-(d*(2*n+2*f)+2*f*n+2*d*d)/(f-n);

    return new Float32Array([
        (cy*cz*s*A)/ar, cy*s*sz*A, -s*sy*B, -s*sy,
        (s*(cz*sx*sy-cx*sz)*A)/ar, s*(sx*sy*sz+cx*cz)*A, cy*s*sx*B, cy*s*sx,
        (s*(sx*sz+cx*cz*sy)*A)/ar, s*(cx*sy*sz-cz*sx)*A, cx*cy*s*B, cx*cy*s,
        (s*(cz*((-oy*sx-cx*oz)*sy-cy*ox)-(oz*sx-cx*oy)*sz)*A)/ar,
        s*(((-oy*sx-cx*oz)*sy-cy*ox)*sz+cz*(oz*sx-cx*oy))*A,
        C+(s*(ox*sy+cy*(-oy*sx-cx*oz))+d)*B, s*(ox*sy+cy*(-oy*sx-cx*oz))+d
    ]);
}

// Creates a 3D torus in the XY plane,
function makeTorus(r, sr, k) {
  var n = 24;
  var sn = 24;
  var tv = new Array();
  var tc = new Array();

  for(var i=0;i<n;i++)
    for(var j=0;j<sn+1*(i==n-1);j++)
      for(var v=0;v<2;v++)  {
        // Pre-calculation of angles
        var a =  2*Math.PI*(i+j/sn+k*v)/n;
        var sa = 2*Math.PI*j/sn;
        var x, y, z;

        tv.push(x = (r+sr*Math.cos(sa))*Math.cos(a)); // X
        tv.push(y = (r+sr*Math.cos(sa))*Math.sin(a)); // Y
        tv.push(z = sr*Math.sin(sa));                 // Z

        tc.push(0.5+0.5*x);  // R
        tc.push(0.5+0.5*y); // G
        tc.push(0.5+0.5*z);  // B
        tc.push(1.0);  // Alpha
      }

  // Converts and returns array
  var res = new Object();
  res.vertices = new Float32Array(tv);
  res.colors = new Float32Array(tc);
  return res;
}

function makeTriangle() {
    var tv = new Array();
    var tc = new Array();

    tv.push(0.0, 0.0, 0.0);
    tv.push(1.0, 0.0, 0.0);
    tv.push(1.0, 1.0, 0.0);
    tv.push(0.0, 1.0, 0.0);
    tc.push(1.0, 0.0, 1.0, 1.0);
    tc.push(1.0, 0.0, 1.0, 1.0);
    tc.push(1.0, 0.0, 1.0, 1.0);
    tc.push(1.0, 0.0, 1.0, 1.0);


    var res = new Object();
    res.vertices = new Float32Array(tv);
    res.colors = new Float32Array(tc);
    return res;
}

function upload(evt) {

    var data = null;
    var file = evt.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event) {
        var csvData = event.target.result;
        data = $.csv.toArrays(csvData);
        if (data && data.length > 0) {
          alert('Imported -' + data.length + '- rows successfully!');
        } else {
            alert('No data to import!');
        }
    };
}
