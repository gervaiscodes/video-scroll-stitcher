export interface StitchOptions {
  videoUrl: string;
  onProgress: (progress: number) => void;
  cropMask?: {
    top: number; // Pixels to ignore from top
    bottom: number; // Pixels to ignore from bottom
  };
}

export const stitchVideo = async (options: StitchOptions): Promise<string> => {
  const { videoUrl, onProgress, cropMask } = options;
  const cropTop = cropMask?.top || 0;
  const cropBottom = cropMask?.bottom || 0;

  // 1. Setup Video Element
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true; // Important for mobile

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  const width = video.videoWidth;
  const height = video.videoHeight;
  const duration = video.duration;

  // 2. Setup Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height; // Start with one frame height
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");

  // 3. Processing Loop
  // const fps = 30; // Not used yet
  const sampleRate = 0.1; // Sample every 0.1 seconds (10 FPS equivalent) - reduces ambiguity
  const step = sampleRate; // seconds

  let currentY = 0; // Where we are drawing on the master canvas
  let lastFrameData: ImageData | null = null;

  // Master canvas (offscreen) to accumulate the image
  const masterCanvas = document.createElement("canvas");
  masterCanvas.width = width;
  masterCanvas.height = height; // Initial height
  const masterCtx = masterCanvas.getContext("2d");
  if (!masterCtx) throw new Error("Could not get master context");

  // Draw first frame - EXCLUDING footer if cropBottom is set
  video.currentTime = 0;
  await new Promise<void>((r) => {
    video.onseeked = () => r();
    video.currentTime = 0;
  });

  // Draw only the top part (H - cropBottom)
  // But we still want the full width
  masterCanvas.height = height - cropBottom;
  masterCtx.drawImage(
    video,
    0,
    0,
    width,
    height - cropBottom, // Source
    0,
    0,
    width,
    height - cropBottom // Dest
  );

  lastFrameData = getFrameData(video, ctx, width, height);
  currentY = height - cropBottom;

  for (let time = step; time < duration; time += step) {
    onProgress((time / duration) * 100);

    // Seek
    video.currentTime = time;
    await new Promise<void>((r) => {
      video.onseeked = () => r();
    });

    // Get current frame data
    const frameData = getFrameData(video, ctx, width, height);

    // Calculate overlap
    if (lastFrameData) {
      const offset = findOffset(
        lastFrameData,
        frameData,
        width,
        height,
        cropTop,
        cropBottom
      );
      console.log(`Time: ${time.toFixed(2)}, Offset: ${offset}`);

      if (offset > 0) {
        // We found an overlap. The content has moved UP by 'offset' pixels.

        const scrollAmount = offset;

        // Resize master canvas
        const newHeight = masterCanvas.height + scrollAmount;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = masterCanvas.height;
        tempCanvas.getContext("2d")?.drawImage(masterCanvas, 0, 0);

        masterCanvas.height = newHeight;
        const mCtx = masterCanvas.getContext("2d");
        if (mCtx) {
          mCtx.drawImage(tempCanvas, 0, 0);

          // Draw the NEW content.
          // We only want to draw the *newly revealed* part at the bottom.
          // Use floating point destination to avoid sub-pixel blurring if possible (though canvas is int)

          // Source Y: We want the bottom 'scrollAmount' pixels from the CURRENT frame.
          //           But wait, the 'offset' is how much the content shifted UP.
          //           So existing content is shifted up by 'offset'.
          //           The new content is at the bottom of the current frame?

          // Let's look at the geometry again.
          // Frame 1: [ A ] (height H)
          // Frame 2: [ A' ] (shifted up by S)
          //          [ B  ] (height S, new stuff)

          // We want to append B.
          // B is located at: y = H - S to H in Frame 2.
          // Height of B is S.

          // Destination Y: oldHeight.

          // However, we must be careful about the header.
          // The "Frame 2" image contains the fixed header at the top.
          // We definitely don't want to draw that.
          // But B is at the bottom, so it's far from the header (assuming Header < H - S).

          // Implementation:
          // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

          // If we have a footer crop, we shouldn't draw it either.
          // Actually, B might be "above" the footer.
          // Content layout in frame: [Header (Top)] ... [Content] ... [Footer (Bottom)]

          // If we found a valid scroll S.
          // The new content B is the slice of pixels that was "below the fold" in previous frame.
          // In Frame 2, it is visible above the footer.

          // Let's assume we just append the bottom-most valid content.

          mCtx.drawImage(
            video,
            0,
            height - scrollAmount - cropBottom, // Source X, Y (Capture from just above footer???)
            width,
            scrollAmount, // Source W, H
            0,
            masterCanvas.height - scrollAmount, // Dest X, Y
            width,
            scrollAmount // Dest W, H
          );
        }

        currentY += scrollAmount;
      }
    }

    lastFrameData = frameData;
  }

  // Final step: Append the footer from the last frame (if any)
  if (cropBottom > 0) {
    const footerHeight = cropBottom;
    const newHeight = masterCanvas.height + footerHeight;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = masterCanvas.height;
    tempCanvas.getContext("2d")?.drawImage(masterCanvas, 0, 0);

    masterCanvas.height = newHeight;
    const mCtx = masterCanvas.getContext("2d");
    if (mCtx) {
      mCtx.drawImage(tempCanvas, 0, 0);

      // Draw the footer from the current video state (which is at the end)
      mCtx.drawImage(
        video,
        0,
        height - cropBottom,
        width,
        cropBottom, // Source: Bottom slice
        0,
        newHeight - footerHeight,
        width,
        cropBottom // Dest: Very bottom
      );
    }
  }

  onProgress(100);
  return masterCanvas.toDataURL("image/png");
};

function getFrameData(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  ctx.drawImage(video, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}

// Simple pixel row matching
function findOffset(
  prev: ImageData,
  curr: ImageData,
  w: number,
  h: number,
  cropTop: number,
  cropBottom: number
): number {
  // We match the bottom slice of 'prev' (ABOVE cropBottom)
  // and look for it in 'curr' (BELOW cropTop).

  // Search area setup
  // We take a "signature" from the previous frame.
  // The signature should be fairly low down, but above the footer.
  // Let's take a block of height 'searchHeight' ending at 'h - cropBottom'.

  const searchHeight = Math.floor((h - cropTop - cropBottom) * 0.2);
  if (searchHeight < 10) return 0; // Not enough space

  const signatureY = h - cropBottom - searchHeight; // Top-left Y of the signature block in Prev

  const colsToScan = [
    Math.floor(w * 0.5),
    Math.floor(w * 0.25),
    Math.floor(w * 0.75),
  ];

  let bestOffset = 0;
  let minDiff = Infinity;

  // We search for this signature in 'Curr'.
  // We assume content moves UP. So the signature will be found at a "smaller Y" in Curr.
  // The scan range in Curr should be from 'cropTop' up to 'signatureY'.

  // scanY is where the signature *starts* in Curr.
  // We scan every 2nd pixel

  // LIMIT SEARCH RANGE:
  // With Step=0.1s, we don't expect the user to scroll more than ~40% of the screen height.
  // If we search too far, we might find a duplicate card further up.
  const maxScroll = Math.floor(h * 0.5);
  const minScanY = Math.max(cropTop, signatureY - maxScroll);

  for (let scanY = signatureY; scanY >= minScanY; scanY -= 2) {
    let diff = 0;

    for (const x of colsToScan) {
      for (let k = 0; k < searchHeight; k += 5) {
        const prevIdx = ((signatureY + k) * w + x) * 4;
        const currIdx = ((scanY + k) * w + x) * 4;

        const rD = prev.data[prevIdx] - curr.data[currIdx];
        const gD = prev.data[prevIdx + 1] - curr.data[currIdx + 1];
        const bD = prev.data[prevIdx + 2] - curr.data[currIdx + 2];

        diff += Math.abs(rD) + Math.abs(gD) + Math.abs(bD);
      }
    }

    // Distance penalty: prefer smaller offsets.
    // We add a penalty to the difference based on how far we are from the signatureY.
    // Offset = signatureY - scanY (since scanY < signatureY)
    const currentOffset = signatureY - scanY;
    const penaltyPerCc = 5; // Tweak this: 10 pixels offset = 50 score penalty
    const score = diff + currentOffset * penaltyPerCc;

    if (score < minDiff) {
      minDiff = score;
      bestOffset = currentOffset;
    }
  }

  // Threshold (relaxed slightly because minDiff now includes penalty)
  if (minDiff > 8000) return 0;

  return bestOffset;
}

export async function detectStaticRegions(
  videoUrl: string
): Promise<{ top: number; bottom: number }> {
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  const width = video.videoWidth;
  const height = video.videoHeight;
  const duration = video.duration;

  // Sample frames
  const sampleCount = 5;
  const frames: ImageData[] = [];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) return { top: 0, bottom: 0 };

  for (let i = 0; i < sampleCount; i++) {
    // Sample from 10% to 90% of video to avoid fade-ins/outs
    const time = duration * 0.1 + (duration * 0.8 * i) / (sampleCount - 1);
    video.currentTime = time;
    await new Promise<void>((r) => {
      video.onseeked = () => r();
    });
    ctx.drawImage(video, 0, 0);
    frames.push(ctx.getImageData(0, 0, width, height));
  }

  // Analyze rows
  // We compute the max difference for each row across all frames
  const rowDiffs = new Float32Array(height);

  // Check center column and maybe 2 others
  const cols = [
    Math.floor(width * 0.25),
    Math.floor(width * 0.5),
    Math.floor(width * 0.75),
  ];

  for (let y = 0; y < height; y++) {
    let maxRowDiff = 0;

    for (let i = 0; i < sampleCount - 1; i++) {
      let diff = 0;
      for (const x of cols) {
        const idx = (y * width + x) * 4;
        const f1 = frames[i].data;
        const f2 = frames[i + 1].data;

        diff +=
          Math.abs(f1[idx] - f2[idx]) +
          Math.abs(f1[idx + 1] - f2[idx + 1]) +
          Math.abs(f1[idx + 2] - f2[idx + 2]);
      }
      // Normalize by number of cols check
      diff /= cols.length;
      if (diff > maxRowDiff) maxRowDiff = diff;
    }
    rowDiffs[y] = maxRowDiff;
  }

  // Determine thresholds
  // A static row should have very close to 0 difference. Compression artifacts might add noise.
  const noiseThreshold = 15;

  let top = 0;
  for (let y = 0; y < height / 2; y++) {
    if (rowDiffs[y] > noiseThreshold) {
      break;
    }
    top = y + 1;
  }

  let bottom = 0;
  for (let y = height - 1; y > height / 2; y--) {
    if (rowDiffs[y] > noiseThreshold) {
      break;
    }
    bottom = height - y;
  }

  return { top, bottom };
}
