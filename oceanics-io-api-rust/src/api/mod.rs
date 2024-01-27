use wasm_bindgen::prelude::*;
use crate::cypher::{Node,Links};
use crate::middleware::{
    server_error_response, 
    unauthorized_response, 
    MiddlewareError,
    Context,
    Claims
};

/// The /left/uuid/right POST handler
#[wasm_bindgen(js_name = "joinNodesQuery")]
pub fn join_nodes_query(ctx: &Context, label: Option<String>) -> Result<String, JsError> {
    let errors = ctx.check_user_left_and_right();
    if errors.len() > 0 {
        let error = server_error_response(
            "joinNodesQuery".to_string(),
            errors,
            None
        );
        return Err(error);
    }
    let cypher = Links::new(
        label,
        None,
        None,
        None
    ).join(
        ctx.left.as_ref().unwrap(), 
        ctx.right.as_ref().unwrap()
    );
    Ok(cypher.query)
}

/// The /{left}/{uuid}/{right} DELETE method
#[wasm_bindgen(js_name = "dropLinkQuery")]
pub fn drop_link_query(ctx: &Context, label: Option<String>) -> Result<String, JsError> {
    let errors = ctx.check_user_left_and_right();
    if errors.len() > 0 {
        let error = server_error_response(
            "dropLinkQuery".to_string(),
            errors,
            None
        );
        return Err(error);
    }
    let cypher = Links::with_label(label).drop(
        ctx.left.as_ref().unwrap(), 
        ctx.right.as_ref().unwrap()
    );
    Ok(cypher.query)
}

/// The /auth DELETE method
#[wasm_bindgen(js_name = "dropAllLinkedNodesQuery")]
pub fn drop_all_linked_nodes_query(ctx: &Context) -> Result<String, JsError> {
    let errors = ctx.check_user();
    if errors.len() > 0 {
        let error = server_error_response(
            "dropAllLinkedNodesQuery".to_string(),
            errors,
            None
        );
        return Err(error);
    }
    let wildcard = Node::new(None, None, None);
    let cypher = crate::cypher::links::Links::new(
        None,
        None,
        None,
        None
    ).drop(
        ctx.user.as_ref().unwrap(), 
        &wildcard
    );
    Ok(cypher.query)
}

/// The DELETE /{type} or /{type}/{uuid}
#[wasm_bindgen(js_name = "dropOneLinkedNodeQuery")]
pub fn drop_one_linked_node_query(ctx: &Context) -> Result<String, JsError> {
    let errors = ctx.check_user_and_left();
    if errors.len() > 0 {
        let error = server_error_response(
            "dropOneLinkedNodeQuery".to_string(),
            errors,
            None
        );
        return Err(error);
    }
    let cypher = crate::cypher::links::Links::blank().drop(
        ctx.user.as_ref().unwrap(), 
        ctx.left.as_ref().unwrap()
    );
    Ok(cypher.query)
}

/// The /{type} POST handler.
#[wasm_bindgen(js_name = "insertLinkedNodeQuery")]
pub fn insert_linked_node_query(ctx: &Context, label: Option<String>) -> Result<String, JsError> {
    let errors = ctx.check_user_and_left();
    if errors.len() > 0 {
        let error = server_error_response(
            "insertLinkedNodeQuery".to_string(),
            errors,
            None
        );
        return Err(error);
    }
    let link = Links::new(label, Some(0), Some(0.0), Some("".to_string()));
    let cypher = link.insert(
        ctx.user.as_ref().unwrap(),
        ctx.left.as_ref().unwrap()
    );
    Ok(cypher.query)
}

/// The /auth POST endpoint handler after 
/// middleware
#[wasm_bindgen(js_name = "registerQuery")]
pub fn register_query(ctx: &Context, label: Option<String>) -> Result<String, JsError> {
    let cypher = ctx.user.as_ref().unwrap().create();
    Ok(cypher.query)
}

#[wasm_bindgen(js_name = "metadataQuery")]
pub fn metadata_query(ctx: &Context) -> Result<String, JsError> {
    let link = Links::new(None, None, None, None);
    let errors = ctx.check_user_and_left();
    if errors.len() > 0 {
        let error = server_error_response(
            "metadataQuery".to_string(),
            errors,
            None
        );
        return Err(error);
    }
    let left = ctx.left.as_ref().unwrap();
    let cypher = link.query(
        ctx.user.as_ref().unwrap(), 
        left, 
        left.symbol()
    );
    Ok(cypher.query)
}

/// Produces a Cypher query string that will
/// try to match a User pattern based on the 
/// basic authentication credentials. This 
/// should only be called when issuing a JWT.
#[wasm_bindgen(js_name = "basicAuthQuery")]
pub fn basic_auth_query(ctx: &Context) -> Result<String, JsError> {
    let errors = ctx.check_user();
    if errors.len() > 0 {
        let error = unauthorized_response(
            "basicAuthQuery".to_string(),
            errors,
            None
        );
        return Err(error);
    }
    let cypher = ctx.user.as_ref().unwrap().load(None);
    Ok(cypher.query)
}

#[wasm_bindgen(js_name = "allLabelsQuery")]
pub fn all_labels_query() -> Result<String, JsError> {
    let cypher = Node::all_labels();
    Ok(cypher.query)
}

#[wasm_bindgen(js_name="unauthorizedMultipleMatchingCredentials")]
pub fn unauthorized_multiple_matching_credentials(operation: String) -> JsError {
    unauthorized_response(
        operation,
        vec![MiddlewareError::MultipleCredentialResolutions],
        None
    )
}

#[wasm_bindgen(js_name="unauthorizedNoMatchingCredentials")]
pub fn unauthorized_no_matching_credentials(operation: String) -> JsError {
    unauthorized_response(
        operation,
        vec![MiddlewareError::NoCredentialResolution],
        None
    )
}

/// Called only after auth flow has a valid 
/// claim. Either we got a JWT, or loaded 
/// user from database after basic auth.
#[wasm_bindgen(js_name = "issueUserToken")]
pub fn issue_token(ctx: &Context, sub: &str, signing_key: &str) -> Result<String, JsError> {
    let errors = ctx.check_user();
    if errors.len() > 0 {
        let error = server_error_response(
            "issueUserToken".to_string(),
            errors,
            None
        );
        return Err(error);
    }
    let claims = Claims::new(
        sub.to_string(),
        "oceanics.io".to_string(),
        3600
    );
    
    Ok(claims.encode(signing_key).unwrap())
}