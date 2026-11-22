"use client";

import {
  activitySearchUrl,
  ENABLE_AFFILIATES,
  hotelSearchUrl,
} from "@/lib/affiliates";
import { track } from "@/lib/track";

type Props = {
  placeName: string;
  cityName?: string | null;
  className?: string;
};

/** Nearby stay/ticket CTAs — hidden until affiliates are enabled at build time. */
export function AffiliateCta({ placeName, cityName, className = "" }: Props) {
  if (!ENABLE_AFFILIATES) return null;

  const hotel = hotelSearchUrl(placeName, cityName);
  const activity = activitySearchUrl(placeName, cityName);
  if (!hotel && !activity) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {hotel ? (
        <a
          href={hotel}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() =>
            track("affiliate_click", { kind: "hotel", place: placeName, city: cityName ?? "" })
          }
          className="inline-flex items-center rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800"
        >
          근처 숙소
        </a>
      ) : null}
      {activity ? (
        <a
          href={activity}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() =>
            track("affiliate_click", { kind: "activity", place: placeName, city: cityName ?? "" })
          }
          className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
        >
          티켓·투어
        </a>
      ) : null}
    </div>
  );
}
