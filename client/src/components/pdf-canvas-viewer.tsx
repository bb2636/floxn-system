import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfCanvasViewerProps {
  pdfData: ArrayBuffer | null;
  loading: boolean;
  error: string | null;
}

export function PdfCanvasViewer({ pdfData, loading, error }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<HTMLCanvasElement[]>([]);
  const [rendering, setRendering] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const renderPdf = useCallback(async (data: ArrayBuffer) => {
    setRendering(true);
    try {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      const canvases: HTMLCanvasElement[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        canvases.push(canvas);
      }
      setPages(canvases);
    } catch (err) {
      console.error("PDF render error:", err);
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (pdfData) {
      renderPdf(pdfData);
    } else {
      setPages([]);
      setTotalPages(0);
      setCurrentPage(1);
    }
  }, [pdfData, renderPdf]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pages.length === 0) return;

    container.innerHTML = "";
    pages.forEach((canvas, idx) => {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "8px";
      wrapper.style.position = "relative";
      wrapper.dataset.pageIndex = String(idx + 1);
      wrapper.appendChild(canvas);
      container.appendChild(wrapper);
    });
  }, [pages]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const children = container.children;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const rect = child.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top;

      if (relativeTop + rect.height > 0 && relativeTop < containerHeight / 2) {
        setCurrentPage(i + 1);
        break;
      }
    }
  }, []);

  if (loading || rendering) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px" }}>
        <div className="animate-spin" style={{ width: "40px", height: "40px", border: "3px solid #e5e7eb", borderTop: "3px solid #008FED", borderRadius: "50%" }} />
        <span style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#6b7280" }}>PDF 생성 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px", padding: "20px" }}>
        <span style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#ef4444" }}>{error}</span>
      </div>
    );
  }

  if (!pdfData || pages.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {totalPages > 1 && (
        <div style={{ padding: "6px 16px", borderBottom: "1px solid #e5e7eb", fontSize: "13px", fontFamily: "Pretendard", color: "#6b7280", textAlign: "center", flexShrink: 0 }}>
          {currentPage} / {totalPages} 페이지
        </div>
      )}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflow: "auto", padding: "8px", background: "#f3f4f6" }}
        data-testid="pdf-canvas-container"
      />
    </div>
  );
}
