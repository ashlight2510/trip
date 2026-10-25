declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
  }

  interface Viewpoint {
    pan: number;
    tilt: number;
    zoom: number;
  }

  class Roadview {
    constructor(container: HTMLElement);
    setPanoId(panoId: number, position: LatLng): void;
    getViewpoint(): Viewpoint;
    setViewpoint(viewpoint: Partial<Viewpoint>): void;
    relayout(): void;
  }

  class RoadviewClient {
    getNearestPanoId(position: LatLng, radius: number, callback: (panoId: number | null) => void): void;
  }

  namespace event {
    function addListener(target: object, type: string, handler: () => void): void;
    function removeListener(target: object, type: string, handler: () => void): void;
  }
}

interface Window {
  kakao?: typeof kakao;
}
