import AuthForm from "@/app/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-6 py-12">
      <AuthForm mode="login" />
    </main>
  );
}
