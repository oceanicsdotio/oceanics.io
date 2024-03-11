import React from "react";
import type {ChangeEventHandler, MouseEventHandler} from "react";
import styled from "styled-components";
import {ghost, orange, grey, charcoal, red} from "../../palette";

export interface InputType {
    name?: string
    description?: string
    id: string
}
export interface FieldType extends InputType {
    type: "password"|"email"|"text"|"number"|"submit"
    disabled?: true
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    step?: number
    pattern?: string
    placeholder?: string
    readonly?: boolean
    required?: true
    value?: any
}
export interface SelectType extends InputType{
    options: string[]
    onChange?: ChangeEventHandler<HTMLSelectElement>
}
type ActionType = {
    id: string
    disabled?: boolean
    name?: string
    value?: string
} & ({
    onClick: MouseEventHandler
} | {
    type: "submit"
});

export type FormType = {
    /**
     * Unique form identifier
     */
    id: string
    /**
     * Form data submission action 
     */
    action: (data: FormData) => void
    /**
     * Name of the form
     */
    name?: string
    /**
     * Styled components hook
     */
    className?: string
    /**
     * Array of inputs to render
     */
    fields?: FieldType[]
    /**
     * Array of selects to render
     */
    enums?: SelectType[]
    /**
     * Additional button actions that can use the form data
     */
    actions?: ActionType[]
    /**
     * Callback for input value changes
     */
    onChange?: ChangeEventHandler<HTMLInputElement>
};

/**
 * Form component used across the site
 * to standardize the data entry experience.
 */
export const Form = ({ 
    id,
    action,
    name="",
    className,
    fields=[],
    enums=[],
    actions=[],
    onChange
}: FormType) => {
    // pre-process to make render more simple
    const _inputs = ({description="", ...props}: FieldType) => {
        return {
            ...props,
            description,
            name: props.name??props.id,
            key: `${id}-${props.id}`
        };
    };
    const _selects = ({options, ...props}: SelectType, index: number) => {
        return {
            ...props,
            name: props.name??props.id,
            key: `${id}-${props.id}`,
            options: options.map((option) => {
                return {
                    value: option, 
                    key: `${id}-option-${index}`
                }
            })
        }
    };
    const _buttons = (props: ActionType) => {
        return {
            ...props,
            value: props.value??props.name??props.id,
            key: `${id}-${props.id}`,
            form: id,
            name: props.name??props.id
        }
    };

    return (
        <form id={id} className={className} action={action}>
            <h1>{name??id}</h1>
            {fields.map(_inputs).map(({key, description, ...props}) => 
                <div key={key}>
                    <label htmlFor={props.id}>{props.name}</label>
                    <input onChange={onChange} {...props}/>
                    <div>{description}</div>
                </div>)}
            {enums.map(_selects).map(({key, options, ...props}) => 
                <div key={key}>
                    <label htmlFor={props.id}>{props.name}</label>
                    <select {...props}>
                        {options.map(({key, ...props}) => 
                            <option key={key} {...props}>{props.value}</option>)}
                    </select>
                </div>)}
            {actions.map(_buttons).map(({key, ...action}) => 
                <button key={key} {...action}>{action.name}</button>)}
        </form>
    )
}

export const StyledForm = styled(Form)`
    display: block;
    max-width: 65ch;
    padding: 1rem 1rem;
    margin: 0;
    border-radius: 5px;
    background-color: ${charcoal};
    color: ${ghost};
    -webkit-appearance: none; 
    -moz-appearance: none;

    & h1 {
        text-transform: capitalize;
    }

    & div {
        margin: 1rem 0;
    }

    & input, button, select {
        // layout
        width: 100%;
        display: block;
        box-sizing: border-box;
        padding: 0.25rem;
        margin: 0.5rem 0;

        // appearance
        appearance: none;
        -webkit-appearance: none; 
        -moz-appearance: none;
        font-family: inherit;
        font-size: inherit;
        color: ${ghost};
        border: 1px dashed ${grey};
        border-radius: 5px;
        background-color: ${charcoal};

        &:focus, &:hover {
            border-color: ${orange};
            color: ${orange};
        }
    }

    & input {
        &:invalid {
            border-color: ${red};
            color: ${red};
        }
    }

    &:invalid input[type="submit"] {
        border: 1px solid ${red};
        color: ${red};
    }

    & button {
        text-transform: capitalize;
    }

    & input ~ div {
        color: ${grey};
    }

    & label, input ~ div {
        display: block;
        font-size: smaller;
        font-style: italic;
        text-transform: lowercase;
        margin: 0;
    }
`;

Form.displayName = "Form";

export default StyledForm;