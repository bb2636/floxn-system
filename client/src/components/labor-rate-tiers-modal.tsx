import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { LaborRateTier } from "@shared/schema";
import { useLaborRateTiers, useUpdateLaborRateTiers, DEFAULT_LABOR_RATE_TIERS_FALLBACK } from "@/hooks/use-labor-rate-tiers";
import { Settings } from "lucide-react";

interface LaborRateTiersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LaborRateTiersModal({ open, onOpenChange }: LaborRateTiersModalProps) {
  const { toast } = useToast();
  const { data: tiers, isLoading } = useLaborRateTiers();
  const updateMutation = useUpdateLaborRateTiers();
  
  const [editedTiers, setEditedTiers] = useState<{ id: number; minRatio: number; rateMultiplier: number }[]>([]);
  
  useEffect(() => {
    if (tiers && tiers.length > 0) {
      setEditedTiers(tiers.map(t => ({
        id: t.id,
        minRatio: t.minRatio,
        rateMultiplier: t.rateMultiplier,
      })));
    } else if (!isLoading) {
      setEditedTiers(DEFAULT_LABOR_RATE_TIERS_FALLBACK.map(t => ({
        id: t.id,
        minRatio: t.minRatio,
        rateMultiplier: t.rateMultiplier,
      })));
    }
  }, [tiers, isLoading]);
  
  const handleMinRatioChange = (id: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedTiers(prev => prev.map(t => 
      t.id === id ? { ...t, minRatio: numValue } : t
    ));
  };
  
  const handleRateMultiplierChange = (id: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedTiers(prev => prev.map(t => 
      t.id === id ? { ...t, rateMultiplier: numValue } : t
    ));
  };
  
  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(editedTiers);
      toast({
        title: "저장 완료",
        description: "노임단가 적용비율이 성공적으로 저장되었습니다.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "노임단가 적용비율 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
  const handleReset = () => {
    setEditedTiers(DEFAULT_LABOR_RATE_TIERS_FALLBACK.map(t => ({
      id: t.id,
      minRatio: t.minRatio,
      rateMultiplier: t.rateMultiplier,
    })));
  };
  
  const sortedTiers = [...editedTiers].sort((a, b) => b.minRatio - a.minRatio);
  
  const getRatioLabel = (tier: { minRatio: number }, index: number) => {
    if (index === 0) {
      return `${tier.minRatio}% 이상`;
    }
    const prevTier = sortedTiers[index - 1];
    if (tier.minRatio === 0) {
      return `${prevTier.minRatio}% 미만`;
    }
    return `${tier.minRatio}% 이상`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-lg"
        style={{ 
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <DialogHeader>
          <DialogTitle 
            className="flex items-center gap-2"
            style={{
              fontFamily: "Pretendard",
              fontSize: "18px",
              fontWeight: 600,
              color: "#0C0C0C",
            }}
          >
            <Settings className="h-5 w-5" style={{ color: "#008FED" }} />
            노임단가 적용비율 설정
          </DialogTitle>
          <DialogDescription style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#686A6E" }}>
            C/D 비율에 따른 노임단가 적용률을 설정합니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <div 
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "rgba(12, 12, 12, 0.1)" }}
          >
            <table className="w-full" style={{ fontFamily: "Pretendard" }}>
              <thead>
                <tr style={{ backgroundColor: "#F4F5F6" }}>
                  <th 
                    className="text-left px-4 py-3"
                    style={{ 
                      fontSize: "13px", 
                      fontWeight: 600,
                      color: "#686A6E",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    }}
                  >
                    C/D 비율
                  </th>
                  <th 
                    className="text-center px-4 py-3"
                    style={{ 
                      fontSize: "13px", 
                      fontWeight: 600,
                      color: "#686A6E",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    }}
                  >
                    최소 비율 (%)
                  </th>
                  <th 
                    className="text-center px-4 py-3"
                    style={{ 
                      fontSize: "13px", 
                      fontWeight: 600,
                      color: "#686A6E",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    }}
                  >
                    적용률 (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTiers.map((tier, index) => (
                  <tr 
                    key={tier.id}
                    style={{ 
                      borderBottom: index < sortedTiers.length - 1 ? "1px solid rgba(12, 12, 12, 0.05)" : "none",
                    }}
                  >
                    <td 
                      className="px-4 py-3"
                      style={{ 
                        fontSize: "14px", 
                        color: "#0C0C0C",
                      }}
                    >
                      {getRatioLabel(tier, index)}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        value={tier.minRatio}
                        onChange={(e) => handleMinRatioChange(tier.id, e.target.value)}
                        className="text-center h-9"
                        style={{ 
                          fontSize: "14px",
                          borderColor: "rgba(12, 12, 12, 0.15)",
                        }}
                        min={0}
                        max={100}
                        data-testid={`input-min-ratio-${tier.id}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        value={tier.rateMultiplier}
                        onChange={(e) => handleRateMultiplierChange(tier.id, e.target.value)}
                        className="text-center h-9"
                        style={{ 
                          fontSize: "14px",
                          borderColor: "rgba(12, 12, 12, 0.15)",
                        }}
                        min={0}
                        max={200}
                        data-testid={`input-rate-multiplier-${tier.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p 
            className="mt-3"
            style={{ 
              fontFamily: "Pretendard",
              fontSize: "12px",
              color: "#9B9DA0",
            }}
          >
            * C = 복구면적, D = 기준작업량, E = 노임단가
            <br />
            * F = E × (적용률/100), 최종 노임비 = F + H
          </p>
        </div>
        
        <DialogFooter className="mt-6 gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            style={{ 
              borderColor: "#E5E7EB",
              color: "#686A6E",
            }}
            data-testid="button-reset-tiers"
          >
            초기화
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            style={{ 
              borderColor: "#E5E7EB",
              color: "#686A6E",
            }}
            data-testid="button-cancel-tiers"
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            style={{ 
              backgroundColor: "#008FED",
              color: "white",
            }}
            data-testid="button-save-tiers"
          >
            {updateMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LaborRateTiersButton() {
  const [modalOpen, setModalOpen] = useState(false);
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="gap-1.5"
        style={{
          borderColor: "rgba(12, 12, 12, 0.15)",
          color: "#686A6E",
        }}
        data-testid="button-open-labor-rate-tiers"
      >
        <Settings className="h-4 w-4" />
        적용비율 설정
      </Button>
      <LaborRateTiersModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
