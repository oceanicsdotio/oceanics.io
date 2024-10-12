"use client";
import React, { useEffect, useRef, useState } from "react";
import specification from "@app/../specification.json";
import style from "@catalog/things/create/page.module.css";
import Markdown from "react-markdown";
import useCreate, {TextInput, NumberInput, TextSelectInput} from "@catalog/useCreate";
import {v7 as uuid7} from "uuid";
/**
 * Number of decimal places in geospatial coordinates when automatically
 * determining location. A value of 4 gives good results to within tens
 * of meters. A value of 5 is approximately meter precision.
 */
const GEOLOCATION_PRECISION = 5;
/**
 * OpenAPI schema information used in the interface.
 */
const { properties, title: left, description } = specification.components.schemas.Locations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Create({}) {
  /**
   * Form data is synced with user input
   */
  const uuid = useRef<HTMLInputElement | null>(null);
  const name = useRef<HTMLInputElement | null>(null);
  const _description = useRef<HTMLInputElement | null>(null);
  const encodingType = useRef<HTMLSelectElement | null>(null);
  const locationType = useRef<HTMLSelectElement | null>(null);
  const locationLatitude = useRef<HTMLInputElement | null>(null);
  const locationLongitude = useRef<HTMLInputElement | null>(null);
  /**
   * Geolocation data
   */
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  /**
   * Web Worker.
   */
  const { onSubmit, disabled, create, message } = useCreate({
    left,
  });
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value,
      description: _description.current?.value,
      encodingType: encodingType.current?.value,
      location: {
        type: locationType.current?.value,
        coordinates: [
          locationLatitude.current?.valueAsNumber,
          locationLongitude.current?.valueAsNumber
        ]
      }
    };
  };
  /**
   * On geolocation fix, save to client information.
   */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      setPosition,
      () => {
        console.warn("Unable to obtain client location fix, enter coordinates manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);
  /**
   * Update the interface with current location, either on load or manually when the 
   * UI button is pressed. This allows the user to change back if a mistake is made
   * without having to reload the page.
   */
  const usePosition = () => {
    if (position && locationLatitude.current && locationLongitude.current) {
      locationLatitude.current.value = position.coords.latitude.toFixed(GEOLOCATION_PRECISION);
      locationLongitude.current.value = position.coords.longitude.toFixed(GEOLOCATION_PRECISION);
    }
  }
  /**
   * Once we have saved client info, update the interface automatically. We prevent
   * the coordinates from populating the interface if there is already a valid user
   * input. This allows us to refresh device position without necessarily overriding
   * actions.
   */
  useEffect(() => {
    if (
      position && 
      locationLatitude.current && 
      locationLongitude.current && 
      !locationLongitude.current.value && 
      !locationLatitude.current.value
    ) {
      usePosition()
    }
  },[position])
  /**
   * Client Component
   */
  return (
    <>
      <Markdown>{description}</Markdown>
      <p>{message}</p>
      <hr />
      <form
        className={style.form}
        onSubmit={onSubmit(onSubmitCallback)}
        ref={create}
      >
        <TextInput
          name={"uuid"}
          inputRef={uuid}
          required
          description={properties.uuid.description}
          defaultValue={uuid7()}
          readOnly={true}
        ></TextInput>
        <TextInput
          name={"name"}
          inputRef={name}
          required
          description={properties.name.description}
        ></TextInput>
        <TextInput
          name={"description"}
          inputRef={_description}
          required
          description={properties.description.description}
        ></TextInput>
        <TextSelectInput
          name={"encodingType"}
          inputRef={encodingType}
          defaultValue={properties.encodingType.default}
          description={properties.encodingType.description}
          options={properties.encodingType.enum}
        />
        <TextSelectInput
          name={"type"}
          inputRef={locationType}
          defaultValue={properties.location.properties.type.default}
          description={properties.location.properties.type.description}
          options={["Point"]}  // properties.location.properties.type.enum
        />
        <NumberInput
          name={"latitude"}
          inputRef={locationLatitude}
          description={"Latitude is in decimal degrees. Click below to populate this based on device location."}
          required
          min={-90.0}
          max={90.0}
          step={0.00001}
        ></NumberInput>
        <NumberInput
          name={"longitude"}
          inputRef={locationLongitude}
          description={"Longitude is in decimal degrees. Click below to populate this based on device location."}
          required
          min={-180.0}
          max={180.0}
          step={0.00001}
        ></NumberInput>
        <button className={style.submit} type="button" disabled={!position} onClick={usePosition}>
          Use Device Coordinates
        </button>
        <button className={style.submit} disabled={disabled}>
          Create Location
        </button>
      </form>

    </>
  );
}
