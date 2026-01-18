import { useState, useRef } from "react";
import "./index.css";
import { stitchVideo, detectStaticRegions } from './lib/stitcher';

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        setVideoFile(file);
        setVideoUrl(url);
        setResultImage(null);

        // Auto-detect
        setIsProcessing(true); // Reuse flag or add new one
        detectStaticRegions(url).then((regions: { top: number; bottom: number }) => {
            setCropTop(regions.top);
            setCropBottom(regions.bottom);
            setIsProcessing(false);
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const startStitching = async () => {
    if (!videoRef.current || !videoUrl) return;
    setIsProcessing(true);
    setProgress(0);

    // Placeholder for stitching logic
    console.log("Starting stitching for", videoFile?.name);

    try {
      // Run the stitching logic
      const dataUrl = await stitchVideo({
        videoUrl,
        onProgress: (p) => setProgress(p),
        cropMask: { top: cropTop, bottom: cropBottom }
      });
      setResultImage(dataUrl);
    } catch (e) {
      console.error(e);
      alert("Failed to stitch video. See console for details.");
    } finally {
      setIsProcessing(false);
    }

  };

  const handleCopyClick = async () => {
    if (!resultImage) return;
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      alert("Image copied to clipboard!");
    } catch (err) {
      console.error(err);
      alert("Failed to copy image.");
    }
  };

  return (
    <>
      <a
        href="https://github.com/gervaiscodes/video-scroll-stitcher"
        className="github-link"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        <svg
          height="32"
          aria-hidden="true"
          viewBox="0 0 16 16"
          version="1.1"
          width="32"
          fill="currentColor"
        >
          <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.12-1.61.63-1.61.63-.46.12-.9.45-.9.45-.48-.06-.5-.38-.5-.38-.25-.49-.75-.8-.75-.8-.11-.2-.17-.23-.17-.23-.05-.16.16-.27.16-.27.38.05.65.48.65.48.33.68.99.78.99.78 1.86.34 2.22-.52 2.22-.52v-1.73c0-.21-.15-.47-.55-.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
        </svg>
      </a>
      <h1>Video Scroll Stitcher</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Turn your screen recordings into long screenshots instantly.
      </p>

      <div className="card">
        {!videoFile ? (
          <div
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📹</div>
            <h3>Drag & Drop video here</h3>
            <p style={{ color: "var(--text-muted)" }}>or click to browse</p>
            <input
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              id="file-input"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const f = e.target.files[0];
                  const url = URL.createObjectURL(f);
                  setVideoFile(f);
                  setVideoUrl(url);
                  setResultImage(null);

                   // Auto-detect
                    setIsProcessing(true);
                    detectStaticRegions(url).then((regions: { top: number; bottom: number }) => {
                        setCropTop(regions.top);
                        setCropBottom(regions.bottom);
                        setIsProcessing(false);
                    });
                }
              }}
            />
            <label htmlFor="file-input">
              <button
                style={{ marginTop: "1rem", pointerEvents: "none" }}
                type="button"
              >
                Select File
              </button>
            </label>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl!}
              controls
              style={{ maxHeight: "300px", borderRadius: "8px" }}
            />

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => {
                  setVideoFile(null);
                  setVideoUrl(null);
                  setResultImage(null);
                }}
              >
                Change Video
              </button>
              <button onClick={startStitching} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Start Stitching"}
              </button>
            </div>

            {isProcessing && (
              <div
                style={{
                  width: "100%",
                  background: "var(--bg-card-hover)",
                  borderRadius: "4px",
                  height: "8px",
                  marginTop: "1rem",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    background: "var(--primary)",
                    height: "100%",
                    transition: "width 0.2s",
                  }}
                ></div>
              </div>
            )}

            <div style={{ marginTop: '2rem', width: '100%', textAlign: 'left' }}>
                <h3>Settings</h3>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Ignore Top (Header): {cropTop}px
                    <input
                        type="range" min="0" max="1000" value={cropTop}
                        onChange={(e) => setCropTop(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary)' }}
                    />
                </label>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Ignore Bottom (Footer): {cropBottom}px
                    <input
                        type="range" min="0" max="1000" value={cropBottom}
                        onChange={(e) => setCropBottom(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary)' }}
                    />
                </label>
                {/* Visual crop lines could be added over the video, but simple sliders first */}
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>

      {resultImage && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2>Result</h2>
          <img src={resultImage} alt="Stitched Result" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
          <a href={resultImage} download="stitched-scroll.png">
            <button>Download Image</button>
          </a>
          <button onClick={handleCopyClick} style={{ marginLeft: "1rem", background: "var(--bg-card-hover)" }}>
            Copy to Clipboard
          </button>
        </div>
      )}
    </>
  );
}

export default App;
