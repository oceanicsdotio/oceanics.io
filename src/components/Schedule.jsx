import styled from "styled-components";


const StyledContainer = styled.div`
    width: auto;
    min-height: 150px;
    border: 3px solid black;
    border-radius: 5px;
    padding: 10px;
    margin: 10px;
`;

const StyledInput = styled.input`
    background: none;
    border: none;
    max-width: 100px;
`;

const StyledTextArea = styled.input`
    background: none;
    border: none;
    display: block;
    width: auto;
    margin: 10px;
`;



const StyledLabel = styled.div`
    display: block;
`;

const StyledThing = styled.div`
    display: inline-block;
    border-radius: 5px;
    border: 3px solid;
    padding: 10px;
    margin: 5px;
    background: ${({active=false}) => active ? '#44BA66' : '#444444'};
    color: ${({active=false}) => active ? '#444444': '#44BA66'};
    border-color: ${({active=false}) => active ? '#444444': '#44BA66'};
`;

const StyledLocation = styled.div`
    display: inline-block;
    border-radius: 5px;
    border: 2px black solid;
    padding: 5px;
    margin: 5px;
    height: auto;
    position: relative;
    background: ${({active}) => active ? 'none' : 'grey'};
`;





const Location = ({name, things}) => {
    return (
        <StyledLocation active={!!Object.keys(things).length}>
            <StyledLabel>{name}</StyledLabel>
            <hr/>
            <StyledLabel>{"Things"}</StyledLabel>
            <div>
                {Object.entries(things).map(([thing, people]) => {
                    return (<StyledThing>
                        {thing}
                        {people.length ? people.map(name => <Person name={name}/>) : null}
                    </StyledThing>)
                
                })
                }
            </div>
            <hr/>
            <div>
                <StyledLabel>{"Tasks"}</StyledLabel>
                <ul>
                    {["do a thing", "fix me", "harvest"].map(
                        (x, index) => <li key={index}><StyledInput type="text" defaultValue={x} /></li>)
                    }
                </ul>
                <StyledLabel>{"Notes"}</StyledLabel>
                <StyledTextArea type="textarea" placeholder="Add notes..."/>
            </div>

        </StyledLocation>
    )
};

const Day = ({
    date, 
    team = [
        "AB",
        "CD",
        "EF",
        "GH",
    ]}) => {

    
    const thingLocations = {
        "The Dock": {"Lil Boat": [], "Big Boat": [], "Truck": []}, 
        "The Farm": {},
        "The Yard": {}, 
    };
    const dateFortmat = { weekday: 'long', month: 'short', day: 'numeric' };

    return (
        <StyledContainer>
            <StyledLabel>{date.toLocaleDateString(undefined, dateFortmat)}</StyledLabel>
            <div>
            <StyledLabel>Team</StyledLabel>
            {team.map(name => <Person name={name}/>)}
            </div>
            <div>
            <StyledLabel>Locations</StyledLabel>
            {Object.entries(thingLocations).map(([name, things]) => <Location name={name} things={things}/>)}
            </div>
            
        </StyledContainer>
    )
};

export default (props) => {
    /*
    This is a test service meant to enable automatic reminders and scheduling assistance.

    The service maintains a record of upcoming operations. 

    This includes the missions for vessels, personnel responsibly for that action, and the location
    of the actions. There are many features that can be added, but this is a minimal effort.

    Requirements:
    1. Allow input from pre-populated items
    2. Display next 7 days
    3. Send e-mail or text reminders with SendGrid
    4. Allow recipients to adjust personal settings (optional)

    */
    
    let today = new Date();
    let schedule = [];
    for (let offset = 0; offset < 7; offset++) {
        schedule.push(<Day date={new Date(today)}/>);
    }

    return (
        <div>
            <h1>{"Schedule"}</h1>
            
            {schedule}
        </div>
    );
};

