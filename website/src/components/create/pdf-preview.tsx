// src/components/create/pdf-preview.tsx

import { AnimatedBeamer } from "@/components/ui/beams/animated-beamer";

interface PDFPreviewProps {
  pdfUrl: string | null;
  isLoading: boolean;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ pdfUrl, isLoading }) => (
  <div className="flex flex-col w-full md:w-2/3 p-4 items-center">
    {!pdfUrl ? (
      <iframe
        src={"/repo2pdf-web.pdf"}
        title="PDF Preview"
        className="min-h-[400px] md:min-h-[80svh] w-full h-full border rounded-lg"
      />
    ) : isLoading ? (
      <div className="w-full h-full flex items-center justify-center">
        <AnimatedBeamer />
      </div>
    ) : (
      <iframe
        src={pdfUrl}
        title="PDF Preview"
        className="min-h-[400px] md:min-h-[80svh] w-full h-full border rounded-lg"
      />
    )}
  </div>
);

export default PDFPreview;
