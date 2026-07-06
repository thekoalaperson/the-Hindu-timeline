#!/bin/bash
# Assemble the final soundtrack: narration placed on the timeline,
# music ducked under the voice, loudness-normalized master.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1) narration chunks → one track at their timeline offsets
python3 - <<'EOF' > /tmp/narr_inputs.txt
import json
tl = json.load(open('build/timeline.json'))
for s in tl['scenes']:
    print(f"audio/narr-{s['id']}.wav\t{int(s['narrAt']*1000)}")
EOF

INPUTS=(); FILTERS=""; MIX=""
i=0
while IFS=$'\t' read -r f ms; do
  INPUTS+=(-i "$f")
  FILTERS+="[$i:a]adelay=${ms}|${ms}[d$i];"
  MIX+="[d$i]"
  i=$((i+1))
done < /tmp/narr_inputs.txt

ffmpeg -y -v error "${INPUTS[@]}" -filter_complex \
  "${FILTERS}${MIX}amix=inputs=$i:duration=longest:normalize=0,apad=whole_dur=137[out]" \
  -map "[out]" -ar 44100 -ac 1 audio/narration.wav

# 2) duck music under narration, then blend + master
ffmpeg -y -v error -i audio/music.wav -i audio/narration.wav -filter_complex "
 [1:a]asplit=2[nv][nk];
 [0:a][nk]sidechaincompress=threshold=0.015:ratio=7:attack=60:release=900:makeup=1[duck];
 [duck][nv]amix=inputs=2:duration=first:normalize=0:weights=0.72 1.0,
 loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100[out]
" -map "[out]" -ac 2 audio/mix.wav

# 3) mp3 for the interactive player (embedded as data URI)
ffmpeg -y -v error -i audio/mix.wav -codec:a libmp3lame -b:a 112k audio/mix.mp3
ls -la audio/mix.wav audio/mix.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 audio/mix.wav
