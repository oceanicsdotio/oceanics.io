import React from "react";

export interface ICurrentEvent {
  name: string;
  time?: [Date, Date] | [Date];
  location?: string;
}
export interface ICurrentEventDataRaw {
  name: string;
  time?: [string, string] | [string];
  location?: string;
}

const dateOptions: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'short',
  day: 'numeric'
};
const shortTime: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit"
}

const formatDateTimeInterval = (time: [Date, Date] | [Date] | undefined): string => {
  if (typeof time === "undefined") {
    return "Schedule TBD";
  } else {
    const startTime = time[0].toLocaleTimeString(undefined, shortTime);
    const startDate = time[0].toLocaleDateString(undefined, dateOptions);
    if (time.length === 1) {
      return `${startTime} ${startDate}`;
    } else if (time.length === 2) {
      const endTime = time[1].toLocaleTimeString(undefined, shortTime);
      if (time[0].getDay() === time[1].getDay()) {
        return `${startTime} to ${endTime} ${startDate}`;
      } else {
        const endDate = time[1].toLocaleDateString(undefined, dateOptions);
        return `${startTime} ${startDate} to ${endTime} ${endDate}`;
      }
    } else {
      return "Could not find scheduled event time.";
    }
  }
}

export default function CurrentEvent({ location, time }: ICurrentEvent) {

  return (
    <div className="event">
      <p>{formatDateTimeInterval(time)}</p>
      <p>{location ?? "Location TBD"}</p>
    </div>
  );
}
