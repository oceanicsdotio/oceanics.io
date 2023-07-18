use super::{Cypher, WRITE};
/**
 * Data structure representing a Node Index, which can be used to
 * to create index on node property to speed up retrievals and enforce
 * unique constraints.
 */
pub struct Constraint {
    pub label: String,
    pub key: String,
}

// Rust-only methods
impl Constraint {
    /**
     * Indexes add a unique constraint as well as 
     * speeding up queries on the graph database.
     */
    fn _create_index(&self) -> Cypher {
        let query = format!(
            "CREATE INDEX IF NOT EXISTS FOR (n:{}) ON (n.{})",
            self.label, self.key
        );
        Cypher::new(query, WRITE)
    }

    /**
     * Remove the index.
     */
    fn _drop_index(&self) -> Cypher {
        let query = format!("DROP INDEX ON : {}({})", self.label, self.key);
        Cypher::new(query, WRITE)
    }

}

/**
 * Public implementation for NodeIndex
 */
impl Constraint {
    /**
     * Apply a unique constraint, without creating 
     * an index.
     */
    pub fn unique_constraint(&self) -> Cypher {
        let query = format!(
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:{}) REQUIRE n.{} IS UNIQUE",
            self.label, self.key
        );
        Cypher::new(query, WRITE)
    }
}

#[cfg(test)]
mod tests {
    use super::Constraint;
    
    #[test]
    fn create_constraint_condition() {
        let label = "Things".to_string();
        let key = "uuid".to_string();
        let _constraint = Constraint{
            label, 
            key
        };
    }

    #[test]
    fn unique_constraint_query() {
        let label = "Things".to_string();
        let key = "uuid".to_string();
        let constraint = Constraint{
            label, 
            key
        };
        let cypher = constraint.unique_constraint();
        assert!(cypher.query.len() > 0);
        assert!(!cypher.read_only);
    }

    #[test]
    fn drop_index_query() { 
        let label = "Things".to_string();
        let key = "uuid".to_string();
        let constraint = Constraint{
            label, 
            key
        };
        let cypher = constraint._drop_index();
        assert!(cypher.query.len() > 0);
        assert!(!cypher.read_only);
    }

    #[test]
    fn create_index_query() {
        let label = "Things".to_string();
        let key = "uuid".to_string();
        let constraint = Constraint{
            label, 
            key
        };
        let cypher = constraint._create_index();
        assert!(cypher.query.len() > 0);
        assert!(!cypher.read_only);
    }
}