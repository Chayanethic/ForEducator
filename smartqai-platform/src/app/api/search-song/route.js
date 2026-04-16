import yts from 'yt-search';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 });
  }

  try {
    const results = await yts(query);
    const videos = results.videos.slice(0, 5).map(video => ({
      id: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
    }));
    
    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return NextResponse.json({ error: "Failed to search songs" }, { status: 500 });
  }
}