import React from "react";
import styled from "styled-components";


const StyledButtonPane = styled.div``;

const StyledForm = styled.form`
    display: inline-block;
`;

const StyledInput = styled.input`
    display: block;
`;

const StyledInputWrapper = styled.div``;

const StyledInputButton = styled.input`
    display: block;
`;

const StyledInputButtonDestructive = styled.input`
    display: block;
    background-color: orange;
    color: #CC2244
`;

const StyledInputWrapperRequired = styled.div({
    "::after": {
        "content": "'Required'",  // requires extra quotes to render
        "color": "orange",
        "font-size": "smaller",
    }
});

const StyledLabel = styled.label`
    display: block;
`;

const StyledSelect = styled.select`
    background: #101010AA;
    border: solid 1px;
    display: block;
    font-family:inherit;
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


const Label = (props) => {
    const {id, name} = props;
    return <StyledLabel htmlFor={id}>{name.toUpperCase()}:</StyledLabel>;
};

const TextInput = (props) => {

    const { 
        id, 
        inputType = "text", 
        name = "", 
        placeholder, 
        long = false,
        required = false,
    } = props;

    const useName = name.length ? name : id;


    const contents = (
        <>
            <Label id={id} name={useName} />
            {(long ?
                <StyledTextArea id={id} required name={useName} placeholder={placeholder}></StyledTextArea>
                : <StyledInput type={inputType} required name={useName} placeholder={placeholder}></StyledInput>
            )}
        </>
    );
    
    return required? 
        <StyledInputWrapperRequired>{contents}</StyledInputWrapperRequired>:
        <StyledInputWrapper>{contents}</StyledInputWrapper>;
};


const SelectInput = (props) => {
    const { id, name="", options, required=false } = props;
    const useName = name.length ? name : id;

    const contents = (
        <>
            <Label id={id} name={useName} />
            <StyledSelect id={id} name={useName} multiple required>
                {options.map(x => <option value={x}>{x}</option>)}
            </StyledSelect>
        </>
    );
    return required? 
        <StyledInputWrapperRequired>{contents}</StyledInputWrapperRequired>:
        <StyledInputWrapper>{contents}</StyledInputWrapper>;
}


const Button = (props) => {
    const { action, destructive=false, ...newProps } = props;
    const buttonProps = {
        type: "button",
        id: action + "-button",
        ...newProps
    };
    return destructive ? 
        <StyledInputButtonDestructive {...buttonProps}/>:
        <StyledInputButton {...buttonProps}/>;
};



const ButtonPane = (props) => {
    const { actions } = props;
    return (
        <StyledButtonPane>
            {actions.map(action => <Button {...action} />)}
        </StyledButtonPane>
    )
};


export default (props) => {
    const { id, fields = null, actions } = props;

    const matchInputType = (f) => {
        return "options" in f?
            <SelectInput {...f} />:
            <TextInput {...f} />;
    };

    return (
        <StyledForm id={id}>
            {fields !== null ? fields.map(matchInputType) : <></>}
            {actions ? <ButtonPane actions={actions} /> : <></>}
        </StyledForm>
    )
};
