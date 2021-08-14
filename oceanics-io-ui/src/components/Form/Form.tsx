/**
 * React and friends
 */
import React, {ChangeEventHandler, FC, MouseEventHandler} from "react";

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
import Field, {FieldType} from "./Field";

/**
 * Compile time type checking
 */
type ActionType = {
    id: string;
    onClick: MouseEventHandler;
};
type FormType = {
    id: string;
    className?: string;
    fields: FieldType[];
    actions: ActionType[];
    onChange: ChangeEventHandler<HTMLInputElement>;
};

/**
 * 
 */
export const Form: FC<FormType> = ({ 
    id, 
    className,
    fields, 
    actions,
    onChange
}) => 
    <form id={id} className={className}>
        {(fields??[]).map((field: FieldType) => 
            <Field key={`${id}-${field.id}`}>
                <label htmlFor={field.id}>{`${field.name ?? field.id}: `}</label>
                <Input onChange={onChange} {...field}/>
                <div>{field.description??""}</div>
            </Field>
        )}
        {(actions??[]).map((action: ActionType) => 
            <Button key={`${id}-${action.id}`} {...action}/>
        )}
    </form>


/**
 * Styled version of the Form component
 */
export const StyledForm = styled(Form)`
    display: inline-block;
    align-content: center;
`;

export default StyledForm;

