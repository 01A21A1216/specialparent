export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-50 p-3 border border-sage-100">
      <div className="text-xs text-sage-500 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-sage-900">{value}</div>
    </div>
  );
}
