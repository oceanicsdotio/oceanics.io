import * as wasm from './neritics_bg.wasm';

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

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

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

    heap[idx] = obj;
    return idx;
}

function getObject(idx) { return heap[idx]; }

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

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error('expected a boolean argument');
    }
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

    if (typeof(arg) !== 'string') throw new Error('expected a string argument');

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
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
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

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error('expected a number argument');
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
    const state = { a: arg0, b: arg1, cnt: 1 };
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
            if (--state.cnt === 0) wasm.__wbindgen_export_2.get(dtor)(a, state.b);
            else state.a = a;
        }
    };
    real.original = state;
    return real;
}

function logError(f) {
    return function () {
        try {
            return f.apply(this, arguments);

        } catch (e) {
            let error = (function () {
                try {
                    return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
                } catch(_) {
                    return "<failed to stringify thrown value>";
                }
            }());
            console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
            throw e;
        }
    };
}
function __wbg_adapter_22(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hec2f2516977eb204(arg0, arg1, addHeapObject(arg2));
}

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
/**
* @param {WebGLRenderingContext} ctx
* @param {string} vertex
* @param {string} fragment
* @returns {WebGLProgram}
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
* @param {WebGLRenderingContext} ctx
* @param {Float32Array} data
* @returns {WebGLBuffer}
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
* @param {WebGLRenderingContext} ctx
* @param {WebGLTexture} texture
* @param {number} unit
*/
export function bind_texture(ctx, texture, unit) {
    try {
        _assertNum(unit);
        wasm.bind_texture(addBorrowedObject(ctx), addHeapObject(texture), unit);
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

/**
* @param {WebGLRenderingContext} ctx
* @param {ImageData} data
* @param {number} filter
* @param {number} _width
* @param {number} _height
* @returns {WebGLTexture}
*/
export function create_texture(ctx, data, filter, _width, _height) {
    try {
        _assertNum(filter);
        _assertNum(_width);
        _assertNum(_height);
        var ret = wasm.create_texture(addBorrowedObject(ctx), addBorrowedObject(data), filter, _width, _height);
        return takeObject(ret);
    } finally {
        heap[stack_pointer++] = undefined;
        heap[stack_pointer++] = undefined;
    }
}

let cachegetFloat64Memory0 = null;
function getFloat64Memory0() {
    if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachegetFloat64Memory0;
}

function getArrayF64FromWasm0(ptr, len) {
    return getFloat64Memory0().subarray(ptr / 8, ptr / 8 + len);
}
/**
* @param {number} np
* @returns {Float64Array}
*/
export function random_series(np) {
    _assertNum(np);
    wasm.random_series(8, np);
    var r0 = getInt32Memory0()[8 / 4 + 0];
    var r1 = getInt32Memory0()[8 / 4 + 1];
    var v0 = getArrayF64FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 8);
    return v0;
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
    var ret = wasm.create_color_map_canvas(addHeapObject(_color));
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
* @param {number} frames
* @param {number} time
* @param {any} color
* @returns {number}
*/
export function draw_fps(ctx, frames, time, color) {
    try {
        _assertNum(frames);
        var ret = wasm.draw_fps(addBorrowedObject(ctx), frames, time, addHeapObject(color));
        return ret >>> 0;
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
    _assertNum(size);
    var ret = wasm.alloc(size);
    return ret;
}

/**
* @param {number} ptr
* @param {number} cap
*/
export function dealloc(ptr, cap) {
    _assertNum(ptr);
    _assertNum(cap);
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

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8);
    getFloat64Memory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
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

function handleError(f) {
    return function () {
        try {
            return f.apply(this, arguments);

        } catch (e) {
            wasm.__wbindgen_exn_store(addHeapObject(e));
        }
    };
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
function __wbg_adapter_204(arg0, arg1, arg2, arg3) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h96984aac8d17c2af(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

function notDefined(what) { return () => { throw new Error(`${what} is not defined`); }; }
/**
*/
export class Axis {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_axis_free(ptr);
    }
}
/**
*/
export class CellIndex {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_cellindex_free(ptr);
    }
}
/**
*/
export class ContextCursor {

    static __wrap(ptr) {
        const obj = Object.create(ContextCursor.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_contextcursor_free(ptr);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    constructor(x, y) {
        var ret = wasm.contextcursor_new(x, y);
        return ContextCursor.__wrap(ret);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} theta
    * @param {number} n
    * @param {number} a
    * @param {number} b
    */
    static ticks(ctx, theta, n, a, b) {
        try {
            _assertNum(n);
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
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
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
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            wasm.contextcursor_draw(this.ptr, addBorrowedObject(ctx), w, h, addHeapObject(color), time, line_width);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class CursorState {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

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
        _assertNum(capacity);
        var ret = wasm.datastream_new(capacity);
        return DataStream.__wrap(ret);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    push(x, y) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.datastream_push(this.ptr, x, y);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    * @param {number} point_size
    * @param {number} line_width
    * @param {number} alpha
    */
    draw(ctx, w, h, color, point_size, line_width, alpha) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.datastream_draw(this.ptr, addHeapObject(ctx), w, h, addHeapObject(color), point_size, line_width, alpha);
    }
}
/**
*/
export class DrawingCanvas {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_drawingcanvas_free(ptr);
    }
}
/**
*/
export class EdgeIndex {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_edgeindex_free(ptr);
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
    * @param {number} count
    * @param {number} zero
    * @param {number} stop
    */
    constructor(count, zero, stop) {
        _assertNum(count);
        var ret = wasm.group_new(count, zero, stop);
        return Group.__wrap(ret);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} width
    * @param {number} height
    * @param {number} fade
    * @param {number} scale
    * @param {any} color
    */
    draw(ctx, width, height, fade, scale, color) {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            wasm.group_draw(this.ptr, addBorrowedObject(ctx), width, height, fade, scale, addHeapObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {number} padding
    * @param {number} drag
    * @param {number} bounce
    */
    update_links(padding, drag, bounce) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.group_update_links(this.ptr, padding, drag, bounce);
    }
}
/**
*/
export class HexagonalGrid {

    static __wrap(ptr) {
        const obj = Object.create(HexagonalGrid.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_hexagonalgrid_free(ptr);
    }
    /**
    * @param {number} nx
    */
    constructor(nx) {
        _assertNum(nx);
        var ret = wasm.hexagonalgrid_new(nx);
        return HexagonalGrid.__wrap(ret);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {number} mx
    * @param {number} my
    * @param {any} color
    * @param {number} line_width
    * @param {number} alpha
    */
    draw(ctx, w, h, mx, my, color, line_width, alpha) {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            wasm.hexagonalgrid_draw(this.ptr, addBorrowedObject(ctx), w, h, mx, my, addHeapObject(color), line_width, alpha);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class Model {

    static __wrap(ptr) {
        const obj = Object.create(Model.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_model_free(ptr);
    }
    /**
    */
    constructor() {
        var ret = wasm.model_new();
        return Model.__wrap(ret);
    }
    /**
    * @param {number} angle
    * @param {number} ax
    * @param {number} ay
    * @param {number} az
    * @returns {Model}
    */
    rotate_from_js(angle, ax, ay, az) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.model_rotate_from_js(this.ptr, angle, ax, ay, az);
        return Model.__wrap(ret);
    }
    /**
    * @param {number} angle
    * @param {number} ax
    * @param {number} ay
    * @param {number} az
    */
    rotate_in_place(angle, ax, ay, az) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.model_rotate_in_place(this.ptr, angle, ax, ay, az);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    * @param {number} time
    * @param {number} line_width
    * @param {number} point_size
    * @returns {number}
    */
    draw_edges(ctx, w, h, color, time, line_width, point_size) {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            var ret = wasm.model_draw_edges(this.ptr, addBorrowedObject(ctx), w, h, addHeapObject(color), time, line_width, point_size);
            return ret >>> 0;
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {number} sx
    * @param {number} sy
    * @param {number} sz
    * @returns {Model}
    */
    scale(sx, sy, sz) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.model_scale(this.ptr, sx, sy, sz);
        return Model.__wrap(ret);
    }
    /**
    * @param {number} resolution
    */
    sphere(resolution) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertNum(resolution);
        wasm.model_sphere(this.ptr, resolution);
    }
    /**
    * @param {number} dx
    * @param {number} dy
    * @param {number} dz
    * @returns {Model}
    */
    shift(dx, dy, dz) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.model_shift(this.ptr, dx, dy, dz);
        return Model.__wrap(ret);
    }
    /**
    * @param {number} dim
    * @returns {Model}
    */
    reflect(dim) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertNum(dim);
        var ret = wasm.model_reflect(this.ptr, dim);
        return Model.__wrap(ret);
    }
}
/**
*/
export class Observation {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_observation_free(ptr);
    }
}
/**
*/
export class ObservedProperty {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_observedproperty_free(ptr);
    }
}
/**
*/
export class Primitive {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_primitive_free(ptr);
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
        _assertNum(nx);
        _assertNum(ny);
        var ret = wasm.rectilineargrid_new(nx, ny);
        return RectilinearGrid.__wrap(ret);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    */
    draw(ctx, w, h, color) {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            wasm.rectilineargrid_draw(this.ptr, addBorrowedObject(ctx), w, h, addBorrowedObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {number} ii
    * @param {number} jj
    * @returns {boolean}
    */
    insert(ii, jj) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertNum(ii);
        _assertNum(jj);
        var ret = wasm.rectilineargrid_insert(this.ptr, ii, jj);
        return ret !== 0;
    }
    /**
    */
    clear() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.rectilineargrid_clear(this.ptr);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {number} frames
    * @param {any} color
    */
    animation_frame(ctx, w, h, frames, color) {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            _assertNum(frames);
            wasm.rectilineargrid_animation_frame(this.ptr, addBorrowedObject(ctx), w, h, frames, addHeapObject(color));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class Shipyard {

    static __wrap(ptr) {
        const obj = Object.create(Shipyard.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_shipyard_free(ptr);
    }
    /**
    */
    constructor() {
        var ret = wasm.shipyard_new();
        return Shipyard.__wrap(ret);
    }
    /**
    * @param {number} angle
    * @param {number} ax
    * @param {number} ay
    * @param {number} az
    */
    rotate_in_place(angle, ax, ay, az) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.shipyard_rotate_in_place(this.ptr, angle, ax, ay, az);
    }
    /**
    * @param {number} dx
    * @param {number} dy
    * @param {number} dz
    */
    shift(dx, dy, dz) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.shipyard_shift(this.ptr, dx, dy, dz);
    }
    /**
    * @param {number} sx
    * @param {number} sy
    * @param {number} sz
    */
    scale(sx, sy, sz) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.shipyard_scale(this.ptr, sx, sy, sz);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {number} time
    * @param {number} line_width
    * @param {number} point_size
    * @returns {number}
    */
    draw(ctx, w, h, time, line_width, point_size) {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            var ret = wasm.shipyard_draw(this.ptr, addBorrowedObject(ctx), w, h, time, line_width, point_size);
            return ret >>> 0;
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @param {number} res
    */
    build_ship(res) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertNum(res);
        wasm.shipyard_build_ship(this.ptr, res);
    }
    /**
    * @returns {Model}
    */
    static build_body() {
        var ret = wasm.shipyard_build_body();
        return Model.__wrap(ret);
    }
    /**
    * @returns {Model}
    */
    static build_arm() {
        var ret = wasm.shipyard_build_arm();
        return Model.__wrap(ret);
    }
    /**
    * @param {number} res
    * @param {number} S
    * @param {number} A
    * @param {number} B
    * @param {number} C
    * @returns {Model}
    */
    static build_tube(res, S, A, B, C) {
        _assertNum(res);
        var ret = wasm.shipyard_build_tube(res, S, A, B, C);
        return Model.__wrap(ret);
    }
    /**
    * @param {number} res
    * @param {number} S
    * @param {number} A
    * @param {number} B
    * @param {number} C
    * @returns {Model}
    */
    static build_tube_cover(res, S, A, B, C) {
        _assertNum(res);
        var ret = wasm.shipyard_build_tube_cover(res, S, A, B, C);
        return Model.__wrap(ret);
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

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_simplecursor_free(ptr);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    constructor(x, y) {
        var ret = wasm.simplecursor_new(x, y);
        return SimpleCursor.__wrap(ret);
    }
    /**
    * @param {number} x
    * @param {number} y
    */
    update(x, y) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.simplecursor_update(this.ptr, x, y);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    * @param {number} _time
    * @param {number} line_width
    */
    draw(ctx, w, h, color, _time, line_width) {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            wasm.simplecursor_draw(this.ptr, addBorrowedObject(ctx), w, h, addHeapObject(color), _time, line_width);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}
/**
*/
export class Texture2D {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_texture2d_free(ptr);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
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
    */
    constructor(nx, ny) {
        _assertNum(nx);
        _assertNum(ny);
        var ret = wasm.triangularmesh_new(nx, ny);
        return TriangularMesh.__wrap(ret);
    }
    /**
    * @param {CanvasRenderingContext2D} ctx
    * @param {number} w
    * @param {number} h
    * @param {any} color
    * @param {number} alpha
    * @param {number} line_width
    */
    draw(ctx, w, h, color, alpha, line_width) {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            _assertNum(this.ptr);
            _assertNum(w);
            _assertNum(h);
            wasm.triangularmesh_draw(this.ptr, addBorrowedObject(ctx), w, h, addHeapObject(color), alpha, line_width);
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
}

export const __wbindgen_string_new = function(arg0, arg1) {
    var ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

export const __wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
};

export const __wbindgen_cb_drop = function(arg0) {
    const obj = takeObject(arg0).original;
    if (obj.cnt-- == 1) {
        obj.a = 0;
        return true;
    }
    var ret = false;
    _assertBoolean(ret);
    return ret;
};

export const __wbg_instanceof_Window_d64060d13377409b = logError(function(arg0) {
    var ret = getObject(arg0) instanceof Window;
    _assertBoolean(ret);
    return ret;
});

export const __wbg_document_bcf9d67bc56e8c6d = logError(function(arg0) {
    var ret = getObject(arg0).document;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_fetch_b3f48cf99ebd282a = logError(function(arg0, arg1) {
    var ret = getObject(arg0).fetch(getObject(arg1));
    return addHeapObject(ret);
});

export const __wbg_createElement_467bb064d2ae5833 = handleError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).createElement(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
});

export const __wbg_set_234288aa11f3e098 = handleError(function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
});

export const __wbindgen_object_clone_ref = function(arg0) {
    var ret = getObject(arg0);
    return addHeapObject(ret);
};

export const __wbg_instanceof_Response_acb554d7c391aef7 = logError(function(arg0) {
    var ret = getObject(arg0) instanceof Response;
    _assertBoolean(ret);
    return ret;
});

export const __wbg_text_83594a5e8d9e514a = handleError(function(arg0) {
    var ret = getObject(arg0).text();
    return addHeapObject(ret);
});

export const __wbg_headers_1edd511ef1b065ca = logError(function(arg0) {
    var ret = getObject(arg0).headers;
    return addHeapObject(ret);
});

export const __wbg_newwithstrandinit_54427750de69ea87 = handleError(function(arg0, arg1, arg2) {
    var ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
    return addHeapObject(ret);
});

export const __wbg_bufferData_e135b678b6ef2433 = logError(function(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
});

export const __wbg_texImage2D_154146e05cef429c = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4 >>> 0, arg5 >>> 0, getObject(arg6));
});

export const __wbg_activeTexture_a4d9c550dcacf795 = logError(function(arg0, arg1) {
    getObject(arg0).activeTexture(arg1 >>> 0);
});

export const __wbg_attachShader_9958cc9636fc8494 = logError(function(arg0, arg1, arg2) {
    getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
});

export const __wbg_bindBuffer_c96c99b259d952f4 = logError(function(arg0, arg1, arg2) {
    getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
});

export const __wbg_bindTexture_998c063ed7315afd = logError(function(arg0, arg1, arg2) {
    getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
});

export const __wbg_compileShader_82966bc7f1d070fe = logError(function(arg0, arg1) {
    getObject(arg0).compileShader(getObject(arg1));
});

export const __wbg_createBuffer_501da6aef1c4b91c = logError(function(arg0) {
    var ret = getObject(arg0).createBuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_createProgram_531dab3c15c28e4f = logError(function(arg0) {
    var ret = getObject(arg0).createProgram();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_createShader_376b269548a48c7a = logError(function(arg0, arg1) {
    var ret = getObject(arg0).createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_createTexture_77f1141b79fa578d = logError(function(arg0) {
    var ret = getObject(arg0).createTexture();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_getProgramInfoLog_5def5bb3d8d30e1f = logError(function(arg0, arg1, arg2) {
    var ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
});

export const __wbg_getProgramParameter_c021157c5817259f = logError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
});

export const __wbg_getShaderInfoLog_b619769ff40aac70 = logError(function(arg0, arg1, arg2) {
    var ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
});

export const __wbg_getShaderParameter_d03718a8c98a4d23 = logError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
});

export const __wbg_linkProgram_9e60adcb42d34c3c = logError(function(arg0, arg1) {
    getObject(arg0).linkProgram(getObject(arg1));
});

export const __wbg_shaderSource_c208cc7a688e8923 = logError(function(arg0, arg1, arg2, arg3) {
    getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
});

export const __wbg_texParameteri_d819847181bb4c5a = logError(function(arg0, arg1, arg2, arg3) {
    getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
});

export const __wbg_log_cc6b9ddc6ca5449d = logError(function(arg0) {
    console.log(getObject(arg0));
});

export const __wbg_instanceof_CanvasRenderingContext2d_1112667cc1f23532 = logError(function(arg0) {
    var ret = getObject(arg0) instanceof CanvasRenderingContext2D;
    _assertBoolean(ret);
    return ret;
});

export const __wbg_setglobalAlpha_38e9b8a563afafa7 = logError(function(arg0, arg1) {
    getObject(arg0).globalAlpha = arg1;
});

export const __wbg_setstrokeStyle_4af370453cc9beef = logError(function(arg0, arg1) {
    getObject(arg0).strokeStyle = getObject(arg1);
});

export const __wbg_setfillStyle_379229e7549f4190 = logError(function(arg0, arg1) {
    getObject(arg0).fillStyle = getObject(arg1);
});

export const __wbg_setlineWidth_791bd882f2c95620 = logError(function(arg0, arg1) {
    getObject(arg0).lineWidth = arg1;
});

export const __wbg_setlineCap_f80e51156fa227b9 = logError(function(arg0, arg1, arg2) {
    getObject(arg0).lineCap = getStringFromWasm0(arg1, arg2);
});

export const __wbg_setfont_02a2069b464f8be9 = logError(function(arg0, arg1, arg2) {
    getObject(arg0).font = getStringFromWasm0(arg1, arg2);
});

export const __wbg_beginPath_3fa944f9f04ab627 = logError(function(arg0) {
    getObject(arg0).beginPath();
});

export const __wbg_fill_591769697a512b9a = logError(function(arg0) {
    getObject(arg0).fill();
});

export const __wbg_stroke_80ff74c82b2000f2 = logError(function(arg0) {
    getObject(arg0).stroke();
});

export const __wbg_createLinearGradient_813e324ba7a40ba2 = logError(function(arg0, arg1, arg2, arg3, arg4) {
    var ret = getObject(arg0).createLinearGradient(arg1, arg2, arg3, arg4);
    return addHeapObject(ret);
});

export const __wbg_putImageData_b290181a4e24024c = handleError(function(arg0, arg1, arg2, arg3) {
    getObject(arg0).putImageData(getObject(arg1), arg2, arg3);
});

export const __wbg_arc_a76d718c10697300 = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).arc(arg1, arg2, arg3, arg4, arg5);
});

export const __wbg_closePath_645de671318f9598 = logError(function(arg0) {
    getObject(arg0).closePath();
});

export const __wbg_lineTo_2f564751588d678e = logError(function(arg0, arg1, arg2) {
    getObject(arg0).lineTo(arg1, arg2);
});

export const __wbg_moveTo_7b8c1f8d728e56d3 = logError(function(arg0, arg1, arg2) {
    getObject(arg0).moveTo(arg1, arg2);
});

export const __wbg_rect_a45a5e48878e40ce = logError(function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).rect(arg1, arg2, arg3, arg4);
});

export const __wbg_clearRect_5163a03172c6613a = logError(function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).clearRect(arg1, arg2, arg3, arg4);
});

export const __wbg_fillRect_45e261a0d8e4d566 = logError(function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).fillRect(arg1, arg2, arg3, arg4);
});

export const __wbg_restore_28d621c4540ffa99 = logError(function(arg0) {
    getObject(arg0).restore();
});

export const __wbg_save_0bee05b6d23ded8e = logError(function(arg0) {
    getObject(arg0).save();
});

export const __wbg_fillText_20e548df14499144 = handleError(function(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).fillText(getStringFromWasm0(arg1, arg2), arg3, arg4);
});

export const __wbg_rotate_43a9ff93afb49de2 = handleError(function(arg0, arg1) {
    getObject(arg0).rotate(arg1);
});

export const __wbg_translate_882094cd23d918c7 = handleError(function(arg0, arg1, arg2) {
    getObject(arg0).translate(arg1, arg2);
});

export const __wbg_addColorStop_c75d1d727f815743 = handleError(function(arg0, arg1, arg2, arg3) {
    getObject(arg0).addColorStop(arg1, getStringFromWasm0(arg2, arg3));
});

export const __wbg_instanceof_HtmlCanvasElement_308a7fa689ff20ef = logError(function(arg0) {
    var ret = getObject(arg0) instanceof HTMLCanvasElement;
    _assertBoolean(ret);
    return ret;
});

export const __wbg_setwidth_568dfd10a534fefd = logError(function(arg0, arg1) {
    getObject(arg0).width = arg1 >>> 0;
});

export const __wbg_setheight_f95890a4f65f1ed9 = logError(function(arg0, arg1) {
    getObject(arg0).height = arg1 >>> 0;
});

export const __wbg_getContext_554fc171434d411b = handleError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
});

export const __wbg_newwithu8clampedarray_4799da77eec42ad7 = handleError(function(arg0, arg1, arg2) {
    var ret = new ImageData(getClampedArrayU8FromWasm0(arg0, arg1), arg2 >>> 0);
    return addHeapObject(ret);
});

export const __wbg_newnoargs_bfddd41728ab0b9c = logError(function(arg0, arg1) {
    var ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
});

export const __wbg_call_20c04382b27a4486 = handleError(function(arg0, arg1) {
    var ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
});

export const __wbg_call_49bac88c9eff93af = handleError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
});

export const __wbg_new_f46e6afe0b8a862e = logError(function() {
    var ret = new Object();
    return addHeapObject(ret);
});

export const __wbg_new_261626435fed913c = logError(function(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return __wbg_adapter_204(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        var ret = new Promise(cb0);
        return addHeapObject(ret);
    } finally {
        state0.a = state0.b = 0;
    }
});

export const __wbg_resolve_430b2f40a51592cc = logError(function(arg0) {
    var ret = Promise.resolve(getObject(arg0));
    return addHeapObject(ret);
});

export const __wbg_then_a9485ea9ef567f90 = logError(function(arg0, arg1) {
    var ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
});

export const __wbg_then_b114127b40814c36 = logError(function(arg0, arg1, arg2) {
    var ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
});

export const __wbg_globalThis_8379563d70fab135 = handleError(function() {
    var ret = globalThis.globalThis;
    return addHeapObject(ret);
});

export const __wbg_self_944d201f31e01c91 = handleError(function() {
    var ret = self.self;
    return addHeapObject(ret);
});

export const __wbg_window_993fd51731b86960 = handleError(function() {
    var ret = window.window;
    return addHeapObject(ret);
});

export const __wbg_global_073eb4249a3a8c12 = handleError(function() {
    var ret = global.global;
    return addHeapObject(ret);
});

export const __wbg_newwithbyteoffsetandlength_3c83a6445776097f = logError(function(arg0, arg1, arg2) {
    var ret = new Float32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
});

export const __wbg_floor_2ed266d3eec8ae77 = typeof Math.floor == 'function' ? Math.floor : notDefined('Math.floor');

export const __wbg_random_5f96f58bd6257873 = typeof Math.random == 'function' ? Math.random : notDefined('Math.random');

export const __wbg_buffer_985803c87989344b = logError(function(arg0) {
    var ret = getObject(arg0).buffer;
    return addHeapObject(ret);
});

export const __wbg_set_6db0a4cb6e322f85 = handleError(function(arg0, arg1, arg2) {
    var ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
    _assertBoolean(ret);
    return ret;
});

export const __wbindgen_is_undefined = function(arg0) {
    var ret = getObject(arg0) === undefined;
    _assertBoolean(ret);
    return ret;
};

export const __wbg_error_4bb6c2a97407129a = logError(function(arg0, arg1) {
    try {
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
});

export const __wbg_new_59cb74e423758ede = logError(function() {
    var ret = new Error();
    return addHeapObject(ret);
});

export const __wbg_stack_558ba5917b466edd = logError(function(arg0, arg1) {
    var ret = getObject(arg1).stack;
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
});

export const __wbindgen_string_get = function(arg0, arg1) {
    const obj = getObject(arg1);
    var ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export const __wbindgen_boolean_get = function(arg0) {
    const v = getObject(arg0);
    var ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
    _assertNum(ret);
    return ret;
};

export const __wbindgen_debug_string = function(arg0, arg1) {
    var ret = debugString(getObject(arg1));
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export const __wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

export const __wbindgen_memory = function() {
    var ret = wasm.memory;
    return addHeapObject(ret);
};

export const __wbindgen_closure_wrapper3069 = logError(function(arg0, arg1, arg2) {
    var ret = makeMutClosure(arg0, arg1, 48, __wbg_adapter_22);
    return addHeapObject(ret);
});

