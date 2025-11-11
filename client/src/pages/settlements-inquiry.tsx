import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function SettlementsInquiry() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    all: false,
    thisMonth: false,
    unpaid: false,
    installment: false,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  if (!user) {
    return null;
  }

  return (
    <div className="p-8">
      {/* Page title */}
      <div className="flex items-center gap-4 mb-9">
        <h1 className="text-[26px] font-semibold leading-[128%] tracking-[-0.02em] text-[#0C0C0C]">
          정산 조회
        </h1>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-[0px_0px_20px_#DBE9F5] mb-6 p-6">
        <div className="flex items-center gap-4 mb-4">
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
          <Button variant="default" data-testid="button-search">
            검색
          </Button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-all"
              checked={selectedFilters.all}
              onCheckedChange={(checked) =>
                setSelectedFilters({ ...selectedFilters, all: checked as boolean })
              }
              data-testid="checkbox-filter-all"
            />
            <label
              htmlFor="filter-all"
              className="text-sm font-medium text-[rgba(12,12,12,0.7)] cursor-pointer"
            >
              전체
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-month"
              checked={selectedFilters.thisMonth}
              onCheckedChange={(checked) =>
                setSelectedFilters({ ...selectedFilters, thisMonth: checked as boolean })
              }
              data-testid="checkbox-filter-month"
            />
            <label
              htmlFor="filter-month"
              className="text-sm font-medium text-[rgba(12,12,12,0.7)] cursor-pointer"
            >
              이번 달
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-unpaid"
              checked={selectedFilters.unpaid}
              onCheckedChange={(checked) =>
                setSelectedFilters({ ...selectedFilters, unpaid: checked as boolean })
              }
              data-testid="checkbox-filter-unpaid"
            />
            <label
              htmlFor="filter-unpaid"
              className="text-sm font-medium text-[rgba(12,12,12,0.7)] cursor-pointer"
            >
              미납금
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-installment"
              checked={selectedFilters.installment}
              onCheckedChange={(checked) =>
                setSelectedFilters({ ...selectedFilters, installment: checked as boolean })
              }
              data-testid="checkbox-filter-installment"
            />
            <label
              htmlFor="filter-installment"
              className="text-sm font-medium text-[rgba(12,12,12,0.7)] cursor-pointer"
            >
              할부대상
            </label>
          </div>
        </div>
      </div>

      {/* Results placeholder */}
      <div className="bg-white rounded-xl shadow-[0px_0px_20px_#DBE9F5] p-8">
        <p className="text-center text-[rgba(12,12,12,0.5)]">
          정산 내역이 여기에 표시됩니다.
        </p>
      </div>
    </div>
  );
}
