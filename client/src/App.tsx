import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FloatingIntakeButton } from "@/components/floating-intake-button";
import Login from "@/pages/login";
import MobileLogin from "@/pages/mobile-login";
import MobileHome from "@/pages/mobile-home";
import Dashboard from "@/pages/dashboard";
import AdminSettings from "@/pages/admin-settings";
import Intake from "@/pages/intake";
import ComprehensiveProgress from "@/pages/comprehensive-progress";
import StatisticsOverview from "@/pages/statistics-overview";
import ClosedCaseStatistics from "@/pages/closed-case-statistics";
import UnsettledCaseStatistics from "@/pages/unsettled-case-statistics";
import SettlementsInquiry from "@/pages/settlements-inquiry";
import SettlementAction from "@/pages/settlement-action";
import FieldManagement from "@/pages/field-management";
import FieldDrawing from "@/pages/field-drawing";
import FieldDocuments from "@/pages/field-documents";
import FieldEstimate from "@/pages/field-estimate";
import FieldReport from "@/pages/field-report";
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
      <Route path="/mobile-login" component={MobileLogin} />
      <Route path="/mobile-home" component={MobileHome} />
      <Route path="/forbidden" component={Forbidden} />
      
      <Route path="/home" component={Dashboard} />
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
          <ProtectedRoute category="정산 및 통계">
            <StatisticsLayout>
              <ClosedCaseStatistics />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>
      

      <Route path="/statistics/closed">
        {() => (
          <ProtectedRoute category="정산 및 통계">
            <StatisticsLayout>
              <ClosedCaseStatistics />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/statistics/unsettled">
        {() => (
          <ProtectedRoute category="정산 및 통계">
            <StatisticsLayout>
              <UnsettledCaseStatistics />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/settlements">
        {() => (
          <ProtectedRoute category="정산 및 통계">
            <StatisticsLayout>
              <SettlementsInquiry filterMode="claim" />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/settlements/claim">
        {() => (
          <ProtectedRoute category="정산 및 통계">
            <StatisticsLayout>
              <SettlementsInquiry filterMode="claim" />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/settlements/closed">
        {() => (
          <ProtectedRoute category="정산 및 통계">
            <StatisticsLayout>
              <SettlementsInquiry filterMode="closed" />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/statistics/settlements-inquiry">
        {() => (
          <ProtectedRoute category="정산 및 통계">
            <StatisticsLayout>
              <SettlementsInquiry filterMode="claim" />
            </StatisticsLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/statistics/settlement-action">
        {() => (
          <ProtectedRoute category="정산 및 통계">
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
              <FieldDocuments />
            </FieldSurveyLayout>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/field-survey/estimate">
        {() => (
          <ProtectedRoute category="현장조사">
            <FieldEstimate />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/field-survey/report">
        {() => (
          <ProtectedRoute category="현장조사">
            <FieldSurveyLayout>
              <FieldReport />
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
        <FloatingIntakeButton />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
