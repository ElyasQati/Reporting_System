"use client";
import { createContext } from "react";
import type { Editable, Entity } from "./entity-form";

export const ReadOnlyContext = createContext<null | {
  details: (entity: Entity, record: Editable) => void;
}>(null);
