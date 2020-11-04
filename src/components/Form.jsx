import React from "react";
import styled from "styled-components";
import {red, ghost} from "../palette"

const StyledButtonPane = styled.div`
    margin-top: 10px;
`;

const StyledForm = styled.form`
    display: inline-block;
`;

const StyledInput = styled.input`
    display: block;
`;

const StyledInputWrapper = styled.div``;


const StyledInputButton = styled.input`
    display: block;
    background-color: ${props => props.destructive ? "orange" : "black"};
    color: ${props => props.destructive ? red : ghost};
`;

const StyledInputWrapperRequired = styled.div({
    "::after": {
        "content": "'required ↑'",  // requires extra quotes to render
        "color": "orange",
        "font-size": "smaller",
    }
});

const StyledLabel = styled.label`
    display: block;
    font-size: smaller;
`;

const StyledSelect = styled.select`
    background: #101010AA;
    border: solid 1px;
    display: block;
    font-family: inherit;
    font-size: inherit;
    color: #ccc;
    -webkit-appearance: none;  /*Removes default chrome and safari style*/
    -moz-appearance: none;  /*Removes default style Firefox*/
`;

const StyledTextArea = styled.textarea`
    background: #101010AA;
    border: solid 1px;
    display: block;
    font-family:inherit;
    font-size: inherit;
    color: #ccc;
    -webkit-appearance: none;  /*Removes default chrome and safari style*/
    -moz-appearance: none;  /*Removes default style Firefox*/
`;


const Label = ({id, name}) => {
    return <StyledLabel htmlFor={id}>{name.toUpperCase()}:</StyledLabel>;
};

const TextInput = ({ 
    id, 
    inputType = "text", 
    name = "", 
    placeholder, 
    long = false,
    required = false,
}) => {
    /*
    Text inputs add an additional layer of QA/QC over normal
    forms. 
    */

    const useName = name.length ? name : id;

    const contents = <>
        <Label id={id} name={useName} />
        {(long ?
            <StyledTextArea id={id} required name={useName} placeholder={placeholder}></StyledTextArea>
            : <StyledInput type={inputType} required name={useName} placeholder={placeholder}></StyledInput>
        )}
    </>;
    
    return required ? 
        <StyledInputWrapperRequired>
            {contents}
        </StyledInputWrapperRequired> :
        <StyledInputWrapper>
            {contents}
        </StyledInputWrapper>;
};


const SelectInput = ({
    id, 
    name="", 
    options, 
    required=false 
}) => {
    /*
    Select inputs are dropdown lists that are populated from 
    static files or from database records. 
    */
    
    const useName = name.length ? name : id;

    const contents = <>
        <Label id={id} name={useName} />
        <StyledSelect id={id} name={useName} multiple required>
            {options.map(x => <option value={x}>{x}</option>)}
        </StyledSelect>
    </>;

    return required? 
        <StyledInputWrapperRequired>{contents}</StyledInputWrapperRequired>:
        <StyledInputWrapper>{contents}</StyledInputWrapper>;
}


const Button = ({ 
    action, 
    destructive=false, 
    ...props 
}) => {
    
    const buttonProps = {
        type: "button",
        id: action + "-button",
        destructive,
        ...props
    };
    return <StyledInputButton {...buttonProps}/>;
};


export default ({ 
    id, 
    fields = null, 
    actions 
}) => {
  
    const matchInputType = (ff, ii) => {
        return "options" in ff ?
            <SelectInput {...ff} key={ii}/>:
            <TextInput {...ff} key={ii}/>;
    };

    return (
        <StyledForm id={id}>
            {fields !== null ? fields.map(matchInputType) : null}
            {actions ? (
                <StyledButtonPane>
                    {actions.map((action, key) => <Button {...action} key={key}/>)}
                </StyledButtonPane>
            ) : null}
        </StyledForm>
    )
};
