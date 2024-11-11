"use client";
import specification from "@app/../specification.json";
import type { Locations as LocationsType } from "@oceanics/app";
import React, { useRef, useEffect, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  TextInput,
  NumberInput,
  TextSelectInput,
  type Initial,
  type FormArgs,
  Collection,
} from "@catalog/client";
import style from "@catalog/page.module.css";

/**
 * Number of decimal places in geospatial coordinates when automatically
 * determining location. A value of 4 gives good results to within tens
 * of meters. A value of 5 is approximately meter precision.
 */
const GEOLOCATION_PRECISION = 5;
/**
 * OpenAPI schema information used in the interface.
 */
const schema = specification.components.schemas.Locations;
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Form({
  action,
  initial,
  onSubmit,
  formRef,
  disabled,
}: FormArgs<LocationsType>) {
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
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCallback = () => {
    return {
      uuid: uuid.current?.value,
      name: name.current?.value || undefined,
      description: _description.current?.value || undefined,
      encodingType: encodingType.current?.value || undefined,
      location: {
        type: locationType.current?.value || undefined,
        coordinates: [
          locationLatitude.current?.valueAsNumber || undefined,
          locationLongitude.current?.valueAsNumber || undefined,
        ],
      },
    };
  };
  /**
   * On geolocation fix, save to client information.
   */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      setPosition,
      () => {
        console.warn(
          "Unable to obtain client location fix, enter coordinates manually."
        );
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
      locationLatitude.current.value = position.coords.latitude.toFixed(
        GEOLOCATION_PRECISION
      );
      locationLongitude.current.value = position.coords.longitude.toFixed(
        GEOLOCATION_PRECISION
      );
    }
  };
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
      usePosition();
    }
  }, [position]);
  /**
   * Client Component
   */
  return (
    <form
      className={style.form}
      onSubmit={onSubmit(onSubmitCallback)}
      ref={formRef}
    >
      <TextInput
        name={"uuid"}
        inputRef={uuid}
        required
        description={schema.properties.uuid.description}
        defaultValue={initial.uuid}
        readOnly
      ></TextInput>
      <TextInput
        name={"name"}
        inputRef={name}
        required
        description={schema.properties.name.description}
        defaultValue={initial.name}
      ></TextInput>
      <TextInput
        name={"description"}
        inputRef={_description}
        required
        description={schema.properties.description.description}
        defaultValue={initial.description}
      ></TextInput>
      <TextSelectInput
        name={"encodingType"}
        inputRef={encodingType}
        defaultValue={schema.properties.encodingType.default}
        description={schema.properties.encodingType.description}
        options={schema.properties.encodingType.enum}
      />
      <TextSelectInput
        name={"type"}
        inputRef={locationType}
        defaultValue={schema.properties.location.properties.type.default}
        description={schema.properties.location.properties.type.description}
        options={["Point"]} // properties.location.properties.type.enum
      />
      <NumberInput
        name={"latitude"}
        inputRef={locationLatitude}
        description={
          "Latitude is in decimal degrees. Click below to populate this based on device location."
        }
        required
        min={-90.0}
        max={90.0}
        step={0.00001}
      ></NumberInput>
      <NumberInput
        name={"longitude"}
        inputRef={locationLongitude}
        description={
          "Longitude is in decimal degrees. Click below to populate this based on device location."
        }
        required
        min={-180.0}
        max={180.0}
        step={0.00001}
      ></NumberInput>
      <button
        className={style.submit}
        type="button"
        disabled={!position}
        onClick={usePosition}
      >
        Detect Location
      </button>
      <button className={style.submit} disabled={disabled}>
        {action}
      </button>
      <button className={style.submit} type="reset">
        Reset
      </button>
    </form>
  );
}
export function AdditionalProperties(each: Initial<LocationsType>) {
  return (<>
    <p>description: {each.description ?? "n/a"}</p>
    <p>encoding type: {each.encodingType ?? "n/a"}</p>
  </>)
}
