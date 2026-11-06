import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/features/auth/AuthContext";
import { OnboardingLocaleProvider } from "@/features/onboarding/LocaleContext";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { UiScaleProvider } from "@/features/theme/UiScaleContext";

export function App() {
  return (
    <OnboardingLocaleProvider>
      <ThemeProvider>
        <UiScaleProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </AuthProvider>
        </UiScaleProvider>
      </ThemeProvider>
    </OnboardingLocaleProvider>
  );
}
