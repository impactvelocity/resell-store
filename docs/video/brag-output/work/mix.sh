#!/usr/bin/env bash
# v2 soundtrack: music bed ducked under the voiceover (VO starts 2.3s in), plus effects.
#   ./mix.sh   → work/mix.wav at about -16 LUFS
set -euo pipefail
cd "$(dirname "$0")"
VO_DELAY_MS=150
MUSIC_DB="${MUSIC_DB:--4}"   # music bed level before ducking
SFX_DB="${SFX_DB:--9}"      # effects level
VO_DB="${VO_DB:-8}"          # the VO comes in quiet (about -24 LUFS)

ffmpeg -y -loglevel error -i audio/music.mp3 -i audio/vo.mp3 -i sfx.wav -filter_complex "
  [0:a]atrim=start=8.07,asetpts=PTS-STARTPTS,afade=t=in:d=0.08,aresample=48000,volume=${MUSIC_DB}dB[mus];
  [1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-24dB:ratio=2.5:attack=8:release=120:makeup=2,volume=${VO_DB}dB,adelay=${VO_DELAY_MS}|${VO_DELAY_MS},apad[vo0];
  [vo0]asplit=2[vo][key];
  [mus][key]sidechaincompress=threshold=0.05:ratio=3:attack=30:release=500:knee=4[duck];
  [2:a]aresample=48000,volume=${SFX_DB}dB[fx];
  [duck][vo][fx]amix=inputs=3:duration=first:normalize=0[m]" -map "[m]" -c:a pcm_s16le pre.wav

I=$(ffmpeg -hide_banner -i pre.wav -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | awk '{print $2}')
GAIN=$(node -e "console.log((-16 - (${I})).toFixed(2))")
ffmpeg -y -loglevel error -i pre.wav -af "volume=${GAIN}dB,alimiter=limit=0.89:attack=3:release=60" -c:a pcm_s16le mix.wav
echo "pre-mix ${I} LUFS → gain ${GAIN} dB"
ffmpeg -hide_banner -i mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|LRA|Peak):'
