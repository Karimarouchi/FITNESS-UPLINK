import { ResetPasswordForm } from "@/components/ui/reset-password-form";

const ResetPasswordFormDemo = () => {
  const handleVerifyCode = (code: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(code === "123456");
      }, 1000);
    });
  };

  const handleSubmitPassword = (password: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        window.alert(`Password has been successfully reset (${password.length} chars).`);
        resolve();
      }, 1500);
    });
  };

  const handleCancel = () => {
    window.alert("Operation cancelled.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <ResetPasswordForm
        email="ravikatiyar@gmail.com"
        onVerifyCode={handleVerifyCode}
        onSubmit={handleSubmitPassword}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default ResetPasswordFormDemo;
