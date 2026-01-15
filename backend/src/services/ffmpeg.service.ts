import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { CaptionData, VisualSection, CaptionChunk } from 'shared';

export class FFmpegService {
  createCaptionChunks(captions: CaptionData[]): CaptionChunk[] {
    const chunks: CaptionChunk[] = [];
    let currentChunk: CaptionData[] = [];
    let chunkStartTime = captions[0]?.start || 0;

    for (const caption of captions) {
      if (caption.end - chunkStartTime > 2.0 || currentChunk.length >= 4) {
        if (currentChunk.length > 0) {
          chunks.push({
            words: currentChunk.map((c) => c.word),
            start: chunkStartTime,
            end: currentChunk[currentChunk.length - 1].end,
            text: currentChunk.map((c) => c.word).join(' '),
          });
        }
        currentChunk = [caption];
        chunkStartTime = caption.start;
      } else {
        currentChunk.push(caption);
      }
    }

    // Add last chunk
    if (currentChunk.length > 0) {
      chunks.push({
        words: currentChunk.map((c) => c.word),
        start: chunkStartTime,
        end: currentChunk[currentChunk.length - 1].end,
        text: currentChunk.map((c) => c.word).join(' '),
      });
    }

    return chunks;
  }

  createSubtitleFile(chunks: CaptionChunk[], outputPath: string): void {
    let srtContent = '';

    chunks.forEach((chunk, index) => {
      const startTime = this.formatSRTTime(chunk.start);
      const endTime = this.formatSRTTime(chunk.end);

      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${chunk.text}\n\n`;
    });

    fs.writeFileSync(outputPath, srtContent, 'utf-8');
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  async adjustVideoSpeed(
    inputPath: string,
    outputPath: string,
    targetDuration: number
  ): Promise<void> {
    console.log(`Adjusting video speed for ${path.basename(inputPath)} to ${targetDuration}s`);
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.error(`Error probing file ${inputPath}:`, err);
          reject(err);
          return;
        }

        const videoDuration = metadata.format.duration || 0;
        const speedFactor = videoDuration / targetDuration;

        // Clamp speed factor to reasonable values
        const clampedSpeed = Math.max(0.5, Math.min(2.0, speedFactor));
        console.log(`Speed factor: ${speedFactor}, Clamped: ${clampedSpeed}`);

        ffmpeg(inputPath)
          .videoFilters(`setpts=${(1 / clampedSpeed).toFixed(3)}*PTS`)
          .audioFilters(`atempo=${clampedSpeed}`)
          .outputOptions('-t', targetDuration.toString())
          .output(outputPath)
          .on('end', () => {
            console.log(`Finished adjusting speed for ${path.basename(inputPath)}`);
            resolve();
          })
          .on('error', (error) => {
            console.error(`Error adjusting speed for ${path.basename(inputPath)}:`, error);
            reject(error);
          })
          .run();
      });
    });
  }

  async concatenateVideos(inputPaths: string[], outputPath: string): Promise<void> {
    console.log(`Concatenating ${inputPaths.length} videos to ${outputPath}`);
    return new Promise((resolve, reject) => {
      const listPath = path.join(path.dirname(outputPath), 'concat_list.txt');
      const listContent = inputPaths.map((p) => `file '${p}'`).join('\n');
      fs.writeFileSync(listPath, listContent);

      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions('-c', 'copy')
        .output(outputPath)
        .on('end', () => {
          console.log('Concatenation complete');
          fs.unlinkSync(listPath);
          resolve();
        })
        .on('error', (error) => {
          console.error('Error concatenating videos:', error);
          if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
          reject(error);
        })
        .run();
    });
  }

  async addSubtitlesAndAudio(
    videoPath: string,
    audioPath: string,
    subtitlePath: string,
    outputPath: string
  ): Promise<void> {
    console.log(`Adding subtitles and audio to ${videoPath}`);
    return new Promise((resolve, reject) => {
      const subtitleStyle = [
        'FontName=Arial',
        'FontSize=48',
        'PrimaryColour=&H00FFFFFF',
        'OutlineColour=&H00000000',
        'BorderStyle=3',
        'Outline=4',
        'Shadow=0',
        'Bold=1',
        'Alignment=2',
        'MarginV=50',
      ].join(',');

      ffmpeg(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-preset',
          'medium',
          '-crf',
          '23',
          '-vf',
          `subtitles=${subtitlePath.replace(/\\/g, '/')}:force_style='${subtitleStyle}'`,
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('Finished adding subtitles and audio');
          resolve();
        })
        .on('error', (error) => {
          console.error('Error adding subtitles and audio:', error);
          reject(error);
        })
        .run();
    });
  }

  async renderFinalVideo(
    projectId: string,
    visuals: VisualSection[],
    audioPath: string,
    captions: CaptionData[]
  ): Promise<string> {
    console.log(`Starting render for project ${projectId}`);
    const projectDir = path.join(config.uploadDir, 'final', projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const tempDir = path.join(projectDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Process each visual clip
    console.log('Processing visual clips...');
    const processedClips: string[] = [];
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i];
      const inputPath = path.join(
        config.uploadDir,
        'visuals',
        projectId,
        `${visual.selected_pexels_video?.id}.mp4`
      );
      const outputPath = path.join(tempDir, `clip_${i}.mp4`);

      if (fs.existsSync(inputPath)) {
        await this.adjustVideoSpeed(inputPath, outputPath, visual.duration);
        processedClips.push(outputPath);
      } else {
        console.warn(`Visual file not found: ${inputPath}`);
      }
    }

    // Concatenate all clips
    console.log('Concatenating clips...');
    const mergedPath = path.join(tempDir, 'merged.mp4');
    await this.concatenateVideos(processedClips, mergedPath);

    // Create subtitle file
    console.log('Creating subtitle file...');
    const chunks = this.createCaptionChunks(captions);
    const subtitlePath = path.join(tempDir, 'subtitles.srt');
    this.createSubtitleFile(chunks, subtitlePath);

    // Add subtitles and audio
    console.log('Finalizing video...');
    const finalPath = path.join(projectDir, 'video.mp4');
    await this.addSubtitlesAndAudio(mergedPath, audioPath, subtitlePath, finalPath);

    // Clean up temp files
    console.log('Cleaning up temp files...');
    this.cleanupTempFiles(tempDir);

    console.log(`Render complete for project ${projectId}`);
    return finalPath;
  }

  private cleanupTempFiles(tempDir: string): void {
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);
    }
  }
}
