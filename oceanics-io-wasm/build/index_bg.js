import * as wasm from './index_bg.wasm';

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = new Uint8Array();

function getUint8Memory0() {
    if (cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedInt32Memory0 = new Int32Array();

function getInt32Memory0() {
    if (cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);

            } else {
                state.a = a;
            }
        }
    };
    real.original = state;

    return real;
}
function __wbg_adapter_24(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h5478814b2526581c(arg0, arg1, addHeapObject(arg2));
}

/**
*
*    After generating the base data array, clamp it and create a new
*    array as a JavaScript/HTML image data element.
*
* @param {number} world_size
* @param {number} water_level
* @returns {ImageData}
*/
export function image_data(world_size, water_level) {
    const ret = wasm.image_data(world_size, water_level);
    return takeObject(ret);
}

/**
* @param {number} jj
* @param {number} length
* @param {number} grid_size
* @returns {number}
*/
export function x_transform(jj, length, grid_size) {
    const ret = wasm.x_transform(jj, length, grid_size);
    return ret;
}

/**
* @param {number} xx
* @param {number} phase
* @param {number} width
* @returns {number}
*/
export function z_transform(xx, phase, width) {
    const ret = wasm.z_transform(xx, phase, width);
    return ret;
}

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
* @param {WebGLRenderingContext} context
* @param {WebGLBuffer} buffer
* @param {number} handle
* @param {number} count
*/
export function bind_attribute(context, buffer, handle, count) {
    try {
        wasm.bind_attribute(addBorrowedObject(context), addBorrowedObject(buffer), handle, count);
    } finally {
        heap[stack_pointer++] = undefined;
        heap[stack_pointer++] = undefined;
    }
}

/**
*
*    Compile the shaders and link them to a program, returning the pointer to the executable
*    in GPU memory.
*
*    This is the high-level routine called directly from JavaScript.
*
* @param {WebGLRenderingContext} ctx
* @param {string} vertex
* @param {string} fragment
* @returns {WebGLProgram}
*/
export function create_program(ctx, vertex, fragment) {
    try {
        const ptr0 = passStringToWasm0(vertex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(fragment, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.create_program(addBorrowedObject(ctx), ptr0, len0, ptr1, len1);
        return takeObject(ret);
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

let cachedFloat32Memory0 = new Float32Array();

function getFloat32Memory0() {
    if (cachedFloat32Memory0.byteLength === 0) {
        cachedFloat32Memory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32Memory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4);
    getFloat32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
*
*    Memory buffers are used to store array data for visualization.
*
*    This could be colors, or positions, or offsets, or velocities.
*
* @param {WebGLRenderingContext} ctx
* @param {Float32Array} data
* @returns {WebGLBuffer}
*/
export function create_buffer(ctx, data) {
    try {
        const ptr0 = passArrayF32ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.create_buffer(addBorrowedObject(ctx), ptr0, len0);
        return takeObject(ret);
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
*
*    Activate the chosen texture so that GL operations on textures will target it. The
*    texture number is [0,...) and can be accessed sequentially by offset.
*
*    Currently we only support 2D textures, which can be stacked to emulate 3D.
*
* @param {WebGLRenderingContext} ctx
* @param {WebGLTexture} texture
* @param {number} unit
*/
export function bind_texture(ctx, texture, unit) {
    try {
        wasm.bind_texture(addBorrowedObject(ctx), addHeapObject(texture), unit);
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
*
*    Define a 2D array in GPU memory, and bind it for GL operations.
*
* @param {WebGLRenderingContext} ctx
* @param {ImageData} data
* @param {number} filter
* @param {number} _width
* @param {number} _height
* @returns {WebGLTexture}
*/
export function create_texture(ctx, data, filter, _width, _height) {
    try {
        const ret = wasm.create_texture(addBorrowedObject(ctx), addBorrowedObject(data), filter, _width, _height);
        return takeObject(ret);
    } finally {
        heap[stack_pointer++] = undefined;
        heap[stack_pointer++] = undefined;
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}
/**
*/
export function greet() {
    wasm.greet();
}

/**
* @returns {string}
*/
export function get_rust_data() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.get_rust_data(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
    }
}

/**
* @param {string} name
* @returns {string}
*/
export function hello_world(name) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.hello_world(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(r0, r1);
    }
}

/**
*/
export function panic_hook() {
    wasm.panic_hook();
}

/**
* @param {any} _color
* @returns {CanvasRenderingContext2D}
*/
export function create_color_map_canvas(_color) {
    const ret = wasm.create_color_map_canvas(addHeapObject(_color));
    return takeObject(ret);
}

/**
* @param {CanvasRenderingContext2D} ctx
* @param {number} w
* @param {number} h
* @param {any} color
*/
export function clear_rect_blending(ctx, w, h, color) {
    try {
        wasm.clear_rect_blending(addBorrowedObject(ctx), w, h, addHeapObject(color));
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {CanvasRenderingContext2D} ctx
* @param {string} caption
* @param {number} x
* @param {number} y
* @param {any} color
* @param {string} font
*/
export function draw_caption(ctx, caption, x, y, color, font) {
    try {
        const ptr0 = passStringToWasm0(caption, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(font, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.draw_caption(addBorrowedObject(ctx), ptr0, len0, x, y, addBorrowedObject(color), ptr1, len1);
    } finally {
        heap[stack_pointer++] = undefined;
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {CanvasRenderingContext2D} ctx
* @param {number} frames
* @param {number} time
* @param {any} color
* @returns {number}
*/
export function draw_fps(ctx, frames, time, color) {
    try {
        const ret = wasm.draw_fps(addBorrowedObject(ctx), frames, time, addBorrowedObject(color));
        return ret >>> 0;
    } finally {
        heap[stack_pointer++] = undefined;
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {CanvasRenderingContext2D} ctx
* @param {number} x
* @param {number} y
* @param {number} scale
* @param {any} color
*/
export function draw_single_pixel(ctx, x, y, scale, color) {
    try {
        wasm.draw_single_pixel(addBorrowedObject(ctx), x, y, scale, addHeapObject(color));
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {number} size
* @returns {number}
*/
export function alloc(size) {
    const ret = wasm.alloc(size);
    return ret;
}

/**
* @param {number} ptr
* @param {number} cap
*/
export function dealloc(ptr, cap) {
    wasm.dealloc(ptr, cap);
}

/**
* @param {string} path
* @returns {Promise<any>}
*/
export function fetch_text(path) {
    const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.fetch_text(ptr0, len0);
    return takeObject(ret);
}

let cachedFloat64Memory0 = new Float64Array();

function getFloat64Memory0() {
    if (cachedFloat64Memory0.byteLength === 0) {
        cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8);
    getFloat64Memory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayF64FromWasm0(ptr, len) {
    return getFloat64Memory0().subarray(ptr / 8, ptr / 8 + len);
}
/**
* @param {Float64Array} series
* @returns {Float64Array}
*/
export function make_vertex_array(series) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArrayF64ToWasm0(series, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.make_vertex_array(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayF64FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 8);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
* @param {number} day_of_year
* @param {number} latitude
* @param {number} time_of_day
* @returns {number}
*/
export function photosynthetically_active_radiation(day_of_year, latitude, time_of_day) {
    const ret = wasm.photosynthetically_active_radiation(day_of_year, latitude, time_of_day);
    return ret;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedUint8ClampedMemory0 = new Uint8ClampedArray();

function getUint8ClampedMemory0() {
    if (cachedUint8ClampedMemory0.byteLength === 0) {
        cachedUint8ClampedMemory0 = new Uint8ClampedArray(wasm.memory.buffer);
    }
    return cachedUint8ClampedMemory0;
}

function getClampedArrayU8FromWasm0(ptr, len) {
    return getUint8ClampedMemory0().subarray(ptr / 1, ptr / 1 + len);
}
function __wbg_adapter_280(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h5f4bd1afe381c453(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

function notDefined(what) { return () => { throw new Error(`${what} is not defined`); }; }
/**
*/
export class ContextCursor {

    static __wrap(ptr) {
        const obj = Object.create(ContextCursor.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_contextcursor_free(ptr);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    constructor(x, y) {
        const ret = wasm.contextcursor_new(x, y);
        return ContextCursor.__wrap(ret);
    }
    /**
    *
    *        Draw radial ticks
    *            - theta: angle of rotation for set of all ticks
    *            - n: the number of ticks
    *            - a, b: the inner and outer radiuses
    *
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} theta
    * @param {number} n
    * @param {number} a
    * @param {number} b
    */
    static ticks(ctx, theta, n, a, b) {
        try {
            wasm.contextcursor_ticks(addBorrowedObject(ctx), theta, n, a, b);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    update(x, y) {
        wasm.contextcursor_update(this.ptr, x, y);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    * @param {number} time
    * @param {number} line_width
    */
    draw(ctx, w, h, color, time, line_width) {
        try {
            wasm.contextcursor_draw(this.ptr, addBorrowedObject(ctx), w, h, addBorrowedObject(color), time, line_width);
        } finally {
            heap[stack_pointer++] = undefined;
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*
*     * The Cypher data structure contains pre-computed queries
*     * ready to be executed against the Neo4j graph database.
*
*/
export class Cypher {

    static __wrap(ptr) {
        const obj = Object.create(Cypher.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cypher_free(ptr);
    }
    /**
    * @returns {boolean}
    */
    get read_only() {
        const ret = wasm.__wbg_get_cypher_read_only(this.ptr);
        return ret !== 0;
    }
    /**
    * @param {boolean} arg0
    */
    set read_only(arg0) {
        wasm.__wbg_set_cypher_read_only(this.ptr, arg0);
    }
    /**
    * @param {string} query
    * @param {boolean} read_only
    */
    constructor(query, read_only) {
        const ptr0 = passStringToWasm0(query, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.cypher_new(ptr0, len0, read_only);
        return Cypher.__wrap(ret);
    }
    /**
    * @returns {string}
    */
    get query() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.cypher_query(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
}
/**
*
*    Features are used in multiple ways. Both by the probability table.
*    and by the game interface.
*
*/
export class Feature {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_feature_free(ptr);
    }
}
/**
*/
export class InteractiveDataStream {

    static __wrap(ptr) {
        const obj = Object.create(InteractiveDataStream.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_interactivedatastream_free(ptr);
    }
    /**
    *
    *         * Create a new container without making too many assumptions
    *         *  how it will be used. Mostly streams are dynamically
    *         * constructed on the JavaScript side.
    *
    * @param {number} capacity
    */
    constructor(capacity) {
        const ret = wasm.interactivedatastream_new(capacity);
        return InteractiveDataStream.__wrap(ret);
    }
    /**
    *
    *         * Compose the data-driven visualization and draw to the target HtmlCanvasElement.
    *
    * @param {HTMLCanvasElement} canvas
    * @param {number} time
    * @param {any} style
    */
    draw(canvas, time, style) {
        wasm.interactivedatastream_draw(this.ptr, addHeapObject(canvas), time, addHeapObject(style));
    }
    /**
    *
    *         * Hoist the datastream push method, needed to ensure JavaScript binding
    *
    * @param {number} x
    * @param {number} y
    */
    push(x, y) {
        wasm.interactivedatastream_push(this.ptr, x, y);
    }
    /**
    *
    *         * Hoist data stream size getter, needed to ensure JavaScript binding
    *
    * @returns {number}
    */
    size() {
        const ret = wasm.interactivedatastream_size(this.ptr);
        return ret >>> 0;
    }
    /**
    *
    *         * Hoist cursor setter, needed to ensure JavaScript binding
    *
    * @param {number} x
    * @param {number} y
    */
    update_cursor(x, y) {
        wasm.interactivedatastream_update_cursor(this.ptr, x, y);
    }
}
/**
*
*    * Container for rectilinear grid that also has a cursor reference,
*    * and keeps track of metadata related to sampling and rendering.
*
*/
export class InteractiveGrid {

    static __wrap(ptr) {
        const obj = Object.create(InteractiveGrid.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_interactivegrid_free(ptr);
    }
    /**
    *
    *        * JavaScript binding for creating a new interactive grid container
    *
    * @param {number} nx
    * @param {number} ny
    * @param {number} nz
    * @param {number} stencil
    */
    constructor(nx, ny, nz, stencil) {
        const ret = wasm.interactivegrid_new(nx, ny, nz, stencil);
        return InteractiveGrid.__wrap(ret);
    }
    /**
    *
    *        * Hoisting function for cursor updates from JavaScript.
    *        * Prevents null references in some cases.
    *
    * @param {number} x
    * @param {number} y
    */
    update_cursor(x, y) {
        wasm.interactivegrid_update_cursor(this.ptr, x, y);
    }
    /**
    *
    *        * Animation frame is used as a visual feedback test
    *        * that utilizes most public methods of the data structure.
    *
    * @param {HTMLCanvasElement} canvas
    * @param {number} time
    * @param {any} style
    */
    draw(canvas, time, style) {
        wasm.interactivegrid_draw(this.ptr, addHeapObject(canvas), time, addHeapObject(style));
    }
}
/**
*
*     * Container for mesh that also contains cursor and rendering target infromation
*
*/
export class InteractiveMesh {

    static __wrap(ptr) {
        const obj = Object.create(InteractiveMesh.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_interactivemesh_free(ptr);
    }
    /**
    *
    *         * By default create a simple RTIN graph and initial the cursor
    *
    * @param {number} nx
    * @param {number} ny
    */
    constructor(nx, ny) {
        const ret = wasm.interactivemesh_new(nx, ny);
        return InteractiveMesh.__wrap(ret);
    }
    /**
    *
    *         * Compose a data-driven interactive canvas for the triangular network.
    *
    * @param {HTMLCanvasElement} canvas
    * @param {number} time
    * @param {any} style
    */
    draw(canvas, time, style) {
        wasm.interactivemesh_draw(this.ptr, addHeapObject(canvas), time, addHeapObject(style));
    }
    /**
    *
    *         * Update link forces and vectors.
    *         *
    *         * First use the edges to apply forces vectors to each particle, incrementally
    *         * updating the velocity.
    *
    * @param {number} drag
    * @param {number} bounce
    * @param {number} dt
    * @param {number} collision_threshold
    */
    updateState(drag, bounce, dt, collision_threshold) {
        wasm.interactivemesh_updateState(this.ptr, drag, bounce, dt, collision_threshold);
    }
    /**
    *
    *         * Hoisting function for cursor updates from JavaScript.
    *         * Prevents null references in some cases
    *
    * @param {number} x
    * @param {number} y
    */
    updateCursor(x, y) {
        wasm.interactivemesh_updateCursor(this.ptr, x, y);
    }
    /**
    *
    *         * Rotate the mesh in place
    *
    * @param {number} angle
    * @param {number} ax
    * @param {number} ay
    * @param {number} az
    */
    rotate(angle, ax, ay, az) {
        wasm.interactivemesh_rotate(this.ptr, angle, ax, ay, az);
    }
}
/**
*
*     The Island Kernel is used to generate island features
*     when the program is used in generative mode.
*
*/
export class IslandKernel {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_islandkernel_free(ptr);
    }
    /**
    * @returns {number}
    */
    get mask() {
        const ret = wasm.__wbg_get_islandkernel_mask(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set mask(arg0) {
        wasm.__wbg_set_islandkernel_mask(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get depth() {
        const ret = wasm.__wbg_get_islandkernel_depth(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set depth(arg0) {
        wasm.__wbg_set_islandkernel_depth(this.ptr, arg0);
    }
}
/**
*
*     * Links are the relationships between two entities.
*     *
*     * They are directional, and have properties like entities. When you
*     * have the option, it is encouraged to use rich links, instead of
*     *  doubly-linked nodes to represent relationships.
*     *
*     * The attributes are for a `Links` are:
*     * - `_symbol`, a private str for cypher query templating
*     * - `rank`, a reinforcement learning parameter for recommending new data
*     * - `uuid`, the unique identifier for the entity
*     * - `props`, properties blob
*     * - `label`, the optional label for the relationship, we only use one per link
*
*/
export class Links {

    static __wrap(ptr) {
        const obj = Object.create(Links.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_links_free(ptr);
    }
    /**
    * @returns {number | undefined}
    */
    get cost() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_links_cost(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getFloat32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number | undefined} arg0
    */
    set cost(arg0) {
        wasm.__wbg_set_links_cost(this.ptr, !isLikeNone(arg0), isLikeNone(arg0) ? 0 : arg0);
    }
    /**
    * @returns {number | undefined}
    */
    get rank() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.__wbg_get_links_rank(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {number | undefined} arg0
    */
    set rank(arg0) {
        wasm.__wbg_set_links_rank(this.ptr, !isLikeNone(arg0), isLikeNone(arg0) ? 0 : arg0);
    }
    /**
    * @param {string | undefined} label
    * @param {number | undefined} rank
    * @param {number | undefined} cost
    * @param {string | undefined} pattern
    */
    constructor(label, rank, cost, pattern) {
        var ptr0 = isLikeNone(label) ? 0 : passStringToWasm0(label, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(pattern) ? 0 : passStringToWasm0(pattern, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.links_new(ptr0, len0, !isLikeNone(rank), isLikeNone(rank) ? 0 : rank, !isLikeNone(cost), isLikeNone(cost) ? 0 : cost, ptr1, len1);
        return Links.__wrap(ret);
    }
    /**
    *
    *         * Query to remove a links between node patterns
    *
    * @param {Node} left
    * @param {Node} right
    * @returns {Cypher}
    */
    drop(left, right) {
        _assertClass(left, Node);
        _assertClass(right, Node);
        const ret = wasm.links_drop(this.ptr, left.ptr, right.ptr);
        return Cypher.__wrap(ret);
    }
    /**
    *
    *         * Create links between node patterns
    *
    * @param {Node} left
    * @param {Node} right
    * @returns {Cypher}
    */
    join(left, right) {
        _assertClass(left, Node);
        _assertClass(right, Node);
        const ret = wasm.links_join(this.ptr, left.ptr, right.ptr);
        return Cypher.__wrap(ret);
    }
    /**
    *
    *         * Use link-based queries, usually to get all children/siblings,
    *         * but actually very flexible.
    *
    * @param {Node} left
    * @param {Node} right
    * @param {string} result
    * @returns {Cypher}
    */
    query(left, right, result) {
        _assertClass(left, Node);
        _assertClass(right, Node);
        const ptr0 = passStringToWasm0(result, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.links_query(this.ptr, left.ptr, right.ptr, ptr0, len0);
        return Cypher.__wrap(ret);
    }
    /**
    * @param {Node} left
    * @param {Node} right
    * @returns {Cypher}
    */
    insert(left, right) {
        _assertClass(left, Node);
        _assertClass(right, Node);
        const ret = wasm.links_insert(this.ptr, left.ptr, right.ptr);
        return Cypher.__wrap(ret);
    }
    /**
    *
    *         * Detach and delete the right node, leaving the left node pattern
    *         * in the graph. For example, use this to delete a single node or
    *         * collection (right), owned by a user (left).
    *
    * @param {Node} left
    * @param {Node} right
    * @returns {Cypher}
    */
    deleteChild(left, right) {
        _assertClass(left, Node);
        _assertClass(right, Node);
        const ret = wasm.links_deleteChild(this.ptr, left.ptr, right.ptr);
        return Cypher.__wrap(ret);
    }
    /**
    *
    *         * Detach and delete both the root node and the child nodes. Use
    *         * this to delete a pattern, for example removing a user account and
    *         * all owned data. In some cases this can leave orphan nodes,
    *         * but these should always have at least one link back to a User or
    *         * Provider, so can be cleaned up later.
    *
    * @param {Node} left
    * @param {Node} right
    * @returns {Cypher}
    */
    delete(left, right) {
        _assertClass(left, Node);
        _assertClass(right, Node);
        const ret = wasm.links_delete(this.ptr, left.ptr, right.ptr);
        return Cypher.__wrap(ret);
    }
}
/**
*
*    The MiniMap is a data structure and interactive container.
*    It contains persistent world data as a raster, and exposes
*    selection and subsetting methods to explore subareas.
*
*/
export class MiniMap {

    static __wrap(ptr) {
        const obj = Object.create(MiniMap.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_minimap_free(ptr);
    }
    /**
    *
    *         * Constructor to init the data structure from JavaScript.
    *
    * @param {number} vx
    * @param {number} vy
    * @param {number} world_size
    * @param {number} water_level
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} grid_size
    */
    constructor(vx, vy, world_size, water_level, ctx, grid_size) {
        const ret = wasm.minimap_new(vx, vy, world_size, water_level, addHeapObject(ctx), grid_size);
        return MiniMap.__wrap(ret);
    }
    /**
    * @param {number} jj
    * @param {number} index
    * @param {number} length
    * @param {number} width
    * @param {number} phase
    * @returns {string}
    */
    get_dynamic_tile(jj, index, length, width, phase) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.minimap_get_dynamic_tile(retptr, this.ptr, jj, index, length, width, phase);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} ii
    * @param {number} jj
    * @param {number} length
    * @param {number} time
    * @param {number} width
    * @param {number} tile
    */
    drawTile(ctx, ii, jj, length, time, width, tile) {
        wasm.minimap_drawTile(this.ptr, addHeapObject(ctx), ii, jj, length, time, width, tile);
    }
    /**
    *
    *         * Public interface to update actions
    *
    * @param {number} actions
    */
    set_actions(actions) {
        wasm.minimap_set_actions(this.ptr, actions);
    }
    /**
    *
    *         * Get remaining actions from Javascript
    *
    * @returns {number}
    */
    actions() {
        const ret = wasm.minimap_actions(this.ptr);
        return ret >>> 0;
    }
    /**
    *
    *         * Hoist the insert feature method and rename it for
    *         * web interface
    *
    * @param {any} feature
    */
    insertFeature(feature) {
        wasm.minimap_insertFeature(this.ptr, addHeapObject(feature));
    }
    /**
    *
    *         * Hoist the score calculating method
    *
    * @returns {number}
    */
    score() {
        const ret = wasm.minimap_score(this.ptr);
        return ret;
    }
    /**
    *
    *         * Get the JSON serialized tile data from a linear index.
    *
    * @param {number} index
    * @returns {any}
    */
    get_tile(index) {
        const ret = wasm.minimap_get_tile(this.ptr, index);
        return takeObject(ret);
    }
    /**
    *
    *         * Hoist the replace tile function to make it
    *         * available from JavaScript interface.
    *         * This swaps out a tile for another tile.
    *
    * @param {number} ii
    * @param {number} jj
    */
    replaceTile(ii, jj) {
        wasm.minimap_replaceTile(this.ptr, ii, jj);
    }
    /**
    */
    clear() {
        wasm.minimap_clear(this.ptr);
    }
    /**
    * @param {number} ind
    * @param {number} ii
    * @param {number} jj
    * @returns {number}
    */
    insertTile(ind, ii, jj) {
        const ret = wasm.minimap_insertTile(this.ptr, ind, ii, jj);
        return ret >>> 0;
    }
    /**
    * @param {number} index
    * @returns {number}
    */
    get_mask(index) {
        const ret = wasm.minimap_get_mask(this.ptr, index);
        return ret;
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @returns {ImageData}
    */
    visible(ctx) {
        try {
            const ret = wasm.minimap_visible(this.ptr, addBorrowedObject(ctx));
            return takeObject(ret);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    *
    *         * Access method for current view
    *
    * @returns {number}
    */
    view_x() {
        const ret = wasm.minimap_view_x(this.ptr);
        return ret;
    }
    /**
    *
    *         * Access method for current view
    *
    * @returns {number}
    */
    view_y() {
        const ret = wasm.minimap_view_y(this.ptr);
        return ret;
    }
    /**
    *
    *         * Move the field of view in the overall world image. Input is used
    *         * my onClick events to navigate around the map.
    *
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} vx
    * @param {number} vy
    */
    updateView(ctx, vx, vy) {
        wasm.minimap_updateView(this.ptr, addHeapObject(ctx), vx, vy);
    }
    /**
    *
    *         * Make a white box, that will be filled in with image
    *         * data to form a frame.
    *
    * @param {CanvasRenderingContext2D} ctx
    */
    draw_bbox(ctx) {
        try {
            wasm.minimap_draw_bbox(this.ptr, addBorrowedObject(ctx));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    *
    *         * Draw the image data, then a square, and then fill the square with part of the image data again to form
    *         * a frame
    *
    * @param {CanvasRenderingContext2D} ctx
    */
    draw_image_data(ctx) {
        try {
            wasm.minimap_draw_image_data(this.ptr, addBorrowedObject(ctx));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*
*     * The Node data structure encapsulates logic needed for
*     * representing entities in the Cypher query language.
*
*/
export class Node {

    static __wrap(ptr) {
        const obj = Object.create(Node.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_node_free(ptr);
    }
    /**
    * @param {string | undefined} pattern
    * @param {string | undefined} symbol
    * @param {string | undefined} label
    */
    constructor(pattern, symbol, label) {
        var ptr0 = isLikeNone(pattern) ? 0 : passStringToWasm0(pattern, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(symbol) ? 0 : passStringToWasm0(symbol, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(label) ? 0 : passStringToWasm0(label, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.node_new(ptr0, len0, ptr1, len1, ptr2, len2);
        return Node.__wrap(ret);
    }
    /**
    * @returns {Cypher}
    */
    static allLabels() {
        const ret = wasm.node_allLabels();
        return Cypher.__wrap(ret);
    }
    /**
    * @returns {string}
    */
    patternOnly() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.node_patternOnly(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @returns {string}
    */
    get symbol() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.node_symbol(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @returns {string}
    */
    get label() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.node_label(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    *
    *         * Format the cypher query representation of the Node data structure
    *
    * @returns {string}
    */
    cypherRepr() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.node_cypherRepr(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    *
    *         * Query to delete a node pattern from the graph.
    *
    * @returns {Cypher}
    */
    delete() {
        const ret = wasm.node_delete(this.ptr);
        return Cypher.__wrap(ret);
    }
    /**
    *
    *         * Format a query that will merge a pattern into all matching nodes.
    *
    * @param {Node} updates
    * @returns {Cypher}
    */
    mutate(updates) {
        _assertClass(updates, Node);
        var ptr0 = updates.ptr;
        updates.ptr = 0;
        const ret = wasm.node_mutate(this.ptr, ptr0);
        return Cypher.__wrap(ret);
    }
    /**
    *
    *         * Generate a query to load data from the database
    *
    * @param {string | undefined} key
    * @returns {Cypher}
    */
    load(key) {
        var ptr0 = isLikeNone(key) ? 0 : passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.node_load(this.ptr, ptr0, len0);
        return Cypher.__wrap(ret);
    }
    /**
    * @returns {Cypher}
    */
    create() {
        const ret = wasm.node_create(this.ptr);
        return Cypher.__wrap(ret);
    }
}
/**
*
*     * Data structure representing a Node Index, which can be used to
*     * to create index on node property to speed up retievals and enfroce
*     * unique constraints.
*
*/
export class NodeIndex {

    static __wrap(ptr) {
        const obj = Object.create(NodeIndex.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nodeindex_free(ptr);
    }
    /**
    * @param {string} label
    * @param {string} key
    */
    constructor(label, key) {
        const ptr0 = passStringToWasm0(label, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.nodeindex_new(ptr0, len0, ptr1, len1);
        return NodeIndex.__wrap(ret);
    }
    /**
    *
    *         * Indexes add a unique constraint as well as speeding up queries
    *         * on the graph database.
    *
    * @returns {Cypher}
    */
    add() {
        const ret = wasm.nodeindex_add(this.ptr);
        return Cypher.__wrap(ret);
    }
    /**
    *
    *         * Remove the index
    *
    * @returns {Cypher}
    */
    drop() {
        const ret = wasm.nodeindex_drop(this.ptr);
        return Cypher.__wrap(ret);
    }
    /**
    *
    *         * Apply a unique constraint, without creating an index
    *
    * @returns {Cypher}
    */
    unique_constraint() {
        const ret = wasm.nodeindex_unique_constraint(this.ptr);
        return Cypher.__wrap(ret);
    }
}
/**
*/
export class PrismCursor {

    static __wrap(ptr) {
        const obj = Object.create(PrismCursor.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_prismcursor_free(ptr);
    }
    /**
    * @param {number} x
    * @param {number} y
    * @param {number} device_pixel_ratio
    * @param {number} grid_size
    */
    constructor(x, y, device_pixel_ratio, grid_size) {
        const ret = wasm.prismcursor_new(x, y, device_pixel_ratio, grid_size);
        return PrismCursor.__wrap(ret);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    update(x, y) {
        wasm.prismcursor_update(this.ptr, x, y);
    }
    /**
    * @param {number} width
    * @returns {number}
    */
    gridX(width) {
        const ret = wasm.prismcursor_gridX(this.ptr, width);
        return ret;
    }
    /**
    * @param {number} width
    * @returns {number}
    */
    gridY(width) {
        const ret = wasm.prismcursor_gridY(this.ptr, width);
        return ret;
    }
    /**
    * @returns {number}
    */
    x() {
        const ret = wasm.prismcursor_x(this.ptr);
        return ret;
    }
    /**
    * @returns {number}
    */
    y() {
        const ret = wasm.prismcursor_y(this.ptr);
        return ret;
    }
}
/**
*/
export class SimpleCursor {

    static __wrap(ptr) {
        const obj = Object.create(SimpleCursor.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_simplecursor_free(ptr);
    }
    /**
    * @returns {number}
    */
    get x() {
        const ret = wasm.__wbg_get_simplecursor_x(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set x(arg0) {
        wasm.__wbg_set_simplecursor_x(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get y() {
        const ret = wasm.__wbg_get_simplecursor_y(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set y(arg0) {
        wasm.__wbg_set_simplecursor_y(this.ptr, arg0);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    constructor(x, y) {
        const ret = wasm.simplecursor_new(x, y);
        return SimpleCursor.__wrap(ret);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    update(x, y) {
        wasm.simplecursor_update(this.ptr, x, y);
    }
    /**
    *
    *        The simple cursor rendering method is stateless exept for the cursor position,
    *        which is updated asynchronously from the JavaScript interface so that event handling
    *        is isolated from the request animation frame loop.
    *
    *        Components include 4 segments between the axes and the cursor position. These have
    *        minimum length of `tick_size` or the distance current position from the axis. The
    *        max length is `tick_size` plus the distance to the cursor, modulated by the
    *        `completeness` parameter.
    *
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    * @param {number} font_size
    * @param {number} line_width
    * @param {number} tick_size
    * @param {number} completeness
    * @param {number} label_padding
    */
    draw(ctx, w, h, color, font_size, line_width, tick_size, completeness, label_padding) {
        try {
            wasm.simplecursor_draw(this.ptr, addBorrowedObject(ctx), w, h, addBorrowedObject(color), font_size, line_width, tick_size, completeness, label_padding);
        } finally {
            heap[stack_pointer++] = undefined;
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*
*    Tiles are individual features, aka the instance of
*    a type of feature, which is stored in memory and may be
*    modified to deviate from the basic rules.
*
*    These are used in the TileSet struct.
*
*    These have:
*    - feature: unique string identifying the base type
*    - flip: render left or right facing sprite
*    - value: passive value toward total score
*    - frame_offset: start frame to desync animations
*
*/
export class Tile {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tile_free(ptr);
    }
}
/**
*
*     * Tileset collects data structures related to generating and saving
*     * features in the game.
*     * Tiles are stored in `tiles`.
*     * Current count of each type is stored
*     * in a HashMap indexed by tile type, and mapping of diagonal indices
*     * to linear indices is stored in a another HashMap.
*
*/
export class TileSet {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tileset_free(ptr);
    }
}

export function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
};

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

export function __wbindgen_boolean_get(arg0) {
    const v = getObject(arg0);
    const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
    return ret;
};

export function __wbindgen_json_parse(arg0, arg1) {
    const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

export function __wbindgen_json_serialize(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = JSON.stringify(obj === undefined ? null : obj);
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbindgen_cb_drop(arg0) {
    const obj = takeObject(arg0).original;
    if (obj.cnt-- == 1) {
        obj.a = 0;
        return true;
    }
    const ret = false;
    return ret;
};

export function __wbg_instanceof_Window_42f092928baaee84(arg0) {
    const ret = getObject(arg0) instanceof Window;
    return ret;
};

export function __wbg_document_15b2e504fb1556d6(arg0) {
    const ret = getObject(arg0).document;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_fetch_9a5cb9d8a96004d0(arg0, arg1) {
    const ret = getObject(arg0).fetch(getObject(arg1));
    return addHeapObject(ret);
};

export function __wbg_createElement_28fc3740fb11defb() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).createElement(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
}, arguments) };

export function __wbindgen_object_clone_ref(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

export function __wbg_addColorStop_0794a382726a5341() { return handleError(function (arg0, arg1, arg2, arg3) {
    getObject(arg0).addColorStop(arg1, getStringFromWasm0(arg2, arg3));
}, arguments) };

export function __wbg_set_b5c36262f65fae92() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
}, arguments) };

export function __wbg_instanceof_Response_240e67e5796c3c6b(arg0) {
    const ret = getObject(arg0) instanceof Response;
    return ret;
};

export function __wbg_text_64ed39439c06af3f() { return handleError(function (arg0) {
    const ret = getObject(arg0).text();
    return addHeapObject(ret);
}, arguments) };

export function __wbg_headers_0aeca08d4e61e2e7(arg0) {
    const ret = getObject(arg0).headers;
    return addHeapObject(ret);
};

export function __wbg_newwithstrandinit_de7c409ec8538105() { return handleError(function (arg0, arg1, arg2) {
    const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_bufferData_b0959f6e8fa1bac9(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
};

export function __wbg_texImage2D_3445a9062b91788e() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4 >>> 0, arg5 >>> 0, getObject(arg6));
}, arguments) };

export function __wbg_activeTexture_1f86480fc893f091(arg0, arg1) {
    getObject(arg0).activeTexture(arg1 >>> 0);
};

export function __wbg_attachShader_910d42315ce8a2cf(arg0, arg1, arg2) {
    getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
};

export function __wbg_bindBuffer_17e7701f3783fe14(arg0, arg1, arg2) {
    getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
};

export function __wbg_bindTexture_50372861417a920b(arg0, arg1, arg2) {
    getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
};

export function __wbg_compileShader_4ae3f58c811393d2(arg0, arg1) {
    getObject(arg0).compileShader(getObject(arg1));
};

export function __wbg_createBuffer_1a5c0608cbb5262d(arg0) {
    const ret = getObject(arg0).createBuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createProgram_e82f0c292b92d048(arg0) {
    const ret = getObject(arg0).createProgram();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createShader_47aca7e73f341855(arg0, arg1) {
    const ret = getObject(arg0).createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createTexture_d0a3e4c23b48c479(arg0) {
    const ret = getObject(arg0).createTexture();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_enableVertexAttribArray_fb815e4bac96e84e(arg0, arg1) {
    getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
};

export function __wbg_getProgramInfoLog_877ead0372418939(arg0, arg1, arg2) {
    const ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_getProgramParameter_b925281cc104aece(arg0, arg1, arg2) {
    const ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_getShaderInfoLog_41c1fac084c27bba(arg0, arg1, arg2) {
    const ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_getShaderParameter_f4134a1d05c41379(arg0, arg1, arg2) {
    const ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_linkProgram_9583241ca29e93d4(arg0, arg1) {
    getObject(arg0).linkProgram(getObject(arg1));
};

export function __wbg_shaderSource_88896867d034a493(arg0, arg1, arg2, arg3) {
    getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
};

export function __wbg_texParameteri_f6100356bad10edc(arg0, arg1, arg2, arg3) {
    getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
};

export function __wbg_vertexAttribPointer_245aa6fcda0cbb3d(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
};

export function __wbg_error_800b8d466653f7ea(arg0) {
    console.error(getObject(arg0));
};

export function __wbg_log_17733ab6fa45831d(arg0) {
    console.log(getObject(arg0));
};

export function __wbg_instanceof_CanvasRenderingContext2d_10bb8c4425aab773(arg0) {
    const ret = getObject(arg0) instanceof CanvasRenderingContext2D;
    return ret;
};

export function __wbg_setglobalAlpha_c7e8decb1c76d203(arg0, arg1) {
    getObject(arg0).globalAlpha = arg1;
};

export function __wbg_setstrokeStyle_6031fd3bde25a376(arg0, arg1) {
    getObject(arg0).strokeStyle = getObject(arg1);
};

export function __wbg_setfillStyle_73949a5c3b61798a(arg0, arg1) {
    getObject(arg0).fillStyle = getObject(arg1);
};

export function __wbg_setlineWidth_51ef142c745a9f5a(arg0, arg1) {
    getObject(arg0).lineWidth = arg1;
};

export function __wbg_setlineCap_b56634b59665f763(arg0, arg1, arg2) {
    getObject(arg0).lineCap = getStringFromWasm0(arg1, arg2);
};

export function __wbg_setfont_c1044c3e2bfe91af(arg0, arg1, arg2) {
    getObject(arg0).font = getStringFromWasm0(arg1, arg2);
};

export function __wbg_drawImage_030b93b8db0287bc() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).drawImage(getObject(arg1), arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
}, arguments) };

export function __wbg_beginPath_4a4302577da62125(arg0) {
    getObject(arg0).beginPath();
};

export function __wbg_fill_e5193c88834dc182(arg0) {
    getObject(arg0).fill();
};

export function __wbg_stroke_fe693002a3fc8e6a(arg0) {
    getObject(arg0).stroke();
};

export function __wbg_createLinearGradient_42c7945aa8379feb(arg0, arg1, arg2, arg3, arg4) {
    const ret = getObject(arg0).createLinearGradient(arg1, arg2, arg3, arg4);
    return addHeapObject(ret);
};

export function __wbg_getImageData_9190728c4dffac60() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    const ret = getObject(arg0).getImageData(arg1, arg2, arg3, arg4);
    return addHeapObject(ret);
}, arguments) };

export function __wbg_putImageData_b6835d76d1cb45dd() { return handleError(function (arg0, arg1, arg2, arg3) {
    getObject(arg0).putImageData(getObject(arg1), arg2, arg3);
}, arguments) };

export function __wbg_arc_b54bf161e510b1a8() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).arc(arg1, arg2, arg3, arg4, arg5);
}, arguments) };

export function __wbg_closePath_82947eae4ee7ec93(arg0) {
    getObject(arg0).closePath();
};

export function __wbg_lineTo_ab95f0e81662aade(arg0, arg1, arg2) {
    getObject(arg0).lineTo(arg1, arg2);
};

export function __wbg_moveTo_fe2d1db84edc26a4(arg0, arg1, arg2) {
    getObject(arg0).moveTo(arg1, arg2);
};

export function __wbg_rect_39df7643dd2108bb(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).rect(arg1, arg2, arg3, arg4);
};

export function __wbg_fillRect_3b87fb719605af54(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).fillRect(arg1, arg2, arg3, arg4);
};

export function __wbg_restore_eb0c3e24ffc7cd10(arg0) {
    getObject(arg0).restore();
};

export function __wbg_save_bdf758248b0f51e1(arg0) {
    getObject(arg0).save();
};

export function __wbg_fillText_8f777bfaa35f393b() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).fillText(getStringFromWasm0(arg1, arg2), arg3, arg4);
}, arguments) };

export function __wbg_measureText_f486a8c576d38b71() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).measureText(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_rotate_b3e723d0ecb4480b() { return handleError(function (arg0, arg1) {
    getObject(arg0).rotate(arg1);
}, arguments) };

export function __wbg_translate_cd6770b0975720df() { return handleError(function (arg0, arg1, arg2) {
    getObject(arg0).translate(arg1, arg2);
}, arguments) };

export function __wbg_setsrc_b891ba96d8a001d7(arg0, arg1, arg2) {
    getObject(arg0).src = getStringFromWasm0(arg1, arg2);
};

export function __wbg_width_0b3173a789327516(arg0) {
    const ret = getObject(arg0).width;
    return ret;
};

export function __wbg_height_a8cefe84b4f518f3(arg0) {
    const ret = getObject(arg0).height;
    return ret;
};

export function __wbg_new_67cf33e5a9ba2808() { return handleError(function () {
    const ret = new Image();
    return addHeapObject(ret);
}, arguments) };

export function __wbg_data_8e8cdb73c43d0bc7(arg0, arg1) {
    const ret = getObject(arg1).data;
    const ptr0 = passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_newwithu8clampedarray_4da1c1ab5fa3d369() { return handleError(function (arg0, arg1, arg2) {
    const ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0);
    return addHeapObject(ret);
}, arguments) };

export function __wbg_newwithu8clampedarrayandsh_67cfbae8df523bed() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0, arg3 >>> 0);
    return addHeapObject(ret);
}, arguments) };

export function __wbg_instanceof_HtmlCanvasElement_9f56aef8c479066b(arg0) {
    const ret = getObject(arg0) instanceof HTMLCanvasElement;
    return ret;
};

export function __wbg_width_54a66e74169bb513(arg0) {
    const ret = getObject(arg0).width;
    return ret;
};

export function __wbg_setwidth_79da97dd2684789d(arg0, arg1) {
    getObject(arg0).width = arg1 >>> 0;
};

export function __wbg_height_d4607377aede83c6(arg0) {
    const ret = getObject(arg0).height;
    return ret;
};

export function __wbg_setheight_d1ec9b4faad45a42(arg0, arg1) {
    getObject(arg0).height = arg1 >>> 0;
};

export function __wbg_getContext_efe7e95b72348104() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_width_a0e1ded63e4e4084(arg0) {
    const ret = getObject(arg0).width;
    return ret;
};

export function __wbg_newnoargs_971e9a5abe185139(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

export function __wbg_call_33d7bcddbbfa394a() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_new_e6a9fecc2bf26696() {
    const ret = new Object();
    return addHeapObject(ret);
};

export function __wbg_call_65af9f665ab6ade5() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_new_52205195aa880fc2(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return __wbg_adapter_280(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return addHeapObject(ret);
    } finally {
        state0.a = state0.b = 0;
    }
};

export function __wbg_resolve_0107b3a501450ba0(arg0) {
    const ret = Promise.resolve(getObject(arg0));
    return addHeapObject(ret);
};

export function __wbg_then_18da6e5453572fc8(arg0, arg1) {
    const ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
};

export function __wbg_then_e5489f796341454b(arg0, arg1, arg2) {
    const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
};

export function __wbg_self_fd00a1ef86d1b2ed() { return handleError(function () {
    const ret = self.self;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_window_6f6e346d8bbd61d7() { return handleError(function () {
    const ret = window.window;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_globalThis_3348936ac49df00a() { return handleError(function () {
    const ret = globalThis.globalThis;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_global_67175caf56f55ca9() { return handleError(function () {
    const ret = global.global;
    return addHeapObject(ret);
}, arguments) };

export function __wbindgen_is_undefined(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
};

export function __wbg_buffer_34f5ec9f8a838ba0(arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
};

export function __wbg_newwithbyteoffsetandlength_fb619fd76ea1f132(arg0, arg1, arg2) {
    const ret = new Float32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_set_2762e698c2f5b7e0() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
    return ret;
}, arguments) };

export const __wbg_random_5ee0189319837e3a = typeof Math.random == 'function' ? Math.random : notDefined('Math.random');

export function __wbg_new_693216e109162396() {
    const ret = new Error();
    return addHeapObject(ret);
};

export function __wbg_stack_0ddaca5d1abfb52f(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_error_09919627ac0992f5(arg0, arg1) {
    try {
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
};

export function __wbindgen_debug_string(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

export function __wbindgen_memory() {
    const ret = wasm.memory;
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper751(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 94, __wbg_adapter_24);
    return addHeapObject(ret);
};

