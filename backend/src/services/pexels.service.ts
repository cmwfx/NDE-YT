import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { PexelsVideo } from 'shared';

const PEXELS_API_URL = 'https://api.pexels.com/videos';

interface PexelsSearchResponse {
  videos: PexelsVideo[];
  page: number;
  per_page: number;
  total_results: number;
}

export class PexelsService {
  private headers = {
    Authorization: config.pexels.apiKey,
  };

  async searchVideos(query: string, perPage: number = 5): Promise<PexelsVideo[]> {
    try {
      const response = await axios.get<PexelsSearchResponse>(
        `${PEXELS_API_URL}/search`,
        {
          headers: this.headers,
          params: {
            query,
            per_page: perPage * 2, // Request more to filter for 16:9
            orientation: 'landscape',
          },
        }
      );

      // Filter for 16:9 aspect ratio videos (tolerance of ±0.05)
      const targetRatio = 16 / 9;
      const filtered16by9 = response.data.videos.filter(video => {
        const aspectRatio = video.width / video.height;
        return Math.abs(aspectRatio - targetRatio) < 0.05;
      });

      // Return requested number of 16:9 videos, or all if less available
      return filtered16by9.slice(0, perPage);
    } catch (error) {
      console.error('Pexels search error:', error);
      throw new Error('Failed to search Pexels videos');
    }
  }

  async downloadVideo(videoUrl: string, outputPath: string): Promise<void> {
    try {
      const response = await axios.get(videoUrl, {
        responseType: 'stream',
      });

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writer = fs.createWriteStream(outputPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Pexels download error:', error);
      throw new Error('Failed to download video from Pexels');
    }
  }

  getBestVideoQuality(video: PexelsVideo): string {
    const targetRatio = 16 / 9;

    // Filter for 16:9 aspect ratio video files
    const sixteenByNine = video.video_files.filter(file => {
      const aspectRatio = file.width / file.height;
      return Math.abs(aspectRatio - targetRatio) < 0.05;
    });

    // Prefer 1920x1080 (Full HD 16:9)
    const fullHD = sixteenByNine.find(
      (file) => file.width === 1920 && file.height === 1080
    );
    if (fullHD) return fullHD.link;

    // Prefer any HD quality 16:9
    const hdVideo = sixteenByNine.find((file) => file.quality === 'hd');
    if (hdVideo) return hdVideo.link;

    // Fallback to highest quality 16:9 available
    const sorted16by9 = sixteenByNine.sort((a, b) => b.width - a.width);
    if (sorted16by9.length > 0) return sorted16by9[0].link;

    // Last resort: highest quality available (any aspect ratio)
    const sortedFiles = video.video_files.sort((a, b) => b.width - a.width);
    return sortedFiles[0].link;
  }
}
