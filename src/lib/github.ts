export interface GitHubOrg {
    login: string;
    id: number;
    url: string;
    description?: string;
    avatar_url: string;
}


export async function fetchGitHubOrgs(accessToken: string): Promise<GitHubOrg[]> {
    const res = await fetch('https://api.github.com/user/orgs', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (!res.ok) {
        throw new Error('Failed to fetch GitHub organizations');
    }

    return res.json();
}