import React, { useEffect, useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import Oceanside, {ApplicationType} from './Oceanside';

export default {
  component: Oceanside
} as Meta

const Template: StoryFn<ApplicationType> = ({icons, ...args}) => {
    const [_icons, setIcons] = useState(icons);
    useEffect(()=> {
        if (typeof _icons !== "undefined") return;
        (async()=>{
            const response = await fetch("/nodes.json");
            const result = await response.json();
            setIcons(result.icons??null);
        })();
    }, [_icons]);
    return <>
        {_icons && <Oceanside icons={_icons} {...args} />}
    </>
}

export const EightSquare = Template.bind({});
EightSquare.args = {
    view: {
        size: 512
    },
    size: 8,
    grid: {
        size: 8
    },
    datum: 0.6,
    runtime: null
};

export const TwelveSquare = Template.bind({});
TwelveSquare.args = {
    view: {
        size: 512
    },
    size: 12,
    grid: {
        size: 12
    },
    datum: 0.6,
    runtime: null
};