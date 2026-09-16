import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/features/auth/AuthContext";
import { OnboardingLocaleProvider } from "@/features/onboarding/LocaleContext";

export function App() {
  return (
    <OnboardingLocaleProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </OnboardingLocaleProvider>
  );
}
