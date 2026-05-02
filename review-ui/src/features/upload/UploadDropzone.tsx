import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";

import { reviewsApi } from "@/shared/api/reviews";
import { cn } from "@/shared/lib/cn";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf":     [".pdf"],
  "message/rfc822":      [".eml"],
  "application/vnd.ms-outlook": [".msg"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv":            [".csv"],
};

export function UploadDropzone() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const upload = useMutation({
    mutationFn: (file: File) => reviewsApi.upload(file),
    onSuccess: ({ review_id }) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", "list"] });
      navigate(`/reviews/${encodeURIComponent(review_id)}`);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: ACCEPTED_TYPES,
    onDrop: (files) => {
      const [file] = files;
      if (file) upload.mutate(file);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
        isDragActive
          ? "border-brand bg-brand-soft text-brand-dark"
          : "border-border bg-surface text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
      aria-label="Anfrage hochladen"
    >
      <input {...getInputProps()} />
      {upload.isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        <Upload className="h-5 w-5" aria-hidden="true" />
      )}
      <div className="text-sm font-semibold">
        {upload.isPending
          ? "Pipeline läuft…"
          : isDragActive
            ? "Hier ablegen"
            : "Anfrage hochladen"}
      </div>
      <div className="text-xs">
        PDF, EML, MSG, XLSX, CSV
      </div>
      {upload.isError && (
        <p className="mt-2 text-xs text-danger">
          Upload fehlgeschlagen — bitte erneut versuchen.
        </p>
      )}
    </div>
  );
}
