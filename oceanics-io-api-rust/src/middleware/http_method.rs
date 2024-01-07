use std::str::FromStr;
use std::fmt;

/**
 * For request matching. 
 */
#[derive(Debug, PartialEq, Copy, Clone, Eq, Hash)]
pub enum HttpMethod {
    POST,
    PUT,
    OPTIONS,
    QUERY,
    DELETE,
    GET,
    HEAD
}

impl FromStr for HttpMethod {
    type Err = ();
    fn from_str(input: &str) -> Result<HttpMethod, Self::Err> {
        match input {
            "POST" => Ok(HttpMethod::POST),
            "PUT" => Ok(HttpMethod::PUT),
            "OPTIONS" => Ok(HttpMethod::OPTIONS),
            "QUERY" => Ok(HttpMethod::QUERY),
            "DELETE" => Ok(HttpMethod::DELETE),
            "GET" => Ok(HttpMethod::GET),
            "HEAD" => Ok(HttpMethod::HEAD),
            _ => Err(()),
        }
    }
}

impl fmt::Display for HttpMethod {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_string())
    }
}
