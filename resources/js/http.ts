export async function readJsonResponse(response: Response, fallback: string, rejectedFallback = fallback): Promise<unknown> {
    if (response.status === 413) {
        throw new Error(rejectedFallback);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(fallback);
    }

    try {
        return await response.json();
    } catch {
        throw new Error(fallback);
    }
}
