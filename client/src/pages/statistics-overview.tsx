import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StatisticsOverview() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  if (!user) {
    return null;
  }

  return (
    <div className="p-8">
      {/* Page title */}
      <div className="flex items-center gap-4 mb-9">
        <h1 className="text-[26px] font-semibold leading-[128%] tracking-[-0.02em] text-[#0C0C0C]">
          통계
        </h1>
      </div>

      {/* Search and filters card */}
      <div className="bg-white rounded-xl shadow-[0px_0px_20px_#DBE9F5] mb-6">
        {/* Card header */}
        <div className="flex items-center px-6 py-6 border-b-2 border-[rgba(12,12,12,0.1)]">
          <h2 className="text-xl font-semibold leading-[128%] tracking-[-0.02em] text-[#0C0C0C]">
            조회하기
          </h2>
        </div>

        {/* Card content */}
        <div className="flex flex-col gap-3 p-5">
          {/* Search section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[rgba(12,12,12,0.7)]">
              검색
            </label>
            <div className="flex gap-2 items-end">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(12,12,12,0.4)]" />
                <Input
                  type="text"
                  placeholder="접수번호, 사고번호, 보험사, 의뢰사 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Button
                variant="default"
                className="h-10"
                data-testid="button-search"
              >
                조회
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results placeholder */}
      <div className="bg-white rounded-xl shadow-[0px_0px_20px_#DBE9F5] p-8">
        <p className="text-center text-[rgba(12,12,12,0.5)]">
          통계 데이터가 여기에 표시됩니다.
        </p>
      </div>
    </div>
  );
}
