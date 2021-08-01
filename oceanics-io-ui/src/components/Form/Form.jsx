import React from "react";
import styled from "styled-components";


import Input from "../Input";
import Button from "../Button";



/**
Form component encapsulates behavior of user submission forms.
*/
export const Form = ({ 
    id, 
    fields = null, 
    actions = null,
    callback = null
}) => {
    
    return <form 
        id={id}
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
                <Input
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
            <Button 
                key={`${id}-action-${ii}`}
                {...props}
            />
        )}
    
    </form>
};


/**
 * Styled version of the Form component
 */
export const StyledForm = styled(Form)`
    display: inline-block;
    align-content: center;
`;

export default StyledForm;

