Multichannel segmented audio player demo
![img2](static/ss2.png)
![img1](static/ss1.png)
There is only very few albums uploaded, due to copyright laws. Sorry for not providing further, or not providing a library functionality, copyright laws for music are very strict.

Here is how uploading process works:
1. Split track with [Audio Seperator](https://github.com/nomadkaraoke/python-audio-separator)
```python
from audio_separator.separator import Separator
separator = Separator(output_format="mp3")
separator.load_model("mel_band_roformer_karaoke_aufr33_viperx_sdr_10.1956.ckpt")
separator.separate("2023 - Rat Wars/09. ASHAMED.mp3")
```
Out of all models, `mel_band_roformer_karaoke_aufr33_viperx_sdr_10.1956` was cleanest and fastest.
1. Run utilities.
   1. Waveform Peaks [BBC - audiowaveform](https://github.com/bbc/audiowaveform) for vocal and instrumental 
   ```bash
   audiowaveform -i 09.ASHAMED_vocal.mp3 --pixels-per-second 100 --output-format json > 09.ASHAMED_vocal.json
   ```
   2. Duration [FFMPEG](https://ffmpeg.org/). 
   ```bash
   ffprobe -i 09.ASHAMED_vocal.mp3 -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 -v error
   ```
   3. Tempo [sonic-annotator](https://www.vamp-plugins.org/download.html). 
    ```bash
    sonic-annotator -d vamp:qm-vamp-plugins:qm-tempotracker:tempo-w csv 09.ASHAMED_vocal.mp3
    ```
   4. Key [keyfinder-cli](https://github.com/evanpurkhiser/keyfinder-cli)
   ```bash
   keyfinder-cli 09.ASHAMED_vocal.mp3
   ```
   5. Metatadata [exif-tool](https://exiftool.org/)
   ```bash
   exiftool 09.ASHAMED_vocal.mp3
   ```
2. Segment both vocal and instrumental audio with [FFMPEG](https://ffmpeg.org/).
```bash
ffmpeg -i file_path -c:a aac -b:a 320k -f segment -segment_time 40 -segment_list ashamed_playlist.m3u8 -segment_format mpegts ashamed_segment_%03d.ts
```
1. Upload segments, playlists and cover to S3, 
   1. Vocal path =>  `cansu-dev-dj/Burnt Sugar/01. Only Friend/vocal/` 
   2. Instrumental path => `cansu-dev-dj/Burnt Sugar/01. Only Friend/instrumental/`
   3. Cover path => `cansu-dev-dj/Burnt Sugar/cover.jpg`  (it must be `cover.png`, will make it flexible later on)
2. Upload metadata and every other utility outputs to backend server in the format of
```json
{
  "metadata": '',
  "key": '',
  "tempo": '', // send the sonic annotator output as it is 124.25876923076923, it will be rounded up/down or trimmed.
  "length": 230, // send the ffprobe output as it is like 56.790204
  "instrumentalFolderPath": '',  // required
  "instrumental": false,
  "vocalFolderPath": '', // empty if no vocals
  "waveform": [],
  "vocalWaveform": [],
}
```

Note that, after upload, cover image will not be optimized, and served from S3 as it is. You can use `imagemagick` if your cover files are too large (this example clips any cover art larger than 400x400 to the 400x400 with %85 quality)
```bash
convert RAT_WARS_COVER.jpg -strip -quality 85 -resize "400x>" -sampling-factor 4:2:0  -colorspace sRGB -interlace Plane cover.png
```

I will make a GUI for this process soon.