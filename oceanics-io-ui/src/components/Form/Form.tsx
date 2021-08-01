/**
 * React and friends
 */
import React from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * General input
 */
import Input from "./Input";

/**
 * Button input
 */
import Button from "./Button";

/**
 * Input fields
 */
import FormField from "./FormField";


/**
 * Compile time type checking
 * @param param0 
 * @returns 
 */
type FieldType = {
    name: string,
    description: string,
    id: string
}
type ActionType = {

}
export type FormType = {
    id: string,
    fields: FieldType[],
    actions: ActionType[],
    callback: Function | null
}

/**
 * Form component encapsulates behavior of user submission forms.
 */
export const Form = ({ 
    id, 
    fields = [], 
    actions = [],
    callback = null
}: FormType) => {
    
    return <form 
        id={id}
    >
        {fields.map(({
            name=null,
            description=null,
            ...field
        }, ii) => 
            <FormField key={`${id}-field-${ii}`}>
                <label htmlFor={field.id}>
                    {`${name || field.id}: `}
                </label>
                <Input
                    onChange={(event: Event) => {
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

