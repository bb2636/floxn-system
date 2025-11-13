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
import FieldDrawing from "@/pages/field-drawing";
import Forbidden from "@/pages/forbidden";
import NotFound from "@/pages/not-found";
import { StatisticsLayout } from "@/components/statistics-layout";
import { FieldSurveyLayout } from "@/components/field-survey-layout";
import { DrawingLayout } from "@/components/drawing-layout";
import { ProtectedRoute } from "@/components/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/forbidden" component={Forbidden} />
      
      <Route path="/dashboard" component={Dashboard} />
      
      <Route path="/admin-settings">
        {() => (
          <ProtectedRoute category="관리자 설정">
            <AdminSettings />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/intake">
        {() => (
          <ProtectedRoute category="새로운접수">
            <Intake />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/comprehensive-progress">
        {() => (
          <ProtectedRoute category="종합진행관리">
            <ComprehensiveProgress />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/statistics">
        {() => (
          <ProtectedRoute category="통계 및 정산">
            <StatisticsLayout>
              <StatisticsOverview />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/settlements">
        {() => (
          <ProtectedRoute category="통계 및 정산">
            <StatisticsLayout>
              <SettlementsInquiry />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/statistics/settlement-action">
        {() => (
          <ProtectedRoute category="통계 및 정산">
            <StatisticsLayout>
              <SettlementAction />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/field-survey/management">
        {() => (
          <ProtectedRoute category="현장조사">
            <FieldSurveyLayout>
              <FieldManagement />
            </FieldSurveyLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/field-survey/drawing">
        {() => (
          <ProtectedRoute category="현장조사">
            <DrawingLayout>
              <FieldDrawing />
            </DrawingLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/field-survey/documents">
        {() => (
          <ProtectedRoute category="현장조사">
            <FieldSurveyLayout>
              <div className="p-8">종합자료 등록 페이지 (준비중)</div>
            </FieldSurveyLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/field-survey/estimate">
        {() => (
          <ProtectedRoute category="현장조사">
            <FieldSurveyLayout>
              <div className="p-8">견적서 작성 페이지 (준비중)</div>
            </FieldSurveyLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/field-survey/report">
        {() => (
          <ProtectedRoute category="현장조사">
            <FieldSurveyLayout>
              <div className="p-8">현장출동보고서 페이지 (준비중)</div>
            </FieldSurveyLayout>
          </ProtectedRoute>
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
