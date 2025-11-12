import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AdminSettings from "@/pages/admin-settings";
import Intake from "@/pages/intake";
import ComprehensiveProgress from "@/pages/comprehensive-progress";
import StatisticsOverview from "@/pages/statistics-overview";
import SettlementsInquiry from "@/pages/settlements-inquiry";
import SettlementAction from "@/pages/settlement-action";
import FieldManagement from "@/pages/field-management";
import NotFound from "@/pages/not-found";
import { StatisticsLayout } from "@/components/statistics-layout";
import { FieldSurveyLayout } from "@/components/field-survey-layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin-settings" component={AdminSettings} />
      <Route path="/intake" component={Intake} />
      <Route path="/comprehensive-progress" component={ComprehensiveProgress} />
      <Route path="/statistics">
        {() => (
          <StatisticsLayout>
            <StatisticsOverview />
          </StatisticsLayout>
        )}
      </Route>
      <Route path="/settlements">
        {() => (
          <StatisticsLayout>
            <SettlementsInquiry />
          </StatisticsLayout>
        )}
      </Route>
      <Route path="/statistics/settlement-action">
        {() => (
          <StatisticsLayout>
            <SettlementAction />
          </StatisticsLayout>
        )}
      </Route>
      <Route path="/field-survey/management">
        {() => (
          <FieldSurveyLayout>
            <FieldManagement />
          </FieldSurveyLayout>
        )}
      </Route>
      <Route path="/field-survey/drawing">
        {() => (
          <FieldSurveyLayout>
            <div className="p-8">도면 작성 페이지 (준비중)</div>
          </FieldSurveyLayout>
        )}
      </Route>
      <Route path="/field-survey/documents">
        {() => (
          <FieldSurveyLayout>
            <div className="p-8">종합자료 등록 페이지 (준비중)</div>
          </FieldSurveyLayout>
        )}
      </Route>
      <Route path="/field-survey/estimate">
        {() => (
          <FieldSurveyLayout>
            <div className="p-8">견적서작성조사 페이지 (준비중)</div>
          </FieldSurveyLayout>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
