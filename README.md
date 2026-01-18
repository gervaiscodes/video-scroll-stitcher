# Video Scroll Stitcher

Turn your screen recordings into long, seamless screenshots instantly.

**Video Scroll Stitcher** is a client-side web application that takes a video of you scrolling through content (like a Twitter feed, a long article, or a chat history) and stitches the frames together into a single, high-quality long screenshot.

## 🚀 Features

* **Privacy First**: All processing happens locally in your browser. Your videos are never uploaded to any server.
* **Auto-Detection**: Automatically detects fixed headers and footers to exclude them from the stitching process.
* **Precision Control**: Manually fine-tune the top and bottom crop areas to ensure perfect stitches.
* **Instant Export**: Download your stitched image or copy it directly to your clipboard.

## 🛠️ Installation

This project is built with React, TypeScript, and Vite. You'll need [Node.js](https://nodejs.org/) installed on your machine.

1. **Clone the repository**

```bash
git clone <repository-url>
cd video-scroll-stitcher
```

2. **Install dependencies**

```bash
yarn install
# or npm install
```

3. **Run the development server**

```bash
yarn dev
# or npm run dev
```

4. **Open in Browser**

Navigate to `http://localhost:5173` (or the URL shown in your terminal).

## 📖 How to Use

### 1. Record Your Screen

* Use your phone's native screen recording feature (iOS or Android).
* **Important**: Scroll **slowly and steadily**. Avoid fast flicks or sudden jumps. The stitcher needs overlap between frames to match them correctly.
* Ideally, keep your finger on the screen and drag slowly.

### 2. Import Video

* Drag and drop your screen recording file into the app.
* Or click "Select File" to browse.

### 3. Adjust Settings

The app will attempt to auto-detect static headers (like navigation bars) and footers.

* **Ignore Top**: Use the slider to increase the cropped area at the top if the header is still visible or doubling up.
* **Ignore Bottom**: Adjust this if a bottom tab bar or floating button is interfering with the stitch.

### 4. Stitch & Export

* Click **Start Stitching**. You'll see a progress bar as it processes the video.
* Once done, the result will appear below.
* **Download Image**: Save the PNG to your device.
* **Copy to Clipboard**: Copy the image to paste directly into Slack, Discord, or other apps.

## ⚠️ Limitations & Troubleshooting

Since this uses computer vision to match pixel patterns, there are some scenarios where stitching might fail or produce artifacts.

### 1. Scroll Speed (Too Fast)

**Issue**: If you scroll too fast, there may not be enough overlapping content between sampled frames.
**Fix**: Record a new video where you scroll much slower.

### 2. Dynamic Content

**Issue**: Videos, GIFs, or animated ads in the feed can confuse the matcher because the pixels change even if the scroll position is the same.
**Fix**: Try to scroll past dynamic content quickly, or record static feeds.

### 3. Fading/Transparent Headers

**Issue**: Headers that fade in/out or change transparency might not be perfectly detected as "static" regions.
**Fix**: Manually increase the "Ignore Top" slider until the changing header is fully cropped out.

### 4. Repeating Patterns

**Issue**: If the content has identical repeated blocks (e.g., a list of identical rows), the stitcher might align the wrong blocks, causing sections to be skipped or repeated.
**Fix**: Try to ensure unique content is visible during the scroll.

### 5. Smooth Color Backgrounds

**Issue**: If the background is a solid color with no texture, it's hard to calculate exactly how many pixels you scrolled.
**Fix**: This tool works best with content that has text or distinct visual elements.

## 🤝 Contributing

Found a bug? Screenshot looks weird? We'd love to fix it!

1. **Open an Issue**: Describe what happened.
2. **Submit a PR**: If you know how to fix it, feel free to submit a Pull Request.
3. **Provide Samples**: If possible, attach the video file that failed to stitch (via Google Drive/Dropbox link) in your issue so we can debug the algorithm.
