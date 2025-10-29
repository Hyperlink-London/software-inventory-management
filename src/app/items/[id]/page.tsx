interface ItemDetailPageProps {
  params: { id: string };
}

export default function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Item Detail</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Placeholder for item details.</p>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Item ID: {id}</p>
      </div>
    </div>
  );
}


