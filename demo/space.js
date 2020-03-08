
let wasm;

const heap = new Array(32);

heap.fill(undefined);

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

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
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

let cachedTextEncoder = new TextEncoder('utf-8');

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

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
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
function __wbg_adapter_22(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h9a9f3efc86f4423b(arg0, arg1, addHeapObject(arg2));
}

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
* @param {any} ctx
* @param {string} vertex
* @param {string} fragment
* @returns {any}
*/
export function create_program(ctx, vertex, fragment) {
    try {
        var ptr0 = passStringToWasm0(vertex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(fragment, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ret = wasm.create_program(addBorrowedObject(ctx), ptr0, len0, ptr1, len1);
        return takeObject(ret);
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

let cachegetFloat32Memory0 = null;
function getFloat32Memory0() {
    if (cachegetFloat32Memory0 === null || cachegetFloat32Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat32Memory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachegetFloat32Memory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4);
    getFloat32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
* @param {any} ctx
* @param {Float32Array} data
* @returns {any}
*/
export function create_buffer(ctx, data) {
    try {
        var ptr0 = passArrayF32ToWasm0(data, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ret = wasm.create_buffer(addBorrowedObject(ctx), ptr0, len0);
        return takeObject(ret);
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {any} ctx
* @param {any} texture
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
* @param {any} ctx
* @param {any} data
* @param {number} filter
* @param {number} _width
* @param {number} _height
* @returns {any}
*/
export function create_texture(ctx, data, filter, _width, _height) {
    try {
        var ret = wasm.create_texture(addBorrowedObject(ctx), addBorrowedObject(data), filter, _width, _height);
        return takeObject(ret);
    } finally {
        heap[stack_pointer++] = undefined;
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {any} ctx
* @param {number} w
* @param {number} h
* @param {number} mx
* @param {number} my
* @param {any} color
*/
export function draw_hex_grid(ctx, w, h, mx, my, color) {
    try {
        wasm.draw_hex_grid(addBorrowedObject(ctx), w, h, mx, my, addHeapObject(color));
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
*/
export function panic_hook() {
    wasm.panic_hook();
}

/**
* @param {any} _color
* @returns {any}
*/
export function create_color_map_canvas(_color) {
    var ret = wasm.create_color_map_canvas(addHeapObject(_color));
    return takeObject(ret);
}

/**
* @param {any} ctx
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
* @param {any} ctx
* @param {number} frames
* @param {number} time
* @param {any} color
* @returns {number}
*/
export function draw_fps(ctx, frames, time, color) {
    try {
        var ret = wasm.draw_fps(addBorrowedObject(ctx), frames, time, addHeapObject(color));
        return ret >>> 0;
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {any} ctx
* @param {string} caption
* @param {number} x
* @param {number} y
* @param {any} color
* @param {string} font
*/
export function draw_caption(ctx, caption, x, y, color, font) {
    try {
        var ptr0 = passStringToWasm0(caption, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(font, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.draw_caption(addBorrowedObject(ctx), ptr0, len0, x, y, addHeapObject(color), ptr1, len1);
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {any} ctx
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
    var ret = wasm.alloc(size);
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
* @returns {any}
*/
export function fetch_text(path) {
    var ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ret = wasm.fetch_text(ptr0, len0);
    return takeObject(ret);
}

let cachegetFloat64Memory0 = null;
function getFloat64Memory0() {
    if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachegetFloat64Memory0;
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
    var ptr0 = passArrayF64ToWasm0(series, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.make_vertex_array(8, ptr0, len0);
    var r0 = getInt32Memory0()[8 / 4 + 0];
    var r1 = getInt32Memory0()[8 / 4 + 1];
    var v1 = getArrayF64FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 8);
    return v1;
}

/**
* @param {number} x
* @param {number} y
*/
export function mouse_move(x, y) {
    wasm.mouse_move(x, y);
}

/**
* @param {number} np
* @returns {Float64Array}
*/
export function random_series(np) {
    wasm.random_series(8, np);
    var r0 = getInt32Memory0()[8 / 4 + 0];
    var r1 = getInt32Memory0()[8 / 4 + 1];
    var v0 = getArrayF64FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 8);
    return v0;
}

function handleError(e) {
    wasm.__wbindgen_exn_store(addHeapObject(e));
}

let cachegetUint8ClampedMemory0 = null;
function getUint8ClampedMemory0() {
    if (cachegetUint8ClampedMemory0 === null || cachegetUint8ClampedMemory0.buffer !== wasm.memory.buffer) {
        cachegetUint8ClampedMemory0 = new Uint8ClampedArray(wasm.memory.buffer);
    }
    return cachegetUint8ClampedMemory0;
}

function getClampedArrayU8FromWasm0(ptr, len) {
    return getUint8ClampedMemory0().subarray(ptr / 1, ptr / 1 + len);
}
function __wbg_adapter_198(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__hc5676375af21edd9(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

function notDefined(what) { return () => { throw new Error(`${what} is not defined`); }; }
/**
*/
export class Agent {

    static __wrap(ptr) {
        const obj = Object.create(Agent.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_agent_free(ptr);
    }
    /**
    * @param {number} x
    * @param {number} y
    * @param {number} z
    */
    constructor(x, y, z) {
        var ret = wasm.agent_new(x, y, z);
        return Agent.__wrap(ret);
    }
    /**
    * @param {number} p
    */
    push_link(p) {
        wasm.agent_push_link(this.ptr, p);
    }
    /**
    * @param {number} speed
    * @param {number} bounce
    * @param {number} pad
    * @param {number} tx
    * @param {number} ty
    * @param {number} tz
    */
    clamp_motion(speed, bounce, pad, tx, ty, tz) {
        wasm.agent_clamp_motion(this.ptr, speed, bounce, pad, tx, ty, tz);
    }
    /**
    * @param {any} ctx
    * @param {number} _n
    * @param {number} w
    * @param {number} h
    * @param {number} x
    * @param {number} y
    * @param {number} z
    * @param {number} u
    * @param {number} v
    * @param {number} fade
    * @param {number} scale
    * @param {any} color
    */
    static draw_agent(ctx, _n, w, h, x, y, z, u, v, fade, scale, color) {
        try {
            wasm.agent_draw_agent(addBorrowedObject(ctx), _n, w, h, x, y, z, u, v, fade, scale, addHeapObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class Axis {

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_axis_free(ptr);
    }
}
/**
*/
export class Cursor {

    static __wrap(ptr) {
        const obj = Object.create(Cursor.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_cursor_free(ptr);
    }
    /**
    */
    constructor() {
        var ret = wasm.cursor_new();
        return Cursor.__wrap(ret);
    }
    /**
    * @param {any} ctx
    * @param {number} displacement
    * @param {number} radius
    * @param {number} n
    * @param {number} radians
    */
    static keyring(ctx, displacement, radius, n, radians) {
        try {
            wasm.cursor_keyring(addBorrowedObject(ctx), displacement, radius, n, radians);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {any} ctx
    * @param {number} theta
    * @param {number} n
    * @param {number} a
    * @param {number} b
    */
    static ticks(ctx, theta, n, a, b) {
        try {
            wasm.cursor_ticks(addBorrowedObject(ctx), theta, n, a, b);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {any} ctx
    * @param {number} w
    * @param {number} h
    * @param {number} time
    * @param {number} x
    * @param {number} y
    * @param {number} dx
    * @param {number} dy
    * @param {any} color
    */
    static draw(ctx, w, h, time, x, y, dx, dy, color) {
        try {
            wasm.cursor_draw(addBorrowedObject(ctx), w, h, time, x, y, dx, dy, addHeapObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class CursorState {

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_cursorstate_free(ptr);
    }
}
/**
*/
export class DataStream {

    static __wrap(ptr) {
        const obj = Object.create(DataStream.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_datastream_free(ptr);
    }
    /**
    * @param {number} capacity
    */
    constructor(capacity) {
        var ret = wasm.datastream_new(capacity);
        return DataStream.__wrap(ret);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    push(x, y) {
        wasm.datastream_push(this.ptr, x, y);
    }
    /**
    * @param {any} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    */
    draw(ctx, w, h, color) {
        wasm.datastream_draw(this.ptr, addHeapObject(ctx), w, h, addHeapObject(color));
    }
}
/**
*/
export class DrawingCanvas {

    static __wrap(ptr) {
        const obj = Object.create(DrawingCanvas.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_drawingcanvas_free(ptr);
    }
    /**
    * @returns {DrawingCanvas}
    */
    static new() {
        var ret = wasm.drawingcanvas_new();
        return DrawingCanvas.__wrap(ret);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    start_segment(x, y) {
        wasm.drawingcanvas_start_segment(this.ptr, x, y);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    extend(x, y) {
        wasm.drawingcanvas_extend(this.ptr, x, y);
    }
    /**
    * @param {any} ctx
    * @param {number} w
    * @param {number} h
    */
    draw(ctx, w, h) {
        try {
            wasm.drawingcanvas_draw(this.ptr, addBorrowedObject(ctx), w, h);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class Group {

    static __wrap(ptr) {
        const obj = Object.create(Group.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_group_free(ptr);
    }
    /**
    */
    constructor() {
        var ret = wasm.group_new();
        return Group.__wrap(ret);
    }
}
/**
*/
export class Link {

    static __wrap(ptr) {
        const obj = Object.create(Link.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_link_free(ptr);
    }
    /**
    * @param {number} p
    */
    constructor(p) {
        var ret = wasm.link_new(p);
        return Link.__wrap(ret);
    }
}
/**
*/
export class Observation {

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_observation_free(ptr);
    }
}
/**
*/
export class ObservedProperty {

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_observedproperty_free(ptr);
    }
}
/**
*/
export class RectilinearGrid {

    static __wrap(ptr) {
        const obj = Object.create(RectilinearGrid.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_rectilineargrid_free(ptr);
    }
    /**
    * @param {number} nx
    * @param {number} ny
    */
    constructor(nx, ny) {
        var ret = wasm.rectilineargrid_new(nx, ny);
        return RectilinearGrid.__wrap(ret);
    }
    /**
    * @param {any} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    */
    draw(ctx, w, h, color) {
        try {
            wasm.rectilineargrid_draw(this.ptr, addBorrowedObject(ctx), w, h, addHeapObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {number} ii
    * @param {number} jj
    * @returns {boolean}
    */
    mark(ii, jj) {
        var ret = wasm.rectilineargrid_mark(this.ptr, ii, jj);
        return ret !== 0;
    }
    /**
    */
    clear() {
        wasm.rectilineargrid_clear(this.ptr);
    }
    /**
    * @param {any} ctx
    * @param {number} w
    * @param {number} h
    * @param {number} frames
    * @param {number} time
    * @param {any} color
    */
    animation_frame(ctx, w, h, frames, time, color) {
        try {
            wasm.rectilineargrid_animation_frame(this.ptr, addBorrowedObject(ctx), w, h, frames, time, addHeapObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class Spring {

    static __wrap(ptr) {
        const obj = Object.create(Spring.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_spring_free(ptr);
    }
    /**
    * @returns {number}
    */
    get x() {
        var ret = wasm.__wbg_get_spring_x(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set x(arg0) {
        wasm.__wbg_set_spring_x(this.ptr, arg0);
    }
    /**
    * @param {number} k
    * @param {number} x
    * @param {number} v
    * @param {number} l
    * @param {number} stop
    * @param {number} p
    */
    constructor(k, x, v, l, stop, p) {
        var ret = wasm.spring_new(k, x, v, l, stop, p);
        return Spring.__wrap(ret);
    }
    /**
    * @returns {number}
    */
    potential_energy() {
        var ret = wasm.spring_potential_energy(this.ptr);
        return ret;
    }
    /**
    * @returns {number}
    */
    force() {
        var ret = wasm.spring_force(this.ptr);
        return ret;
    }
    /**
    * @returns {boolean}
    */
    drop() {
        var ret = wasm.spring_drop(this.ptr);
        return ret !== 0;
    }
    /**
    * @param {number} distance
    */
    update(distance) {
        wasm.spring_update(this.ptr, distance);
    }
    /**
    * @param {number} s
    * @returns {number}
    */
    size(s) {
        var ret = wasm.spring_size(this.ptr, s);
        return ret;
    }
}
/**
*/
export class Texture2D {

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_texture2d_free(ptr);
    }
    /**
    * @param {any} ctx
    * @param {number} _w
    * @param {number} _h
    * @param {number} _frame
    * @param {number} time
    */
    static fill_canvas(ctx, _w, _h, _frame, time) {
        try {
            wasm.texture2d_fill_canvas(addBorrowedObject(ctx), _w, _h, _frame, time);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class TriangularMesh {

    static __wrap(ptr) {
        const obj = Object.create(TriangularMesh.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_triangularmesh_free(ptr);
    }
    /**
    * @param {number} nx
    * @param {number} ny
    * @param {number} w
    * @param {number} h
    */
    constructor(nx, ny, w, h) {
        var ret = wasm.triangularmesh_new(nx, ny, w, h);
        return TriangularMesh.__wrap(ret);
    }
    /**
    * @param {any} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    */
    draw(ctx, w, h, color) {
        try {
            wasm.triangularmesh_draw(this.ptr, addBorrowedObject(ctx), w, h, addHeapObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {any} ctx
    * @param {number} w
    * @param {number} h
    * @param {number} frame
    * @param {number} time
    * @param {any} color
    */
    animation_frame(ctx, w, h, frame, time, color) {
        try {
            wasm.triangularmesh_animation_frame(this.ptr, addBorrowedObject(ctx), w, h, frame, time, addHeapObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {number} index
    * @returns {boolean}
    */
    mark(index) {
        var ret = wasm.triangularmesh_mark(this.ptr, index);
        return ret !== 0;
    }
    /**
    */
    clear() {
        wasm.triangularmesh_clear(this.ptr);
    }
}

function init(module) {
    if (typeof module === 'undefined') {
        module = import.meta.url.replace(/\.js$/, '_bg.wasm');
    }
    let result;
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        var ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        var ret = false;
        return ret;
    };
    imports.wbg.__widl_instanceof_Window = function(arg0) {
        var ret = getObject(arg0) instanceof Window;
        return ret;
    };
    imports.wbg.__widl_instanceof_CanvasRenderingContext2D = function(arg0) {
        var ret = getObject(arg0) instanceof CanvasRenderingContext2D;
        return ret;
    };
    imports.wbg.__widl_f_set_global_alpha_CanvasRenderingContext2D = function(arg0, arg1) {
        getObject(arg0).globalAlpha = arg1;
    };
    imports.wbg.__widl_f_begin_path_CanvasRenderingContext2D = function(arg0) {
        getObject(arg0).beginPath();
    };
    imports.wbg.__widl_f_fill_CanvasRenderingContext2D = function(arg0) {
        getObject(arg0).fill();
    };
    imports.wbg.__widl_f_stroke_CanvasRenderingContext2D = function(arg0) {
        getObject(arg0).stroke();
    };
    imports.wbg.__widl_f_create_linear_gradient_CanvasRenderingContext2D = function(arg0, arg1, arg2, arg3, arg4) {
        var ret = getObject(arg0).createLinearGradient(arg1, arg2, arg3, arg4);
        return addHeapObject(ret);
    };
    imports.wbg.__widl_f_set_stroke_style_CanvasRenderingContext2D = function(arg0, arg1) {
        getObject(arg0).strokeStyle = getObject(arg1);
    };
    imports.wbg.__widl_f_set_fill_style_CanvasRenderingContext2D = function(arg0, arg1) {
        getObject(arg0).fillStyle = getObject(arg1);
    };
    imports.wbg.__widl_f_put_image_data_CanvasRenderingContext2D = function(arg0, arg1, arg2, arg3) {
        try {
            getObject(arg0).putImageData(getObject(arg1), arg2, arg3);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_set_line_width_CanvasRenderingContext2D = function(arg0, arg1) {
        getObject(arg0).lineWidth = arg1;
    };
    imports.wbg.__widl_f_set_line_cap_CanvasRenderingContext2D = function(arg0, arg1, arg2) {
        getObject(arg0).lineCap = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__widl_f_arc_CanvasRenderingContext2D = function(arg0, arg1, arg2, arg3, arg4, arg5) {
        try {
            getObject(arg0).arc(arg1, arg2, arg3, arg4, arg5);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_close_path_CanvasRenderingContext2D = function(arg0) {
        getObject(arg0).closePath();
    };
    imports.wbg.__widl_f_line_to_CanvasRenderingContext2D = function(arg0, arg1, arg2) {
        getObject(arg0).lineTo(arg1, arg2);
    };
    imports.wbg.__widl_f_move_to_CanvasRenderingContext2D = function(arg0, arg1, arg2) {
        getObject(arg0).moveTo(arg1, arg2);
    };
    imports.wbg.__widl_f_rect_CanvasRenderingContext2D = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).rect(arg1, arg2, arg3, arg4);
    };
    imports.wbg.__widl_f_clear_rect_CanvasRenderingContext2D = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).clearRect(arg1, arg2, arg3, arg4);
    };
    imports.wbg.__widl_f_fill_rect_CanvasRenderingContext2D = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).fillRect(arg1, arg2, arg3, arg4);
    };
    imports.wbg.__widl_f_restore_CanvasRenderingContext2D = function(arg0) {
        getObject(arg0).restore();
    };
    imports.wbg.__widl_f_save_CanvasRenderingContext2D = function(arg0) {
        getObject(arg0).save();
    };
    imports.wbg.__widl_f_fill_text_CanvasRenderingContext2D = function(arg0, arg1, arg2, arg3, arg4) {
        try {
            getObject(arg0).fillText(getStringFromWasm0(arg1, arg2), arg3, arg4);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_set_font_CanvasRenderingContext2D = function(arg0, arg1, arg2) {
        getObject(arg0).font = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__widl_f_rotate_CanvasRenderingContext2D = function(arg0, arg1) {
        try {
            getObject(arg0).rotate(arg1);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_translate_CanvasRenderingContext2D = function(arg0, arg1, arg2) {
        try {
            getObject(arg0).translate(arg1, arg2);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_create_element_Document = function(arg0, arg1, arg2) {
        try {
            var ret = getObject(arg0).createElement(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_instanceof_HTMLCanvasElement = function(arg0) {
        var ret = getObject(arg0) instanceof HTMLCanvasElement;
        return ret;
    };
    imports.wbg.__widl_f_get_context_HTMLCanvasElement = function(arg0, arg1, arg2) {
        try {
            var ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_set_width_HTMLCanvasElement = function(arg0, arg1) {
        getObject(arg0).width = arg1 >>> 0;
    };
    imports.wbg.__widl_f_set_height_HTMLCanvasElement = function(arg0, arg1) {
        getObject(arg0).height = arg1 >>> 0;
    };
    imports.wbg.__widl_f_set_Headers = function(arg0, arg1, arg2, arg3, arg4) {
        try {
            getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_new_with_u8_clamped_array_ImageData = function(arg0, arg1, arg2) {
        try {
            var ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0);
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_new_with_str_and_init_Request = function(arg0, arg1, arg2) {
        try {
            var ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_headers_Request = function(arg0) {
        var ret = getObject(arg0).headers;
        return addHeapObject(ret);
    };
    imports.wbg.__widl_instanceof_Response = function(arg0) {
        var ret = getObject(arg0) instanceof Response;
        return ret;
    };
    imports.wbg.__widl_f_text_Response = function(arg0) {
        try {
            var ret = getObject(arg0).text();
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_buffer_data_with_array_buffer_view_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
    };
    imports.wbg.__widl_f_tex_image_2d_with_u32_and_u32_and_image_data_WebGLRenderingContext = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        try {
            getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4 >>> 0, arg5 >>> 0, getObject(arg6));
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__widl_f_active_texture_WebGLRenderingContext = function(arg0, arg1) {
        getObject(arg0).activeTexture(arg1 >>> 0);
    };
    imports.wbg.__widl_f_attach_shader_WebGLRenderingContext = function(arg0, arg1, arg2) {
        getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
    };
    imports.wbg.__widl_f_bind_buffer_WebGLRenderingContext = function(arg0, arg1, arg2) {
        getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__widl_f_bind_texture_WebGLRenderingContext = function(arg0, arg1, arg2) {
        getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__widl_f_compile_shader_WebGLRenderingContext = function(arg0, arg1) {
        getObject(arg0).compileShader(getObject(arg1));
    };
    imports.wbg.__widl_f_create_buffer_WebGLRenderingContext = function(arg0) {
        var ret = getObject(arg0).createBuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__widl_f_create_program_WebGLRenderingContext = function(arg0) {
        var ret = getObject(arg0).createProgram();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__widl_f_create_shader_WebGLRenderingContext = function(arg0, arg1) {
        var ret = getObject(arg0).createShader(arg1 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__widl_f_create_texture_WebGLRenderingContext = function(arg0) {
        var ret = getObject(arg0).createTexture();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__widl_f_get_program_info_log_WebGLRenderingContext = function(arg0, arg1, arg2) {
        var ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__widl_f_get_program_parameter_WebGLRenderingContext = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__widl_f_get_shader_info_log_WebGLRenderingContext = function(arg0, arg1, arg2) {
        var ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__widl_f_get_shader_parameter_WebGLRenderingContext = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__widl_f_link_program_WebGLRenderingContext = function(arg0, arg1) {
        getObject(arg0).linkProgram(getObject(arg1));
    };
    imports.wbg.__widl_f_shader_source_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
    };
    imports.wbg.__widl_f_tex_parameteri_WebGLRenderingContext = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
    };
    imports.wbg.__widl_f_document_Window = function(arg0) {
        var ret = getObject(arg0).document;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__widl_f_fetch_with_request_Window = function(arg0, arg1) {
        var ret = getObject(arg0).fetch(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        var ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__widl_f_log_1_ = function(arg0) {
        console.log(getObject(arg0));
    };
    imports.wbg.__wbg_call_12b949cfc461d154 = function(arg0, arg1) {
        try {
            var ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_newnoargs_c4b2cbbd30e2d057 = function(arg0, arg1) {
        var ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_ce7cf17fc6380443 = function(arg0, arg1, arg2) {
        try {
            var ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_new_7dd9b384a913884d = function() {
        var ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_d3eff62d5c013634 = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_198(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            var ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbg_resolve_6885947099a907d3 = function(arg0) {
        var ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_b6fef331fde5cf0a = function(arg0, arg1) {
        var ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_7d828a330efec051 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_globalThis_22e06d4bea0084e3 = function() {
        try {
            var ret = globalThis.globalThis;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_self_00b0599bca667294 = function() {
        try {
            var ret = self.self;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_window_aa795c5aad79b8ac = function() {
        try {
            var ret = window.window;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_global_cc239dc2303f417c = function() {
        try {
            var ret = global.global;
            return addHeapObject(ret);
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        var ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbg_buffer_1bb127df6348017b = function(arg0) {
        var ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_07654e7af606fce0 = function(arg0, arg1, arg2) {
        var ret = new Float32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_8d5fd23e838df6b0 = function(arg0, arg1, arg2) {
        try {
            var ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
            return ret;
        } catch (e) {
            handleError(e)
        }
    };
    imports.wbg.__wbg_floor_25c84bba53058144 = typeof Math.floor == 'function' ? Math.floor : notDefined('Math.floor');
    imports.wbg.__wbg_random_624219ee110d74d6 = typeof Math.random == 'function' ? Math.random : notDefined('Math.random');
    imports.wbg.__wbg_new_59cb74e423758ede = function() {
        var ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_558ba5917b466edd = function(arg0, arg1) {
        var ret = getObject(arg1).stack;
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_error_4bb6c2a97407129a = function(arg0, arg1) {
        try {
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        var ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        var ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        var ret = debugString(getObject(arg1));
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_memory = function() {
        var ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper290 = function(arg0, arg1, arg2) {

        const state = { a: arg0, b: arg1, cnt: 1 };
        const real = (arg0) => {
            state.cnt++;
            const a = state.a;
            state.a = 0;
            try {
                return __wbg_adapter_22(a, state.b, arg0);
            } finally {
                if (--state.cnt === 0) wasm.__wbindgen_export_2.get(54)(a, state.b);
                else state.a = a;
            }
        }
        ;
        real.original = state;
        var ret = real;
        return addHeapObject(ret);
    };

    if ((typeof URL === 'function' && module instanceof URL) || typeof module === 'string' || (typeof Request === 'function' && module instanceof Request)) {

        const response = fetch(module);
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            result = WebAssembly.instantiateStreaming(response, imports)
            .catch(e => {
                return response
                .then(r => {
                    if (r.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                        return r.arrayBuffer();
                    } else {
                        throw e;
                    }
                })
                .then(bytes => WebAssembly.instantiate(bytes, imports));
            });
        } else {
            result = response
            .then(r => r.arrayBuffer())
            .then(bytes => WebAssembly.instantiate(bytes, imports));
        }
    } else {

        result = WebAssembly.instantiate(module, imports)
        .then(result => {
            if (result instanceof WebAssembly.Instance) {
                return { instance: result, module };
            } else {
                return result;
            }
        });
    }
    return result.then(({instance, module}) => {
        wasm = instance.exports;
        init.__wbindgen_wasm_module = module;

        return wasm;
    });
}

export default init;

