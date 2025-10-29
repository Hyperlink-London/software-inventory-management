export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-zinc-600 dark:text-zinc-400">
        © {new Date().getFullYear()} Software Inventory. All rights reserved.
      </div>
    </footer>
  );
}


