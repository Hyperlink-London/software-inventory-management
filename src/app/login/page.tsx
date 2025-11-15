import GitHubSignInButton from "../GitHubSignInButton";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
        Sign In
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-md">
        Click the button below to sign in with your GitHub account.
      </p>

      {/* ✅ Render the component directly */}
      <GitHubSignInButton />
    </div>
  );
}
