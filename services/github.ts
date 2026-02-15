import { AppData, GitHubConfig } from "../types";

export const fetchFromGitHub = async (config: GitHubConfig): Promise<AppData | null> => {
  if (!config.token || !config.repo) return null;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`,
      {
        headers: {
          Authorization: `token ${config.token}`,
          Accept: "application/vnd.github.v3.raw",
        },
      }
    );

    if (!response.ok) throw new Error("GitHub Fetch Failed");
    const data = await response.json();
    return data as AppData;
  } catch (error) {
    console.error("GitHub Load Error:", error);
    return null;
  }
};

export const saveToGitHub = async (config: GitHubConfig, data: AppData): Promise<boolean> => {
  if (!config.token || !config.repo) return false;

  try {
    // 1. Get current SHA
    const getRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`,
      {
        headers: {
          Authorization: `token ${config.token}`,
        },
      }
    );
    
    let sha = "";
    if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
    }

    // 2. Update file
    const content = btoa(JSON.stringify(data, null, 2)); // Base64 encode
    
    const putRes = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Update data.json - ${new Date().toISOString()}`,
          content: content,
          sha: sha || undefined
        }),
      }
    );

    return putRes.ok;
  } catch (error) {
    console.error("GitHub Save Error:", error);
    return false;
  }
};