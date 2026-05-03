"use client";

import { useState } from "react";
import { EvoltScanResult } from "@/lib/parseEvolts";

const statusClass = {
  optimal: "bg-green-100 text-green-800",
  under: "bg-amber-100 text-amber-800",
  over: "bg-red-100 text-red-800",
};

const SIMPLE_BODY = [
  "Lean Body Mass",
  "Skeletal Muscle Mass",
  "Body Fat Mass",
  "Total Body Fat %",
  "Visceral Fat Level",
  "BMR",
];
const SIMPLE_SEGMENTAL = [
  "Left Arm Fat",
  "Right Arm Fat",
  "Left Leg Fat",
  "Right Leg Fat",
];

function Badge({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-1 ${statusClass[status as keyof typeof statusClass]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  status,
  accent,
}: {
  label: string | undefined;
  value: string;
  status?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#0B0F0C] rounded-xl p-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p
        className={`text-sm font-medium ${accent ? "text-[#C6FF00]" : "text-white"}`}
      >
        {value} {!accent && <Badge status={status} />}
      </p>
    </div>
  );
}

// In EvoltResultCard.tsx — update the type
type CoachingInsights = {
  summary: string;
  highlights: { label: string; text: string; type: "positive" | "warning" }[];
  recommendations: { category: string; tip: string }[];
  focus: string;
  macroInsight: string;
};
export function EvoltResultCard({ data }: { data: EvoltScanResult }) {
  const [simple, setSimple] = useState(true);
  const [insights, setInsights] = useState<CoachingInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const { meta, bodyComposition, segmental, nutrition } = data;
  const initials =
    meta.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?";

  const shownBody = simple
    ? bodyComposition.filter((x) => SIMPLE_BODY.includes(x.label))
    : bodyComposition;

  const shownSegmental = simple
    ? segmental.filter((x) => SIMPLE_SEGMENTAL.includes(x.label))
    : segmental;

  const fetchInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const res = await fetch("/api/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.message);
      setInsights(json);
    } catch (err: any) {
      setInsightsError(err.message ?? "Failed to load insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="bg-[#111714] border border-[#1F2A24] rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C6FF0022] flex items-center justify-center text-[#C6FF00] font-medium text-sm">
            {initials}
          </div>
          <div>
            <p className="text-white font-medium">{meta.name ?? "Unknown"}</p>
            <p className="text-gray-400 text-xs">{meta.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#0B0F0C] rounded-lg p-1">
          <button
            onClick={() => setSimple(true)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${simple ? "bg-[#C6FF00] text-black font-medium" : "text-gray-400 hover:text-white"}`}
          >
            Simple
          </button>
          <button
            onClick={() => setSimple(false)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${!simple ? "bg-[#C6FF00] text-black font-medium" : "text-gray-400 hover:text-white"}`}
          >
            Detailed
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Age", meta.age],
          ["Gender", meta.gender],
          ["Height", meta.height],
          ["Weight", meta.weight],
        ].map(
          ([label, value]) =>
            value && (
              <div key={label} className="bg-[#0B0F0C] rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            ),
        )}
      </div>

      {/* Body Composition */}
      {shownBody.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            Body composition
          </p>
          <div className="grid grid-cols-2 gap-2">
            {shownBody.map(({ label, value, status }) => (
              <MetricCard
                key={label}
                label={label}
                value={value}
                status={status}
              />
            ))}
          </div>
        </div>
      )}

      {/* Segmental */}
      {shownSegmental.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            Segmental analysis
          </p>
          <div className="grid grid-cols-2 gap-2">
            {shownSegmental.map(({ label, value, status }) => (
              <MetricCard
                key={label}
                label={label}
                value={value}
                status={status}
              />
            ))}
          </div>
        </div>
      )}

      {/* Nutrition */}
      {Object.values(nutrition).some(Boolean) && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            Nutrition targets
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Calories", nutrition.calories],
              ["Protein", nutrition.protein],
              ["Carbs", nutrition.carbs],
              ["Fat", nutrition.fat],
            ].map(
              ([label, value]) =>
                value && (
                  <MetricCard key={label} label={label} value={value} accent />
                ),
            )}
          </div>
        </div>
      )}

      {/* Coaching Insights */}
      <div className="border-t border-[#1F2A24] pt-4">
        {!insights && !loadingInsights && (
          <button
            onClick={fetchInsights}
            className="w-full py-3 rounded-xl border border-[#C6FF0044] text-[#C6FF00] text-sm font-medium hover:bg-[#C6FF0011] transition-colors"
          >
            Get AI coaching insights
          </button>
        )}

        {loadingInsights && (
          <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
            <svg
              className="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            Analyzing your scan...
          </div>
        )}

        {insightsError && (
          <p className="text-red-400 text-xs text-center py-3">
            {insightsError}
          </p>
        )}

        {insights && (
          <div className="space-y-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider">
              AI coaching insights
            </p>

            {/* Summary */}
            <p className="text-gray-300 text-sm leading-relaxed">
              {insights.summary}
            </p>

            {/* Highlights */}
            <div className="grid grid-cols-1 gap-2">
              {insights.highlights.map((h, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 flex flex-col gap-1 ${
                    h.type === "positive"
                      ? "bg-green-900/20 border border-green-800/30"
                      : "bg-amber-900/20 border border-amber-800/30"
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${h.type === "positive" ? "text-green-400" : "text-amber-400"}`}
                  >
                    {h.label}
                  </span>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {h.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Macro Insight */}
{insights.macroInsight && (
  <div className="bg-[#0B0F0C] rounded-xl p-4 border border-[#1F2A24]">
    <p className="text-[#C6FF00] text-xs font-medium mb-2">Macro breakdown</p>
    <p className="text-gray-300 text-xs leading-relaxed">{insights.macroInsight}</p>
  </div>
)}

            {/* Recommendations */}
            <div className="space-y-2">
              {insights.recommendations.map((r, i) => (
                <div key={i} className="bg-[#0B0F0C] rounded-xl p-3">
                  <p className="text-[#C6FF00] text-xs font-medium mb-1">
                    {r.category}
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {r.tip}
                  </p>
                </div>
              ))}
            </div>

            {/* Focus of the week */}
            <div className="bg-[#C6FF0011] border border-[#C6FF0033] rounded-xl p-4">
              <p className="text-[#C6FF00] text-xs font-medium mb-1">
                Focus this week
              </p>
              <p className="text-gray-200 text-sm leading-relaxed">
                {insights.focus}
              </p>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchInsights}
              className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
            >
              Regenerate insights
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
