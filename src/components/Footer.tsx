export default function Footer() {
  return (
    <footer className="w-full border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Hyperlink Inventory. All rights reserved.
      </div>
    </footer>
  );
}


