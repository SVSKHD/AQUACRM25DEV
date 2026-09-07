import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function InvoiceReportPage() {
  const { month = "", year = "2026" } = useParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const monthNumber = /^(0?[1-9]|1[0-2])$/.test(month)
    ? Number(month)
    : months.findIndex((name) => name.toLowerCase() === month.toLowerCase()) + 1;
  const valid = monthNumber > 0 && /^[1-9]\d{3}$/.test(year);
  const label = valid ? `${months[monthNumber - 1]} ${year}` : "Invalid report date";

  useEffect(() => {
    const previous = document.title;
    document.title = `${label} - Aquakart Invoices`;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow, noarchive";
    document.head.appendChild(robots);
    setError("");
    return () => { document.title = previous; robots.remove(); };
  }, [label]);

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`https://api.aquakart.co.in/v1/invoices/report/${monthNumber}/${year}`, { credentials: "omit" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to download. Please try again.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `Aquakart_Invoices_${year}-${String(monthNumber).padStart(2, "0")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-900">
      <section className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-200" aria-labelledby="report-title">
        <h1 id="report-title" className="text-2xl font-semibold mb-6">{label}</h1>
        {valid ? <button type="button" onClick={download} disabled={busy} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">
          {busy ? "Downloading…" : "Download Excel"}
        </button> : <p>Use a month from 1 to 12 or its full name, followed by an optional four-digit year.</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      </section>
    </main>
  );
}
