
const FormBox = styled.div`
& * {
    font-size: 1.2rem;
}
`;

export const FormContainer = (props) => 
<FormBox>
    <Form {...props}/>
</FormBox>