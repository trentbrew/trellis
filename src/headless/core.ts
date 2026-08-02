export type HeadlessCore<T> = any;
export type HeadlessComponentType = string;
export interface RegistryEntry {
  type: HeadlessComponentType;
  name: string;
  core: HeadlessCore<unknown>;
}
