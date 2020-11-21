import React from "react";
import styled from "styled-components";
import {red, ghost, shadow} from "../palette";


const InputDescription = styled.div`
    color: ${ghost};
    font-size: smaller;
    font-style: italic;
`;

export const Input = ({
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

export const InputWrapper = styled(Input)`

    background-color: ${({destructive}) => destructive ? "orange" : shadow};
    color: ${({destructive}) => destructive ? red : ghost};
    border: solid 1px;
    display: block;
    font-family: inherit;
    font-size: inherit;
    cursor: ${({type}) => type==="button" ? "pointer" : null};
    
    -webkit-appearance: none;  /*Removes default chrome and safari style*/
    -moz-appearance: none;  /*Removes default style Firefox*/

    ::after {
        content: ${({required})=>required?"'(!)'":null};
        color: orange;
        font-size: smaller;
    }
`;

const FormField = styled.div`
    margin-bottom: 1rem;    
`;

export const Form = ({ 
    id, 
    fields = null, 
    actions,
    callback = null
}) => {
    /*
    Form component encapuslates behavior of user submission forms.
    */
    return <form id={id}>
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
                        callback(event);
                    }}
                    {...field}
                />
                <InputDescription>{description}</InputDescription>
            </FormField>
        )}
        
        {actions.map((props, ii) => 
            <InputWrapper 
                key={`${id}-action-${ii}`}
                type={"button"} 
                {...props}
            />
        )}
    
    </form>
};

export const StyledForm = styled(Form)`
    display: inline-block;
`;

export default StyledForm;