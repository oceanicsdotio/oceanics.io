pub mod cell {
    /**
     * A cell is and interior space define by joined vertices.
     * This is duplicated in all topological models to reduce cross- 
     * boundary imports.
     * 
     * The `mask` attribute is used to indicate whether the cell is active.
     */
    pub struct Cell {
        pub mask: bool
    }
}