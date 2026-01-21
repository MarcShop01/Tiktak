// GitHub Storage Class
class GitHubStorage {
  constructor(config) {
    this.config = {
      owner: config.owner,
      repo: config.repo,
      branch: config.branch || 'main',
      token: config.token,
      apiBase: 'https://api.github.com'
    };
    
    this.headers = {
      'Authorization': `token ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  async readFile(path) {
    try {
      const url = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
      const response = await fetch(url, { headers: this.headers });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Fichier ${path} non trouvé, création...`);
          return null;
        }
        throw new Error(`Erreur ${response.status}`);
      }
      
      const data = await response.json();
      const content = atob(data.content);
      return JSON.parse(content);
    } catch (error) {
      console.error('Erreur lecture GitHub:', error);
      return null;
    }
  }

  async writeFile(path, content, commitMessage = 'Update data') {
    try {
      const getUrl = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
      const getResponse = await fetch(getUrl, { headers: this.headers });
      
      let sha = null;
      if (getResponse.ok) {
        const existing = await getResponse.json();
        sha = existing.sha;
      }

      const encodedContent = btoa(JSON.stringify(content, null, 2));
      
      const body = {
        message: commitMessage,
        content: encodedContent,
        branch: this.config.branch
      };
      
      if (sha) body.sha = sha;

      const putResponse = await fetch(getUrl, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(body)
      });

      if (!putResponse.ok) throw new Error(`Erreur ${putResponse.status}`);
      
      return await putResponse.json();
    } catch (error) {
      console.error('Erreur écriture GitHub:', error);
      throw error;
    }
  }

  async addVideo(videoData) {
    const videoId = `vid_${Date.now()}`;
    const videoPath = `data/videos/${videoId}.json`;
    
    await this.writeFile(videoPath, {
      id: videoId,
      ...videoData,
      created_at: new Date().toISOString(),
      engagement: {
        likes: [],
        shares: 0,
        saves: 0,
        view_count: 0,
        view_duration_avg: 0
      }
    }, `Ajout vidéo: ${videoData.title}`);

    const indexPath = 'data/videos/index.json';
    const index = await this.readFile(indexPath) || { 
      last_updated: new Date().toISOString(),
      total_videos: 0,
      videos: [] 
    };
    
    index.videos.push({
      id: videoId,
      filename: `${videoId}.json`,
      title: videoData.title,
      user_id: videoData.user_id,
      upload_date: new Date().toISOString(),
      views: 0,
      likes: 0,
      comments_count: 0,
      thumbnail_url: videoData.thumbnail_url,
      video_url: videoData.video_url,
      hashtags: videoData.hashtags || [],
      category: videoData.category || 'general'
    });

    index.total_videos = index.videos.length;
    index.last_updated = new Date().toISOString();

    await this.writeFile(indexPath, index, `Mise à jour index vidéos`);

    return videoId;
  }

  async likeVideo(videoId, userId) {
    const videoPath = `data/videos/${videoId}.json`;
    const videoData = await this.readFile(videoPath);
    
    if (!videoData) return false;
    
    if (!videoData.engagement.likes.includes(userId)) {
      videoData.engagement.likes.push(userId);
      await this.writeFile(videoPath, videoData, `Like vidéo ${videoId}`);
      
      const indexPath = 'data/videos/index.json';
      const index = await this.readFile(indexPath);
      const videoInIndex = index.videos.find(v => v.id === videoId);
      if (videoInIndex) {
        videoInIndex.likes = videoData.engagement.likes.length;
        await this.writeFile(indexPath, index, `Mise à jour likes index`);
      }
      return true;
    }
    return false;
  }

  async searchVideos(query, filters = {}) {
    const indexPath = 'data/videos/index.json';
    const index = await this.readFile(indexPath);
    
    if (!index || !index.videos) return { results: [], total: 0 };
    
    let results = [...index.videos];
    
    if (query) {
      results = results.filter(video => 
        video.title.toLowerCase().includes(query.toLowerCase()) ||
        (video.hashtags && video.hashtags.some(tag => 
          tag.toLowerCase().includes(query.toLowerCase())
        ))
      );
    }
    
    if (filters.category) {
      results = results.filter(video => video.category === filters.category);
    }
    
    if (filters.userId) {
      results = results.filter(video => video.user_id === filters.userId);
    }
    
    if (filters.sortBy === 'popular') {
      results.sort((a, b) => b.views - a.views);
    } else if (filters.sortBy === 'latest') {
      results.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
    } else if (filters.sortBy === 'likes') {
      results.sort((a, b) => b.likes - a.likes);
    }
    
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const start = (page - 1) * limit;
    
    return {
      results: results.slice(start, start + limit),
      total: results.length,
      page,
      totalPages: Math.ceil(results.length / limit)
    };
  }
}