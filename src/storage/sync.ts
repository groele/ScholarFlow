import { db, type Project, type ResearchRecord, type Manuscript, type Submission, type Evidence, type SchemaTemplate, type Hypothesis, type Experiment, type Task, type ResearchArea } from './dexie';
import { loadSettings, type WebDAVConfig, type GitHubConfig, type CloudConfig } from './settings';
import { generateId } from './id';

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface LocalDatabaseDump {
  projects: Project[];
  researchRecords: ResearchRecord[];
  manuscripts: Manuscript[];
  submissions: Submission[];
  tasks: Task[];
  researchAreas: ResearchArea[];
  evidence: Evidence[];
  schemaTemplates: SchemaTemplate[];
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  lastUpdated: number;
  _github_sha?: string;
}

interface GitHubContentResponse {
  content: string;
  sha: string;
}

function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

class CloudSyncEngine {
  private syncing = false;

  /**
   * Test connection with a cloud provider
   */
  async testConnection(provider: 'webdav' | 'github', config: WebDAVConfig | GitHubConfig): Promise<SyncResult> {
    try {
      if (provider === 'webdav') {
        const { url, username, password } = config as WebDAVConfig;
        if (!url || !username || !password) throw new Error('Missing WebDAV configuration fields');

        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        const headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa(username + ':' + password));

        const response = await fetch(cleanUrl, {
          method: 'PROPFIND',
          headers,
          body: `<?xml version="1.0" encoding="utf-8" ?>
            <d:propfind xmlns:d="DAV:">
              <d:prop><d:displayname/></d:prop>
            </d:propfind>`
        });

        if (response.status >= 200 && response.status < 300) {
          return { success: true };
        } else {
          return { success: false, error: `WebDAV server returned status ${response.status}` };
        }
      } else if (provider === 'github') {
        const { token, repo } = config as GitHubConfig;
        if (!token || !repo) throw new Error('Missing GitHub token or repository path');

        const response = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (response.ok) {
          return { success: true };
        } else {
          const errData: { message?: string } = await response.json().catch(() => ({}));
          return { success: false, error: errData.message || `GitHub error ${response.status}` };
        }
      }
      return { success: false, error: 'Unsupported provider' };
    } catch (e: unknown) {
      return { success: false, error: getErrorMessage(e) };
    }
  }

  /**
   * Synchronizes the database tables with the configured metadata cloud provider
   */
  async syncDatabaseNow(): Promise<SyncResult> {
    if (this.syncing) return { success: false, error: 'Sync already in progress' };
    this.syncing = true;

    try {
      const settings = await loadSettings();
      const metaProvider = settings.syncProviders?.metadata || { provider: 'local' as const, config: {} };

      if (metaProvider.provider === 'local') {
        this.syncing = false;
        return { success: true, message: 'Local storage active, no sync required.' };
      }

      // 1. Package local database tables into a single JSON object
      const localData = await this.packageLocalData();

      let remoteData: LocalDatabaseDump | null = null;
      let remoteTimestamp = 0;
      const localTimestamp = localData.lastUpdated || 0;

      // 2. Fetch remote database JSON
      if (metaProvider.provider === 'webdav') {
        remoteData = await this.fetchFromWebDAV(metaProvider.config as WebDAVConfig);
      } else if (metaProvider.provider === 'github') {
        remoteData = await this.fetchFromGitHub(metaProvider.config as GitHubConfig);
      }

      if (remoteData) {
        remoteTimestamp = remoteData.lastUpdated || 0;

        // 3. Simple Last-Write-Wins Merge
        if (remoteTimestamp > localTimestamp) {
          // Remote is newer - merge and update local tables
          await this.importRemoteData(remoteData);
        } else if (localTimestamp > remoteTimestamp) {
          // Local is newer - push local to remote
          localData.lastUpdated = Date.now();
          await this.saveToCloud(metaProvider.provider, metaProvider.config, localData);
        } else {
          // already in sync
        }
      } else {
        // No remote database exists yet - create it with local data
        localData.lastUpdated = Date.now();
        await this.saveToCloud(metaProvider.provider, metaProvider.config, localData);
      }

      // Notify other parts of the extension of data changes
      chrome.runtime.sendMessage({ action: 'DATABASE_UPDATED' }).catch(() => {});

      this.syncing = false;
      return { success: true };
    } catch (e: unknown) {
      this.syncing = false;
      console.error('Database Sync Error:', e);
      return { success: false, error: getErrorMessage(e) };
    }
  }

  /**
   * Uploads raw evidence file (e.g. PDF) to cloud
   */
  async uploadFile(fileData: ArrayBuffer | string, filename: string, fileType: string): Promise<SyncResult & { file?: Evidence }> {
    const settings = await loadSettings();
    const fileProvider = settings.syncProviders?.files || { provider: 'local' as const, config: {} };

    if (fileProvider.provider === 'local') {
      try {
        const fileId = generateId('file');
        const fileSize = typeof fileData === 'string' ? fileData.length : fileData.byteLength;
        const fileRecord: Evidence = {
          id: fileId,
          userId: 'user',
          projectId: 'proj_general',
          title: filename,
          description: `Uploaded mock evidence file ${filename}`,
          evidenceType: filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'url',
          filePath: `chrome-extension://${chrome.runtime.id}/mock-local-file/${fileId}`,
          fileSize,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.evidence.put(fileRecord);
        chrome.runtime.sendMessage({ action: 'DATABASE_UPDATED' }).catch(() => {});
        return { success: true, file: fileRecord };
      } catch (e: unknown) {
        console.error('Local file save error:', e);
        return { success: false, error: `Failed to save file locally: ${getErrorMessage(e)}` };
      }
    }

    try {
      let fileUrl = '';
      if (fileProvider.provider === 'webdav') {
        fileUrl = await this.uploadToWebDAV(fileProvider.config as WebDAVConfig, fileData, filename, fileType);
      } else if (fileProvider.provider === 'github') {
        fileUrl = await this.uploadToGitHub(fileProvider.config as GitHubConfig, fileData, filename, fileType);
      }

      const fileSize = typeof fileData === 'string' ? fileData.length : fileData.byteLength;
      const fileRecord: Evidence = {
        id: generateId('ev'),
        userId: 'user',
        projectId: 'proj_general',
        title: filename,
        description: `Uploaded evidence file ${filename}`,
        evidenceType: filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'url',
        filePath: fileUrl,
        fileSize,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.evidence.put(fileRecord);
      chrome.runtime.sendMessage({ action: 'DATABASE_UPDATED' }).catch(() => {});
      return { success: true, file: fileRecord };
    } catch (e: unknown) {
      console.error('File Upload Error:', e);
      return { success: false, error: getErrorMessage(e) };
    }
  }

  // --- Core Helpers ---
  private async packageLocalData(): Promise<LocalDatabaseDump> {
    const projects = await db.projects.toArray();
    const researchRecords = await db.researchRecords.toArray();
    const manuscripts = await db.manuscripts.toArray();
    const submissions = await db.submissions.toArray();
    const tasks = await db.tasks.toArray();
    const researchAreas = await db.researchAreas.toArray();
    const evidence = await db.evidence.toArray();
    const schemaTemplates = await db.schemaTemplates.toArray();
    const hypotheses = await db.hypotheses.toArray();
    const experiments = await db.experiments.toArray();

    const timestampResult = await chrome.storage.local.get(['db_last_updated']);

    return {
      projects,
      researchRecords,
      manuscripts,
      submissions,
      tasks,
      researchAreas,
      evidence,
      schemaTemplates,
      hypotheses,
      experiments,
      lastUpdated: (timestampResult.db_last_updated as number) || Date.now()
    };
  }

  private async importRemoteData(data: LocalDatabaseDump): Promise<void> {
    await db.transaction('rw', [
      db.projects,
      db.researchRecords,
      db.manuscripts,
      db.submissions,
      db.tasks,
      db.researchAreas,
      db.evidence,
      db.schemaTemplates,
      db.hypotheses,
      db.experiments,
    ], async () => {
      await db.projects.clear();
      await db.researchRecords.clear();
      await db.manuscripts.clear();
      await db.submissions.clear();
      await db.tasks.clear();
      await db.researchAreas.clear();
      await db.evidence.clear();
      await db.schemaTemplates.clear();
      await db.hypotheses.clear();
      await db.experiments.clear();

      if (Array.isArray(data.projects)) await db.projects.bulkPut(data.projects);
      if (Array.isArray(data.researchRecords)) await db.researchRecords.bulkPut(data.researchRecords);
      if (Array.isArray(data.manuscripts)) await db.manuscripts.bulkPut(data.manuscripts);
      if (Array.isArray(data.submissions)) await db.submissions.bulkPut(data.submissions);
      if (Array.isArray(data.tasks)) await db.tasks.bulkPut(data.tasks);
      if (Array.isArray(data.researchAreas)) await db.researchAreas.bulkPut(data.researchAreas);
      if (Array.isArray(data.evidence)) await db.evidence.bulkPut(data.evidence);
      if (Array.isArray(data.schemaTemplates)) await db.schemaTemplates.bulkPut(data.schemaTemplates);
      if (Array.isArray(data.hypotheses)) await db.hypotheses.bulkPut(data.hypotheses);
      if (Array.isArray(data.experiments)) await db.experiments.bulkPut(data.experiments);
    });

    if (data.lastUpdated) {
      await chrome.storage.local.set({ db_last_updated: data.lastUpdated });
    }
  }

  private async saveToCloud(provider: 'webdav' | 'github', config: CloudConfig, data: LocalDatabaseDump): Promise<void> {
    if (provider === 'webdav') {
      await this.saveToWebDAV(config as WebDAVConfig, data);
    } else if (provider === 'github') {
      await this.saveToGitHub(config as GitHubConfig, data);
    }
    await chrome.storage.local.set({ db_last_updated: data.lastUpdated });
  }

  // --- WebDAV Connectors ---
  private async fetchFromWebDAV(config: WebDAVConfig): Promise<LocalDatabaseDump | null> {
    const { url, username, password } = config;
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const dbUrl = `${cleanUrl}/researchflow_db.json`;

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(username + ':' + password));

    const response = await fetch(dbUrl, { method: 'GET', headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`WebDAV read failed: ${response.statusText}`);
    return await response.json() as LocalDatabaseDump;
  }

  private async saveToWebDAV(config: WebDAVConfig, dbObj: LocalDatabaseDump): Promise<void> {
    const { url, username, password } = config;
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const dbUrl = `${cleanUrl}/researchflow_db.json`;

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(username + ':' + password));
    headers.set('Content-Type', 'application/json');

    const response = await fetch(dbUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(dbObj, null, 2)
    });
    if (!response.ok) throw new Error(`WebDAV write failed: ${response.statusText}`);
  }

  private async uploadToWebDAV(config: WebDAVConfig, fileData: ArrayBuffer | string, filename: string, fileType: string): Promise<string> {
    const { url, username, password } = config;
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    const folderUrl = `${cleanUrl}/evidence`;
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(username + ':' + password));

    // Try making evidence directory (fails silently if it already exists)
    await fetch(folderUrl, { method: 'MKCOL', headers }).catch(() => {});

    // PUT file contents
    const fileUrl = `${folderUrl}/${encodeURIComponent(filename)}`;
    headers.set('Content-Type', fileType || 'application/octet-stream');
    const response = await fetch(fileUrl, {
      method: 'PUT',
      headers,
      body: fileData
    });

    if (!response.ok) throw new Error(`WebDAV file upload failed: ${response.statusText}`);
    return fileUrl;
  }

  // --- GitHub Connectors ---
  private async fetchFromGitHub(config: GitHubConfig): Promise<LocalDatabaseDump | null> {
    const { token, repo, branch = 'main' } = config;
    const dbUrl = `https://api.github.com/repos/${repo}/contents/researchflow_db.json?ref=${branch}`;

    const response = await fetch(dbUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub fetch failed: ${response.statusText}`);

    const data = await response.json() as GitHubContentResponse;
    let decoded: string;
    try {
      decoded = atob(data.content.replace(/\s/g, ''));
    } catch {
      throw new Error('GitHub: failed to decode database file content (invalid base64)');
    }
    let parsed: LocalDatabaseDump;
    try {
      parsed = JSON.parse(decoded) as LocalDatabaseDump;
    } catch {
      throw new Error('GitHub: database file contains invalid JSON');
    }
    parsed._github_sha = data.sha;
    return parsed;
  }

  private async saveToGitHub(config: GitHubConfig, dbObj: LocalDatabaseDump): Promise<void> {
    const { token, repo, branch = 'main' } = config;
    const dbUrl = `https://api.github.com/repos/${repo}/contents/researchflow_db.json`;

    let sha = dbObj._github_sha;
    if (!sha) {
      const getRes = await fetch(`${dbUrl}?ref=${branch}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const getResData = await getRes.json() as { sha: string };
        sha = getResData.sha;
      }
    }

    const cleanDb = { ...dbObj };
    delete cleanDb._github_sha;

    const base64Body = btoa(unescape(encodeURIComponent(JSON.stringify(cleanDb, null, 2))));

    const putBody: { message: string; content: string; branch: string; sha?: string } = {
      message: 'sync: update researchflow database',
      content: base64Body,
      branch
    };
    if (sha) putBody.sha = sha;

    const response = await fetch(dbUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(putBody)
    });

    if (!response.ok) {
      const err: { message?: string } = await response.json().catch(() => ({}));
      throw new Error(`GitHub save failed: ${err.message || response.statusText}`);
    }
  }

  private async uploadToGitHub(config: GitHubConfig, fileData: ArrayBuffer | string, filename: string, fileType: string): Promise<string> {
    const { token, repo, branch = 'main' } = config;
    const uniqueName = Date.now() + '_' + filename;
    const fileUrl = `https://api.github.com/repos/${repo}/contents/evidence/${encodeURIComponent(uniqueName)}`;

    let base64Content = '';
    if (typeof fileData === 'string') {
      base64Content = fileData.split(',')[1] || fileData;
    } else {
      const bytes = new Uint8Array(fileData);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Content = btoa(binary);
    }

    const response = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `upload: evidence ${filename}`,
        content: base64Content,
        branch
      })
    });

    if (!response.ok) {
      const err: { message?: string } = await response.json().catch(() => ({}));
      throw new Error(`GitHub file upload failed: ${err.message || response.statusText}`);
    }

    const data = await response.json() as { content: { html_url: string } };
    return data.content.html_url;
  }
}

export const syncEngine = new CloudSyncEngine();
