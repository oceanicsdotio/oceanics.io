import React from "react";
import type {ChangeEventHandler, MouseEventHandler} from "react";
import styled from "styled-components";

import Input from "./Input";
import Button from "./Button";
import Field from "./Field";
import type {FieldType} from "./Field"

/**
 * Compile time type checking
 */
type ActionType = {
    id: string;
    onClick: MouseEventHandler;
};
export type FormType = {
    id: string;
    className?: string;
    fields: FieldType[];
    actions: ActionType[];
    onChange: ChangeEventHandler<HTMLInputElement>;
};

/**
 * Base version of the form, without styled components. 
 */
const Form = ({ 
    id, 
    className,
    fields, 
    actions,
    onChange
}: FormType) => 
    <form id={id} className={className}>
        {fields.map((field: FieldType) => 
            <Field key={`${id}-${field.id}`}>
                <label htmlFor={field.id}>{`${field.name ?? field.id}: `}</label>
                <Input onChange={onChange} {...field}/>
                <div>{field.description??""}</div>
            </Field>
        )}
        {actions.map((action: ActionType) => 
            <Button key={`${id}-${action.id}`} {...action}/>
        )}
    </form>


/**
 * Styled version of the Form component. 
 */
export const StyledForm = styled(Form)`
    display: inline-block;
    align-content: center;
`;

export default StyledForm;