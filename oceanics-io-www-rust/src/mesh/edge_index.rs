pub mod edge_index {
    /**
     * Edge index is like a CellIndex, but has only 2 nodes. The direction does not
     * matter, as they are sorted at creation. 
     */
    #[derive(Hash, Eq, PartialEq, Debug, Clone, Copy)]
    pub struct EdgeIndex {
        pub indices: [u16; 2]
    }

    impl EdgeIndex {
        /**
         * Sort the indices and create a EdgeIndex.
         * TODO: ensure uniqueness to avoid degenerate scenarios
         */
        pub fn new(a: u16, b: u16) -> EdgeIndex {
            let mut indices = [a, b];
            indices.sort();
            EdgeIndex { indices }
        }

        pub fn items(&self) -> [&u16; 2] {
            [&self.indices[0], &self.indices[1]]
        }
    }
}