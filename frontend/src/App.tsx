import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/features/auth/AuthContext";
import { OnboardingLocaleProvider } from "@/features/onboarding/LocaleContext";
import { ThemeProvider } from "@/features/theme/ThemeContext";

export function App() {
  return (
    <OnboardingLocaleProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </OnboardingLocaleProvider>
  );
}
