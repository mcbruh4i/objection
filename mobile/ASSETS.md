# Asset inventory and regeneration

All assets in `mobile/assets/` are bundled with the Expo app. The app never fetches media at runtime.

## Rights and placeholder status

Two source videos were supplied locally by the project owner:

- `D:/New folder/m2-res_636p.mp4` (Video A; 480x636, 30fps, 7.85s)
- `D:/New folder/objection!.mp4` (Video B; 1920x1080, 60fps, 2.07s)

No license or ownership metadata accompanied either source. Their derived assets below are **temporary local-development placeholders only**. They must not be represented as CC0 or royalty-free, and must be replaced before distribution unless the project owner can document the right to use the source visual and voice material. The procedural sound effects are original mathematical waveforms with no third-party samples.

## Bundled outputs

| File | Source / purpose | Format details |
| --- | --- | --- |
| `assets/video/talk-loop.mp4` | Video A, source frames 1-55 | 480x636, 30fps, muted H.264 Constrained Baseline |
| `assets/video/bench-slam.mp4` | Video A, source frames 56-86 | 480x636, 30fps, muted H.264 Constrained Baseline |
| `assets/video/objection-point.mp4` | Video A, source frames 87-235 | 480x636, 30fps, muted H.264 Constrained Baseline |
| `assets/images/objection-splash.webp` | Video B frame at 0.80s | 1920x1080 WebP with alpha; green screen keyed and despilled |
| `assets/audio/objection-voice.mp3` | Video B audio from 0.26s through 1.36s | mono MP3; temporary source-derived placeholder |
| `assets/audio/defense-blip.mp3` | Original procedural square-wave dialogue blip | mono MP3 |
| `assets/audio/prosecutor-blip.mp3` | Original procedural square-wave dialogue blip | mono MP3 |
| `assets/audio/bench-thud.mp3` | Original procedural decaying low-frequency impact | mono MP3 |
| `assets/audio/gavel.mp3` | Original procedural decaying two-tone impact | mono MP3 |

The three character clips share the exact same 480x636 output geometry, 30fps cadence, muted audio, and left-side courtroom framing. To exclude the unrelated secondary character that enters on the right of Video A, each applies `crop=300:636:0:0,scale=480:636:flags=lanczos`. This deliberately keeps the prosecutor, bench, and point-arm silhouette while replacing the rightmost source area; it is a placeholder crop to be replaced with final licensed clips.

## Regeneration (Windows PowerShell)

These commands use the locally available FFmpeg build. Quoted paths are required because the executable and sources contain spaces. FFmpeg frame indexes are zero-based, so source frames 1-55 map to `0:55`, 56-86 map to `55:86`, and 87-235 map to `86:235` (`end_frame` is exclusive).

```powershell
$ffmpeg = 'C:\Program Files\Varia\ffmpeg.exe'
$sourceA = 'D:\New folder\m2-res_636p.mp4'
$sourceB = 'D:\New folder\objection!.mp4'

& $ffmpeg -hide_banner -loglevel error -y -i $sourceA -map 0:v:0 -vf "trim=start_frame=0:end_frame=55,setpts=PTS-STARTPTS,crop=300:636:0:0,scale=480:636:flags=lanczos" -r 30 -an -c:v libopenh264 -profile:v constrained_baseline -rc_mode bitrate -b:v 700k -pix_fmt yuv420p -movflags +faststart assets/video/talk-loop.mp4
& $ffmpeg -hide_banner -loglevel error -y -i $sourceA -map 0:v:0 -vf "trim=start_frame=55:end_frame=86,setpts=PTS-STARTPTS,crop=300:636:0:0,scale=480:636:flags=lanczos" -r 30 -an -c:v libopenh264 -profile:v constrained_baseline -rc_mode bitrate -b:v 700k -pix_fmt yuv420p -movflags +faststart assets/video/bench-slam.mp4
& $ffmpeg -hide_banner -loglevel error -y -i $sourceA -map 0:v:0 -vf "trim=start_frame=86:end_frame=235,setpts=PTS-STARTPTS,crop=300:636:0:0,scale=480:636:flags=lanczos" -r 30 -an -c:v libopenh264 -profile:v constrained_baseline -rc_mode bitrate -b:v 700k -pix_fmt yuv420p -movflags +faststart assets/video/objection-point.mp4

& $ffmpeg -hide_banner -loglevel error -y -ss 0.80 -i $sourceB -frames:v 1 -vf "format=rgba,chromakey=0x00FF00:0.28:0.08,despill=type=green:mix=1:expand=0.25" -c:v libwebp -preset drawing -q:v 82 -compression_level 6 -pix_fmt yuva420p assets/images/objection-splash.webp
& $ffmpeg -hide_banner -loglevel error -y -i $sourceB -ss 0.26 -t 1.10 -map 0:a:0 -vn -ac 1 -ar 44100 -c:a libmp3lame -b:a 96k assets/audio/objection-voice.mp3

& $ffmpeg -hide_banner -loglevel error -y -f lavfi -i "aevalsrc=0.09*sgn(sin(2*PI*520*t)):s=44100:d=0.06" -ac 1 -ar 44100 -c:a libmp3lame -b:a 48k assets/audio/defense-blip.mp3
& $ffmpeg -hide_banner -loglevel error -y -f lavfi -i "aevalsrc=0.09*sgn(sin(2*PI*245*t)):s=44100:d=0.06" -ac 1 -ar 44100 -c:a libmp3lame -b:a 48k assets/audio/prosecutor-blip.mp3
& $ffmpeg -hide_banner -loglevel error -y -f lavfi -i "aevalsrc=0.52*sin(2*PI*76*t)*exp(-20*t):s=44100:d=0.20" -ac 1 -ar 44100 -c:a libmp3lame -b:a 48k assets/audio/bench-thud.mp3
& $ffmpeg -hide_banner -loglevel error -y -f lavfi -i "aevalsrc=(0.34*sin(2*PI*900*t)*exp(-25*t))+(0.18*sin(2*PI*1800*t)*exp(-28*t)):s=44100:d=0.25" -ac 1 -ar 44100 -c:a libmp3lame -b:a 48k assets/audio/gavel.mp3
```

Run the block from `mobile/`; it writes paths relative to that directory.

## Validation

```powershell
$ffprobe = 'C:\Program Files\Varia\ffprobe.exe'
Get-ChildItem assets/video,assets/images,assets/audio -File | Select-Object FullName,Length
& $ffprobe -v error -show_entries format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,pix_fmt -of json assets/video/talk-loop.mp4
& $ffprobe -v error -show_entries format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,pix_fmt -of json assets/video/bench-slam.mp4
& $ffprobe -v error -show_entries format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,pix_fmt -of json assets/video/objection-point.mp4
& $ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,pix_fmt -of json assets/images/objection-splash.webp
```

At generation time, the bundled set was about 0.7 MB total. The H.264 clips were validated as 480x636 at 30fps; the splash was validated as `yuva420p` WebP; and all effects were validated as 44.1 kHz mono MP3 files.
