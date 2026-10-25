import { loadScript } from "./load-script";
import {
  PanoramaNotFoundError,
  SEARCH_RADIUS_M,
  normalizeHeading,
  type RoadviewProvider,
} from "./types";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const CALLBACK = "__pungyeongGoogleReady";

let ready: Promise<google.maps.StreetViewLibrary> | null = null;

function loadStreetView() {
  ready ??= new Promise<void>((resolve, reject) => {
    (window as unknown as Record<string, unknown>)[CALLBACK] = () => resolve();
    loadScript(
      `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly&loading=async&callback=${CALLBACK}`,
    ).catch(reject);
  })
    .then(() => google.maps.importLibrary("streetView") as Promise<google.maps.StreetViewLibrary>)
    .catch((e) => {
      ready = null;
      throw e;
    });
  return ready;
}

export const googleProvider: RoadviewProvider = {
  id: "google",
  attribution: "Street View © Google",
  isConfigured: () => Boolean(KEY),

  async mount(el, target) {
    const { StreetViewPanorama, StreetViewService } = await loadStreetView();

    let panoId: string | undefined;
    try {
      const { data } = await new StreetViewService().getPanorama({
        location: { lat: target.lat, lng: target.lng },
        radius: SEARCH_RADIUS_M,
      });
      panoId = data.location?.pano;
    } catch {
      throw new PanoramaNotFoundError();
    }
    if (!panoId) throw new PanoramaNotFoundError();

    const pano = new StreetViewPanorama(el, {
      pano: panoId,
      pov: { heading: target.heading, pitch: target.pitch ?? 0 },
      addressControl: false,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
      showRoadLabels: false,
      zoomControl: false,
      panControl: false,
    });

    const subs = new Set<google.maps.MapsEventListener>();

    return {
      getHeading: () => normalizeHeading(pano.getPov().heading),
      setHeading(deg) {
        pano.setPov({ heading: normalizeHeading(deg), pitch: pano.getPov().pitch });
      },
      onHeadingChange(cb) {
        const sub = pano.addListener("pov_changed", () => cb(normalizeHeading(pano.getPov().heading)));
        subs.add(sub);
        return () => {
          sub.remove();
          subs.delete(sub);
        };
      },
      destroy() {
        subs.forEach((s) => s.remove());
        pano.setVisible(false);
        el.innerHTML = "";
      },
    };
  },
};
