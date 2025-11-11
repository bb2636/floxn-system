import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";

export default function SettlementAction() {
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
          정산하기
        </h1>
      </div>

      {/* Content placeholder */}
      <div className="bg-white rounded-xl shadow-[0px_0px_20px_#DBE9F5] p-8">
        <div className="text-center">
          <p className="text-[rgba(12,12,12,0.5)] mb-4">
            정산 처리 기능이 여기에 구현됩니다.
          </p>
          <Button variant="default" data-testid="button-settlement-action">
            정산 처리
          </Button>
        </div>
      </div>
    </div>
  );
}
