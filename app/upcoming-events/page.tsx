import { Metadata } from "next";
import Link from "next/link";
import type {
  ICurrentEvent,
  ICurrentEventDataRaw,
} from "app/upcoming-events/Event";
import styles from "@app/layout.module.css";

export const metadata: Metadata = {
  title: "Out of the Blue | Upcoming Events",
  description: "Upcoming events.",
};

interface IPastEventData {
  name: string;
  time: [Date, Date] | [Date];
  location: string;
  description?: string;
}
interface IPastEventDataRaw {
  name: string;
  time: [string, string] | [string];
  location: string;
}

interface ICalendarData {
  past?: IPastEventData[];
  current: ICurrentEvent[];
}
interface ICalendarDataRaw {
  past?: IPastEventDataRaw[];
  current: ICurrentEventDataRaw[];
}

function loadData({ past=[], current }: ICalendarDataRaw): ICalendarData {
  // Load dates from time strings
  return {
    past: past.map((data) => {
      return {
        ...data,
        time: data.time.map((t) => new Date(t)),
      } as IPastEventData;
    }),
    current: current.map((data) => {
      const time =
        typeof data.time !== "undefined"
          ? data.time.map((t) => new Date(t))
          : data.time;
      return { ...data, time } as ICurrentEvent;
    }),
  };
}

export default function Page() {
  const current: {name: string}[] = [];
  const hasCurrentEvents = current.length > 0;
  const currentEventsMessage = hasCurrentEvents ? (
    <p>{`There are ${current.length} upcoming event${
      current.length !== 1 ? "s" : ""
    }`}</p>
  ) : (
    <p>There are no upcoming events.</p>
  );

  return (
    <>
      <h2>Upcoming Events</h2>
      {currentEventsMessage}
      {current.map((props, key) => (
        <a key={key}>{props.name}</a>
      ))}
      <p>You have not missed anything yet.</p>
      <p>
        <Link className={styles.link} href="/subscribe">
          🛟 Subscribe to News & Events
        </Link>
      </p>
      <p>
        <Link className={styles.link} href="/about-us">
          🛟 Find Out More or Contact Us
        </Link>
      </p>
    </>
  );
}
