#!/bin/bash
# Final soundtrack for a story: narration placed on the timeline, music ducked
# under the voice, loudness-normalized master + player mp3.
#   bash mix.sh <story-dir>
set -euo pipefail
STORY="${1:?usage: mix.sh <story-dir>}"
cd "$STORY"

TOTAL=$(python3 -c "import json;print(int(json.load(open('timeline.json'))['total']+2))")

python3 - <<'EOF' > /tmp/narr_inputs.txt
import json
tl = json.load(open('timeline.json'))
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
  "${FILTERS}${MIX}amix=inputs=$i:duration=longest:normalize=0,apad=whole_dur=${TOTAL}[out]" \
  -map "[out]" -ar 44100 -ac 1 audio/narration.wav

ffmpeg -y -v error -i audio/music.wav -i audio/narration.wav -filter_complex "
 [1:a]asplit=2[nv][nk];
 [0:a][nk]sidechaincompress=threshold=0.015:ratio=7:attack=60:release=900:makeup=1[duck];
 [duck][nv]amix=inputs=2:duration=first:normalize=0:weights=0.72 1.0,
 loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100[out]
" -map "[out]" -ac 2 audio/mix.wav

ffmpeg -y -v error -i audio/mix.wav -codec:a libmp3lame -b:a 112k audio/mix.mp3
echo "mix: $(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/mix.wav)s"
