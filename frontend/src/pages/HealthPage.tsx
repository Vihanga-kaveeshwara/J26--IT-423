import { useEffect, useState } from 'react';
import api from '../services/api';

type HealthResponse = {
  success: boolean;
  message: string;
  mlService?: string;
};

export function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<HealthResponse>('/health')
      .then(({ data }) => setHealth(data))
      .catch(() => setError('Backend health check failed.'));
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Frontend is running</h1>
      <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Service status</h2>
        {health && <pre className="mt-4 rounded bg-slate-100 p-4">{JSON.stringify(health, null, 2)}</pre>}
        {error && <p className="mt-4 text-red-700">{error}</p>}
        {!health && !error && <p className="mt-4 text-slate-600">Checking backend...</p>}
      </section>
    </main>
  );
}
