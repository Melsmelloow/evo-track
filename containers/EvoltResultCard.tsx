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

export function EvoltResultCard({ data }: { data: EvoltScanResult }) {
  const [simple, setSimple] = useState(true);
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

        {/* Toggle */}
        <div className="flex items-center gap-1 bg-[#0B0F0C] rounded-lg p-1">
          <button
            onClick={() => setSimple(true)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              simple
                ? "bg-[#C6FF00] text-black font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => setSimple(false)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              !simple
                ? "bg-[#C6FF00] text-black font-medium"
                : "text-gray-400 hover:text-white"
            }`}
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
    </div>
  );
}
