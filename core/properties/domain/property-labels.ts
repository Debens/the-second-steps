import type {
  FloorAreaUnitCode,
  FurnishedStatusCode,
  PropertyFeatureCode,
  PropertyTypeCode,
} from "./property";

export const PROPERTY_TYPE_LABELS: Readonly<Record<PropertyTypeCode, string>> =
  {
    detached: "Detached house",
    semi_detached: "Semi-detached house",
    terraced: "Terraced house",
    bungalow: "Bungalow",
    flat: "Flat or apartment",
    maisonette: "Maisonette",
    room: "Room",
    other: "Other",
  };

export const FURNISHED_STATUS_LABELS: Readonly<
  Record<FurnishedStatusCode, string>
> = {
  furnished: "Furnished",
  part_furnished: "Part furnished",
  unfurnished: "Unfurnished",
  flexible: "Furnished or unfurnished",
};

export const FLOOR_AREA_UNIT_LABELS: Readonly<
  Record<FloorAreaUnitCode, string>
> = {
  sq_ft: "sq ft",
  sq_m: "sq m",
};

export const PROPERTY_FEATURE_LABELS: Readonly<
  Record<PropertyFeatureCode, string>
> = {
  private_garden: "Private garden",
  communal_garden: "Communal garden",
  balcony: "Balcony",
  terrace: "Terrace or roof terrace",
  patio: "Patio",
  off_street_parking: "Off-street parking",
  allocated_parking: "Allocated parking",
  garage: "Garage",
  on_street_parking: "On-street parking",
  permit_parking: "Permit parking",
  ev_charging: "Electric vehicle charging",
  lift: "Lift",
  concierge: "Concierge",
  bike_storage: "Bike storage",
  wheelchair_accessible: "Wheelchair accessible",
  gas_central_heating: "Gas central heating",
  electric_heating: "Electric heating",
  underfloor_heating: "Underfloor heating",
  en_suite: "En-suite",
  utility_room: "Utility room",
  dishwasher: "Dishwasher",
  washing_machine: "Washing machine",
  fireplace: "Fireplace",
};
