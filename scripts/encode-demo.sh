#!/usr/bin/env bash
# Encodes a landing-page demo ad for the web: ≤1280px on the long edge, H.264 + faststart so it can
# start playing before it finishes downloading, plus a poster frame. Then add an entry to `demoAds`
# in src/app/page.tsx.
#
#   scripts/encode-demo.sh path/to/ad.mp4 4   →  public/demos/demo-4.mp4 + demo-4.jpg
set -euo pipefail
in="$1"; n="$2"; out="public/demos/demo-$n"
ffmpeg -hide_banner -loglevel error -y -i "$in" \
  -vf "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'" \
  -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart "$out.mp4"
ffmpeg -hide_banner -loglevel error -y -ss 1.5 -i "$out.mp4" -frames:v 1 -q:v 4 "$out.jpg"
echo "wrote $out.mp4 and $out.jpg"
