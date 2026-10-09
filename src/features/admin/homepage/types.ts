/** Plain data the server page hands to the homepage builder (no db types cross the boundary). */
export type SectionDTO = {
  id: string;
  key: string;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
};
