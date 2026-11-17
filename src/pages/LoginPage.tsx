import { CleanMinimalSignIn } from "@/components/ui/clean-minimal-sign-in";

export function LoginPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <CleanMinimalSignIn />
      </div>
    </div>
  );
}

export default LoginPage;
