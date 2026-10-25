export interface Landmark {
  bearing: number;
  label: string;
}

export interface PanoramaTarget {
  lat: number;
  lng: number;
  heading: number;
  pitch?: number;
  landmarks?: Landmark[];
  palette?: [string, string];
}

export interface RoadviewHandle {
  getHeading(): number;
  setHeading(deg: number): void;
  onHeadingChange(cb: (deg: number) => void): () => void;
  destroy(): void;
}

export interface RoadviewProvider {
  id: "kakao" | "google" | "fallback";
  attribution: string;
  isConfigured(): boolean;
  mount(el: HTMLElement, target: PanoramaTarget): Promise<RoadviewHandle>;
}

export class PanoramaNotFoundError extends Error {
  constructor() {
    super("No panorama near this location");
  }
}

export const normalizeHeading = (deg: number) => ((deg % 360) + 360) % 360;

export const SEARCH_RADIUS_M = 150;
