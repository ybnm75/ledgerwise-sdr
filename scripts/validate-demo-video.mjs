import { spawnSync } from "node:child_process";
import path from "node:path";

const video = path.resolve(process.argv[2] || ".demo-video/ledgerwise-loom-ready.mp4");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} failed:\n${result.stderr}`);
  return `${result.stdout}${result.stderr}`;
}

const probe = JSON.parse(run("ffprobe", [
  "-v", "error", "-show_entries",
  "format=duration,size:stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels",
  "-of", "json", video
]));

const videoStream = probe.streams.find((stream) => stream.codec_type === "video");
const audioStream = probe.streams.find((stream) => stream.codec_type === "audio");
const duration = Number(probe.format.duration);
const size = Number(probe.format.size);

if (!videoStream || videoStream.codec_name !== "h264") throw new Error("Expected an H.264 video stream.");
if (videoStream.width !== 1600 || videoStream.height !== 900) throw new Error("Expected a 1600x900 video.");
if (!audioStream || audioStream.codec_name !== "aac") throw new Error("Expected an AAC narration stream.");
if (!(duration > 60 && duration < 600)) throw new Error(`Duration ${duration}s is outside the one-to-ten-minute target.`);
if (size < 1_000_000) throw new Error("The output file is unexpectedly small.");

const decode = run("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "NUL"]);
if (decode.trim()) throw new Error(`Decode errors detected:\n${decode}`);

const blackScan = run("ffmpeg", [
  "-hide_banner", "-i", video,
  "-vf", "blackdetect=d=1:pix_th=0.02", "-an", "-f", "null", "NUL"
]);
if (/black_start|black_end/.test(blackScan)) throw new Error("A black-frame interval longer than one second was detected.");

const volumeScan = run("ffmpeg", ["-hide_banner", "-i", video, "-af", "volumedetect", "-f", "null", "NUL"]);
const meanMatch = volumeScan.match(/mean_volume:\s*(-?[\d.]+) dB/);
const maxMatch = volumeScan.match(/max_volume:\s*(-?[\d.]+) dB/);
const mean = Number(meanMatch?.[1]);
const max = Number(maxMatch?.[1]);
if (!Number.isFinite(mean) || mean < -30 || mean > -12) throw new Error(`Narration mean volume ${mean} dB is outside the expected range.`);
if (!Number.isFinite(max) || max > -0.1) throw new Error(`Narration peak ${max} dB risks clipping.`);

console.log(`Video validation passed: ${duration.toFixed(2)}s, ${videoStream.width}x${videoStream.height}, H.264/AAC, decode clean, no black gaps, mean ${mean} dB, peak ${max} dB.`);
