pub mod cell_index {    
    /**
     * A hashable cell index is necessary because a HashSet cannot
     * be used as the key to a HashMap.
     * 
     * The following rules and properties apply:
     * - first index is always the lowest
     * - triangle is assumed to be wound counter-clockwise
     * - flipping inverts winding
     * - triangles with same indices but different windings are not identical (two-sided)
     */
    #[derive(Hash, Eq, PartialEq, Debug, Copy, Clone)]
    pub struct CellIndex {
        pub indices: [u16; 3],
    }

    impl CellIndex {
        /**
         * Sort the indices and create a CellIndex.
         */
        pub unsafe fn new(a: u16, b: u16, c: u16) -> CellIndex {
           
            if a == b || b == c || c == a {
                panic!("Degenerate CellIndex ({},{},{})", a, b, c);
            }
            let indices = [a, b, c];
            let mut index = CellIndex { indices };
            index.sort();
            index
        }

        /**
         * Wrapping getter
         */
        pub fn get(&self, position: usize) -> u16 {
            self.indices[position % 3]
        }

        /**
         * Swap any two indices in place
         */
        fn swap(&mut self, a: usize, b: usize) {
            let temp = self.indices[a];
            self.indices[a] = self.indices[b];
            self.indices[b] = temp;
        }

        /**
         * Invert the winding of the triangle while
         * keeping the first vertex the same
         */
        pub fn flip(&mut self) {
            self.swap(1, 2);
        }

        /*
         * Sorting should put lowest index first, but preserve the
         * winding of the triangle by shifting instead of reordering.
         * 
         * If the third is smallest, shift shift left 2
         * If the second is smallest, shift left 1
         * Else, do nothing
         * 
         * Shifting left is accomplished with 2 swaps.
         */
        fn sort(&mut self) {
            while self.indices[0] > self.indices[1] || self.indices[0] > self.indices[2] {
                self.swap(0, 1);
                self.swap(1, 2)
            }
        }
    }
}
