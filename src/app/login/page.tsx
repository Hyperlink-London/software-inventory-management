import GitHubSignInButton from "../GitHubSignInButton";

export default function LoginPage() {
  return (
    <div className="p-10 flex flex-col gap-4 items-center">
      <h1 className="text-2xl font-semibold">Login</h1>
      <GitHubSignInButton />
    </div>
  );
}
