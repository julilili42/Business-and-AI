type StatusCardProps = {
  status: string;
  loading: boolean;
};

export function StatusCard({ status, loading }: StatusCardProps) {
  return (
    <div className={`status-card ${loading ? "loading" : ""}`}>
      {loading && <div className="status-spinner" aria-hidden="true" />}
      <span>{status}</span>
    </div>
  );
}
