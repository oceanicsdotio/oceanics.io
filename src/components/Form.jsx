import React from "react";
import styled from "styled-components";
import {red, ghost, shadow, orange, pink, grey} from "../palette";


const StyledTextArea = styled.div`
    background: none;
    border: none;
    position: relative;
    display: block;
    color: ${ghost};
    margin: 0;
    word-wrap: break-word;
    word-break: break-all;
    padding: 0.5rem;
`;


/**
 * A note is just a free form text area that can be changed by users
 * to collaborativle update information that does not cleanly fit
 * into the schema as it currently exists.
 */
const Note = ({
    placeholder="..."
}) => 
    <StyledTextArea 
        contentEditable={true}
        suppressContentEditableWarning={true}
    >
        {placeholder}
    </StyledTextArea>;


/**
 * Generic form input component that converts to the
 * appropriate type
 */
const Input = ({
    id,
    type,
    className,
    name=null,
    options=null,
    ...props
}) => {

    switch (type) {
        case "long":
            return <textarea
                id={id}
                className={className}
                name={name || id}
                {...props}
            />
        case "select":
            return <select 
                id={id} 
                className={className}
                name={name || id} 
                {...props}
            >
                {(options||[]).map((x, ii) => 
                    <option key={`${id}-option-${ii}`} value={x}>{x}</option>
                )}
            </select>
        case "button":  // doesn't use name || id
            return <input
                id={id}
                className={className}
                type={type}
                {...props}
            />

        default:
            return <input 
                id={id}
                className={className}
                type={type}
                name={name || id}
                {...props}  
            />
    }
};

/**
 * The InputWrapper component is a styled version of the standard
 * Input
 */
export const InputWrapper = styled(Input)`

    background-color: ${({destructive}) => {
        if (destructive) return orange;
        return shadow;
    }};
    
    color: ${({destructive, type}) => {
        if (destructive) return red;
        if (type === "button") return orange;
        return ghost;
    }};

    border: solid 0.1rem;
    border-radius: 0.25rem;
    padding: 0.25rem;
    margin: 0;
    margin-bottom: 0.5rem;

    display: block;
    font-family: inherit;
    font-size: inherit;
    width: 100%;
    
    box-sizing: border-box;

    cursor: ${({type}) => type === "button" ? "pointer" : null};
    
    -webkit-appearance: none;  /*Removes default chrome and safari style*/
    -moz-appearance: none;  /*Removes default style Firefox*/

    ::after {
        content: ${({required})=>required?"'(!)'":null};
        color: orange;
        font-size: smaller;
    }

    & > * {
        padding: 0;
        margin: 0;
        max-width: 100%;
    } 
`;


/**
 * FormField is the container for a form input
 * and its metadata.
 */
const FormField = styled.div`

    margin-bottom: 1rem;  
    box-sizing: border-box;

    & > div {
        color: ${ghost};
        font-size: smaller;
        font-style: italic;
    }  

    & > select {
        -moz-appearance: none;
        -webkit-appearance: none;
        appearance: none;
        background-color: ${shadow};

        & > option {
            font-size: inherit;
            font-family: inherit;
            color: ${pink};
        }

        &:focus {
            border-color: ${orange};
            box-shadow: none;
            color: ${orange}; 
            outline: none;
        }

        &::-ms-expand {
            display: none;
        }
    }
`;

/**
Form component encapuslates behavior of user submission forms.
*/
export const Form = ({ 
    id, 
    fields = null, 
    actions = null,
    callback = null
}) => {
    
    return <form 
        id={id} 
        name={id} 
        method={"post"} 
        data-netlify={"true"} 
        data-netlify-honeypot={"bot-field"}
    >
        {(fields || []).map(({
            name=null,
            description=null,
            ...field
        }, ii) => 
            <FormField key={`${id}-field-${ii}`}>
                <label htmlFor={field.id}>
                    {`${name || field.id}: `}
                </label>
                <InputWrapper
                    onChange={(event) => {
                        event.persist();
                        if (callback) callback(event);
                    }}
                    {...field}
                />
                <div>{description}</div>
            </FormField>
        )}
        
        {(actions || []).map((props, ii) => 
            <InputWrapper 
                key={`${id}-action-${ii}`}
                type={"button"} 
                {...props}
            />
        )}
        {<input type="hidden" name="form-name" value={id} />}
    
    </form>
};


/**
Styled version of the Form component
*/
export const StyledForm = styled(Form)`
    display: inline-block;
    align-content: center;
`;

export default StyledForm;
