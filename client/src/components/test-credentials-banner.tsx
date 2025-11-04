import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TestCredentialsBanner() {
  return (
    <Alert className="mb-6 border-primary/20 bg-primary/5">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm text-foreground ml-2">
        <strong className="font-semibold">테스트 계정:</strong> 사고번호{" "}
        <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono">TEST-2024-001</code>{" "}
        / 비밀번호{" "}
        <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono">test1234</code>
      </AlertDescription>
    </Alert>
  );
}
