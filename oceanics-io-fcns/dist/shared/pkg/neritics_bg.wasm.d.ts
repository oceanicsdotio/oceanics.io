/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export function __wbg_islandkernel_free(a: number): void;
export function __wbg_get_islandkernel_mask(a: number): number;
export function __wbg_set_islandkernel_mask(a: number, b: number): void;
export function __wbg_get_islandkernel_depth(a: number): number;
export function __wbg_set_islandkernel_depth(a: number, b: number): void;
export function __wbg_interactivegrid_free(a: number): void;
export function interactivegrid_new(a: number, b: number, c: number, d: number): number;
export function interactivegrid_update_cursor(a: number, b: number, c: number): void;
export function interactivegrid_draw(a: number, b: number, c: number, d: number): void;
export function __wbg_minimap_free(a: number): void;
export function image_data(a: number, b: number): number;
export function x_transform(a: number, b: number, c: number): number;
export function z_transform(a: number, b: number, c: number): number;
export function minimap_new(a: number, b: number, c: number, d: number, e: number, f: number): number;
export function minimap_get_dynamic_tile(a: number, b: number, c: number, d: number, e: number, f: number, g: number): void;
export function minimap_drawTile(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number): void;
export function minimap_set_actions(a: number, b: number): void;
export function minimap_actions(a: number): number;
export function minimap_insertFeature(a: number, b: number): void;
export function minimap_score(a: number): number;
export function minimap_get_tile(a: number, b: number): number;
export function minimap_replaceTile(a: number, b: number, c: number): void;
export function minimap_clear(a: number): void;
export function minimap_insertTile(a: number, b: number, c: number, d: number): number;
export function minimap_get_mask(a: number, b: number): number;
export function minimap_visible(a: number, b: number): number;
export function minimap_view_x(a: number): number;
export function minimap_view_y(a: number): number;
export function minimap_updateView(a: number, b: number, c: number, d: number): void;
export function minimap_draw_bbox(a: number, b: number): void;
export function minimap_draw_image_data(a: number, b: number): void;
export function __wbg_tile_free(a: number): void;
export function __wbg_feature_free(a: number): void;
export function __wbg_tileset_free(a: number): void;
export function __wbg_interactivedatastream_free(a: number): void;
export function interactivedatastream_new(a: number): number;
export function interactivedatastream_draw(a: number, b: number, c: number, d: number): void;
export function interactivedatastream_push(a: number, b: number, c: number): void;
export function interactivedatastream_size(a: number): number;
export function interactivedatastream_update_cursor(a: number, b: number, c: number): void;
export function bind_attribute(a: number, b: number, c: number, d: number): void;
export function create_program(a: number, b: number, c: number, d: number, e: number): number;
export function create_buffer(a: number, b: number, c: number): number;
export function bind_texture(a: number, b: number, c: number): void;
export function create_texture(a: number, b: number, c: number, d: number, e: number): number;
export function __wbg_cypher_free(a: number): void;
export function __wbg_get_cypher_read_only(a: number): number;
export function __wbg_set_cypher_read_only(a: number, b: number): void;
export function cypher_new(a: number, b: number, c: number): number;
export function cypher_query(a: number, b: number): void;
export function __wbg_node_free(a: number): void;
export function node_new(a: number, b: number, c: number, d: number, e: number, f: number): number;
export function node_allLabels(): number;
export function node_patternOnly(a: number, b: number): void;
export function node_symbol(a: number, b: number): void;
export function node_cypherRepr(a: number, b: number): void;
export function node_delete(a: number): number;
export function node_mutate(a: number, b: number): number;
export function node_load(a: number, b: number, c: number): number;
export function node_create(a: number): number;
export function __wbg_nodeindex_free(a: number): void;
export function nodeindex_new(a: number, b: number, c: number, d: number): number;
export function nodeindex_add(a: number): number;
export function nodeindex_drop(a: number): number;
export function nodeindex_unique_constraint(a: number): number;
export function __wbg_links_free(a: number): void;
export function __wbg_get_links_cost(a: number, b: number): void;
export function __wbg_set_links_cost(a: number, b: number, c: number): void;
export function __wbg_get_links_rank(a: number, b: number): void;
export function __wbg_set_links_rank(a: number, b: number, c: number): void;
export function links_new(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number): number;
export function links_drop(a: number, b: number, c: number): number;
export function links_join(a: number, b: number, c: number): number;
export function links_query(a: number, b: number, c: number, d: number, e: number): number;
export function links_insert(a: number, b: number, c: number): number;
export function links_deleteChild(a: number, b: number, c: number): number;
export function links_delete(a: number, b: number, c: number): number;
export function __wbg_interactivemesh_free(a: number): void;
export function interactivemesh_new(a: number, b: number): number;
export function interactivemesh_draw(a: number, b: number, c: number, d: number): void;
export function interactivemesh_updateState(a: number, b: number, c: number, d: number, e: number): void;
export function interactivemesh_updateCursor(a: number, b: number, c: number): void;
export function interactivemesh_rotate(a: number, b: number, c: number, d: number, e: number): void;
export function __wbg_simplecursor_free(a: number): void;
export function __wbg_get_simplecursor_x(a: number): number;
export function __wbg_set_simplecursor_x(a: number, b: number): void;
export function __wbg_get_simplecursor_y(a: number): number;
export function __wbg_set_simplecursor_y(a: number, b: number): void;
export function simplecursor_new(a: number, b: number): number;
export function simplecursor_update(a: number, b: number, c: number): void;
export function simplecursor_draw(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number): void;
export function __wbg_contextcursor_free(a: number): void;
export function contextcursor_new(a: number, b: number): number;
export function contextcursor_ticks(a: number, b: number, c: number, d: number, e: number): void;
export function contextcursor_update(a: number, b: number, c: number): void;
export function contextcursor_draw(a: number, b: number, c: number, d: number, e: number, f: number, g: number): void;
export function __wbg_prismcursor_free(a: number): void;
export function prismcursor_new(a: number, b: number, c: number, d: number): number;
export function prismcursor_update(a: number, b: number, c: number): void;
export function prismcursor_gridX(a: number, b: number): number;
export function prismcursor_gridY(a: number, b: number): number;
export function prismcursor_x(a: number): number;
export function prismcursor_y(a: number): number;
export function greet(): void;
export function get_rust_data(a: number): void;
export function hello_world(a: number, b: number, c: number): void;
export function panic_hook(): void;
export function create_color_map_canvas(a: number): number;
export function clear_rect_blending(a: number, b: number, c: number, d: number): void;
export function draw_caption(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number): void;
export function draw_fps(a: number, b: number, c: number, d: number): number;
export function draw_single_pixel(a: number, b: number, c: number, d: number, e: number): void;
export function alloc(a: number): number;
export function dealloc(a: number, b: number): void;
export function fetch_text(a: number, b: number): number;
export function make_vertex_array(a: number, b: number, c: number): void;
export function photosynthetically_active_radiation(a: number, b: number, c: number): number;
export function __wbindgen_malloc(a: number): number;
export function __wbindgen_realloc(a: number, b: number, c: number): number;
export const __wbindgen_export_2: WebAssembly.Table;
export function _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h5428fd0af30f14ee(a: number, b: number, c: number): void;
export function __wbindgen_add_to_stack_pointer(a: number): number;
export function __wbindgen_free(a: number, b: number): void;
export function __wbindgen_exn_store(a: number): void;
export function wasm_bindgen__convert__closures__invoke2_mut__he635f268f2714aeb(a: number, b: number, c: number, d: number): void;
