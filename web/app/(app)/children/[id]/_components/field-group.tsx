export function FieldGroup({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wider text-sage-500 font-medium">
        {legend}
      </div>
      {children}
    </div>
  );
}
