"use client";

import { FileText, Loader2, UploadCloud } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EvoltScanResult,
  mergeEvoltResults,
  parseEvoltText,
} from "@/lib/parseEvolts";
import { EvoltResultCard } from "./EvoltResultCard";
import { preprocessImage } from "@/lib/preprocessImage";

type FileWithPreview = {
  file: File;
  id: string;
};

function UploadForm() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  // Add state
  const [result, setResult] = useState<EvoltScanResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files).map((file) => ({
      file,
      id: crypto.randomUUID(),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  // 🔥 OCR MULTI FILE
  const handleOCR = async () => {
    if (!files.length) return;
    setLoading(true);

    try {
      const parsed = await Promise.all(
        files.map(async (item) => {
          const formData = new FormData();

          // Preprocess before sending
          const processed = await preprocessImage(item.file);
          formData.append("file", processed, item.file.name);

          const res = await fetch("/api/ocr", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          return parseEvoltText(data.text);
        }),
      );
      console.table(parsed);
      setResult(mergeEvoltResults(parsed));
    } catch (err) {
      console.error("Upload OCR Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0B0F0C] p-6">
      <Card className="w-full max-w-md bg-[#111714] border border-[#1F2A24] rounded-2xl shadow-xl">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-semibold text-white">
              Upload Evolt Scan
            </h2>
            <p className="text-sm text-gray-400">
              Upload one or more scan results
            </p>
          </div>
          {/* Upload Area */}
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#1F2A24] rounded-xl cursor-pointer hover:border-[#C6FF00] transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-8 h-8 text-[#C6FF00]" />
              <p className="mt-2 text-sm text-gray-400">Click or drag files</p>
              <p className="text-xs text-gray-500">PNG, JPG or PDF</p>
            </div>
            <Input
              type="file"
              multiple
              accept="image/*"
              capture={false as any}
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-[#0B0F0C] rounded-lg border border-[#1F2A24]"
                >
                  <FileText className="text-[#C6FF00]" />
                  <div className="flex-1">
                    <p className="text-sm text-white truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(item.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Button */}
          <Button
            onClick={handleOCR}
            disabled={loading}
            className="w-full bg-[#C6FF00] text-black hover:bg-[#a3d900]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" />
                Processing OCR...
              </span>
            ) : (
              "Analyze Scans"
            )}
          </Button>
          {result && <EvoltResultCard data={result} />}
        </CardContent>
      </Card>
    </div>
  );
}

export default UploadForm;
