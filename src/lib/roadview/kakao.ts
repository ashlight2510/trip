import { loadScript } from "./load-script";
import {
  PanoramaNotFoundError,
  SEARCH_RADIUS_M,
  normalizeHeading,
  type RoadviewProvider,
} from "./types";

const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

let ready: Promise<void> | null = null;

function loadKakao() {
  ready ??= loadScript(`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`)
    .then(() => new Promise<void>((resolve) => window.kakao!.maps.load(resolve)))
    .catch((e) => {
      ready = null;
      throw e;
    });
  return ready;
}

export const kakaoProvider: RoadviewProvider = {
  id: "kakao",
  attribution: "로드뷰 © Kakao",
  isConfigured: () => Boolean(KEY),

  async mount(el, target) {
    await loadKakao();
    const { maps } = window.kakao!;
    const position = new maps.LatLng(target.lat, target.lng);

    const panoId = await new Promise<number | null>((resolve) =>
      new maps.RoadviewClient().getNearestPanoId(position, SEARCH_RADIUS_M, resolve),
    );
    if (panoId === null) throw new PanoramaNotFoundError();

    const roadview = new maps.Roadview(el);
    await new Promise<void>((resolve) => {
      const onInit = () => {
        maps.event.removeListener(roadview, "init", onInit);
        roadview.setViewpoint({ pan: target.heading, tilt: target.pitch ?? 0, zoom: 0 });
        resolve();
      };
      maps.event.addListener(roadview, "init", onInit);
      roadview.setPanoId(panoId, position);
    });

    const listeners = new Set<() => void>();
    const onResize = () => roadview.relayout();
    window.addEventListener("resize", onResize);

    return {
      getHeading: () => normalizeHeading(roadview.getViewpoint().pan),
      setHeading(deg) {
        const vp = roadview.getViewpoint();
        roadview.setViewpoint({ pan: normalizeHeading(deg), tilt: vp.tilt, zoom: vp.zoom });
      },
      onHeadingChange(cb) {
        const fn = () => cb(normalizeHeading(roadview.getViewpoint().pan));
        listeners.add(fn);
        maps.event.addListener(roadview, "viewpoint_changed", fn);
        return () => {
          listeners.delete(fn);
          maps.event.removeListener(roadview, "viewpoint_changed", fn);
        };
      },
      destroy() {
        listeners.forEach((fn) => maps.event.removeListener(roadview, "viewpoint_changed", fn));
        window.removeEventListener("resize", onResize);
        el.innerHTML = "";
      },
    };
  },
};
