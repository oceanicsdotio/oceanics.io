/**
 * React and friends
 */
import React, {ChangeEventHandler, FC} from "react";

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
import FormField from "./Field";


/**
 * Compile time type checking
 * @param param0 
 * @returns 
 */
type FieldType = {
    name: string;
    description: string;
    id: string;
}
type ActionType = {

}
export type FormType = {
    id: string;
    fields: FieldType[];
    actions?: ActionType[];
    callback?: ChangeEventHandler<HTMLInputElement>;
}

/**
 * Form component encapsulates behavior of user submission forms.
 */
export const Form: FC<FormType> = ({ 
    id, 
    fields = [], 
    actions = [],
    callback
}) => {
    
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
                    onChange={callback} 
                    {...field}
                />
                <div>{description}</div>
            </FormField>
        )}
        
        {actions.map((props, ii) => 
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

