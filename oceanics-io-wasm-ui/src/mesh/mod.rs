pub mod cell_index;
pub mod edge_index;
pub mod edge;
pub mod index_interval;
pub mod interactive_mesh;
pub mod style;
pub mod topology;
pub mod triangular_mesh;
pub mod vertex_array;

/**
 * The `mesh` module provides and interactive and non-interactive
 * version of a 2D unstructured (or optionally structured) triangular mesh.
 * 
 * Contains the data structures:
 * - `CellIndex`: 3-integer index to HashMap
 * - `EdgeIndex`: 2-integer index to HashMap
 * - `Edge`: Edge data
 * - `Topology`: Topological data structs
 * - `TriangularMesh`: VertexArray + Topology
 * - `VertexArrayBuffer`
 * - 
 */
pub mod mesh {
    use crate::vec3::vec3::Vec3;

    /*
    * Update the agent position from velocity. 
    * 
    * The environmental effects are:
    * - drag: lose velocity over time
    * - bounce: lose velocity on interaction
    */      
    pub fn next_state(coordinates: &Vec3, velocity: &Vec3, drag: f64, bounce: f64, dt: f64) -> [[f64; 3]; 2] {
    
        let mut new_v: Vec3 = velocity * (1.0 - drag);
        let mut new_c: Vec3 = coordinates + new_v * dt;

        for dim in 0..3 {
            let val = new_c.value[dim];
            if val > 1.0 {
                let delta = val - 1.0;
                new_c.value[dim] -= 2.0*delta;
                
                new_v.value[dim] *= -bounce;
            } else if val < 0.0 {
                new_c.value[dim] -= 2.0*val;
                new_v.value[dim] *= -bounce;
            }
        }

        [new_c.value, new_v.value]
    }


    pub fn color_map_z(z: f64, fade: &f64) -> String {
        format!(
            "rgba({},{},{},{:.2})", 
            255,
            0,
            255,
            1.0 - fade * z
        )
    }
}