import { VlogIndex } from "@/components/vlog-index";

export const metadata = {
  title: "브이로그",
  description: "계절·국내·카페·해외 가상 브이로그를 카테고리별로 골라 보는 목록.",
};

export default function VlogPage() {
  return <VlogIndex />;
}
